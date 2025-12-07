import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import multer from "multer";
import { createConstructorRouter } from "./constructor-feature";
import { LocalStorageService } from "./localStorage";
import { db } from "./db";
import os from 'os';
import { execSync } from 'child_process';

// Импорт модульных роутеров
import { createHealthRouter } from "./routers/health-router";
import { createFileRouter } from "./routers/file-router";
import { createEcommerceRouter } from "./routers/ecommerce-router";
import { createContentRouter } from "./routers/content-router";
import { createSettingsRouter } from "./routers/settings-router";
import { createFinanceRouter } from "./routers/finance-router";
import { createBannerRouter } from "./routers/banner-router";
import { createDashboardRouter } from "./routers/dashboard-router";
import { createSitePagesRouter } from "./routers/site-pages-router";
import { createPopupsRouter } from "./routers/popups-router";
import { createSpecialOffersRouter } from "./routers/special-offers-router";
import { createAuthRouter } from "./routers/auth-router";
import { ordersRouter } from "./routers/orders-router";
import { currencyRouter } from "./routers/currency-router";
import { photoUploadRouter } from "./routers/photo-upload-router";
import { mockAuth, jwtAuth } from "./routers/middleware";
import { devRouter } from "./routers/dev-router";
// AR feature routers (projects + items)
import { createARRouter } from "./routers/ar-router";
import { createARItemsRouter } from "./routers/ar-items-router";

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
  const authRouter = createAuthRouter();
  const healthRouter = createHealthRouter();
  const fileRouter = createFileRouter();
  const ecommerceRouter = createEcommerceRouter();
  const contentRouter = createContentRouter();
  const settingsRouter = createSettingsRouter();
  const financeRouter = createFinanceRouter();
  const bannerRouter = createBannerRouter();
  const dashboardRouter = createDashboardRouter();
  const sitePagesRouter = createSitePagesRouter();
  const popupsRouter = createPopupsRouter();
  const specialOffersRouter = createSpecialOffersRouter();

  // Auth router должен быть подключен БЕЗ middleware, так как он сам обрабатывает аутентификацию
  app.use('/api/auth', authRouter);

  // Применяем auth middleware ко всем остальным API маршрутам (кроме auth и публичных)
  // В production используем JWT auth, в development - mock auth
  // Auth selection: prefer JWT in production; allow override via FORCE_JWT_AUTH=1
  const authMiddleware = (process.env.FORCE_JWT_AUTH === '1' || process.env.NODE_ENV === 'production') ? jwtAuth : mockAuth;
  
  // Список публичных роутов, которые не требуют авторизации
  const publicRoutes = [
    '/auth',
    '/categories',
    '/products',
    '/catalog',       // Path-based catalog endpoint
    '/currencies',
    '/exchange-rates',
    '/reviews',
    '/settings',
    '/banners',
    '/popups',
    '/special-offers',
    '/site-pages',
    '/blog',
    '/health',
    '/debug',
    '/dev',           // Development endpoints (host-info и др.)
    '/objects',       // Статические файлы
    '/admin',         // ВРЕМЕННО для отладки CRM панели
    '/upload/admin',  // ВРЕМЕННО для управления загрузками
    '/users',         // ВРЕМЕННО для списка пользователей
    '/local-upload',  // Загрузка файлов через formidable
    '/ar/create-demo', // AR demo endpoint (публичный для пользователей без регистрации)
    '/ar/status'       // Публичный статус AR проекта для опроса фронтом/скриптами
  ];
  
  // Публичные endpoints с методами POST/PUT/DELETE (для клиентов без авторизации)
  const publicMethods = [
    { path: '/upload/session', method: 'POST' },      // Создание сессии загрузки фото
    { path: '/upload/complete', method: 'POST' },     // Завершение загрузки
    { path: '/upload/local/', method: 'PUT' },        // Загрузка файлов на локальный storage (клиенты)
    { path: '/local-upload', method: 'POST' },        // Загрузка файлов через formidable (admin)
    { path: '/orders/simple', method: 'POST' },       // Создание простого заказа
    { path: '/constructor/pages', method: 'GET' },    // Получение страниц конструктора
  ];
  
  app.use('/api', (req, res, next) => {
    // Проверяем если путь начинается с одного из публичных роутов (GET запросы)
    const isPublicGet = publicRoutes.some(route => req.path.startsWith(route));
    if (isPublicGet) {
      return next(); // Пропускаем публичные роуты
    }
    
    // Проверяем публичные методы (POST/PUT/DELETE)
    const isPublicMethod = publicMethods.some(pm => 
      req.path.startsWith(pm.path) && req.method === pm.method
    );
    if (isPublicMethod) {
      return next(); // Пропускаем публичные методы
    }
    
    return authMiddleware(req, res, next);
  });

  // Подключаем роутеры с соответствующими префиксами
  // ВАЖНО: orders роутер должен быть ДО ecommerce, так как у них есть конфликтующий роут /orders
  app.use('/api/orders', ordersRouter);
  app.use('/api/currencies', currencyRouter);
  app.use('/api', currencyRouter); // для /api/exchange-rates
  app.use('/api/upload', photoUploadRouter);
  // Development utilities
  app.use('/api/dev', devRouter);
  app.use('/api', healthRouter);
  app.use('/api', fileRouter);
  app.use('/api', ecommerceRouter);
  app.use('/api', contentRouter);
  app.use('/api', settingsRouter);
  app.use('/api', financeRouter);
  app.use('/api/banners', bannerRouter);
  app.use('/api', dashboardRouter);
  app.use('/api', sitePagesRouter);
  app.use('/api/popups', popupsRouter);
  app.use('/api/special-offers', specialOffersRouter);
  // AR routers (mounted after auth middleware so they require auth unless in development mockAuth)
  const arRouter = createARRouter();
  const arItemsRouter = createARItemsRouter();
  app.use('/api/ar', arRouter);
  app.use('/api/ar', arItemsRouter);
  
  // CRITICAL: Duplicate /ar routes WITHOUT /api prefix for QR codes and ngrok direct access
  // QR codes generate URLs like https://.../ar/view/demo-xxx (not /api/ar/view/demo-xxx)
  app.use('/ar', arRouter);


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

  // Удалено дублирующие роуты - они теперь обрабатываются в /api/auth

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

  app.put('/api/users/:id/role', mockAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
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
