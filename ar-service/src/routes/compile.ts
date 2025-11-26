/**
 * POST /compile - Create new AR compilation job
 * 
 * Receives compilation request from backend, creates ar_projects record,
 * enqueues pg-boss job, and returns immediately (non-blocking)
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import { boss, QUEUE_NAMES } from '../config/queue';
import { FileManager } from '../services/file-manager';

const router = Router();
const fileManager = new FileManager();

interface CompileRequest {
  userId: string; // From backend JWT validation
  photoUrl?: string; // /objects/uploads/photo.jpg (legacy single photo)
  photoUrls?: string[]; // /objects/uploads/photo-0.jpg, ... (multi-target)
  videoUrl?: string; // /objects/uploads/video.mp4 (legacy single video)
  videoUrls?: string[]; // /objects/uploads/video-0.mp4, ... (one per photo)
  maskUrl?: string; // /objects/uploads/mask.png (optional custom mask)
  maskUrls?: string[]; // /objects/uploads/mask-0.png, ... (multi-target custom masks)
  shapeType?: 'circle' | 'oval' | 'square' | 'rect' | 'custom'; // Auto-generate mask shape
  orderId?: string; // E-commerce order ID (optional)
  isDemo?: boolean; // Demo mode (auto-delete after 24h)
  config?: {
    fitMode?: 'contain' | 'cover' | 'fill' | 'exact';
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
    aspectLocked?: boolean;
    autoPlay?: boolean;
    loop?: boolean;
    videoPosition?: { x: number; y: number; z: number };
    videoRotation?: { x: number; y: number; z: number };
    videoScale?: { width: number; height: number };
  };
}

/**
 * POST /compile
 * 
 * @body CompileRequest
 * @returns 202 Accepted { projectId, status: 'pending' }
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const {
      userId,
      photoUrl,
      photoUrls,
      videoUrl,
      videoUrls,
      maskUrl,
      maskUrls,
      shapeType,
      orderId,
      isDemo = false,
      config = {}
    } = req.body as CompileRequest;
    
    // Validation
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Поддержка как одного фото (legacy), так и множественных
    const photos = photoUrls || (photoUrl ? [photoUrl] : []);
    const videos = videoUrls || (videoUrl ? [videoUrl] : []);
    
    if (photos.length === 0) {
      return res.status(400).json({ error: 'At least one photo is required (photoUrl or photoUrls)' });
    }
    
    if (videos.length === 0) {
      return res.status(400).json({ error: 'At least one video is required (videoUrl or videoUrls)' });
    }
    
    if (photos.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 photos allowed for multi-target AR' });
    }
    
    // Проверка соответствия количества фото и видео
    if (photos.length !== videos.length) {
      return res.status(400).json({ 
        error: `Mismatch: ${photos.length} photos but ${videos.length} videos. Each photo needs its own video.` 
      });
    }
    
    // Resolve file paths (URL → filesystem)
    const photoPaths = photos.map(url => fileManager.resolveUploadPath(url));
    const videoPaths = videos.map(url => fileManager.resolveUploadPath(url));
    const maskPath = maskUrl ? fileManager.resolveUploadPath(maskUrl) : undefined;
    const maskPaths = maskUrls ? maskUrls.map(url => fileManager.resolveUploadPath(url)) : undefined;
    
    // Validate files exist
    console.log(`[Compile Route] 🔍 Validating ${photoPaths.length} photo(s) and ${videoPaths.length} video(s)...`);
    for (let i = 0; i < photoPaths.length; i++) {
      const exists = await fileManager.fileExists(photoPaths[i]);
      if (!exists) {
        return res.status(400).json({ 
          error: `Photo file not found: ${photos[i]} (resolved: ${photoPaths[i]})` 
        });
      }
      console.log(`[Compile Route] ✅ Photo ${i + 1}/${photoPaths.length} exists`);
    }
    
    for (let i = 0; i < videoPaths.length; i++) {
      const exists = await fileManager.fileExists(videoPaths[i]);
      if (!exists) {
        return res.status(400).json({ 
          error: `Video file not found: ${videos[i]} (resolved: ${videoPaths[i]})` 
        });
      }
      console.log(`[Compile Route] ✅ Video ${i + 1}/${videoPaths.length} exists`);
    }
    
    // Generate single project ID for multi-target AR
    const projectId = uuidv4();
    
    // Create project storage directory
    const storageDir = fileManager.getProjectStorageDir(projectId);
    await fileManager.createProjectStorage(projectId);
    
    // Calculate demo expiration (24 hours)
    const expiresAt = isDemo ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    
    console.log(`\n[Compile Route] 🚀 CREATING MULTI-TARGET AR PROJECT:`);
    console.log(`  Project ID: ${projectId}`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Markers: ${photoPaths.length} photos with ${videoPaths.length} videos`);
    console.log(`  Demo: ${isDemo}`);
    
    // Insert ar_projects record (ONE project with multiple markers)
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO ar_projects (
          id, user_id, order_id, photo_url, video_url, mask_url,
          status, config, is_demo, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          projectId,
          userId,
          orderId || null,
          photos[0], // First photo as representative
          videos[0], // First video as representative
          maskUrl || null,
          'pending',
          JSON.stringify({ ...config, markersCount: photoPaths.length }),
          isDemo,
          expiresAt
        ]
      );
      
      console.log(`[Compile Route] ✅ Created ar_projects record: ${projectId}`);
    } finally {
      client.release();
    }
    
    // Enqueue pg-boss job with ALL photos, videos, and masks
    const jobId = await boss.send(QUEUE_NAMES.AR_COMPILE, {
      projectId,
      userId,
      photoPaths, // ARRAY of all photo paths
      videoPaths, // ARRAY of all video paths (one per photo)
      photoUrls: photos, // Original URLs for reference
      videoUrls: videos, // Original URLs for reference
      maskPath, // Single custom mask (legacy)
      maskUrls: maskPaths, // ARRAY of custom mask paths (multi-target)
      shapeType, // Auto-generate mask shape (circle, oval, square, rect)
      storageDir,
      config: { ...config, markersCount: photoPaths.length }
    }, {
      retryLimit: 3,
      retryDelay: 60,
      expireInSeconds: 600 // 10 minutes for multi-target compilation
    });
    
    // Update queue_job_id
    const client2 = await pool.connect();
    try {
      await client2.query(
        `UPDATE ar_projects SET queue_job_id = $1 WHERE id = $2`,
        [jobId, projectId]
      );
    } finally {
      client2.release();
    }

    const responseTime = Date.now() - startTime;
    console.log(`[Compile Route] ✅ Multi-target AR project queued: ${projectId} (job: ${jobId}) in ${responseTime}ms`);
    
    // Use ngrok tunnel URL for public access
    const baseUrl = process.env.TUNNEL_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Return immediately (202 Accepted)
    res.status(202).json({
      projectId,
      status: 'pending',
      message: `Multi-target AR project with ${photoPaths.length} marker(s) created successfully`,
      markersCount: photoPaths.length,
      estimatedTimeSeconds: 120 + (photoPaths.length - 1) * 30, // Extra time for multiple markers
      statusUrl: `/status/${projectId}`,
      viewUrl: `${baseUrl}/ar/view/${projectId}`
    });  } catch (error: any) {
    console.error('[Compile Route] ❌ Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
