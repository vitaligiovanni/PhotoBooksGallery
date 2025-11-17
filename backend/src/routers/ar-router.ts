import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import fsSync from 'fs';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { db } from '../db';
import { storage } from '../storage';
import { arProjects, arProjectItems, insertARProjectSchema } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { compileARProject, generateARViewer } from '../services/ar-compiler';
import { jwtAuth, mockAuth } from './middleware';

// Ensure temp upload directory exists to prevent ENOENT errors from multer
// process.cwd() уже указывает на backend/ директорию
const tempUploadDir = path.join(process.cwd(), 'objects', 'temp-uploads');
try {
  fsSync.mkdirSync(tempUploadDir, { recursive: true });
} catch (e) {
  console.warn('[AR Router] Failed to ensure temp upload dir:', e);
}

const upload = multer({
  dest: tempUploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    
    if (file.fieldname === 'photo' && allowedPhotoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else if (file.fieldname === 'video' && allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${file.fieldname}: ${file.mimetype}`));
    }
  },
});

export function createARRouter(): Router {
  const router = Router();
  // Use strict JWT in production, relaxed mockAuth in dev to simplify local testing
  const requireAuth = process.env.NODE_ENV === 'production' ? jwtAuth : mockAuth;

  /**
   * POST /api/ar/create-automatic
   * Создать AR проект (автоматическая компиляция)
   * Requires: JWT authentication
   */
  router.post(
    '/create-automatic',
    requireAuth,
    upload.fields([
      { name: 'photo', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      try {
        console.log('[AR Router] Debug req.user keys:', Object.keys((req as any).user || {}));
        console.log('[AR Router] Debug req.user:', (req as any).user);
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        let userId = (req as any).user?.claims?.sub || (req as any).user?.userData?.id || (req as any).user?.id;
        if (!userId) {
          console.warn('[AR Router] No userId on request, resolving fallback admin user...');
          // Try to find any admin user
          try {
            // dynamic import to reuse shared users table type
            const { users } = await import('@shared/schema');
            const admins = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
            if (admins.length > 0) {
              userId = (admins as any)[0].id;
              console.warn(`[AR Router] Using existing user ${userId}`);
            } else {
              const newUser = await storage.upsertUser({
                id: 'local-admin',
                email: 'admin@local.test',
                firstName: 'Админ',
                lastName: 'Локальный',
                profileImageUrl: null,
                role: 'admin'
              });
              userId = newUser.id;
              console.warn(`[AR Router] Created and using user ${userId}`);
            }
          } catch (e) {
            console.warn('[AR Router] Fallback user resolution failed:', e);
            userId = 'local-admin';
          }
        }
        const { orderId, config } = req.body;

        // Validate files
        if (!files.photo || !files.video) {
          return res.status(400).json({
            error: 'Both photo and video are required',
          });
        }

        const photoFile = files.photo[0];
        const videoFile = files.video[0];

        // Validate file sizes
        if (photoFile.size > 10 * 1024 * 1024) {
          return res.status(400).json({
            error: 'Photo size must be less than 10MB',
          });
        }

        if (videoFile.size > 100 * 1024 * 1024) {
          return res.status(400).json({
            error: 'Video size must be less than 100MB',
          });
        }

        // Move files to permanent storage
        const timestamp = Date.now();
        const photoExt = path.extname(photoFile.originalname);
        const videoExt = path.extname(videoFile.originalname);

  // process.cwd() уже указывает на backend/
  const uploadDir = path.join(process.cwd(), 'objects', 'ar-uploads');
        await fs.mkdir(uploadDir, { recursive: true });

        const photoFileName = `photo-${timestamp}-${Math.random().toString(36).substring(7)}${photoExt}`;
        const videoFileName = `video-${timestamp}-${Math.random().toString(36).substring(7)}${videoExt}`;

        const photoPath = path.join(uploadDir, photoFileName);
        const videoPath = path.join(uploadDir, videoFileName);

        await fs.rename(photoFile.path, photoPath);
        await fs.rename(videoFile.path, videoPath);

        // Parse config if provided
        let parsedConfig = null;
        if (config) {
          try {
            parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
          } catch (e) {
            console.warn('[AR Router] Failed to parse config:', e);
          }
        }

        // Create AR project in database
        const insertValues = {
          userId: String(userId),
          orderId: orderId || null,
          photoUrl: `objects/ar-uploads/${photoFileName}`,
          videoUrl: `objects/ar-uploads/${videoFileName}`,
          status: 'pending',
          config: (parsedConfig as any) ?? null,
        } as any;
        const [arProject] = await db
          .insert(arProjects)
          .values(insertValues as any)
          .returning();

        console.log(`[AR Router] Created AR project ${arProject.id} for user ${userId}`);

        // Start compilation in background (don't await)
        compileARProject(arProject.id).catch((error) => {
          console.error(`[AR Router] Background compilation failed for ${arProject.id}:`, error);
        });

        // Return immediate response
        res.status(201).json({
          message: 'AR project created and compilation started',
          data: {
            arId: arProject.id,
            status: 'pending',
            estimatedTime: '5-10 seconds',
            checkStatusUrl: `/api/ar/status/${arProject.id}`,
          },
        });
      } catch (error: any) {
        console.error('[AR Router] Error creating AR project:', error);
        res.status(500).json({
          error: 'Failed to create AR project',
          details: error.message,
        });
      }
    }
  );

  /**
   * GET /api/ar/status/:id
   * Получить статус AR проекта с полными данными для asset panel
   */
  router.get('/status/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
  const userRole = (req as any).user?.role || (req as any).user?.userData?.role;

      let arProject: any | undefined;
      if (userRole === 'admin') {
        // Admins can access any AR project
        const result = await db
          .select()
          .from(arProjects)
          .where(eq(arProjects.id, id))
          .limit(1);
        arProject = result[0];
      } else {
        const result = await db
          .select()
          .from(arProjects)
          .where(and(eq(arProjects.id, id), eq(arProjects.userId, userId)))
          .limit(1);
        arProject = result[0];
      }

      if (!arProject) {
        return res.status(404).json({
          error: 'AR project not found',
        });
      }

      // Construct full URLs for assets
      // Log access to status (after ensuring project exists)
      console.log(`[AR Router] GET /status/${id} by user=${userId} role=${userRole} status=${arProject.status}`);

      // Normalize and construct asset URLs consistently using /api/ar/storage
      const photoUrl = arProject.photoUrl && arProject.photoUrl.startsWith('http')
        ? arProject.photoUrl
        : (arProject.photoUrl ? `/api/${arProject.photoUrl.replace(/^\/?api\//, '')}` : null);

      const videoUrl = arProject.videoUrl && arProject.videoUrl.startsWith('http')
        ? arProject.videoUrl
        : (arProject.videoUrl ? `/api/${arProject.videoUrl.replace(/^\/?api\//, '')}` : null);

      const maskUrl = arProject.maskUrl
        ? (arProject.maskUrl.startsWith('http')
          ? arProject.maskUrl.replace('/api/ar-storage/', '/api/ar/storage/')
          : `/api/ar/storage/${arProject.id}/${path.basename(arProject.maskUrl)}`)
        : null;

      const viewerHtmlUrl = arProject.viewerHtmlUrl
        ? (arProject.viewerHtmlUrl.startsWith('http')
          ? arProject.viewerHtmlUrl.replace('/api/ar-storage/', '/api/ar/storage/')
          : `/api/ar/storage/${arProject.id}/index.html`)
        : null;

      const qrCodeUrl = arProject.qrCodeUrl
        ? (arProject.qrCodeUrl.startsWith('http')
          ? arProject.qrCodeUrl.replace('/api/ar-storage/', '/api/ar/storage/')
          : `/api/ar/storage/${arProject.id}/qr-code.png`)
        : null;

      // Extract progressPhase from config if available
      const progressPhase = (arProject.config as any)?.progressPhase || null;

      res.json({
        message: 'AR project status',
        data: {
          id: arProject.id,
          status: arProject.status,
          progressPhase, // NEW: current phase for UI progress bar

          // Asset URLs
          photoUrl,
          videoUrl,
          maskUrl,
          viewerHtmlUrl,
          viewUrl: arProject.viewUrl,
          qrCodeUrl,

          // Dimensions & aspect ratios
          photoWidth: arProject.photoWidth,
          photoHeight: arProject.photoHeight,
          videoWidth: arProject.videoWidth,
          videoHeight: arProject.videoHeight,
          videoDurationMs: arProject.videoDurationMs,
          photoAspectRatio: arProject.photoAspectRatio ? String(arProject.photoAspectRatio) : null,
          videoAspectRatio: arProject.videoAspectRatio ? String(arProject.videoAspectRatio) : null,

          // Mask info
          maskWidth: arProject.maskWidth,
          maskHeight: arProject.maskHeight,

          // Scaling & fit
          scaleWidth: arProject.scaleWidth ? String(arProject.scaleWidth) : null,
          scaleHeight: arProject.scaleHeight ? String(arProject.scaleHeight) : null,

          // Calibration
          isCalibrated: arProject.isCalibrated,
          calibratedPosX: arProject.calibratedPosX ? String(arProject.calibratedPosX) : null,
          calibratedPosY: arProject.calibratedPosY ? String(arProject.calibratedPosY) : null,
          calibratedPosZ: arProject.calibratedPosZ ? String(arProject.calibratedPosZ) : null,

          // Quality metrics
          markerQuality: arProject.markerQuality ? String(arProject.markerQuality) : null,
          keyPointsCount: arProject.keyPointsCount,
          compilationTimeMs: arProject.compilationTimeMs,

          // Config
          config: arProject.config,

          // Error & timestamps
          errorMessage: arProject.errorMessage,
          createdAt: arProject.createdAt,
          updatedAt: arProject.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('[AR Router] Error getting AR status:', error);
      res.status(500).json({
        error: 'Failed to get AR status',
        details: error.message,
      });
    }
  });

  /**
   * GET /api/ar/my-projects
   * Получить все AR проекты текущего пользователя
   */
  router.get('/my-projects', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      const userProjects = await db
        .select()
        .from(arProjects)
        .where(eq(arProjects.userId, userId))
        .orderBy(desc(arProjects.createdAt));

      res.json({
        message: 'User AR projects',
        data: userProjects.map((project) => ({
          id: project.id,
          status: project.status,
          viewUrl: project.viewUrl,
          qrCodeUrl: project.qrCodeUrl,
          orderId: project.orderId,
          markerQuality: project.markerQuality,
          createdAt: project.createdAt,
        })),
      });
    } catch (error: any) {
      console.error('[AR Router] Error getting user AR projects:', error);
      res.status(500).json({
        error: 'Failed to get AR projects',
        details: error.message,
      });
    }
  });

  /**
   * GET /api/ar/pending
   * Получить все проекты в статусе pending/processing (для admin)
   */
  router.get('/pending', requireAuth, async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;

      if (process.env.NODE_ENV === 'production' && userRole !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
        });
      }

      const pendingProjects = await db
        .select()
        .from(arProjects)
        .where(
          and(
            eq(arProjects.status, 'pending'),
            // OR condition would need sql operator
          )
        )
        .orderBy(desc(arProjects.createdAt))
        .limit(50);

      res.json({
        message: 'Pending AR projects',
        data: pendingProjects,
      });
    } catch (error: any) {
      console.error('[AR Router] Error getting pending AR projects:', error);
      res.status(500).json({
        error: 'Failed to get pending projects',
        details: error.message,
      });
    }
  });

  /**
   * GET /api/ar/all
   * Полный список AR проектов для админ-панели (все статусы кроме потенциально удалённых)
   * Возвращает последние 200 записей в порядке создания (DESC)
   * В production доступ только для admin; в dev разрешено для mockAuth (упрощение локальной разработки)
   */
  router.get('/all', requireAuth, async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;
      if (process.env.NODE_ENV === 'production' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Получаем последние проекты (архив тоже показываем, но можно отфильтровать на клиенте)
      const projects = await db
        .select()
        .from(arProjects)
        .orderBy(desc(arProjects.createdAt))
        .limit(200);

      // Приводим к компактному формату для списка
      const mapped = projects.map(p => ({
        id: p.id,
        status: p.status,
        viewUrl: p.viewUrl,
        viewerHtmlUrl: (p as any).viewerHtmlUrl || null,
        orderId: p.orderId,
        markerQuality: p.markerQuality,
        createdAt: p.createdAt,
        fitMode: (p as any).fitMode,
        config: (p as any).config || null,
        errorMessage: (p as any).errorMessage || null,
      }));

      res.json({
        message: 'All AR projects',
        data: mapped,
        meta: {
          count: mapped.length,
          statuses: mapped.reduce<Record<string, number>>((acc, pr) => { acc[pr.status] = (acc[pr.status]||0)+1; return acc; }, {})
        }
      });
    } catch (error: any) {
      console.error('[AR Router] Error getting all AR projects:', error);
      res.status(500).json({ error: 'Failed to get all projects', details: error.message });
    }
  });

  /**
   * POST /api/ar/:id/mask (admin only)
   * Загрузить/обновить маску и регенерировать viewer
   */
  router.post('/:id/mask', requireAuth, upload.single('mask'), async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;
      if (process.env.NODE_ENV === 'production' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const { id } = req.params;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: 'Mask file (png/webp) is required under field name "mask"' });
      }

      const [project] = await db.select().from(arProjects).where(eq(arProjects.id, id)).limit(1);
      if (!project) return res.status(404).json({ error: 'AR project not found' });
      if (project.status !== 'ready' && project.status !== 'processing' && project.status !== 'pending') {
        return res.status(400).json({ error: `Project status ${project.status} is not eligible for mask update` });
      }

      const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', id);
      const viewerHtmlPath = path.join(storageDir, 'index.html');
      const videoPath = path.join(storageDir, 'video.mp4');
      try { await fs.access(videoPath); } catch { return res.status(409).json({ error: 'Video not prepared yet. Compile project first.' }); }

      await fs.mkdir(storageDir, { recursive: true });
      const ext = path.extname(file.originalname).toLowerCase();
      const maskFileName = `mask${ext || '.png'}`;
      const dest = path.join(storageDir, maskFileName);
      await fs.rename(file.path, dest);

      // probe mask dimensions for UI
      let maskMeta: { width?: number; height?: number } = {};
      try {
        const m = await sharp(dest).metadata();
        maskMeta = { width: m.width, height: m.height };
      } catch {}

      // update DB with mask url and size
      await db.update(arProjects).set({
        maskUrl: `/api/ar/storage/${id}/${maskFileName}` as any,
        maskWidth: (maskMeta.width ?? null) as any,
        maskHeight: (maskMeta.height ?? null) as any,
        updatedAt: new Date() as any,
      } as any).where(eq(arProjects.id, id));

      // regenerate viewer HTML keeping same config
      const markerName = 'marker';
      const videoScale = project.scaleWidth && project.scaleHeight ? { width: Number(project.scaleWidth), height: Number(project.scaleHeight) } : (project.config as any)?.videoScale;
      await generateARViewer({
        arId: id,
        markerBaseName: markerName,
        videoFileName: 'video.mp4',
        maskFileName,
        videoPosition: (project.config as any)?.videoPosition,
        videoRotation: (project.config as any)?.videoRotation,
        videoScale,
        autoPlay: (project.config as any)?.autoPlay ?? true,
        loop: (project.config as any)?.loop ?? true,
      }, viewerHtmlPath);

      res.json({
        message: 'Mask updated and viewer regenerated',
        data: {
          id,
          viewerHtmlUrl: `/api/ar/storage/${id}/index.html`,
          maskUrl: `/api/ar/storage/${id}/${maskFileName}`,
          maskWidth: maskMeta.width ?? null,
          maskHeight: maskMeta.height ?? null,
        }
      });
    } catch (error: any) {
      console.error('[AR Router] Failed to upload/regenerate mask:', error);
      res.status(500).json({ error: 'Failed to update mask', details: error.message });
    }
  });

  /**
   * POST /api/ar/:id/convert-mask (admin only)
   * Конвертировать маску: сделать центр прозрачным (если белый/светлый)
   * Создаёт новый файл converted-mask.png
   */
  router.post('/:id/convert-mask', requireAuth, async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const { id } = req.params;
      const { threshold = 240 } = req.body; // порог яркости для определения "белого" (0-255)

      const [project] = await db.select().from(arProjects).where(eq(arProjects.id, id)).limit(1);
      if (!project) return res.status(404).json({ error: 'AR project not found' });
      if (!project.maskUrl) {
        return res.status(400).json({ error: 'No mask uploaded yet' });
      }

      const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', id);
      const maskPath = path.join(storageDir, path.basename(project.maskUrl as string));
      
      try {
        await fs.access(maskPath);
      } catch {
        return res.status(404).json({ error: 'Mask file not found on disk' });
      }

      // Конвертация: делаем белые пиксели прозрачными
      const convertedFileName = 'converted-mask.png';
      const convertedPath = path.join(storageDir, convertedFileName);

      const image = sharp(maskPath);
      const { width, height, channels } = await image.metadata();

      if (!width || !height) {
        return res.status(500).json({ error: 'Cannot read mask dimensions' });
      }

      // Получаем raw buffer
      const rawBuffer = await image
        .ensureAlpha()
        .raw()
        .toBuffer();

      // Обрабатываем пиксели: если RGB все > threshold, делаем alpha=0
      const pixelCount = width * height;
      const channelsPerPixel = 4; // RGBA

      for (let i = 0; i < pixelCount; i++) {
        const offset = i * channelsPerPixel;
        const r = rawBuffer[offset];
        const g = rawBuffer[offset + 1];
        const b = rawBuffer[offset + 2];
        
        // Если пиксель светлый (белый/серый), делаем прозрачным
        if (r >= threshold && g >= threshold && b >= threshold) {
          rawBuffer[offset + 3] = 0; // alpha = 0
        }
      }

      // Сохраняем обработанное изображение
      await sharp(rawBuffer, {
        raw: {
          width,
          height,
          channels: channelsPerPixel,
        },
      })
        .png()
        .toFile(convertedPath);

      // Обновляем БД
      const convertedMaskUrl = `/api/ar/storage/${id}/${convertedFileName}`;
      await db.update(arProjects).set({
        maskUrl: convertedMaskUrl as any,
        updatedAt: new Date() as any,
      } as any).where(eq(arProjects.id, id));

      // Регенерируем viewer с новой маской
      const viewerHtmlPath = path.join(storageDir, 'index.html');
      const markerName = 'marker';
      const existingConfig = (project.config as any) || {};
      const videoScale = project.scaleWidth && project.scaleHeight 
        ? { width: Number(project.scaleWidth), height: Number(project.scaleHeight) } 
        : existingConfig.videoScale;

      await generateARViewer({
        arId: id,
        markerBaseName: markerName,
        videoFileName: 'video.mp4',
        maskFileName: convertedFileName,
        videoPosition: existingConfig.videoPosition,
        videoRotation: existingConfig.videoRotation,
        videoScale,
        autoPlay: existingConfig.autoPlay ?? true,
        loop: existingConfig.loop ?? true,
      }, viewerHtmlPath);

      res.json({
        message: 'Mask converted successfully',
        data: {
          id,
          convertedMaskUrl,
          viewerHtmlUrl: `/api/ar/storage/${id}/index.html`,
        }
      });
    } catch (error: any) {
      console.error('[AR Router] Failed to convert mask:', error);
      res.status(500).json({ error: 'Failed to convert mask', details: error.message });
    }
  });

  /**
   * PATCH /api/ar/:id/config (admin only)
   * Обновить конфигурацию AR проекта и регенерировать viewer
   * Body: { videoPosition?, videoRotation?, videoScale?, fitMode?, autoPlay?, loop? }
   */
  router.patch('/:id/config', requireAuth, async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;
      if (process.env.NODE_ENV === 'production' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const { id } = req.params;
      const { videoPosition, videoRotation, videoScale, fitMode, autoPlay, loop } = req.body;

      const [project] = await db.select().from(arProjects).where(eq(arProjects.id, id)).limit(1);
      if (!project) return res.status(404).json({ error: 'AR project not found' });
      
      // Check if this is a multi-target project (has items)
      const items = await db.select().from(arProjectItems).where(eq(arProjectItems.projectId, id));
      if (items.length > 0) {
        return res.status(400).json({ 
          error: 'This is a multi-target project. Use /api/ar/:projectId/items/:itemId endpoint to update item configs.',
          itemsCount: items.length
        });
      }
      
      // For legacy single-photo projects, allow config update even in pending status
      if (project.status !== 'ready' && project.status !== 'pending') {
        return res.status(400).json({ error: `Cannot update config for project in ${project.status} status` });
      }

      // Merge new config with existing
      const existingConfig = (project.config as any) || {};
      const updatedConfig = {
        ...existingConfig,
        ...(videoPosition && { videoPosition }),
        ...(videoRotation && { videoRotation }),
        ...(videoScale && { videoScale }),
        ...(fitMode && { fitMode }),
        ...(autoPlay !== undefined && { autoPlay }),
        ...(loop !== undefined && { loop }),
      };

      // Update DB
      await db.update(arProjects).set({
        config: updatedConfig as any,
        isCalibrated: true as any,
        ...(videoPosition && {
          calibratedPosX: String(videoPosition.x) as any,
          calibratedPosY: String(videoPosition.y) as any,
          calibratedPosZ: String(videoPosition.z) as any,
        }),
        updatedAt: new Date() as any,
      } as any).where(eq(arProjects.id, id));

      // Regenerate viewer
      const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', id);
      const viewerHtmlPath = path.join(storageDir, 'index.html');
      const markerName = 'marker';
      
      let maskFileName: string | undefined;
      if ((project as any).maskUrl) {
        const maskPath = path.join(storageDir, path.basename((project as any).maskUrl as string));
        try {
          await fs.access(maskPath);
          maskFileName = path.basename(maskPath);
        } catch {}
      }

      const finalVideoScale = videoScale || (project.scaleWidth && project.scaleHeight ? { width: Number(project.scaleWidth), height: Number(project.scaleHeight) } : undefined);
      
      await generateARViewer({
        arId: id,
        markerBaseName: markerName,
        videoFileName: 'video.mp4',
        maskFileName,
        videoPosition: updatedConfig.videoPosition,
        videoRotation: updatedConfig.videoRotation,
        videoScale: finalVideoScale,
        autoPlay: updatedConfig.autoPlay ?? true,
        loop: updatedConfig.loop ?? true,
      }, viewerHtmlPath);

      res.json({
        message: 'AR config updated and viewer regenerated',
        data: {
          id,
          config: updatedConfig,
          viewerHtmlUrl: `/api/ar/storage/${id}/index.html`,
        }
      });
    } catch (error: any) {
      console.error('[AR Router] Failed to update AR config:', error);
      res.status(500).json({ error: 'Failed to update config', details: error.message });
    }
  });

  /**
   * DELETE /api/ar/:id
   * Удалить AR проект
   */
  router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Get project
      const [arProject] = await db
        .select()
        .from(arProjects)
        .where(eq(arProjects.id, id))
        .limit(1);

      if (!arProject) {
        return res.status(404).json({
          error: 'AR project not found',
        });
      }

      // Check permission (owner or admin)
      if (arProject.userId !== userId && userRole !== 'admin') {
        return res.status(403).json({
          error: 'Permission denied',
        });
      }

      // Delete files
      try {
        const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', id);
        await fs.rm(storageDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`[AR Router] Failed to delete storage for ${id}:`, error);
      }

      // Delete from database
      await db.delete(arProjects).where(eq(arProjects.id, id));

      res.json({
        message: 'AR project deleted',
        data: { id },
      });
    } catch (error: any) {
      console.error('[AR Router] Error deleting AR project:', error);
      res.status(500).json({
        error: 'Failed to delete AR project',
        details: error.message,
      });
    }
  });

  /**
   * POST /api/ar/:projectId/recompile
   * Перекомпилировать проект (для multi-target или legacy)
   */
  router.post('/:projectId/recompile', requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;

      // Verify project exists and user has access
      const [project] = await db.select().from(arProjects).where(eq(arProjects.id, projectId)).limit(1);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (userRole !== 'admin' && project.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Start compilation in background
      console.log(`[AR Router] Manual recompilation triggered for project ${projectId}`);
      compileARProject(projectId).catch((error) => {
        console.error(`[AR Router] Recompilation failed for ${projectId}:`, error);
      });

      res.json({
        message: 'Recompilation started',
        data: { projectId, status: 'pending' },
      });
    } catch (error: any) {
      console.error('[AR Router] Error triggering recompilation:', error);
      res.status(500).json({ error: 'Failed to trigger recompilation', details: error.message });
    }
  });

  /**
   * GET /api/ar/:projectId/items
   * Получить все items (живые фото) в проекте
   */
  router.get('/:projectId/items', requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;

      // Verify project exists and user has access
      const [project] = await db.select().from(arProjects).where(eq(arProjects.id, projectId)).limit(1);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (userRole !== 'admin' && project.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const items = await db
        .select()
        .from(arProjectItems)
        .where(eq(arProjectItems.projectId, projectId))
        .orderBy(arProjectItems.targetIndex);

      res.json({
        message: 'Project items',
        data: items,
      });
    } catch (error: any) {
      console.error('[AR Items] Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch items', details: error.message });
    }
  });

  /**
   * POST /api/ar/:projectId/items
   * Добавить новый item (живое фото) в проект
   * Limit: max 100 items per project
   */
  router.post(
    '/:projectId/items',
    requireAuth,
    upload.fields([
      { name: 'photo', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      try {
        const { projectId } = req.params;
        const userId = (req as any).user?.id;
        const userRole = (req as any).user?.role || (req as any).user?.userData?.role;
        const { name, config } = req.body;

        // Verify project exists and user has access
        const [project] = await db.select().from(arProjects).where(eq(arProjects.id, projectId)).limit(1);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        if (userRole !== 'admin' && project.userId !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Check item count limit (100 max)
        const existingItems = await db.select().from(arProjectItems).where(eq(arProjectItems.projectId, projectId));
        if (existingItems.length >= 100) {
          return res.status(400).json({ error: 'Maximum 100 items per project' });
        }

        // Validate files
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (!files.photo || !files.video) {
          return res.status(400).json({ error: 'Both photo and video are required' });
        }

        const photoFile = files.photo[0];
        const videoFile = files.video[0];

        // Move files to permanent storage under project subfolder
        const timestamp = Date.now();
        const photoExt = path.extname(photoFile.originalname);
        const videoExt = path.extname(videoFile.originalname);
        const uploadDir = path.join(process.cwd(), 'objects', 'ar-uploads', projectId);
        await fs.mkdir(uploadDir, { recursive: true });

        const photoFileName = `photo-${timestamp}-${Math.random().toString(36).substring(7)}${photoExt}`;
        const videoFileName = `video-${timestamp}-${Math.random().toString(36).substring(7)}${videoExt}`;

        const photoPath = path.join(uploadDir, photoFileName);
        const videoPath = path.join(uploadDir, videoFileName);

        await fs.rename(photoFile.path, photoPath);
        await fs.rename(videoFile.path, videoPath);

        // Determine next targetIndex
        const nextIndex = existingItems.length > 0
          ? Math.max(...existingItems.map(i => i.targetIndex ?? 0)) + 1
          : 0;

        // Parse config if provided
        let parsedConfig = null;
        if (config) {
          try {
            parsedConfig = typeof config === 'string' ? JSON.parse(config) : config;
          } catch (e) {
            console.warn('[AR Items] Failed to parse config:', e);
          }
        }

        // Insert item
        const [newItem] = await db
          .insert(arProjectItems)
          .values({
            projectId,
            targetIndex: nextIndex,
            name: name || `Живое фото ${nextIndex + 1}`,
            photoUrl: `objects/ar-uploads/${projectId}/${photoFileName}`,
            videoUrl: `objects/ar-uploads/${projectId}/${videoFileName}`,
            config: parsedConfig as any,
          } as any)
          .returning();

        // Update project status to pending for recompilation
        await db.update(arProjects).set({
          status: 'pending',
          updatedAt: new Date() as any,
        } as any).where(eq(arProjects.id, projectId));

        // Start compilation in background
        console.log(`[AR Items] Starting compilation for project ${projectId} after adding item ${newItem.id}`);
        compileARProject(projectId).catch((error) => {
          console.error(`[AR Items] Background compilation failed for ${projectId}:`, error);
        });

        res.status(201).json({
          message: 'Item added successfully, compilation started',
          data: newItem,
        });
      } catch (error: any) {
        console.error('[AR Items] Error adding item:', error);
        res.status(500).json({ error: 'Failed to add item', details: error.message });
      }
    }
  );

  /**
   * PATCH /api/ar/:projectId/items/:itemId
   * Обновить конфигурацию item (позиция, масштаб, название)
   */
  router.patch('/:projectId/items/:itemId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId, itemId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;
      const { name, config, videoPosition, videoRotation, videoScale, fitMode, autoPlay, loop } = req.body;

      // Verify project access
      const [project] = await db.select().from(arProjects).where(eq(arProjects.id, projectId)).limit(1);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (userRole !== 'admin' && project.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Verify item exists
      const [item] = await db.select().from(arProjectItems).where(
        and(eq(arProjectItems.id, itemId), eq(arProjectItems.projectId, projectId))
      ).limit(1);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Merge config
      const existingConfig = (item.config as any) || {};
      const updatedConfig = {
        ...existingConfig,
        ...(videoPosition && { videoPosition }),
        ...(videoRotation && { videoRotation }),
        ...(videoScale && { videoScale }),
        ...(fitMode && { fitMode }),
        ...(autoPlay !== undefined && { autoPlay }),
        ...(loop !== undefined && { loop }),
      };

      // Update item
      await db.update(arProjectItems).set({
        ...(name && { name }),
        config: updatedConfig as any,
        updatedAt: new Date() as any,
      } as any).where(eq(arProjectItems.id, itemId));

      res.json({
        message: 'Item updated',
        data: { id: itemId, config: updatedConfig },
      });
    } catch (error: any) {
      console.error('[AR Items] Error updating item:', error);
      res.status(500).json({ error: 'Failed to update item', details: error.message });
    }
  });

  /**
   * DELETE /api/ar/:projectId/items/:itemId
   * Удалить item из проекта
   */
  router.delete('/:projectId/items/:itemId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { projectId, itemId } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;

      // Verify project access
      const [project] = await db.select().from(arProjects).where(eq(arProjects.id, projectId)).limit(1);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (userRole !== 'admin' && project.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Verify item exists
      const [item] = await db.select().from(arProjectItems).where(
        and(eq(arProjectItems.id, itemId), eq(arProjectItems.projectId, projectId))
      ).limit(1);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Delete files
      try {
        const photoPath = path.join(process.cwd(), item.photoUrl);
        const videoPath = path.join(process.cwd(), item.videoUrl);
        await fs.unlink(photoPath).catch(() => {});
        await fs.unlink(videoPath).catch(() => {});
        if (item.maskUrl) {
          const maskPath = path.join(process.cwd(), item.maskUrl);
          await fs.unlink(maskPath).catch(() => {});
        }
      } catch (e) {
        console.warn('[AR Items] Failed to delete item files:', e);
      }

      // Delete item
      await db.delete(arProjectItems).where(eq(arProjectItems.id, itemId));

      // Mark project for recompilation
      await db.update(arProjects).set({
        status: 'pending',
        updatedAt: new Date() as any,
      } as any).where(eq(arProjects.id, projectId));

      res.json({
        message: 'Item deleted',
        data: { id: itemId },
      });
    } catch (error: any) {
      console.error('[AR Items] Error deleting item:', error);
      res.status(500).json({ error: 'Failed to delete item', details: error.message });
    }
  });

  /**
   * Static file serving for AR storage
   * This should be mounted as /api/ar-storage in main server
   */
  router.use(
    '/storage',
    (req: Request, res: Response, next) => {
      // Extract AR project ID from path
      const match = req.path.match(/^\/([a-f0-9-]+)\//);
      if (!match) {
        return res.status(404).json({ error: 'Invalid AR storage path' });
      }
      next();
    },
    (req: Request, res: Response) => {
      const filePath = path.join(process.cwd(), 'objects', 'ar-storage', req.path);
      res.sendFile(filePath);
    }
  );

  return router;
}
