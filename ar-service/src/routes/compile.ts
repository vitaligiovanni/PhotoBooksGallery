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
  photoUrl: string; // /objects/uploads/photo.jpg
  videoUrl?: string; // /objects/uploads/video.mp4 (optional)
  maskUrl?: string; // /objects/uploads/mask.png (optional)
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
      videoUrl,
      maskUrl,
      orderId,
      isDemo = false,
      config = {}
    } = req.body as CompileRequest;
    
    // Validation
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    if (!photoUrl) {
      return res.status(400).json({ error: 'photoUrl is required' });
    }
    
    // Generate project ID
    const projectId = uuidv4();
    
    // Resolve file paths (URL → filesystem)
    const photoPath = fileManager.resolveUploadPath(photoUrl);
    const videoPath = videoUrl ? fileManager.resolveUploadPath(videoUrl) : undefined;
    const maskPath = maskUrl ? fileManager.resolveUploadPath(maskUrl) : undefined;
    
    // Create project storage directory
    const storageDir = fileManager.getProjectStorageDir(projectId);
    await fileManager.createProjectStorage(projectId);
    
    // Calculate demo expiration (24 hours)
    const expiresAt = isDemo ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    
    console.log(`[Compile Route] 📥 New compilation request:`);
    console.log(`  Project ID: ${projectId}`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Photo: ${photoUrl}`);
    console.log(`  Video: ${videoUrl || 'NONE'}`);
    console.log(`  Demo: ${isDemo}`);
    console.log(`  Config:`, JSON.stringify(config, null, 2));
    
    // Insert ar_projects record (status: pending)
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
          photoUrl,
          videoUrl || null,
          maskUrl || null,
          'pending',
          JSON.stringify(config),
          isDemo,
          expiresAt
        ]
      );
      
      console.log(`[Compile Route] ✅ Created ar_projects record: ${projectId}`);
    } finally {
      client.release();
    }
    
    // Enqueue pg-boss job (AR_COMPILE)
    const jobId = await boss.send(QUEUE_NAMES.AR_COMPILE, {
      projectId,
      userId,
      photoPath,
      videoPath,
      maskPath,
      storageDir,
      config
    }, {
      retryLimit: 3, // Retry up to 3 times on failure
      retryDelay: 60, // Wait 60 seconds between retries
      expireInSeconds: 300 // Job expires if not started within 5 minutes
    });
    
    console.log(`[Compile Route] 📤 Enqueued pg-boss job: ${jobId}`);
    
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
    console.log(`[Compile Route] ✅ Response sent in ${responseTime}ms (NON-BLOCKING!)`);
    
    // Use ngrok tunnel URL for public access
    const baseUrl = process.env.TUNNEL_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Return immediately (202 Accepted)
    res.status(202).json({
      projectId,
      status: 'pending',
      message: 'Compilation job queued successfully',
      estimatedTimeSeconds: 120,
      statusUrl: `/status/${projectId}`,
      viewUrl: `${baseUrl}/ar/view/${projectId}` // Ngrok tunnel URL
    });
    
  } catch (error: any) {
    console.error('[Compile Route] ❌ Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
