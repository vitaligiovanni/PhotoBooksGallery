import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

// In CommonJS we already have __dirname; if not (e.g. ESM), fallback
// Use a different identifier to avoid shadowing
const localDirname = (global as any).__dirname ?? __dirname ?? process.cwd();
const isProduction = process.env.NODE_ENV === "production";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  if (isProduction) {
    console.log("Skipping Vite setup in production mode");
    return;
  }

  // Dynamic imports for development only
  let createViteServer: any, createLogger: any, viteConfigModule: any;
  try {
    // @ts-ignore - vite is a dev dependency and may not be available in production
    const viteImport = await import("vite");
    createViteServer = viteImport.createServer;
    createLogger = viteImport.createLogger;
    // @ts-ignore - vite config may not be available in production
    viteConfigModule = await import("../vite.config");
  } catch (error) {
    console.warn('Vite not available in production, skipping HMR setup');
    return;
  }
  const { nanoid } = await import("nanoid");
  
  const viteConfig = viteConfigModule.default;
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: any, options: any) => {
        // Log the error but do NOT kill the dev server; killing breaks HMR WS connection
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Serve root-level public (project/public) for assets like manifest/icons (since Vite root is client/)
  const rootPublic = path.resolve(localDirname, "..", "public");
  if (fs.existsSync(rootPublic)) {
    app.use(express.static(rootPublic));
  }

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
  localDirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(localDirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
