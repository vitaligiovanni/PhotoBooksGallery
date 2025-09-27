import { Router } from "express";
import { testDatabaseConnection, db } from "../db";
import fs from 'fs';
import path from 'path';

export function createHealthRouter() {
  const router = Router();

  // Маршрут проверки подключения к базе данных
  router.get('/health/db', async (req, res) => {
    try {
      const result = await testDatabaseConnection();
      if (result.success) {
        res.json({ ok: true, message: "База данных подключена успешно", test: result.result });
      } else {
        res.status(500).json({ ok: false, message: "Ошибка подключения к базе данных", error: result.error });
      }
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ ok: false, message: "Ошибка проверки базы данных", error });
    }
  });

  // Mock auth route для локальной разработки
  router.get('/auth/user', async (req: any, res) => {
    res.json({
      id: 'local-admin',
      email: 'admin@local.test',
      firstName: 'Админ',
      lastName: 'Локальный',
      role: 'admin',
      profileImageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  // Новый агрегированный health endpoint
  router.get('/health', async (_req, res) => {
    const startedAt = process.uptime(); // seconds
    let gitCommit: string | null = null;
    try {
      gitCommit = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
    } catch { /* ignore */ }

    // DB check
    const dbStatus = await testDatabaseConnection();

    // Простая эвристика: считаем файлы миграций и пытемся получить список таблиц
    let migrationsCount = 0;
    try {
      const migDir = path.join(process.cwd(), 'migrations');
      const files = fs.readdirSync(migDir).filter(f => /\.sql$/.test(f));
      migrationsCount = files.length;
    } catch { /* ignore */ }

    // Пытаемся получить число таблиц (упрощенно)
    let tablesCount: number | null = null;
    try {
      const result: any = await db.execute("SELECT count(*)::text as count FROM information_schema.tables WHERE table_schema='public'");
      const firstRow = result?.rows?.[0];
      if (firstRow && typeof firstRow.count === 'string') {
        tablesCount = parseInt(firstRow.count, 10);
      }
    } catch { /* ignore */ }

    res.json({
      ok: dbStatus.success,
      uptimeSeconds: Math.round(startedAt),
      gitCommit,
      database: dbStatus.success ? 'up' : 'down',
      migrationsCount,
      tablesCount,
      timestamp: new Date().toISOString()
    });
  });

  return router;
}