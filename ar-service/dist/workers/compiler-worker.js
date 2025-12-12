"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compilerWorker = exports.CompilerWorker = void 0;
const worker_threads_1 = require("worker_threads");
class CompilerWorker {
    /**
     * Run compilation (Worker Thread in production, direct call in development)
     *
     * DEVELOPMENT: Runs in main thread (tsx doesn't support Worker Threads with .ts files)
     * PRODUCTION: Runs in Worker Thread (compiled .js files work fine)
     */
    async compile(job) {
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
            }
            catch (error) {
                console.error(`[Worker] ❌ Compilation error for ${job.projectId}:`, error);
                return {
                    success: false,
                    error: error.message || 'Unknown compilation error'
                };
            }
        }
        else {
            // PRODUCTION MODE: Worker Thread isolation
            return new Promise((resolve, reject) => {
                console.log(`[Worker] 🔄 Starting compilation for ${job.projectId} (WORKER THREAD)`);
                const worker = new worker_threads_1.Worker(__filename, {
                    workerData: job
                });
                worker.on('message', (result) => {
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
exports.CompilerWorker = CompilerWorker;
// ===== WORKER THREAD CODE (runs in separate thread) =====
if (!worker_threads_1.isMainThread && worker_threads_1.parentPort) {
    (async () => {
        try {
            const job = worker_threads_1.workerData;
            console.log(`[Worker Thread] 🔨 Compiling ${job.projectId} in separate thread`);
            // Import heavy modules ONLY in worker thread
            // This keeps main thread clean
            // CRITICAL: Use .js extension for dynamic imports (TypeScript requirement)
            // tsx will resolve .ts files automatically, Node.js will use compiled .js
            const { compileARProject } = await import('./ar-compiler-core.js');
            // Run compilation (CPU-intensive, 120 seconds)
            const result = await compileARProject(job);
            // Send result back to main thread
            worker_threads_1.parentPort.postMessage(result);
        }
        catch (error) {
            console.error('[Worker Thread] ❌ Compilation failed:', error);
            worker_threads_1.parentPort.postMessage({
                success: false,
                error: error.message || 'Unknown compilation error'
            });
        }
    })();
}
exports.compilerWorker = new CompilerWorker();
//# sourceMappingURL=compiler-worker.js.map