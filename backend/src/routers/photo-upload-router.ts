import { Router } from 'express';
import express from 'express';
import { z } from 'zod';
import { eq, and, lt, sql, inArray } from 'drizzle-orm';
import multer from 'multer';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
// Compiled path is dist/backend/src/routers -> dist/shared
import { uploads } from '../../../shared/schema';
import type { Upload, UploadFile, InsertUpload } from '../../../shared/schema';
import { createStorageProvider, generateUploadKey, getContentType, validateImageFile, LocalStorageProvider } from '../utils/storageProvider';
import { markScheduledForDeletion, deleteDueUploads } from '../cron/uploadsCleanup';
// Use the local middleware under routers/
import { mockAuth, requireAdmin } from './middleware';

const router = Router();
const storageProvider = createStorageProvider();

// Validation schemas
const createSessionSchema = z.object({
  phone: z.string().min(5, 'Phone number must be at least 5 digits').max(12, 'Phone number must be at most 12 digits'),
  format: z.enum(['square', 'album', 'book']),
  size: z.string().min(1, 'Size is required'),
  pages: z.number().min(20).max(200).default(24),
  comment: z.string().optional(),
  estimatedFiles: z.number().min(1).max(100).default(20),
});

const completeSessionSchema = z.object({
  uploadId: z.string().uuid('Invalid upload ID'),
  files: z.array(z.object({
    key: z.string(),
    filename: z.string(),
    size: z.number(),
    mimeType: z.string(),
  })),
});

const bulkIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

// Helper function to calculate price
function calculatePrice(format: string, size: string, pages: number): number {
  const basePrices: Record<string, Record<string, number>> = {
    square: {
      '20x20': 15000,
      '25x25': 18000,
      '30x30': 22000,
    },
    album: {
      '20x15': 12000,
      '30x20': 16000,
      '35x25': 20000,
      '40x30': 25000,
    },
    book: {
      '15x20': 12000,
      '20x30': 16000,
      '35x25': 20000,
      '30x40': 25000,
    },
  };

  const basePrice = basePrices[format]?.[size] || 15000;
  const additionalPages = Math.max(0, pages - 24);
  const additionalCost = additionalPages * 500; // 500 per additional page

  return basePrice + additionalCost;
}

const DEFAULT_RETENTION_DAYS = parseInt(process.env.UPLOAD_RETENTION_DAYS || '30', 10);

// Helper function to send Telegram notification
async function sendTelegramNotification(upload: Upload): Promise<void> {
  const botToken = process.env.ADMIN_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('Telegram notification skipped - missing configuration');
    return;
  }

  try {
    const message = `📸 Новая загрузка фотографий!
    
📱 Телефон: ${upload.phone}
📏 Формат: ${upload.format} ${upload.size}
📄 Страниц: ${upload.pages}
💰 Цена: ${upload.price} ֏
📁 Файлов: ${upload.fileCount}
💾 Размер: ${(((upload.totalFileSize || 0) as number) / 1024 / 1024).toFixed(1)} MB

💬 Комментарий: ${upload.comment || 'Нет'}

🔗 ID сессии: ${upload.id}`;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    console.log(`Telegram notification sent for upload ${upload.id}`);
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

// POST /api/upload/session - Create new upload session
router.post('/session', async (req, res) => {
  try {
    console.log('[/session] Starting session creation');
    console.log('[/session] req.body type:', typeof req.body);
    console.log('[/session] req.body:', JSON.stringify(req.body, null, 2));
    
    const validatedData = createSessionSchema.parse(req.body);
    const { phone, format, size, pages, comment, estimatedFiles } = validatedData;
    console.log('[/session] Validation passed:', validatedData);

    // Calculate price
    const price = calculatePrice(format, size, pages);
    console.log('[/session] Price calculated:', price);

    // Create upload session
    const uploadId = uuidv4();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    console.log('[/session] Generated uploadId:', uploadId);

    console.log('[/session] Inserting into database...');
    const [upload] = await db.insert(uploads).values({
      id: uploadId,
      phone,
      format,
      size,
      pages,
      price: price.toString(),
      comment,
      status: 'pending',
      expiresAt,
    } as any).returning();
    console.log('[/session] Database insert successful, upload:', upload);

    // Generate presigned URLs for estimated number of files
    const urls = [];
    const ttlSec = 48 * 60 * 60; // 48 hours
    console.log('[/session] Generating', estimatedFiles, 'presigned URLs...');

    for (let i = 0; i < estimatedFiles; i++) {
      const filename = `photo-${i + 1}.jpg`;
      const key = generateUploadKey(uploadId, filename);
      const contentType = 'image/jpeg';
      
      try {
        console.log('[/session] Generating presigned URL for key:', key);
        const presignedUrl = await storageProvider.createPresignedPut(key, contentType, ttlSec);
        console.log('[/session] Generated URL:', presignedUrl);
        urls.push({
          key,
          url: presignedUrl,
          expiresAt: new Date(Date.now() + ttlSec * 1000),
        });
      } catch (error) {
        console.error(`[/session] Failed to generate presigned URL for ${key}:`, error);
        throw error; // Re-throw to catch in outer try-catch
      }
    }

    console.log('[/session] All URLs generated, count:', urls.length);
    res.json({
      uploadId,
      session: upload,
      urls,
      maxFileSize: 15 * 1024 * 1024, // 15MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff'],
      maxFiles: 100,
    });
    console.log('[/session] Response sent successfully');

  } catch (error) {
    console.error('[/session] Error creating upload session:', error);
    console.error('[/session] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to create upload session' });
  }
});

