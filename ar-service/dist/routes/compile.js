"use strict";
/**
 * POST /compile - Create new AR compilation job
 *
 * Receives compilation request from backend, creates ar_projects record,
 * enqueues pg-boss job, and returns immediately (non-blocking)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const queue_1 = require("../config/queue");
const file_manager_1 = require("../services/file-manager");
const router = (0, express_1.Router)();
const fileManager = new file_manager_1.FileManager();
/**
 * POST /compile
 *
 * @body CompileRequest
 * @returns 202 Accepted { projectId, status: 'pending' }
 */
router.post('/', async (req, res) => {
    const startTime = Date.now();
    try {
        const { userId, photoUrl, photoUrls, videoUrl, videoUrls, maskUrl, maskUrls, shapeType, orderId, isDemo = false, config = {} } = req.body;
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
        const projectId = (0, uuid_1.v4)();
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
        const client = await database_1.pool.connect();
        try {
            await client.query(`INSERT INTO ar_projects (
          id, user_id, order_id, photo_url, video_url, mask_url,
          status, config, is_demo, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`, [
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
            ]);
            console.log(`[Compile Route] ✅ Created ar_projects record: ${projectId}`);
        }
        finally {
            client.release();
        }
        // Enqueue pg-boss job with ALL photos, videos, and masks
        const jobId = await queue_1.boss.send(queue_1.QUEUE_NAMES.AR_COMPILE, {
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
        const client2 = await database_1.pool.connect();
        try {
            await client2.query(`UPDATE ar_projects SET queue_job_id = $1 WHERE id = $2`, [jobId, projectId]);
        }
        finally {
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
        });
    }
    catch (error) {
        console.error('[Compile Route] ❌ Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=compile.js.map