/**
 * GET /view/:id - Serve AR viewer HTML
 * 
 * Direct access to AR experience (no backend proxy)
 */

import { Router, Request, Response } from 'express';
import * as path from 'path';
import { pool } from '../config/database';

const router = Router();

/**
 * GET /view/:id
 * 
 * @param id - Project ID (UUID)
 * @returns HTML file or 404/error
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).send('<h1>400 Bad Request</h1><p>Project ID is required</p>');
    }
    
    console.log(`[Viewer Route] 👁️ Viewer request for project: ${id}`);
    
    // Check if project exists and is ready
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, status, viewer_html_url, is_demo, expires_at
        FROM ar_projects
        WHERE id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        console.log(`[Viewer Route] ❌ Project not found: ${id}`);
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>AR Project Not Found</title>
            <style>
              body { font-family: system-ui; text-align: center; padding: 50px; }
              h1 { color: #e53e3e; }
            </style>
          </head>
          <body>
            <h1>404 - AR Project Not Found</h1>
            <p>Project ID: ${id}</p>
            <p>This AR project does not exist or has been deleted.</p>
          </body>
          </html>
        `);
      }
      
      const project = result.rows[0];
      
      // Check if demo expired
      if (project.is_demo && project.expires_at) {
        const expiresAt = new Date(project.expires_at);
        if (expiresAt < new Date()) {
          console.log(`[Viewer Route] ⏰ Demo expired: ${id}`);
          return res.status(410).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Demo Expired</title>
              <style>
                body { font-family: system-ui; text-align: center; padding: 50px; }
                h1 { color: #ed8936; }
              </style>
            </head>
            <body>
              <h1>⏰ Demo Expired</h1>
              <p>This demo AR project expired on ${expiresAt.toLocaleString()}</p>
              <p>Demo projects are automatically deleted after 24 hours.</p>
            </body>
            </html>
          `);
        }
      }
      
      // Check compilation status
      if (project.status !== 'ready') {
        console.log(`[Viewer Route] ⏳ Project not ready yet: ${id} (status: ${project.status})`);
        
        let statusMessage = 'Compilation in progress...';
        if (project.status === 'pending') statusMessage = 'Queued for compilation...';
        else if (project.status === 'error') statusMessage = 'Compilation failed. Please try again.';
        
        return res.status(202).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>AR Compilation in Progress</title>
            <meta http-equiv="refresh" content="5">
            <style>
              body { font-family: system-ui; text-align: center; padding: 50px; }
              h1 { color: #4299e1; }
              .spinner { 
                border: 4px solid #f3f3f3; 
                border-top: 4px solid #4299e1; 
                border-radius: 50%; 
                width: 40px; 
                height: 40px; 
                animation: spin 1s linear infinite; 
                margin: 20px auto;
              }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <h1>🔨 ${statusMessage}</h1>
            <p>Project ID: ${id}</p>
            <p>This page will automatically refresh every 5 seconds.</p>
            <p><small>Status: ${project.status}</small></p>
          </body>
          </html>
        `);
      }
      
      // Serve viewer HTML (from storage)
      const viewerPath = path.join('/app/storage/ar-storage', id, 'index.html');
      console.log(`[Viewer Route] ✅ Serving viewer: ${viewerPath}`);
      
      res.sendFile(viewerPath, (err) => {
        if (err) {
          console.error(`[Viewer Route] ❌ Failed to serve viewer:`, err);
          res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Viewer Error</title>
              <style>
                body { font-family: system-ui; text-align: center; padding: 50px; }
                h1 { color: #e53e3e; }
              </style>
            </head>
            <body>
              <h1>500 - Viewer Error</h1>
              <p>Failed to load AR viewer for project: ${id}</p>
              <p>Please contact support if this issue persists.</p>
            </body>
            </html>
          `);
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('[Viewer Route] ❌ Error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Server Error</title>
        <style>
          body { font-family: system-ui; text-align: center; padding: 50px; }
          h1 { color: #e53e3e; }
        </style>
      </head>
      <body>
        <h1>500 - Internal Server Error</h1>
        <p>${error.message}</p>
      </body>
      </html>
    `);
  }
});

export default router;
