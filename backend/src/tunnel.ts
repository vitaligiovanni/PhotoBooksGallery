import type { Server } from 'http';

let tunnelInstance: any = null;
let tunnelUrl: string | null = null;
let starting = false;

// Lazily start a localtunnel to the frontend dev server and cache its URL
export async function ensureLocalTunnel(): Promise<string | null> {
  if (tunnelUrl) return tunnelUrl;
  if (starting) {
    // wait briefly for concurrent callers
    await new Promise((r) => setTimeout(r, 500));
    return tunnelUrl;
  }

  // Only enable when explicitly allowed
  if (process.env.ENABLE_LOCALTUNNEL !== 'true') return null;

  starting = true;
  try {
    // localtunnel is ESM-only, use dynamic import
  // @ts-ignore - localtunnel has no types in our tree at dev time
  const lt = await import('localtunnel');
    const port = Number(process.env.FRONTEND_PORT || process.env.VITE_PORT || 3000);
    const subdomain = process.env.LOCALTUNNEL_SUBDOMAIN; // optional stable name

    // @ts-ignore ESM default export shape
    tunnelInstance = await lt.default({ port, host: 'https://loca.lt', subdomain });
    tunnelUrl = tunnelInstance.url;

    tunnelInstance.on('close', () => {
      tunnelInstance = null;
      tunnelUrl = null;
    });

    return tunnelUrl;
  } catch (e) {
    console.error('[localtunnel] failed to start:', e);
    tunnelInstance = null;
    tunnelUrl = null;
    return null;
  } finally {
    starting = false;
  }
}

export function getLocalTunnelUrl(): string | null {
  return tunnelUrl;
}

export function wireTunnelLifecycle(server: Server) {
  const shutdown = () => {
    if (tunnelInstance) {
      try { tunnelInstance.close(); } catch {}
    }
  };
  server.on('close', shutdown);
  process.on('SIGINT', () => { shutdown(); process.exit(0); });
  process.on('SIGTERM', () => { shutdown(); process.exit(0); });
}
