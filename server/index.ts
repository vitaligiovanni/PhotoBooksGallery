import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import fileUpload from "express-fileupload";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// CORS middleware для локальной разработки
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // First register API routes
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Then setup Vite middleware for development (after API routes)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  async function listenWithFallback(base: number, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      const p = base + i;
      try {
        await new Promise<void>((resolve, reject) => {
          const onError = (err: any) => {
            if (err.code === 'EADDRINUSE') {
              log(`⚠️  Порт ${p} занят, пробую следующий...`);
              reject(err);
            } else {
              reject(err);
            }
          };
          server.once('error', onError);
          server.listen(p, () => {
            server.off('error', onError);
            log(`✅ Сервер запущен: http://localhost:${p}`);
            if (i > 0) {
              log(`ℹ️  Ты можешь указать PORT=${p} в .env чтобы зафиксировать этот порт.`);
            }
            resolve();
          });
        });
        return; // success
      } catch (e: any) {
        if (e.code !== 'EADDRINUSE') {
          log('❌ Ошибка запуска сервера', e);
          process.exit(1);
        }
        continue; // попытаться следующий порт
      }
    }
    log(`❌ Все проверенные порты заняты (начиная с ${base}). Освободи процесс: PowerShell -> Get-Process -Id (Get-NetTCPConnection -LocalPort ${base}).OwningProcess | Stop-Process`);
    process.exit(1);
  }

  const basePort = parseInt(process.env.PORT || '3000', 10);
  await listenWithFallback(basePort);
})();
