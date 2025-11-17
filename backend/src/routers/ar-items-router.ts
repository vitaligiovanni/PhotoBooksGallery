import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import fsSync from 'fs';
import path from 'path';
import fs from 'fs/promises';
import { db } from '../db';
import { arProjects, arProjectItems, insertARProjectItemSchema } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { jwtAuth, mockAuth } from './middleware';

const tempUploadDir = path.join(process.cwd(), 'objects', 'temp-uploads');
try {
  fsSync.mkdirSync(tempUploadDir, { recursive: true });
} catch (e) {
  console.warn('[AR Items Router] Failed to ensure temp upload dir:', e);
}

const upload = multer({
  dest: tempUploadDir,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
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

export function createARItemsRouter(): Router {
  const router = Router();
  const requireAuth = process.env.NODE_ENV === 'production' ? jwtAuth : mockAuth;

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

        res.status(201).json({
          message: 'Item added successfully',
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

  return router;
}
