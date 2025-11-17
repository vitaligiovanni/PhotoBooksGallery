import cron from 'node-cron';
import { db } from '../db';
// Compiled path is dist/backend/src/cron -> dist/shared
import { uploads } from '../../../shared/schema';
import type { Upload } from '../../../shared/schema';
import { inArray, eq } from 'drizzle-orm';
import { createStorageProvider } from '../utils/storageProvider';

const NOTICE_HOURS = parseInt(process.env.UPLOAD_PREDELETE_NOTICE_HOURS || '24', 10);
const storage = createStorageProvider();

export async function markScheduledForDeletion() {
  const now = new Date();
  const rows = await db.select().from(uploads).where(inArray(uploads.status, ['uploaded', 'processing'] as any));
  for (const u of rows) {
    if (!u.deleteAt) continue;
    if (u.adminHold) continue;
    const effectiveDeleteAt = u.postponedUntil && u.postponedUntil > u.deleteAt ? u.postponedUntil : u.deleteAt;
    const noticeAt = new Date((effectiveDeleteAt as Date).getTime() - NOTICE_HOURS * 60 * 60 * 1000);
    if (now >= noticeAt && now < (effectiveDeleteAt as Date) && u.status !== 'scheduled_for_deletion') {
      await (db.update(uploads as any) as any)
        .set({ status: 'scheduled_for_deletion' as any, deletionNotifiedAt: new Date(), deleteAt: effectiveDeleteAt as Date } as any)
        .where(eq(uploads.id, u.id));
    }
  }
}

export async function deleteDueUploads() {
  const now = new Date();
  const rows = await db.select().from(uploads).where(inArray(uploads.status, ['uploaded', 'processing', 'scheduled_for_deletion'] as any));
  for (const u of rows) {
    const effectiveDeleteAt = (u.postponedUntil && (!u.deleteAt || u.postponedUntil > u.deleteAt)) ? u.postponedUntil : u.deleteAt;
    if (!effectiveDeleteAt) continue;
    if (u.adminHold) continue;
    if (effectiveDeleteAt > now) continue;

    // Delete from storage
    if (u.files && u.files.length > 0) {
      const keys = u.files.map(f => f.key);
      try { await storage.deleteObjects(keys); } catch (e) { console.error('Storage delete error', e); }
    }
    await (db.update(uploads as any) as any)
      .set({ status: 'deleted' as any, files: [], deletedAt: new Date() } as any)
      .where(eq(uploads.id, u.id));
  }
}

export function startUploadCleanupCron() {
  // Hourly: mark scheduled_for_deletion
  cron.schedule('15 * * * *', async () => {
    try { await markScheduledForDeletion(); } catch (e) { console.error('cron markScheduledForDeletion error', e); }
  });
  // Hourly: delete due uploads
  cron.schedule('45 * * * *', async () => {
    try { await deleteDueUploads(); } catch (e) { console.error('cron deleteDueUploads error', e); }
  });
  console.log('🗓️ Uploads cleanup cron scheduled (pre-delete notice and deletion).');
}
