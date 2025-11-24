import PgBoss from 'pg-boss';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// pg-boss: PostgreSQL-based job queue
// Simpler than Redis, uses AR database for queue storage
// Perfect for <100 jobs/day workload

const databaseUrl = process.env.AR_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('AR_DATABASE_URL is required for queue');
}

export const boss = new PgBoss({
  connectionString: databaseUrl,
  
  // Queue configuration
  archiveCompletedAfterSeconds: parseInt(
    process.env.QUEUE_ARCHIVE_COMPLETED_AFTER_SECONDS || '3600'
  ), // Archive after 1 hour
  
  deleteAfterDays: parseInt(
    process.env.QUEUE_DELETE_AFTER_DAYS || '7'
  ), // Delete after 7 days
  
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
export const QUEUE_NAMES = {
  AR_COMPILE: 'ar-compile',
  DEMO_CLEANUP: 'demo-cleanup',
  WEBHOOK_NOTIFY: 'webhook-notify'
} as const;

// Initialize queue
export async function initializeQueue(): Promise<void> {
  try {
    console.log('[Queue] 🔄 Starting pg-boss...');
    await boss.start();
    console.log('[Queue] ✅ pg-boss started successfully');
    
    // Register cleanup job (every 6 hours)
    const cleanupSchedule = process.env.DEMO_CLEANUP_SCHEDULE || '0 */6 * * *';
    await boss.schedule(QUEUE_NAMES.DEMO_CLEANUP, cleanupSchedule);
    console.log(`[Queue] 📅 Scheduled demo cleanup: ${cleanupSchedule}`);
    
  } catch (error) {
    console.error('[Queue] ❌ Failed to start pg-boss:', error);
    throw error;
  }
}

// Start queue (called from index.ts)
export async function startQueue(): Promise<void> {
  await initializeQueue();
}

// Stop queue (called from index.ts)
export async function stopQueue(): Promise<void> {
  console.log('[Queue] 🛑 Stopping pg-boss...');
  await boss.stop();
  console.log('[Queue] ✅ pg-boss stopped');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await stopQueue();
});

// Monitor queue health
boss.on('error', (error: Error) => {
  console.error('[Queue] ❌ pg-boss error:', error);
});

boss.on('maintenance', () => {
  console.log('[Queue] 🧹 Running queue maintenance');
});
