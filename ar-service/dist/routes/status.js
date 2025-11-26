"use strict";
/**
 * GET /status/:id - Check AR compilation status
 *
 * Returns current status, progress, and URLs (if ready)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
/**
 * GET /status/:id
 *
 * @param id - Project ID (UUID)
 * @returns StatusResponse
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Project ID is required' });
        }
        console.log(`[Status Route] 🔍 Checking status for project: ${id}`);
        // Query ar_projects
        const client = await database_1.pool.connect();
        try {
            const result = await client.query(`SELECT 
          id, status, view_url, qr_code_url, marker_mind_url,
          photo_url, video_url, viewer_html_url,
          compilation_time_ms, error_message, is_demo, expires_at,
          created_at, updated_at
        FROM ar_projects
        WHERE id = $1`, [id]);
            if (result.rows.length === 0) {
                console.log(`[Status Route] ❌ Project not found: ${id}`);
                return res.status(404).json({ error: 'Project not found' });
            }
            const project = result.rows[0];
            // Calculate progress based on status
            let progress = 0;
            if (project.status === 'pending')
                progress = 0;
            else if (project.status === 'processing')
                progress = 50;
            else if (project.status === 'ready')
                progress = 100;
            else if (project.status === 'error')
                progress = 0;
            const response = {
                projectId: project.id,
                status: project.status,
                progress,
                viewUrl: project.view_url || undefined,
                qrCodeUrl: project.qr_code_url || undefined,
                markerMindUrl: project.marker_mind_url || undefined,
                photoUrl: project.photo_url || undefined,
                videoUrl: project.video_url || undefined,
                viewerHtmlUrl: project.viewer_html_url || undefined,
                compilationTimeMs: project.compilation_time_ms || undefined,
                errorMessage: project.error_message || undefined,
                createdAt: project.created_at,
                updatedAt: project.updated_at,
                isDemo: project.is_demo,
                expiresAt: project.expires_at
            };
            console.log(`[Status Route] ✅ Status: ${project.status}`);
            res.json(response);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('[Status Route] ❌ Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
/**
 * GET /status/:id/logs - Get compilation logs
 *
 * @param id - Project ID (UUID)
 * @returns Array of compilation log entries
 */
router.get('/:id/logs', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[Status Route] 📋 Fetching logs for project: ${id}`);
        const client = await database_1.pool.connect();
        try {
            const result = await client.query(`SELECT 
          id, project_id, step, status, duration_ms, details, created_at
        FROM ar_compilation_logs
        WHERE project_id = $1
        ORDER BY id ASC`, [id]);
            console.log(`[Status Route] ✅ Found ${result.rows.length} log entries`);
            res.json({
                projectId: id,
                logs: result.rows
            });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('[Status Route] ❌ Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=status.js.map