import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { type Server } from 'http';

const rootDir = process.cwd();
const isProduction = process.env.NODE_ENV === 'production';

export function log(message: string, source = 'express') {
  const formattedTime = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`${formattedTime} [${source}] ${message}`);
}

// In production container we skip dev Vite entirely.
export async function setupVite(app: Express, _server: Server) {
  if (isProduction) {
    log('Vite dev middleware skipped (production build)');
    return;
  }
  
  try {
    // In development, we'll serve from the client folder directly
    // or let Vite handle it if it's running separately
    log('Development mode - serving static files from client/dist or fallback');
    
    // Try to serve built files first
    const distPath = path.resolve(rootDir, 'dist', 'public');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      log('Serving from dist/public');
      
      // Catch-all for SPA routing
      app.get('*', (_req, res) => {
        const indexPath = path.resolve(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Development server: index.html not found in dist/public.');
        }
      });
    } else {
      // Fallback to public folder
      const publicPath = path.resolve(rootDir, 'public');
      if (fs.existsSync(publicPath)) {
        app.use(express.static(publicPath));
        log('Serving from public folder');
      }
      
      app.get('*', (_req, res) => {
        res.status(404).send('Development server: No built client found. Run "npm run build:client" first.');
      });
    }
    
  } catch (error) {
    log('Error setting up development server: ' + error);
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(rootDir, 'dist', 'public');
  if (!fs.existsSync(distPath)) {
    throw new Error(`Missing client build at ${distPath}. Run npm run build:client (or full npm run build) before starting server in production mode.`);
  }
  app.use(express.static(distPath));
  app.use('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}
