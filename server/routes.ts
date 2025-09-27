import type { Express } from "express";
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
import { mockAuth } from "./routers/middleware";

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