// POST /api/upload/complete - Complete upload session
router.post('/complete', async (req, res) => {
  try {
    const { uploadId, files } = completeSessionSchema.parse(req.body);

    // Find upload session
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, uploadId));
    
    if (!upload) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    if (upload.status !== 'pending') {
      return res.status(400).json({ error: 'Upload session is not in pending state' });
    }

    if (upload.expiresAt && new Date() > upload.expiresAt) {
      return res.status(410).json({ error: 'Upload session has expired' });
    }

    // Validate files
    const validatedFiles: UploadFile[] = [];
    let totalSize = 0;

    for (const file of files) {
      const validation = validateImageFile(file.filename, file.size);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: `File validation failed: ${file.filename} - ${validation.error}` 
        });
      }

      // Optionally verify file exists in storage
      try {
        const exists = await storageProvider.objectExists(file.key);
        if (!exists) {
          return res.status(400).json({ 
            error: `File not found in storage: ${file.filename}` 
          });
        }
      } catch (error) {
        console.warn(`Could not verify file existence: ${file.key}`, error);
      }

      validatedFiles.push({
        key: file.key,
        filename: file.filename,
        size: file.size,
        mimeType: file.mimeType,
        uploadedAt: new Date().toISOString(),
      });

      totalSize += file.size;
    }

    // Update upload session
    const deleteAt = new Date(Date.now() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const [updatedUpload] = await db.update(uploads)
      .set({
        files: validatedFiles,
        status: 'uploaded',
        completedAt: new Date(),
        fileCount: validatedFiles.length,
        totalFileSize: totalSize,
        deleteAfterDays: DEFAULT_RETENTION_DAYS,
        deleteAt,
      } as any)
      .where(eq(uploads.id, uploadId))
      .returning();

    // Send notification to admin
    try {
      await sendTelegramNotification(updatedUpload);
      await db.update(uploads)
        .set({ telegramSent: true } as any)
        .where(eq(uploads.id, uploadId));
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    res.json({
      success: true,
      upload: updatedUpload,
      message: 'Files uploaded successfully! Our manager will contact you soon.',
    });

  } catch (error) {
    console.error('Error completing upload session:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to complete upload session' });
  }
});

