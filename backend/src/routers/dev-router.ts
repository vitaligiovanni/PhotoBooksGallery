import { Router } from 'express';
import os from 'os';
import path from 'path';
import type { Server } from 'http';

let tunnelInstance: { url: string; close: () => void } | null = null;
let tunnelCreatedAt: number | null = null;
const TUNNEL_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function ensureTunnel(targetPort: number): Promise<string> {
  // expire old tunnel
  if (tunnelInstance && tunnelCreatedAt && (Date.now() - tunnelCreatedAt > TUNNEL_TTL_MS)) {
    try { tunnelInstance.close(); } catch {}
    tunnelInstance = null;
  }
  if (tunnelInstance?.url) return tunnelInstance.url;

  const lt = await import('localtunnel');
  const tunnel = await lt.default({ port: targetPort });
  tunnelInstance = { url: tunnel.url, close: () => tunnel.close() };
  tunnelCreatedAt = Date.now();
  return tunnel.url;
}

const router = Router();

function resolveFrontendPort(): number {
  // Try to infer from FRONTEND_URL, fallback to 3000
  const url = process.env.FRONTEND_URL;
  if (url) {
    try {
      const u = new URL(url);
      return Number(u.port || 3000);
    } catch {
      // ignore
    }
  }
  const p = Number(process.env.FRONTEND_PORT || 3000);
  return Number.isFinite(p) && p > 0 ? p : 3000;
}

router.get('/host-info', (_req, res) => {
  try {
    const nets = os.networkInterfaces();
    const addrs: string[] = [];

    Object.values(nets).forEach((ifaces) => {
      ifaces?.forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          addrs.push(iface.address);
        }
      });
    });

    const port = resolveFrontendPort();
    const hosts = addrs.map((ip) => `http://${ip}:${port}/upload`);

    res.json({
      hosts,
      port,
      count: hosts.length,
      note:
        'Сканируйте QR на телефоне в той же Wi‑Fi сети. Если не открывается — проверьте брандмауэр и что dev‑сервер запущен с --host.',
    });
  } catch (e) {
    res.status(500).json({ error: 'host_info_failed', details: String(e) });
  }
});

export { router as devRouter };

// Dev-only tunnel endpoints
router.get('/tunnel', async (req, res) => {
  try {
    const backendPort = Number(process.env.PORT || 5002);
    const base = await ensureTunnel(backendPort);
    const p = typeof req.query.path === 'string' ? req.query.path : '/';
    const url = new URL(p, base).toString();
    res.json({ url, base });
  } catch (e) {
    res.status(500).json({ error: 'tunnel_failed', details: String(e) });
  }
});

router.get('/tunnel/ar-view/:id', async (req, res) => {
  try {
    const backendPort = Number(process.env.PORT || 5002);
    const base = await ensureTunnel(backendPort);
    const arId = req.params.id;
    const viewPath = `/api/ar/storage/${arId}/index.html`;
    const url = new URL(viewPath, base).toString();
    res.json({ url, base, path: viewPath });
  } catch (e) {
    res.status(500).json({ error: 'tunnel_ar_view_failed', details: String(e) });
  }
});
