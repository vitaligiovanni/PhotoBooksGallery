import { db } from './db';
import { banners, bannerAnalytics, insertBannerSchema, insertBannerAnalyticsSchema } from '../shared/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { Banner, InsertBanner, BannerAnalytics, InsertBannerAnalytics } from '../shared/schema.js';

export class BannerService {
  // Простое кэширование активных баннеров по странице (на 30 секунд)
  private static activeCache: Map<string, { data: Banner[]; expiresAt: number }> = new Map();
  private static CACHE_TTL_MS = 30_000; // 30 seconds

  private static cacheKey(targetPage?: string, userId?: string) {
    // userId пока не влияет, но оставим в ключе на будущее
    return `${targetPage || '*'}::${userId || 'anon'}`;
  }

  private static getFromCache(targetPage?: string, userId?: string): Banner[] | null {
    const key = this.cacheKey(targetPage, userId);
    const hit = this.activeCache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
    if (hit) this.activeCache.delete(key);
    return null;
  }

  private static setCache(targetPage: string | undefined, userId: string | undefined, data: Banner[]) {
    const key = this.cacheKey(targetPage, userId);
    this.activeCache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
  }

  private static invalidateActiveCache() {
    this.activeCache.clear();
  }
  // Получить все активные баннеры для отображения
  static async getActiveBanners(targetPage?: string, userId?: string): Promise<Banner[]> {
    // cache lookup
    const cached = this.getFromCache(targetPage, userId);
    if (cached) return cached;

    const now = new Date();
    let conditions = [
      eq(banners.isActive, true),
      eq(banners.status, 'active'),
      // Active window:
      // (startDate IS NULL OR startDate <= now) AND (endDate IS NULL OR endDate >= now)
      sql`( "start_date" IS NULL OR ${banners.startDate} <= ${now} )`,
      sql`( "end_date" IS NULL OR ${banners.endDate} >= ${now} )`,
    ];

    // Фильтр по целевой странице
    if (targetPage) {
      // If targetPages is array of strings, we can match by simple LIKE any
      // Using SQL for array contains ANY matching
      conditions.push(sql`${banners.targetPages} IS NULL OR ${banners.targetPages} = '{}'::text[] OR ${targetPage} = ANY(${banners.targetPages})`);
    }

    // Фильтр по целевым пользователям
    if (userId) {
      // TODO: Implement user targeting logic
    }

    const result = await db
      .select()
      .from(banners)
      .where(and(...conditions))
      .orderBy(desc(banners.priority), desc(banners.createdAt));

    // cache store
    this.setCache(targetPage, userId, result);
    return result;
  }

  // Получить баннер по ID
  static async getBannerById(id: string): Promise<Banner | null> {
    const result = await db
      .select()
      .from(banners)
      .where(eq(banners.id, id))
      .limit(1);

    return result[0] || null;
  }

  // Создать новый баннер
  static async createBanner(data: InsertBanner): Promise<Banner> {
    const validatedData = insertBannerSchema.parse(data);
    const result = await db
      .insert(banners)
      .values(validatedData)
      .returning();
    this.invalidateActiveCache();

    return result[0];
  }

  // Обновить баннер
  static async updateBanner(id: string, data: Partial<InsertBanner>): Promise<Banner | null> {
    const result = await db
      .update(banners)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(banners.id, id))
      .returning();
    this.invalidateActiveCache();

    return result[0] || null;
  }

  // Удалить баннер
  static async deleteBanner(id: string): Promise<boolean> {
    const result = await db
      .delete(banners)
      .where(eq(banners.id, id))
      .returning({ id: banners.id });
    if (result.length > 0) this.invalidateActiveCache();

    return result.length > 0;
  }

  // Записать аналитику показа баннера
  static async trackBannerImpression(data: InsertBannerAnalytics): Promise<BannerAnalytics> {
    const validatedData = insertBannerAnalyticsSchema.parse(data);

    // Обновляем счетчик показов в самом баннере
    if (data.bannerId) {
      await db
        .update(banners)
        .set({
          currentImpressions: sql`${banners.currentImpressions} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(banners.id, data.bannerId));
      this.invalidateActiveCache();
    }

    const result = await db
      .insert(bannerAnalytics)
      .values(validatedData)
      .returning();

    return result[0];
  }

  // Записать аналитику клика по баннеру
  static async trackBannerClick(bannerId: string, userId?: string, sessionId?: string, pageUrl?: string): Promise<BannerAnalytics> {
    // Обновляем счетчик кликов в самом баннере
    await db
      .update(banners)
      .set({
        currentClicks: sql`${banners.currentClicks} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(banners.id, bannerId));
    this.invalidateActiveCache();

    const analyticsData: InsertBannerAnalytics = {
      bannerId,
      eventType: 'click',
      userId: userId || null,
      sessionId: sessionId || null,
      pageUrl: pageUrl || null,
    };

    return this.trackBannerImpression(analyticsData);
  }

  // Получить статистику баннера
  static async getBannerStats(bannerId: string): Promise<{
    impressions: number;
    clicks: number;
    ctr: number;
  }> {
    const banner = await this.getBannerById(bannerId);
    if (!banner) {
      throw new Error('Banner not found');
    }

    const impressions = banner.currentImpressions || 0;
    const clicks = banner.currentClicks || 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return {
      impressions,
      clicks,
      ctr: Math.round(ctr * 100) / 100, // Округляем до 2 знаков
    };
  }

  // Получить все баннеры для админки
  static async getAllBanners(limit: number = 50, offset: number = 0): Promise<Banner[]> {
    const result = await db
      .select()
      .from(banners)
      .orderBy(desc(banners.createdAt))
      .limit(limit)
      .offset(offset);

    return result;
  }

  // Активировать/деактивировать баннер
  static async toggleBannerStatus(id: string): Promise<Banner | null> {
    const banner = await this.getBannerById(id);
    if (!banner) return null;

    const updated = await this.updateBanner(id, {
      isActive: !banner.isActive,
      status: !banner.isActive ? 'active' : 'paused',
    });
    this.invalidateActiveCache();
    return updated;
  }
}