// Local file upload endpoint (for development)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// Important: key contains slashes (e.g. uploads/tmp/<uuid>/file.jpg). Use wildcard to capture full path.
router.put('/local/*', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  const wildcard = (req.params as any)[0] as string | undefined;
  console.log('[PUT /local/*] Received request');
  console.log('[PUT /local/*] Wildcard param (req.params[0]):', wildcard);
  console.log('[PUT /local/*] Original URL:', req.originalUrl);
  console.log('[PUT /local/*] Content-Type:', req.headers['content-type']);
  console.log('[PUT /local/*] Body type:', typeof req.body);
  console.log('[PUT /local/*] Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('[PUT /local/*] Body length:', req.body ? req.body.length : 0);
  
  try {
    if (!(storageProvider instanceof LocalStorageProvider)) {
      console.log('[PUT /local/*] StorageProvider is not LocalStorageProvider');
      return res.status(404).json({ error: 'Local upload not available' });
    }
    // Express decodes %2F into '/', so use wildcard and treat it as full path
    const key = wildcard || '';
    const fileBuffer = req.body as Buffer;

    if (!fileBuffer || fileBuffer.length === 0) {
      console.log('[PUT /local/*] No file data in request');
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('[PUT /local/*] File size:', fileBuffer.length);

    // Validate file size
    if (fileBuffer.length > 15 * 1024 * 1024) {
      console.log('[PUT /local/*] File too large');
      return res.status(400).json({ error: 'File size exceeds 15MB limit' });
    }

    // Save file
    const decodedKey = decodeURIComponent(key);
    console.log('[PUT /local/*] Saving file to:', decodedKey);
    await storageProvider.saveFile(decodedKey, fileBuffer);
    console.log('[PUT /local/*] File saved successfully');

    res.json({ success: true });

  } catch (error) {
    console.error('[PUT /local/*] Error uploading file locally:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET /api/admin/uploads - List upload sessions (admin only)
router.get('/admin/uploads', mockAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    let allUploads = await db.select().from(uploads).orderBy(uploads.createdAt);
    if (status && ['pending', 'uploaded', 'processing', 'completed', 'deleted', 'scheduled_for_deletion'].includes(status)) {
      allUploads = await db.select().from(uploads).where(eq(uploads.status, status as any)).orderBy(uploads.createdAt);
    }
    
    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUploads = allUploads.slice(startIndex, endIndex);

    res.json({
      uploads: paginatedUploads,
      pagination: {
        page,
        limit,
        total: allUploads.length,
        pages: Math.ceil(allUploads.length / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

// GET /api/admin/uploads/:id - Get upload details (admin only)
router.get('/admin/uploads/:id', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json(upload);

  } catch (error) {
    console.error('Error fetching upload:', error);
    res.status(500).json({ error: 'Failed to fetch upload' });
  }
});

// POST /api/admin/uploads/:id/zip - Generate and download ZIP (admin only)
router.post('/admin/uploads/:id/zip', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[ZIP] Starting ZIP generation for upload:', id);

    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));

    if (!upload) {
      console.error('[ZIP] Upload not found:', id);
      return res.status(404).json({ error: 'Upload not found' });
    }

    console.log('[ZIP] Upload found, file count:', upload.fileCount, 'files array length:', upload.files?.length || 0);

    if (!upload.files || upload.files.length === 0) {
      console.error('[ZIP] No files to download for upload:', id);
      return res.status(400).json({ error: 'No files to download' });
    }

    // Set response headers for ZIP download
    const filename = `photos-${upload.phone}-${upload.id.slice(0, 8)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    archive.pipe(res);

    // Add session info file
    const sessionInfo = {
      phone: upload.phone,
      format: upload.format,
      size: upload.size,
      pages: upload.pages,
      price: upload.price,
      comment: upload.comment,
      filesCount: upload.fileCount,
      totalSize: upload.totalFileSize,
      createdAt: upload.createdAt,
      completedAt: upload.completedAt,
    };

    archive.append(JSON.stringify(sessionInfo, null, 2), { name: 'order-info.json' });

    // Add files
    for (const file of upload.files) {
      try {
        if (storageProvider instanceof LocalStorageProvider) {
          // Local files: resolve path from the actual local uploads base
          console.log('[ZIP] Processing file:', file.key, 'filename:', file.filename);

          // Determine local base path (must match LocalStorageProvider basePath)
          const configuredPath = process.env.UPLOADS_LOCAL_PATH || path.join(process.cwd(), 'uploads');
          const localBasePath = path.isAbsolute(configuredPath) ? configuredPath : path.resolve(configuredPath);

          let filePath: string;

          if (file.key.startsWith('objects/')) {
            // Absolute-like key relative to project root
            filePath = path.join(process.cwd(), file.key);
          } else {
            // Default: key is relative to local uploads base (e.g., uploads/tmp/<id>/file.ext)
            filePath = path.join(localBasePath, file.key);
          }

          console.log('[ZIP] Checking file path:', filePath);

          if (await fs.pathExists(filePath)) {
            console.log('[ZIP] Adding file to archive:', file.filename);
            archive.file(filePath, { name: file.filename });
          } else {
            // Fallback for legacy location under objects/local-upload by basename
            const legacyPath = path.join(process.cwd(), 'objects', 'local-upload', path.basename(file.key));
            console.warn('[ZIP] File not found at primary path, trying legacy path:', legacyPath);
            if (await fs.pathExists(legacyPath)) {
              console.log('[ZIP] Adding legacy file to archive:', file.filename);
              archive.file(legacyPath, { name: file.filename });
            } else {
              console.warn('[ZIP] File not found:', filePath);
            }
          }
        } else {
          // External object storage files (legacy)
          const presignedUrl = await storageProvider.createPresignedGet(file.key, 3600); // 1 hour
          const response = await fetch(presignedUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            archive.append(buffer, { name: file.filename });
          }
        }
      } catch (error) {
        console.error(`Failed to add file ${file.filename} to ZIP:`, error);
      }
    }

    // Finalize archive
    await archive.finalize();

    // Update download timestamp
    await db.update(uploads)
      .set({
        zipDownloadedAt: new Date(),
        zipGeneratedAt: new Date(),
      } as any)
      .where(eq(uploads.id, id));

  } catch (error) {
    console.error('Error generating ZIP:', error);
    res.status(500).json({ error: 'Failed to generate ZIP' });
  }
});

// DELETE /api/admin/uploads/:id - Delete upload and files (admin only)
router.delete('/admin/uploads/:id', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Delete files from storage
    if (upload.files && upload.files.length > 0) {
      const keys = upload.files.map(file => file.key);
      try {
        await storageProvider.deleteObjects(keys);
      } catch (error) {
        console.error('Failed to delete files from storage:', error);
      }
    }

    // Mark as deleted in database
    await db.update(uploads)
      .set({ 
        status: 'deleted',
        files: [], // Clear files list
      } as any)
      .where(eq(uploads.id, id));

    res.json({ success: true, message: 'Upload deleted successfully' });

  } catch (error) {
    console.error('Error deleting upload:', error);
    res.status(500).json({ error: 'Failed to delete upload' });
  }
});

// POST /api/admin/uploads/:id/delete-now - Immediate delete (admin only)
router.post('/admin/uploads/:id/delete-now', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    // Delete files from storage
    if (upload.files && upload.files.length > 0) {
      const keys = upload.files.map(f => f.key);
      try { await storageProvider.deleteObjects(keys); } catch (e) { console.error('Storage delete error', e); }
    }

    // Hard-delete the upload record so it disappears immediately from listings
    try {
      // Some SQL drivers may not support RETURNING on DELETE; perform delete without returning
      await db.delete(uploads).where(eq(uploads.id, id));
    } catch (err) {
      console.error('DB hard delete failed, falling back to soft delete', err);
      // Fallback: soft delete if hard delete is not supported
      await db.update(uploads)
        .set({ status: 'deleted', files: [], deletedAt: new Date() } as any)
        .where(eq(uploads.id, id));
    }

    res.json({ success: true, deleted: true, id });
  } catch (error) {
    console.error('Error delete-now:', error);
    res.status(500).json({ error: 'Failed to delete now' });
  }
});

// POST /api/admin/uploads/bulk-delete-now - Hard delete multiple uploads at once
router.post('/admin/uploads/bulk-delete-now', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { ids } = bulkIdsSchema.parse(req.body);

    const rows = await db.select().from(uploads).where(inArray(uploads.id, ids));
    if (rows.length === 0) return res.json({ success: true, deleted: 0 });

    // Delete files in storage (batch by keys)
    const allKeys = rows.flatMap(r => (r.files || []).map((f: any) => f.key));
    if (allKeys.length > 0) {
      try { await storageProvider.deleteObjects(allKeys); } catch (e) { console.error('Bulk storage delete error', e); }
    }

    // Hard-delete rows
    await db.delete(uploads).where(inArray(uploads.id, ids));
    return res.json({ success: true, deleted: rows.length });
  } catch (error) {
    console.error('Error bulk delete-now:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'Failed to bulk delete now' });
  }
});

// POST /api/admin/uploads/bulk-delete - Soft delete multiple uploads (clear files, keep rows as deleted)
router.post('/admin/uploads/bulk-delete', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { ids } = bulkIdsSchema.parse(req.body);

    const rows = await db.select().from(uploads).where(inArray(uploads.id, ids));
    if (rows.length === 0) return res.json({ success: true, updated: 0 });

    // Delete files in storage
    const allKeys = rows.flatMap(r => (r.files || []).map((f: any) => f.key));
    if (allKeys.length > 0) {
      try { await storageProvider.deleteObjects(allKeys); } catch (e) { console.error('Bulk storage delete error', e); }
    }

    // Mark rows as deleted and clear files
    const now = new Date();
    await db.update(uploads)
      .set({ status: 'deleted' as any, files: [], deletedAt: now } as any)
      .where(inArray(uploads.id, ids));

    return res.json({ success: true, updated: rows.length });
  } catch (error) {
    console.error('Error bulk soft delete:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'Failed to bulk delete' });
  }
});

// POST /api/admin/uploads/:id/postpone - Postpone deletion (admin only)
router.post('/admin/uploads/:id/postpone', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body as { days?: number };
    const postponeDays = Math.max(1, Math.min(365, Number(days) || 7));
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    const base = upload.deleteAt ?? new Date();
    const postponedUntil = new Date(base.getTime() + postponeDays * 24 * 60 * 60 * 1000);

    const [updated] = await db.update(uploads)
      .set({ postponedUntil, deleteAt: postponedUntil, status: upload.status === 'scheduled_for_deletion' ? 'uploaded' : upload.status } as any)
      .where(eq(uploads.id, id))
      .returning();

    res.json({ success: true, upload: updated });
  } catch (error) {
    console.error('Error postpone:', error);
    res.status(500).json({ error: 'Failed to postpone deletion' });
  }
});

// POST /api/admin/uploads/:id/hold - Toggle admin hold (admin only)
router.post('/admin/uploads/:id/hold', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { hold } = req.body as { hold?: boolean };
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
    if (!upload) return res.status(404).json({ error: 'Upload not found' });

    const newHold = typeof hold === 'boolean' ? hold : !upload.adminHold;
    const [updated] = await db.update(uploads)
      .set({ adminHold: newHold } as any)
      .where(eq(uploads.id, id))
      .returning();

    res.json({ success: true, upload: updated });
  } catch (error) {
    console.error('Error hold toggle:', error);
    res.status(500).json({ error: 'Failed to toggle hold' });
  }
});

// GET /api/upload/session/:id - Get session info (public)
router.get('/session/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));

    if (!upload) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    // Return limited info for public access
    res.json({
      id: upload.id,
      phone: upload.phone,
      format: upload.format,
      size: upload.size,
      pages: upload.pages,
      price: upload.price,
      status: upload.status,
      fileCount: upload.fileCount,
      expiresAt: upload.expiresAt,
      createdAt: upload.createdAt,
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

export { router as photoUploadRouter };

// Testing/admin utility endpoint: run cleanup now (schedule + delete)
router.post('/admin/cleanup/run', mockAuth, requireAdmin, async (_req, res) => {
  try {
    await markScheduledForDeletion();
    await deleteDueUploads();
    res.json({ success: true });
  } catch (e) {
    console.error('Manual cleanup run failed', e);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});