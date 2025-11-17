import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import cors from "cors";
import { registerRoutes } from "./routes";
import { initializeCurrencies } from "./initCurrencies";
import { cleanInvalidCategories } from "./cleanInvalidCategories";
import { startUploadCleanupCron } from "./cron/uploadsCleanup";

const app = express();

// Утилита для логирования
function log(message: string, source = 'backend') {
  const formattedTime = new Date().toISOString();
  console.log(`${formattedTime} [${source}] ${message}`);
}

// CORS middleware для работы с frontend
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  // Логируем все входящие запросы немедленно
  console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  
  if (req.method === 'DELETE' && req.url.includes('/categories/')) {
    console.log(`🗑️ DELETE request details:`, {
      url: req.url,
      params: req.params,
      query: req.query,
      headers: req.headers
    });
  }
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
  // Initialize currencies on startup
  await initializeCurrencies();
  
  // Clean invalid categories
  await cleanInvalidCategories();
  
  // First register API routes
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Backend работает только как API сервер
  // Frontend запускается отдельно через Vite dev server

  // Простая проверка что API работает
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      message: 'Backend API server is running',
      port: process.env.PORT || 5001,
      timestamp: new Date().toISOString()
    });
  });

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

  const basePort = parseInt(process.env.PORT || '5000', 10);
  await listenWithFallback(basePort);

  // Start background cron tasks (pre-delete notices and deletions)
  startUploadCleanupCron();

  // Graceful shutdown
  const shutdown = async () => {
    log('🔄 Закрытие соединений с базой данных...');
    try {
      // Close database connections if needed
      const { db } = await import('./db');
      // @ts-ignore
      if (db.$client) {
        // @ts-ignore
        await db.$client.end();
      }
      log('✅ Соединения с базой данных закрыты');
    } catch (error) {
      log(`❌ Ошибка закрытия соединений: ${error}`);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
