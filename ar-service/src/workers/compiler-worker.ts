import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Worker Thread Manager
// Runs MindAR compilation in separate thread to avoid blocking event loop

interface CompilationJob {
  projectId: string;
  userId: string; // Required by ar-compiler-core
  photoPath?: string; // LEGACY: Single photo (deprecated)
  photoPaths?: string[]; // MULTI-TARGET: Array of photo paths
  videoPath?: string; // LEGACY: Single video (deprecated)
  videoPaths?: string[]; // MULTI-TARGET: Array of video paths (one per photo)
  maskPath?: string; // Single custom mask (legacy)
  maskUrls?: string[]; // MULTI-TARGET: Array of custom mask paths
  shapeType?: 'circle' | 'oval' | 'square' | 'rect' | 'custom'; // Auto-generate mask shape
  storageDir: string;
  config: Record<string, any>;
}

interface CompilationResult {
  success: boolean;
  error?: string;
  compilationTimeMs?: number;
  markerMindUrl?: string;
  viewerHtmlUrl?: string;
  qrCodeUrl?: string;
  metadata?: {
    markersCount?: number;
    multiTarget?: boolean;
    photoWidth?: number;
    photoHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    videoDurationMs?: number;
    photoAspectRatio?: string;
    videoAspectRatio?: string;
    videoDurationSec?: number;
    maskFiles?: string[];
  };
}

export class CompilerWorker {
  
  /**
   * Run compilation (Worker Thread in production, direct call in development)
   * 
   * DEVELOPMENT: Runs in main thread (tsx doesn't support Worker Threads with .ts files)
   * PRODUCTION: Runs in Worker Thread (compiled .js files work fine)
   */
  async compile(job: CompilationJob): Promise<CompilationResult> {
    // WORKAROUND: временно отключаем Worker Threads в проде из-за canvas ERR_DLOPEN_FAILED
    // Локально (NODE_ENV!=production) как было: без воркера
    // В проде принудительно в main-thread до стабилизации нативного canvas
    const isDevelopment = true;
    
    if (isDevelopment) {
      // DEVELOPMENT MODE: Direct compilation in main thread
      // tsx watch will restart server if needed
      console.log(`[Worker] 🔄 Starting compilation for ${job.projectId} (MAIN THREAD - DEV MODE)`);
      
      try {
        const { compileARProject } = await import('./ar-compiler-core.js');
        const result = await compileARProject(job);
        console.log(`[Worker] ✅ Compilation completed for ${job.projectId}`);
        return result;
      } catch (error: any) {
        console.error(`[Worker] ❌ Compilation error for ${job.projectId}:`, error);
        return {
          success: false,
          error: error.message || 'Unknown compilation error'
        };
      }
      
    } else {
      // PRODUCTION MODE: Worker Thread isolation
      return new Promise((resolve, reject) => {
        console.log(`[Worker] 🔄 Starting compilation for ${job.projectId} (WORKER THREAD)`);
        
        const worker = new Worker(__filename, {
          workerData: job
        });
        
        worker.on('message', (result: CompilationResult) => {
          console.log(`[Worker] ✅ Compilation completed for ${job.projectId}`);
          resolve(result);
        });
        
        worker.on('error', (error) => {
          console.error(`[Worker] ❌ Compilation error for ${job.projectId}:`, error);
          reject(error);
        });
        
        worker.on('exit', (code) => {
          if (code !== 0) {
            console.error(`[Worker] ❌ Worker stopped with exit code ${code}`);
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    }
  }
}

// ===== WORKER THREAD CODE (runs in separate thread) =====
if (!isMainThread && parentPort) {
  
  (async () => {
    try {
      const job = workerData as CompilationJob;
      
      console.log(`[Worker Thread] 🔨 Compiling ${job.projectId} in separate thread`);
      
      // Import heavy modules ONLY in worker thread
      // This keeps main thread clean
      // CRITICAL: Use .js extension for dynamic imports (TypeScript requirement)
      // tsx will resolve .ts files automatically, Node.js will use compiled .js
      const { compileARProject } = await import('./ar-compiler-core.js');
      
      // Run compilation (CPU-intensive, 120 seconds)
      const result = await compileARProject(job);
      
      // Send result back to main thread
      parentPort!.postMessage(result);
      
    } catch (error: any) {
      console.error('[Worker Thread] ❌ Compilation failed:', error);
      
      parentPort!.postMessage({
        success: false,
        error: error.message || 'Unknown compilation error'
      });
    }
  })();
}

export const compilerWorker = new CompilerWorker();
