import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage.js";
import { setupAuth } from "./replitAuth.js";
import multer from "multer";
import { createConstructorRouter } from "./constructor-feature.js";
import { LocalStorageService } from "./localStorage.js";
import { db } from "./db.js";
import os from 'os';
import { execSync } from 'child_process';

// Импорт модульных роутеров
import { createHealthRouter } from "./routers/health-router.js";
import { createFileRouter } from "./routers/file-router.js";
import { createEcommerceRouter } from "./routers/ecommerce-router.js";
import { createContentRouter } from "./routers/content-router.js";
import { createSettingsRouter } from "./routers/settings-router.js";
import { createFinanceRouter } from "./routers/finance-router.js";
import { createBannerRouter } from "./routers/banner-router.js";
import { createDashboardRouter } from "./routers/dashboard-router.js";
import { createSitePagesRouter } from "./routers/site-pages-router.js";
import { mockAuth } from "./routers/middleware.js";

// Для локальной разработки используем локальное хранилище
const localStorageService = new LocalStorageService();

// Настройка multer для загрузки файлов
const uploadDir = path.join(process.cwd(), 'objects/local-upload');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: multerStorage });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware (отключено для локальной разработки)
  // await setupAuth(app);

  // Подключаем роутер конструктора страниц
  const constructorRouter = createConstructorRouter({ dbInstance: db });
  app.use('/api/constructor', constructorRouter);

  // Подключаем модульные роутеры
  const healthRouter = createHealthRouter();
  const fileRouter = createFileRouter();
  const ecommerceRouter = createEcommerceRouter();
  const contentRouter = createContentRouter();
  const settingsRouter = createSettingsRouter();
  const financeRouter = createFinanceRouter();
  const bannerRouter = createBannerRouter();
  const dashboardRouter = createDashboardRouter();
  const sitePagesRouter = createSitePagesRouter();

  // Применяем mock auth middleware ко всем API маршрутам
  app.use('/api', mockAuth);

  // Подключаем роутеры с соответствующими префиксами
  app.use('/api', healthRouter);
  app.use('/api', fileRouter);
  app.use('/api', ecommerceRouter);
  app.use('/api', contentRouter);
  app.use('/api', settingsRouter);
  app.use('/api', financeRouter);
  app.use('/api/banners', bannerRouter);
  app.use('/api', dashboardRouter);
  app.use('/api', sitePagesRouter);

  // Encoding / locale diagnostics
  app.get('/api/debug/encoding', async (_req, res) => {
    try {
      let dbEncoding: any = null;
      try {
        // Attempt to read server_encoding and database encoding via raw query if pg client available
        // Drizzle with pg: use a raw query through db.$client if exposed; fallback to environment.
        // @ts-ignore
        if (db?.session?.client) {
          // @ts-ignore
          const r = await db.session.client.query("SHOW SERVER_ENCODING");
          dbEncoding = r?.rows?.[0] || null;
        }
      } catch (e) {
        dbEncoding = { error: 'Could not query server encoding', details: String(e) };
      }

      let localeEnv: Record<string, string | undefined> = {};
      ['LANG','LC_ALL','LC_CTYPE','LC_COLLATE','LC_TIME','LC_MESSAGES'].forEach(k => localeEnv[k] = process.env[k]);

      let localeCmd: string | null = null;
      try {
        localeCmd = execSync(process.platform === 'win32' ? 'chcp' : 'locale', { encoding: 'utf8' });
      } catch {
        localeCmd = null;
      }

      res.json({
        process: {
          platform: process.platform,
          nodeVersion: process.version,
          defaultEncoding: Buffer.isEncoding('utf8') ? 'utf8' : 'unknown'
        },
        dbEncoding,
        envLocale: localeEnv,
        systemLocaleOutput: localeCmd,
        suggestions: [
          'Убедитесь что база создана с шаблоном UTF8: CREATE DATABASE yourdb WITH ENCODING "UTF8" TEMPLATE template0 LC_COLLATE="C" LC_CTYPE="C";',
          'В Docker контейнере PostgreSQL убедитесь что переменные LANG/LC_* установлены например en_US.UTF-8 или hy_AM.UTF-8.',
          'Перед миграцией: pg_dump использовать --encoding=UTF8, при восстановлении убедиться что клиентская кодировка \encoding UTF8.',
          'Если увидели ????? вместо текста — это значит данные уже испорчены при вставке. Нужно пересоздать/повторно импортировать из корректного источника.'
        ]
      });
    } catch (e) {
      res.status(500).json({ error: 'encoding_diagnostic_failed', details: String(e) });
    }
  });

  // Local development credential login (replaces disabled Replit auth)
  app.post('/api/login', async (req: any, res) => {
    try {
      const { username, password } = req.body || {};
      if (username === 'admin' && password === 'admin123') {
        const user = await storage.upsertUser({
          id: 'local-admin',
          email: 'admin@local.test',
          firstName: 'Админ',
          lastName: 'Локальный',
          profileImageUrl: null
        });
        // Simple unsigned token placeholder
        const token = 'dev-local-token';
        return res.json({ success: true, token, user: { id: user.id, username: 'admin', role: user.role || 'admin' } });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (e) {
      console.error('Login error', e);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  app.post('/api/logout', async (_req, res) => {
    res.json({ success: true });
  });

  // User management routes (Admin only) - временно отключена аутентификация для локальной разработки
  app.get('/api/users', async (req: any, res) => {
    try {
      // Временный обход аутентификации - возвращаем всех пользователей
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/users/:id/role', mockAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { role } = req.body;
      if (!role || !['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Valid role required (user or admin)" });
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Статическое обслуживание файлов из папки objects
  app.use('/objects', express.static(path.join(process.cwd(), 'objects')));

  const httpServer = createServer(app);
  return httpServer;
}
