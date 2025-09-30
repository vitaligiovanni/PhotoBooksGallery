import { Router } from "express";
import { z } from "zod";
import { BannerService } from "../bannerService";
import { insertBannerSchema } from "../../shared/schema.js";
import { mockAuth, requireAdmin } from "./middleware";

export function createBannerRouter() {
  const router = Router();

  // Получить все активные баннеры для фронтенда
  router.get('/active', async (req, res) => {
    try {
      const targetPage = req.query.page as string;
      const userId = (req as any).user?.claims?.sub;

      const banners = await BannerService.getActiveBanners(targetPage, userId);
      res.json(banners);
    } catch (error) {
      console.error("Error fetching active banners:", error);
      res.status(500).json({ message: "Failed to fetch active banners" });
    }
  });

  // Получить все баннеры для админки
  router.get('/', mockAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const banners = await BannerService.getAllBanners(limit, offset);
      res.json(banners);
    } catch (error) {
      console.error("Error fetching banners:", error);
      res.status(500).json({ message: "Failed to fetch banners" });
    }
  });

  // Получить баннер по ID
  router.get('/:id', mockAuth, requireAdmin, async (req, res) => {
    try {
      const banner = await BannerService.getBannerById(req.params.id);
      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json(banner);
    } catch (error) {
      console.error("Error fetching banner:", error);
      res.status(500).json({ message: "Failed to fetch banner" });
    }
  });

  // Создать новый баннер
  router.post('/', mockAuth, requireAdmin, async (req, res) => {
    try {
      const bannerData = insertBannerSchema.parse(req.body);
      const banner = await BannerService.createBanner(bannerData);
      res.status(201).json(banner);
    } catch (error) {
      console.error("Error creating banner:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid banner data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create banner" });
    }
  });

  // Обновить баннер
  router.put('/:id', mockAuth, requireAdmin, async (req, res) => {
    try {
      const bannerData = insertBannerSchema.partial().parse(req.body);
      const banner = await BannerService.updateBanner(req.params.id, bannerData);
      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json(banner);
    } catch (error) {
      console.error("Error updating banner:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid banner data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update banner" });
    }
  });

  // Удалить баннер
  router.delete('/:id', mockAuth, requireAdmin, async (req, res) => {
    try {
      const success = await BannerService.deleteBanner(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting banner:", error);
      res.status(500).json({ message: "Failed to delete banner" });
    }
  });

  // Активировать/деактивировать баннер
  router.patch('/:id/toggle', mockAuth, requireAdmin, async (req, res) => {
    try {
      const banner = await BannerService.toggleBannerStatus(req.params.id);
      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json(banner);
    } catch (error) {
      console.error("Error toggling banner status:", error);
      res.status(500).json({ message: "Failed to toggle banner status" });
    }
  });

  // Создать тестовый баннер для главной страницы (админ)
  router.post('/seed/test-home', mockAuth, requireAdmin, async (req, res) => {
    try {
      const now = new Date();
      const testBanner = await BannerService.createBanner({
        name: `Тестовый баннер / ${now.toISOString()}`,
        type: 'header',
        title: { ru: 'Тестовый баннер', en: 'Test banner', hy: 'Թեստային բաններ' } as any,
        content: { ru: 'Проверка показа на главной', en: 'Homepage visibility check', hy: 'Գլխավոր էջի տեսանելիության ստուգում' } as any,
        imageUrl: '',
        buttonText: { ru: 'Открыть', en: 'Open', hy: 'Բացել' } as any,
        buttonLink: '/',
        backgroundColor: '#111827',
        textColor: '#ffffff',
        position: 'top',
        size: null as any,
        priority: 100,
        isActive: true,
        status: 'active',
        startDate: null as any,
        endDate: null as any,
        targetPages: ['/', '/home'],
        targetUsers: 'all',
        maxImpressions: null as any,
        maxClicks: null as any,
      } as any);

      res.status(201).json(testBanner);
    } catch (error) {
      console.error('Error seeding test banner:', error);
      res.status(500).json({ message: 'Failed to seed test banner' });
    }
  });

  // Получить статистику баннера
  router.get('/:id/stats', mockAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await BannerService.getBannerStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching banner stats:", error);
      res.status(500).json({ message: "Failed to fetch banner stats" });
    }
  });

  // Записать показ баннера (для фронтенда)
  router.post('/:id/impression', async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const sessionId = req.body.sessionId;
      const pageUrl = req.body.pageUrl;

      const analytics = await BannerService.trackBannerImpression({
        bannerId: req.params.id,
        eventType: 'impression',
        userId: userId || null,
        sessionId: sessionId || null,
        pageUrl: pageUrl || null,
      });

      res.json(analytics);
    } catch (error) {
      console.error("Error tracking banner impression:", error);
      res.status(500).json({ message: "Failed to track banner impression" });
    }
  });

  // Записать клик по баннеру (для фронтенда)
  router.post('/:id/click', async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const sessionId = req.body.sessionId;
      const pageUrl = req.body.pageUrl;

      const analytics = await BannerService.trackBannerClick(
        req.params.id,
        userId,
        sessionId,
        pageUrl
      );

      res.json(analytics);
    } catch (error) {
      console.error("Error tracking banner click:", error);
      res.status(500).json({ message: "Failed to track banner click" });
    }
  });

  return router;
}