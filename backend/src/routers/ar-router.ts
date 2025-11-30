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
import { requestARCompilation, getARStatus, getARViewerUrl } from '../services/ar-service-client';
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
    const allowedMaskTypes = ['image/png', 'image/webp']; // ✅ Маски - PNG/WebP
    
    // Поддержка как photo/photos, так и video/videos, и mask
    if ((file.fieldname === 'photo' || file.fieldname === 'photos') && allowedPhotoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else if ((file.fieldname === 'video' || file.fieldname === 'videos') && allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else if (file.fieldname === 'mask' && allowedMaskTypes.includes(file.mimetype)) {
      cb(null, true); // ✅ Разрешаем маски!
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
   * DEPRECATED: Используйте /api/ar/create-demo вместо этого
   * Старый компилятор отключён, все запросы идут через AR микросервис
   */
  router.post(
    '/create-automatic',
    requireAuth,
    upload.fields([
      { name: 'photo', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      // Старый компилятор отключён - перенаправляем на новый эндпоинт
      return res.status(410).json({
        error: 'This endpoint is deprecated',
        message: 'Please use /api/ar/create-demo instead. Old AR compiler is disabled.',
        newEndpoint: '/api/ar/create-demo',
      });
      
      /* СТАРЫЙ КОД ОТКЛЮЧЁН
      // Весь старый код закомментирован - используйте AR микросервис
      */
    }
  );

  // СТАРЫЙ КОД /create-automatic ЗАКОММЕНТИРОВАН НИЖЕ
  /*
  router.post(
    '/create-automatic-OLD-DISABLED',
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
        const { orderId, config, fitMode, forceSquare } = req.body;

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

        // Apply fitMode and forceSquare if provided
        if (fitMode || forceSquare === 'true') {
          parsedConfig = parsedConfig || {};
          if (fitMode) {
            parsedConfig.fitMode = fitMode;
          }
          if (forceSquare === 'true') {
            parsedConfig.fitMode = 'cover'; // Force cover mode for square markers
            parsedConfig.forceSquare = true;
            console.log('[AR Router] Square marker mode enabled - forcing cover fitMode');
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

        // СТАРЫЙ КОД ЗАКОММЕНТИРОВАН
        // compileARProject(arProject.id).catch((error) => {
        //   console.error(`[AR Router] Background compilation failed for ${arProject.id}:`, error);
        // });
      } catch (error: any) {
        console.error('[AR Router] Error in old create-automatic endpoint:', error);
      }
    }
  );
  */ // КОНЕЦ СТАРОГО КОДА

  /**
   * GET /api/ar/status/:id
   * Получить статус AR проекта - проксирует запрос в AR microservice
   */
  // PUBLIC: статус демо-проектов должен быть доступен без токена
  router.get('/status/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.claims?.sub || (req as any).user?.userData?.id || (req as any).user?.id;
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;

      console.log(`[AR Router] 🔍 Proxying status check for project ${id} to AR microservice...`);

      // Proxy request to AR microservice
      const microserviceStatus = await getARStatus(id);

      console.log(`[AR Router] ✅ AR microservice returned status: ${microserviceStatus.status}, progress: ${microserviceStatus.progress}%`);

      // Sync Backend DB with AR microservice status (eventual consistency)
      try {
        const [existing] = await db.select().from(arProjects).where(eq(arProjects.id, id)).limit(1);
        
        if (existing) {
          // Update existing project
          await db.update(arProjects).set({
            status: microserviceStatus.status,
            photoUrl: microserviceStatus.photoUrl || existing.photoUrl || null,
            videoUrl: microserviceStatus.videoUrl || existing.videoUrl || null,
            viewUrl: microserviceStatus.viewUrl || null,
            qrCodeUrl: microserviceStatus.qrCodeUrl || null,
            markerMindUrl: microserviceStatus.markerMindUrl || null,
            viewerHtmlUrl: microserviceStatus.viewerHtmlUrl || (microserviceStatus.viewUrl ? `/objects/ar-storage/${id}/index.html` : null),
            compilationTimeMs: microserviceStatus.compilationTimeMs || null,
            errorMessage: microserviceStatus.errorMessage || null,
            updatedAt: new Date(),
          } as any).where(eq(arProjects.id, id));
          console.log('[AR Router] ✅ Synced Backend DB with microservice status');
        } else {
          console.warn('[AR Router] ⚠️ Project not in Backend DB, will be invisible in /api/ar/all');
        }
      } catch (syncError: any) {
        console.warn('[AR Router] ⚠️ Failed to sync Backend DB:', syncError.message);
      }

      // Return microservice response directly
      res.json({
        message: 'AR project status',
        data: {
          id: microserviceStatus.projectId,
          status: microserviceStatus.status,
          progress: microserviceStatus.progress,
          photoUrl: microserviceStatus.photoUrl,
          videoUrl: microserviceStatus.videoUrl,
          viewUrl: microserviceStatus.viewUrl,
          qrCodeUrl: microserviceStatus.qrCodeUrl,
          markerMindUrl: microserviceStatus.markerMindUrl,
          viewerHtmlUrl: microserviceStatus.viewerHtmlUrl,
          compilationTimeMs: microserviceStatus.compilationTimeMs,
          errorMessage: microserviceStatus.errorMessage,
          isDemo: microserviceStatus.isDemo,
          expiresAt: microserviceStatus.expiresAt,
          createdAt: microserviceStatus.createdAt,
          updatedAt: microserviceStatus.updatedAt,
        },
      });
    } catch (error: any) {
      console.error('[AR Router] ❌ Error proxying status check:', error);
      
      // Check if it's a 404 from microservice
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        return res.status(404).json({
          error: 'AR project not found',
          details: error.message,
        });
      }
      
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
        isDemo: p.isDemo || false,
        expiresAt: p.expiresAt || null,
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
      
      // Check for video file (multi-target: video-0.mp4, legacy: video.mp4)
      let videoFileName = 'video.mp4';
      const video0Path = path.join(storageDir, 'video-0.mp4');
      const videoPath = path.join(storageDir, 'video.mp4');
      
      try {
        await fs.access(video0Path);
        videoFileName = 'video-0.mp4';
      } catch {
        try {
          await fs.access(videoPath);
        } catch {
          return res.status(409).json({ error: 'Video not prepared yet. Compile project first.' });
        }
      }

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
      
      // CRITICAL: Use photo aspect ratio for scale (NOT old scaleWidth/scaleHeight from DB!)
      const photoAR = Number(project.photoAspectRatio) || 
        (project.photoWidth && project.photoHeight ? project.photoWidth / project.photoHeight : 1.0);
      const videoScale = { width: 1.0, height: 1.0 / photoAR };
      
      console.log(`[AR Mask Upload] Using photo AR=${photoAR.toFixed(3)}, scale=${videoScale.width}×${videoScale.height.toFixed(3)}`);
      
      await generateARViewer({
        arId: id,
        markerBaseName: markerName,
        videoFileName, // Use detected filename (video.mp4 or video-0.mp4)
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
   * DELETE /api/ar/:id/mask (admin only)
   * Удалить пользовательскую маску и регенерировать viewer без маски
   */
  router.delete('/:id/mask', requireAuth, async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;
      if (process.env.NODE_ENV === 'production' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const { id } = req.params;

      const [project] = await db.select().from(arProjects).where(eq(arProjects.id, id)).limit(1);
      if (!project) return res.status(404).json({ error: 'AR project not found' });

      const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', id);
      const viewerHtmlPath = path.join(storageDir, 'index.html');
      
      // Find and delete existing mask files
      const possibleMasks = ['mask.png', 'mask.webp', 'mask.gif', 'mask-0.png', 'mask-0.webp'];
      for (const maskFile of possibleMasks) {
        const maskPath = path.join(storageDir, maskFile);
        try {
          await fs.unlink(maskPath);
          console.log(`[AR Mask Delete] Removed ${maskFile}`);
        } catch {
          // File doesn't exist, skip
        }
      }

      // Update DB - remove mask reference
      await db.update(arProjects).set({
        maskUrl: null as any,
        maskWidth: null as any,
        maskHeight: null as any,
        updatedAt: new Date() as any,
      } as any).where(eq(arProjects.id, id));

      // Regenerate viewer HTML without mask
      const markerName = 'marker';
      let videoFileName = 'video.mp4';
      const video0Path = path.join(storageDir, 'video-0.mp4');
      try {
        await fs.access(video0Path);
        videoFileName = 'video-0.mp4';
      } catch {}

      const photoAR = Number(project.photoAspectRatio) || 
        (project.photoWidth && project.photoHeight ? project.photoWidth / project.photoHeight : 1.0);
      const videoScale = { width: 1.0, height: 1.0 / photoAR };
      
      await generateARViewer({
        arId: id,
        markerBaseName: markerName,
        videoFileName,
        maskFileName: undefined, // NO MASK
        videoPosition: (project.config as any)?.videoPosition,
        videoRotation: (project.config as any)?.videoRotation,
        videoScale,
        autoPlay: (project.config as any)?.autoPlay ?? true,
        loop: (project.config as any)?.loop ?? true,
      }, viewerHtmlPath);

      res.json({
        message: 'Mask removed and viewer regenerated',
        data: {
          id,
          viewerHtmlUrl: `/api/ar/storage/${id}/index.html`,
        }
      });
    } catch (error: any) {
      console.error('[AR Router] Failed to delete mask:', error);
      res.status(500).json({ error: 'Failed to delete mask', details: error.message });
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
      
      // CRITICAL: Use photo aspect ratio for scale (NOT old scaleWidth/scaleHeight!)
      const photoAR = Number(project.photoAspectRatio) || 
        (project.photoWidth && project.photoHeight ? project.photoWidth / project.photoHeight : 1.0);
      const videoScale = { width: 1.0, height: 1.0 / photoAR };
      
      console.log(`[AR Convert Mask] Using photo AR=${photoAR.toFixed(3)}, scale=${videoScale.width}×${videoScale.height.toFixed(3)}`);

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
   * Body: { videoPosition?, videoRotation?, videoScale?, cropRegion?, fitMode?, autoPlay?, loop? }
   */
  router.patch('/:id/config', requireAuth, async (req: Request, res: Response) => {
    try {
      const userRole = (req as any).user?.role || (req as any).user?.userData?.role;
      if (process.env.NODE_ENV === 'production' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const { id } = req.params;
      const { videoPosition, videoRotation, videoScale, cropRegion, fitMode, autoPlay, loop, zoom, offsetX, offsetY, aspectLocked, shapeType } = req.body;

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
        ...(cropRegion && { cropRegion }),
        ...(fitMode && { fitMode }),
        ...(autoPlay !== undefined && { autoPlay }),
        ...(loop !== undefined && { loop }),
        ...(zoom !== undefined && { zoom }), // Ручной зум (0.5-2.0)
        ...(offsetX !== undefined && { offsetX }), // Смещение по X (−0.5 до +0.5)
        ...(offsetY !== undefined && { offsetY }), // Смещение по Y (−0.5 до +0.5)
        ...(aspectLocked !== undefined && { aspectLocked }), // Блокировка пропорций
        ...(shapeType && { shapeType }), // Mask shape: circle, oval, square, rect, custom
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

      let maskFileName: string | undefined;
      
      console.log(`[AR Config] DEBUG: shapeType="${shapeType}", will generate mask: ${!!(shapeType && shapeType !== 'custom')}`);
      
      // If shapeType is provided, generate mask locally (no full recompilation needed)
      if (shapeType && shapeType !== 'custom') {
        console.log(`[AR Config] 🎭 Generating ${shapeType} mask locally...`);
        
        const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', id);
        const maskDestPath = path.join(storageDir, 'mask-0.png');
        
        try {
          // Load template from ar-mask-templates
          const templatePath = path.join(process.cwd(), 'objects', 'ar-mask-templates', `${shapeType}.png`);
          
          // Check if template exists
          try {
            await fs.access(templatePath);
          } catch {
            console.error(`[AR Config] ❌ Mask template not found: ${templatePath}`);
            return res.status(500).json({ 
              error: `Mask template "${shapeType}.png" not found in ar-mask-templates/` 
            });
          }
          
          // Get photo dimensions for mask sizing
          const photoWidth = Number(project.photoWidth) || 1024;
          const photoHeight = Number(project.photoHeight) || 1024;
          
          console.log(`[AR Config] Generating mask at ${photoWidth}×${photoHeight}px (matches photo)`);
          
          // Resize template with 'contain' to preserve shape (circle stays circle!)
          await sharp(templatePath)
            .resize(photoWidth, photoHeight, { 
              fit: 'contain', // ✅ Preserves circle/oval shape!
              background: { r: 0, g: 0, b: 0, alpha: 0 } 
            })
            .png()
            .toFile(maskDestPath);
          
          console.log(`[AR Config] ✅ Mask generated with corrected alpha: ${maskDestPath}`);
          
          // Update DB with mask URL
          await db.update(arProjects).set({
            maskUrl: `/objects/ar-storage/${id}/mask-0.png` as any,
            updatedAt: new Date() as any,
          } as any).where(eq(arProjects.id, id));
          
          maskFileName = 'mask-0.png';
          console.log(`[AR Config] DEBUG: maskFileName set to "${maskFileName}"`);
        } catch (maskError: any) {
          console.error('[AR Config] ❌ Failed to generate mask:', maskError);
          return res.status(500).json({ 
            error: 'Failed to generate mask', 
            details: maskError.message 
          });
        }
      }

      const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', id);
      
      // Determine correct video filename (multi-target uses video-0.mp4, legacy uses video.mp4)
      let videoFileName = 'video.mp4';
      const video0Path = path.join(storageDir, 'video-0.mp4');
      const videoPath = path.join(storageDir, 'video.mp4');
      
      try {
        await fs.access(video0Path);
        videoFileName = 'video-0.mp4'; // Multi-target project
        console.log('[AR Config] Multi-target project detected, using video-0.mp4');
      } catch {
        try {
          await fs.access(videoPath);
          console.log('[AR Config] Legacy project detected, using video.mp4');
        } catch {
          console.error('[AR Config] ❌ No video file found in storage!');
          return res.status(500).json({ error: 'Video file not found in storage' });
        }
      }
      
      // If cropRegion is provided, crop the video
      if (cropRegion && cropRegion.x !== undefined && cropRegion.y !== undefined && 
          cropRegion.width && cropRegion.height) {
        console.log(`[AR Config] Cropping video with region:`, cropRegion);
        const originalVideoPath = path.join(storageDir, videoFileName);
        const croppedVideoName = videoFileName.replace('.mp4', '-cropped.mp4');
        const croppedVideoPath = path.join(storageDir, croppedVideoName);
        
        try {
          const { cropVideoByRegion } = await import('../services/media-metadata');
          await cropVideoByRegion(originalVideoPath, croppedVideoPath, cropRegion);
          videoFileName = croppedVideoName;
          console.log(`[AR Config] Video cropped successfully: ${croppedVideoPath}`);
        } catch (cropError: any) {
          console.error('[AR Config] Failed to crop video:', cropError);
          // Continue with original video if crop fails
          videoFileName = 'video.mp4';
        }
      }

      // Regenerate viewer with cropped video and mask (if generated above)
      const viewerHtmlPath = path.join(storageDir, 'index.html');
      const markerName = 'marker';
      
      // If mask wasn't generated above, check if one already exists
      if (!maskFileName && (project as any).maskUrl) {
        const maskPath = path.join(storageDir, path.basename((project as any).maskUrl as string));
        try {
          await fs.access(maskPath);
          maskFileName = path.basename(maskPath);
        } catch {
          console.warn('[AR Config] Mask URL in DB but file not found:', maskPath);
        }
      }

      // Plane scale: use cropRegion proportions if available, otherwise photo dimensions
      let planeScale;
      
      if (cropRegion && cropRegion.width && cropRegion.height) {
        // КРИТИЧНО: cropRegion.width/height — это ДОЛИ от оригинального видео (0-1), а НЕ пропорции!
        // Нужно получить реальные размеры видео, чтобы рассчитать правильный aspect ratio обрезанного фрагмента
        const originalVideoPath = path.join(storageDir, videoFileName.includes('-cropped') ? videoFileName.replace('-cropped', '') : videoFileName);
        
        try {
          const { extractVideoMetadata } = await import('../services/media-metadata');
          const videoMeta = await extractVideoMetadata(originalVideoPath);
          
          // Рассчитываем реальные размеры обрезанного фрагмента в пикселях
          const croppedWidthPx = cropRegion.width * videoMeta.width;
          const croppedHeightPx = cropRegion.height * videoMeta.height;
          
          // Реальный aspect ratio обрезанного видео
          const cropAspectRatio = croppedWidthPx / croppedHeightPx;
          
          planeScale = { 
            width: 1.0, 
            height: 1.0 / cropAspectRatio 
          };
          console.log(`[AR Config] Crop region: ${cropRegion.width.toFixed(2)}×${cropRegion.height.toFixed(2)} of ${videoMeta.width}×${videoMeta.height}px video`);
          console.log(`[AR Config] Real cropped dimensions: ${Math.round(croppedWidthPx)}×${Math.round(croppedHeightPx)}px, AR = ${cropAspectRatio.toFixed(3)}`);
          console.log(`[AR Config] Plane scale: ${planeScale.width} × ${planeScale.height.toFixed(3)}`);
        } catch (metaError: any) {
          console.warn('[AR Config] Failed to extract video metadata for crop calculation, using fallback:', metaError.message);
          // Fallback: используем cropRegion как пропорции (неправильно, но лучше чем ничего)
          const cropAspectRatio = cropRegion.width / cropRegion.height;
          planeScale = { 
            width: 1.0, 
            height: 1.0 / cropAspectRatio 
          };
        }
      } else {
        // Use photo aspect ratio for plane scale
        // Video has been resized to match photo dimensions in AR compiler
        // So plane should match photo AR, not force 1:1
        const photoAR = Number(project.photoAspectRatio) || (project.photoWidth && project.photoHeight ? project.photoWidth / project.photoHeight : 1.0);
        
        planeScale = { 
          width: 1.0, 
          height: 1.0 / photoAR 
        };
        console.log(`[AR Config] Using photo AR=${photoAR.toFixed(3)}, plane=${planeScale.width}×${planeScale.height.toFixed(3)}`);
      }
      
      // Generate viewer HTML with correct video filename (video.mp4 or video-0.mp4)
      console.log(`[AR Config] Generating viewer with video: ${videoFileName}, mask: ${maskFileName || 'none'}`);
      
      await generateARViewer({
        arId: id,
        markerBaseName: markerName,
        videoFileName,
        maskFileName,
        videoPosition: updatedConfig.videoPosition,
        videoRotation: updatedConfig.videoRotation,
        videoScale: planeScale,
        autoPlay: updatedConfig.autoPlay ?? true,
        loop: updatedConfig.loop ?? true,
      }, viewerHtmlPath);

      res.json({
        message: 'AR config updated and viewer regenerated',
        data: {
          id,
          config: updatedConfig,
          videoFileName,
          planeScale,
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
   * Cache-busting headers added to force mobile reload on config changes
   */
  router.use(
    '/storage',
    (req: Request, res: Response, next) => {
      // Extract AR project ID from path
      const match = req.path.match(/^\/([a-f0-9-]+)\//);
      if (!match) {
        return res.status(404).json({ error: 'Invalid AR storage path' });
      }
      
      // Force no-cache for HTML viewers to ensure mobile gets latest config
      if (req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      
      next();
    },
    (req: Request, res: Response) => {
      const filePath = path.join(process.cwd(), 'objects', 'ar-storage', req.path);
      res.sendFile(filePath);
    }
  );

  /**
   * GET /ar/view/:id
   * Редирект на AR viewer HTML (для QR кодов и ngrok ссылок)
   */
  router.get('/view/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    // FIXED: /objects/ar-storage/ (NOT /api/ar/storage/)
    res.redirect(`/objects/ar-storage/${id}/index.html`);
  });

  // ============================================================
  // NEW: Product Integration Endpoints (Nov 22, 2025)
  // ============================================================

  /**
   * POST /api/ar/create-with-product
   * Create AR project linked to a product (for cart integration)
   * Body: { productId: string } + multipart files (photo, video)
   */
  router.post(
    '/create-with-product',
    requireAuth,
    upload.fields([
      { name: 'photo', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const userId = (req as any).user?.claims?.sub || (req as any).user?.userData?.id || (req as any).user?.id || 'local-admin';
        const { productId, arPrice } = req.body;

        // Validate files
        if (!files.photo || !files.video) {
          return res.status(400).json({ error: 'Both photo and video are required' });
        }

        // Validate product exists
        if (productId) {
          const { products } = await import('@shared/schema');
          const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
          if (!product) {
            return res.status(404).json({ error: 'Product not found' });
          }
        }

        const photoFile = files.photo[0];
        const videoFile = files.video[0];

        // Move files to AR storage (same as create-automatic)
        const arId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', arId);
        await fs.mkdir(storageDir, { recursive: true });

        const photoPath = path.join(storageDir, 'photo.jpg');
        const videoPath = path.join(storageDir, 'video.mp4');

        await fs.copyFile(photoFile.path, photoPath);
        await fs.copyFile(videoFile.path, videoPath);
        await fs.unlink(photoFile.path).catch(() => {});
        await fs.unlink(videoFile.path).catch(() => {});

        // IMPORTANT: Store raw internal file paths (without leading /api) so compiler can access them
        // Compiler uses path.join(process.cwd(), project.photoUrl)
        const [arProject] = await db.insert(arProjects).values({
          id: arId,
          userId,
          productId: productId || null, // Link to product
          arPrice: arPrice || '500.00', // Default AR price (AMD)
          photoUrl: `objects/ar-storage/${arId}/photo.jpg`,
          videoUrl: `objects/ar-storage/${arId}/video.mp4`,
          status: 'pending',
        }).returning();

        // Trigger compilation in background (async)
        compileARProject(arId).catch((e) => {
          console.error(`[AR Router] Background compilation failed for ${arId}:`, e);
        });

        res.status(201).json({
          message: 'AR project created with product link',
          data: {
            arId: arProject.id,
            productId: arProject.productId,
            arPrice: arProject.arPrice,
            status: arProject.status,
          },
        });
      } catch (error: any) {
        console.error('[AR Router] create-with-product error:', error);
        res.status(500).json({ error: error.message || 'Failed to create AR with product' });
      }
    }
  );

  /**
   * GET /api/ar/pricing
   * Get AR pricing info (for cart calculations)
   * Query: ?productId=xxx (optional)
   */
  router.get('/pricing', async (req: Request, res: Response) => {
    try {
      const { productId } = req.query;
      
      // Default AR pricing
      const defaultPrice = 500; // 500 AMD
      
      // If productId provided, check if there's custom pricing
      let customPrice = null;
      if (productId && typeof productId === 'string') {
        const [project] = await db
          .select()
          .from(arProjects)
          .where(eq(arProjects.productId, productId))
          .orderBy(desc(arProjects.createdAt))
          .limit(1);
        
        if (project?.arPrice) {
          customPrice = parseFloat(project.arPrice as string);
        }
      }

      res.json({
        data: {
          defaultPrice,
          customPrice,
          finalPrice: customPrice || defaultPrice,
          currency: 'AMD',
          // Multi-language display
          display: {
            hy: `${customPrice || defaultPrice} ֏`,
            ru: `${Math.round((customPrice || defaultPrice) / 4)} ₽`,
            en: `$${((customPrice || defaultPrice) / 400).toFixed(2)}`,
          },
        },
      });
    } catch (error: any) {
      console.error('[AR Router] pricing error:', error);
      res.status(500).json({ error: error.message || 'Failed to get AR pricing' });
    }
  });

  /**
   * PATCH /api/ar/:id/attach-to-order
   * Mark AR project as attached to order (for tracking)
   * Body: { orderId: string }
   */
  router.patch('/:id/attach-to-order', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: 'orderId is required' });
      }

      // Update AR project
      const [updated] = await db
        .update(arProjects)
        .set({
          orderId,
          attachedToOrder: true,
          updatedAt: new Date(),
        })
        .where(eq(arProjects.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'AR project not found' });
      }

      res.json({
        message: 'AR project attached to order',
        data: {
          arId: updated.id,
          orderId: updated.orderId,
          attachedToOrder: updated.attachedToOrder,
        },
      });
    } catch (error: any) {
      console.error('[AR Router] attach-to-order error:', error);
      res.status(500).json({ error: error.message || 'Failed to attach AR to order' });
    }
  });

  /**
   * GET /api/ar/by-product/:productId
   * Get all AR projects for a specific product
   */
  router.get('/by-product/:productId', requireAuth, async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const userId = (req as any).user?.claims?.sub || (req as any).user?.userData?.id || (req as any).user?.id;

      const projects = await db
        .select()
        .from(arProjects)
        .where(
          and(
            eq(arProjects.productId, productId),
            eq(arProjects.userId, userId)
          )
        )
        .orderBy(desc(arProjects.createdAt));

      res.json({
        data: projects,
        count: projects.length,
      });
    } catch (error: any) {
      console.error('[AR Router] by-product error:', error);
      res.status(500).json({ error: error.message || 'Failed to get AR projects for product' });
    }
  });

  /**
   * POST /api/ar/create-demo
   * Create temporary demo AR project (24h expiration)
   * Supports multiple photos for multi-target AR
   * Each photo can have its own video
   * No product linkage, no pricing — just demo
   * PUBLIC ENDPOINT - No authentication required for demo
   */
  router.post(
    '/create-demo',
    upload.fields([
      { name: 'photos', maxCount: 10 }, // До 10 фотографий
      { name: 'videos', maxCount: 10 }, // До 10 видео (по одному на фото)
    ]),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const userId = (req as any).user?.claims?.sub || (req as any).user?.userData?.id || (req as any).user?.id || 'demo-guest';

        // Validate files
        if (!files.photos || files.photos.length === 0) {
          return res.status(400).json({ error: 'At least one photo is required' });
        }
        
        if (!files.videos || files.videos.length === 0) {
          return res.status(400).json({ error: 'At least one video is required' });
        }

        // Проверка соответствия количества фото и видео
        if (files.photos.length !== files.videos.length) {
          return res.status(400).json({ 
            error: `Mismatch: ${files.photos.length} photos but ${files.videos.length} videos. Each photo needs its own video.` 
          });
        }

        const photoFiles = files.photos;
        const videoFiles = files.videos;

        // Move files to shared uploads directory (AR microservice will access them)
        const arId = `demo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const uploadsDir = path.join(process.cwd(), 'objects', 'uploads');
        await fs.mkdir(uploadsDir, { recursive: true });

        // Process multiple photos and videos
        const photoUrls: string[] = [];
        const videoUrls: string[] = [];
        
        for (let i = 0; i < photoFiles.length; i++) {
          // Copy photo
          const photoFile = photoFiles[i];
          const photoFilename = `${arId}-photo-${i}.jpg`;
          const photoPath = path.join(uploadsDir, photoFilename);
          
          await fs.copyFile(photoFile.path, photoPath);
          await fs.unlink(photoFile.path).catch(() => {});
          photoUrls.push(`/objects/uploads/${photoFilename}`);

          // Copy corresponding video
          const videoFile = videoFiles[i];
          const videoFilename = `${arId}-video-${i}.mp4`;
          const videoPath = path.join(uploadsDir, videoFilename);
          
          await fs.copyFile(videoFile.path, videoPath);
          await fs.unlink(videoFile.path).catch(() => {});
          videoUrls.push(`/objects/uploads/${videoFilename}`);
        }

        console.log('[AR Router] ✅ Files copied to shared uploads:', { 
          photos: photoUrls.length,
          videos: videoUrls.length 
        });

        // Calculate expiration (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Send compilation request to AR microservice with multiple photos and videos
        console.log(`[AR Router] 📤 Sending ${photoUrls.length} photo(s) + ${videoUrls.length} video(s) to AR microservice...`);
        
        const compileResult = await requestARCompilation({
          userId,
          photoUrls: photoUrls, // Массив фотографий
          videoUrls: videoUrls, // Массив видео (по одному на фото)
          isDemo: true,
        });

        // FIXED: ar-service returns ONE projectId for multi-target (multiple markers in ONE project)
        const projectId = compileResult.projectId;
        const markersCount = compileResult.markersCount || photoUrls.length;
        console.log(`[AR Router] ✅ AR microservice created multi-target project: ${projectId} (${markersCount} markers)`);

        // IMPORTANT: Save ONE project record with markersCount
        try {
          await db.insert(arProjects).values({
            id: projectId,
            userId,
            photoUrl: photoUrls[0], // First photo as representative
            videoUrl: videoUrls[0], // First video as representative
            status: 'pending',
            isDemo: true,
            expiresAt: expiresAt,
            config: { markersCount }, // Store markers count in config
          } as any);
          
          console.log(`[AR Router] ✅ Multi-target project saved to Backend DB: ${projectId} (${markersCount} markers)`);
        } catch (dbError: any) {
          console.warn('[AR Router] ⚠️ Failed to save project to Backend DB:', dbError.message);
          // Non-critical: AR service will still compile, but won't appear in /api/ar/all list
        }

        res.status(201).json({
          message: `Multi-target AR project with ${markersCount} markers created (expires in 24 hours)`,
          data: {
            arId: projectId, // Single project ID
            projectId, // Same as arId
            status: compileResult.status,
            markersCount,
            expiresAt: expiresAt,
            isDemo: true,
            estimatedTimeSeconds: compileResult.estimatedTimeSeconds,
            statusUrl: `/api/ar/status/${projectId}`,
            viewUrl: compileResult.viewUrl,
          },
        });
      } catch (error: any) {
        console.error('[AR Router] create-demo error:', error);
        res.status(500).json({ error: error.message || 'Failed to create demo AR' });
      }
    }
  );

  /**
   * PATCH /api/ar/:id/extend-demo
   * Extend demo project expiration (admin only)
   */
  router.patch('/:id/extend-demo', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { hours = 24 } = req.body;

      // Check if project exists and is demo
      const [project] = await db.select().from(arProjects).where(eq(arProjects.id, id)).limit(1);
      
      if (!project) {
        return res.status(404).json({ error: 'AR project not found' });
      }

      if (!project.isDemo) {
        return res.status(400).json({ error: 'Cannot extend non-demo project' });
      }

      // Calculate new expiration
      const currentExpires = project.expiresAt ? new Date(project.expiresAt) : new Date();
      const newExpires = new Date(currentExpires);
      newExpires.setHours(newExpires.getHours() + hours);

      // Update expiration
      const [updated] = await db
        .update(arProjects)
        .set({ 
          expiresAt: newExpires,
          updatedAt: new Date(),
        } as any)
        .where(eq(arProjects.id, id))
        .returning();

      res.json({
        message: `Demo extended by ${hours} hours`,
        data: {
          arId: updated.id,
          expiresAt: updated.expiresAt,
          isDemo: updated.isDemo,
        },
      });
    } catch (error: any) {
      console.error('[AR Router] extend-demo error:', error);
      res.status(500).json({ error: error.message || 'Failed to extend demo' });
    }
  });

  return router;
}
