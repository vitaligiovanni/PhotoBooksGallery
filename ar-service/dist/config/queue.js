"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_NAMES = exports.boss = void 0;
exports.initializeQueue = initializeQueue;
exports.startQueue = startQueue;
exports.stopQueue = stopQueue;
const pg_boss_1 = __importDefault(require("pg-boss"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// pg-boss: PostgreSQL-based job queue
// Simpler than Redis, uses AR database for queue storage
// Perfect for <100 jobs/day workload
const databaseUrl = process.env.AR_DATABASE_URL;
if (!databaseUrl) {
    throw new Error('AR_DATABASE_URL is required for queue');
}
exports.boss = new pg_boss_1.default({
    connectionString: databaseUrl,
    // Queue configuration
    archiveCompletedAfterSeconds: parseInt(process.env.QUEUE_ARCHIVE_COMPLETED_AFTER_SECONDS || '3600'), // Archive after 1 hour
    deleteAfterDays: parseInt(process.env.QUEUE_DELETE_AFTER_DAYS || '7'), // Delete after 7 days
    // Retry configuration
    retryLimit: 3,
    retryDelay: 60, // 60 seconds between retries
    retryBackoff: true,
    // Maintenance
    maintenanceIntervalSeconds: 300, // 5 minutes
    // Performance
    max: 5, // Max concurrent jobs
    // Logging
    noSupervisor: false,
    noScheduling: false
});
// Job queue names
exports.QUEUE_NAMES = {
    AR_COMPILE: 'ar-compile',
    DEMO_CLEANUP: 'demo-cleanup',
    WEBHOOK_NOTIFY: 'webhook-notify'
};
// Initialize queue
async function initializeQueue() {
    try {
        console.log('[Queue] 🔄 Starting pg-boss...');
        await exports.boss.start();
        console.log('[Queue] ✅ pg-boss started successfully');
        // Register cleanup job (every 6 hours)
        const cleanupSchedule = process.env.DEMO_CLEANUP_SCHEDULE || '0 */6 * * *';
        await exports.boss.schedule(exports.QUEUE_NAMES.DEMO_CLEANUP, cleanupSchedule);
        console.log(`[Queue] 📅 Scheduled demo cleanup: ${cleanupSchedule}`);
    }
    catch (error) {
        console.error('[Queue] ❌ Failed to start pg-boss:', error);
        throw error;
    }
}
// Start queue (called from index.ts)
async function startQueue() {
    await initializeQueue();
}
// Stop queue (called from index.ts)
async function stopQueue() {
    console.log('[Queue] 🛑 Stopping pg-boss...');
    await exports.boss.stop();
    console.log('[Queue] ✅ pg-boss stopped');
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    await stopQueue();
});
// Monitor queue health
exports.boss.on('error', (error) => {
    console.error('[Queue] ❌ pg-boss error:', error);
});
exports.boss.on('maintenance', () => {
    console.log('[Queue] 🧹 Running queue maintenance');
});
//# sourceMappingURL=queue.js.map