/**
 * AR Microservice - Main Entry Point
 * 
 * Responsibilities:
 * 1. Express API (compile, status, viewer routes)
 * 2. pg-boss workers (AR_COMPILE, DEMO_CLEANUP)
 * 3. Static file serving (AR storage)
 * 4. Health checks
 */

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as path from 'path';
import { pool } from './config/database';
import { boss, QUEUE_NAMES, startQueue, stopQueue } from './config/queue';
import { CompilerWorker } from './workers/compiler-worker';
import { WebhookClient } from './services/webhook-client';
import { FileManager } from './services/file-manager';

// Configuration flags
const ENABLE_WEBHOOKS = process.env.ENABLE_WEBHOOKS === 'true';

// Import routes
import compileRoutes from './routes/compile';
import statusRoutes from './routes/status';
import viewerRoutes from './routes/viewer';

// Configuration
const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Static files (AR storage)
app.use('/objects/ar-storage', express.static('/app/storage/ar-storage'));

// API Routes
app.use('/compile', compileRoutes);
app.use('/status', statusRoutes);
app.use('/view', viewerRoutes);

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database
    const dbClient = await pool.connect();
    await dbClient.query('SELECT 1');
    dbClient.release();
    
    // Check pg-boss
    const queueHealth = boss ? 'ok' : 'not_started';
    
    res.json({
      status: 'healthy',
      service: 'ar-microservice',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'connected',
      queue: queueHealth,
      uptime: process.uptime()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'PhotoBooks Gallery AR Microservice',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      compile: 'POST /compile',
      status: 'GET /status/:id',
      statusLogs: 'GET /status/:id/logs',
      viewer: 'GET /view/:id',
      health: 'GET /health'
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Express] ❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==== pg-boss WORKERS ====

const compilerWorker = new CompilerWorker();
const webhookClient = new WebhookClient();
const fileManager = new FileManager();

/**
 * AR_COMPILE worker - Processes compilation jobs in Worker Thread
 */
async function handleCompileJob(job: any) {
  const { id: jobId, data } = job;
  const { projectId, userId, photoPath, videoPath, maskPath, storageDir, config } = data;
  
  console.log(`\n[Worker] 🔨 Starting compilation job: ${jobId}`);
  console.log(`[Worker] Project: ${projectId}`);
  
  // Update status to 'processing'
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE ar_projects SET status = $1, updated_at = NOW() WHERE id = $2`,
      ['processing', projectId]
    );
  } finally {
    client.release();
  }
  
  // Log: compilation started
  await logCompilationStep(projectId, 'compilation', 'started', {});
  
  try {
    // Run compilation in Worker Thread (NON-BLOCKING!)
    const result = await compilerWorker.compile({
      projectId,
      userId,
      photoPath,
      videoPath,
      maskPath,
      storageDir,
      config
    } as any);
    
    if (result.success) {
      console.log(`[Worker] ✅ Compilation succeeded: ${projectId} (${result.compilationTimeMs}ms)`);
      
      // Update ar_projects (status: ready)
      const client2 = await pool.connect();
      try {
        await client2.query(
          `UPDATE ar_projects SET 
            status = $1,
            marker_mind_url = $2,
            viewer_html_url = $3,
            view_url = $4,
            qr_code_url = $5,
            compilation_time_ms = $6,
            compilation_finished_at = NOW(),
            updated_at = NOW()
          WHERE id = $7`,
          [
            'ready',
            result.markerMindUrl,
            result.viewerHtmlUrl,
            `${process.env.TUNNEL_URL || process.env.FRONTEND_URL || 'https://photobooksgallery.am'}/ar/view/${projectId}`,
            result.qrCodeUrl,
            result.compilationTimeMs,
            projectId
          ]
        );
      } finally {
        client2.release();
      }
      
      // Log: compilation completed
      await logCompilationStep(projectId, 'compilation', 'completed', {
        compilationTimeMs: result.compilationTimeMs,
        metadata: result.metadata
      });
      
      // Send webhook to backend (with ngrok tunnel URL)
      const baseUrl = process.env.TUNNEL_URL || process.env.FRONTEND_URL || 'https://photobooksgallery.am';
      const viewUrl = `${baseUrl}/ar/view/${projectId}`;
      
      if (ENABLE_WEBHOOKS) {
        await webhookClient.notifyCompilationComplete(projectId, viewUrl, result.qrCodeUrl!);
        // Request email notification
        await webhookClient.requestEmailNotification(projectId, userId, viewUrl);
      } else {
        console.log(`[Worker] ℹ️ Webhooks disabled - skipping notifications`);
      }
      
    } else {
      console.error(`[Worker] ❌ Compilation failed: ${projectId}`);
      console.error(`[Worker] Error: ${result.error}`);
      
      // Update ar_projects (status: error)
      const client3 = await pool.connect();
      try {
        await client3.query(
          `UPDATE ar_projects SET 
            status = $1,
            error_message = $2,
            compilation_finished_at = NOW(),
            updated_at = NOW()
          WHERE id = $3`,
          ['error', result.error, projectId]
        );
      } finally {
        client3.release();
      }
      
      // Log: compilation failed
      await logCompilationStep(projectId, 'compilation', 'failed', {
        error: result.error
      });
      
      // Send failure webhook to backend
      if (ENABLE_WEBHOOKS) {
        await webhookClient.notifyCompilationFailed(projectId, result.error!);
      } else {
        console.log(`[Worker] ℹ️ Webhooks disabled - skipping error notification`);
      }
      
      throw new Error(`Compilation failed: ${result.error}`);
    }
    
  } catch (error: any) {
    console.error(`[Worker] ❌ Job processing error:`, error);
    throw error;
  }
}

/**
 * DEMO_CLEANUP worker - Deletes expired demo projects (runs daily)
 */
async function handleDemoCleanup() {
  console.log(`\n[Cleanup] 🧹 Starting demo cleanup...`);
  
  const client = await pool.connect();
  try {
    // Find expired demos
    const result = await client.query(
      `SELECT id FROM ar_projects
      WHERE is_demo = true
      AND expires_at < NOW()
      AND status != 'deleted'`
    );
    
    console.log(`[Cleanup] Found ${result.rows.length} expired demos`);
    
    for (const row of result.rows) {
      const projectId = row.id;
      
      try {
        // Delete storage
        await fileManager.deleteProjectStorage(projectId);
        
        // Mark as deleted
        await client.query(
          `UPDATE ar_projects SET status = $1, updated_at = NOW() WHERE id = $2`,
          ['deleted', projectId]
        );
        
        console.log(`[Cleanup] ✅ Deleted demo: ${projectId}`);
      } catch (err: any) {
        console.error(`[Cleanup] ❌ Failed to delete demo ${projectId}:`, err.message);
      }
    }
    
    console.log(`[Cleanup] ✅ Cleanup completed`);
    
  } finally {
    client.release();
  }
}

/**
 * Helper: Log compilation step
 */
async function logCompilationStep(
  projectId: string,
  step: string,
  status: string,
  details: Record<string, any>
) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO ar_compilation_logs (project_id, step, status, details, created_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [projectId, step, status, JSON.stringify(details)]
    );
  } catch (err) {
    console.warn('[Log] Failed to insert compilation log:', err);
  } finally {
    client.release();
  }
}

// ==== STARTUP ====

async function start() {
  try {
    console.log('\n🚀 Starting AR Microservice...\n');
    
    // 1. Test database connection
    console.log('[Startup] 🔌 Connecting to database...');
    const dbClient = await pool.connect();
    await dbClient.query('SELECT 1');
    dbClient.release();
    console.log('[Startup] ✅ Database connected');
    
    // 2. Start pg-boss queue
    console.log('[Startup] 📤 Starting pg-boss queue...');
    await startQueue();
    console.log('[Startup] ✅ pg-boss started');
    
    // 3. Register workers
    console.log('[Startup] 👷 Registering workers...');
    
    await boss.work(QUEUE_NAMES.AR_COMPILE, { teamSize: 2, teamConcurrency: 1 }, handleCompileJob);
    console.log('[Startup] ✅ Registered AR_COMPILE worker (teamSize: 2)');
    
    await boss.work(QUEUE_NAMES.DEMO_CLEANUP, handleDemoCleanup);
    console.log('[Startup] ✅ Registered DEMO_CLEANUP worker');
    
    // 4. Start Express server
    const server = app.listen(PORT, () => {
      console.log(`\n✅ AR Microservice running on port ${PORT}`);
      console.log(`   Environment: ${NODE_ENV}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   API docs: http://localhost:${PORT}/\n`);
    });
    
    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
      
      server.close(() => {
        console.log('[Shutdown] ✅ HTTP server closed');
      });
      
      await stopQueue();
      console.log('[Shutdown] ✅ pg-boss stopped');
      
      await pool.end();
      console.log('[Shutdown] ✅ Database pool closed');
      
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    console.error('[Startup] ❌ Failed to start:', error);
    process.exit(1);
  }
}

// Start the service
start();
