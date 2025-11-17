import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { popups, insertPopupSchema } from "../../../shared/schema";
import { eq, and, isNull, gte, lte, or, sql } from "drizzle-orm";
import { mockAuth, requireAdmin } from "./middleware";

export function createPopupsRouter() {
  const router = Router();

  // Получить все активные попапы для фронтенда
  router.get('/active', async (req, res) => {
    try {
      const targetPage = req.query.page as string;
      const userId = (req as any).user?.claims?.sub;
      const now = new Date();

      let query = db
        .select()
        .from(popups)
        .where(
          and(
            eq(popups.isActive, true),
            eq(popups.status, 'active'),
            or(
              isNull(popups.startDate),
              lte(popups.startDate, now)
            ),
            or(
              isNull(popups.endDate),
              gte(popups.endDate, now)
            )
          )
        );

      const activePopups = await query;

      // Фильтрация по странице если указана
      const filteredPopups = targetPage 
        ? activePopups.filter(popup => 
            !popup.targetPages || 
            popup.targetPages.length === 0 || 
            popup.targetPages.includes(targetPage)
          )
        : activePopups;

      res.json(filteredPopups);
    } catch (error) {
      console.error("Error fetching active popups:", error);
      res.status(500).json({ message: "Failed to fetch active popups" });
    }
  });

  // Получить все попапы для админки
  router.get('/', mockAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const allPopups = await db
        .select()
        .from(popups)
        .limit(limit)
        .offset(offset)
        .orderBy(popups.createdAt);

      res.json(allPopups);
    } catch (error) {
      console.error("Error fetching popups:", error);
      res.status(500).json({ message: "Failed to fetch popups" });
    }
  });

  // Получить попап по ID
  router.get('/:id', mockAuth, requireAdmin, async (req, res) => {
    try {
      const [popup] = await db
        .select()
        .from(popups)
        .where(eq(popups.id, req.params.id));

      if (!popup) {
        return res.status(404).json({ message: "Popup not found" });
      }

      res.json(popup);
    } catch (error) {
      console.error("Error fetching popup:", error);
      res.status(500).json({ message: "Failed to fetch popup" });
    }
  });

  // Создать новый попап
  router.post('/', mockAuth, requireAdmin, async (req, res) => {
    try {
      const popupData = insertPopupSchema.parse(req.body);
      
      const [newPopup] = await db
        .insert(popups)
        .values(popupData)
        .returning();

      res.status(201).json(newPopup);
    } catch (error) {
      console.error("Error creating popup:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid popup data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create popup" });
    }
  });

  // Обновить попап
  router.put('/:id', mockAuth, requireAdmin, async (req, res) => {
    try {
      const popupData = insertPopupSchema.partial().parse(req.body);
      
      const updateData: any = { ...popupData, updatedAt: new Date() };
      const [updatedPopup] = await db
        .update(popups)
        .set(updateData)
        .where(eq(popups.id, req.params.id))
        .returning();

      if (!updatedPopup) {
        return res.status(404).json({ message: "Popup not found" });
      }

      res.json(updatedPopup);
    } catch (error) {
      console.error("Error updating popup:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid popup data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update popup" });
    }
  });

  // Удалить попап
  router.delete('/:id', mockAuth, requireAdmin, async (req, res) => {
    try {
      const [deletedPopup] = await db
        .delete(popups)
        .where(eq(popups.id, req.params.id))
        .returning({ id: popups.id });

      if (!deletedPopup) {
        return res.status(404).json({ message: "Popup not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting popup:", error);
      res.status(500).json({ message: "Failed to delete popup" });
    }
  });

  // Активировать/деактивировать попап
  router.patch('/:id/toggle', mockAuth, requireAdmin, async (req, res) => {
    try {
      // Сначала получаем текущий статус
      const [currentPopup] = await db
        .select()
        .from(popups)
        .where(eq(popups.id, req.params.id));

      if (!currentPopup) {
        return res.status(404).json({ message: "Popup not found" });
      }

      const newStatus = currentPopup.isActive ? false : true;
      const newStatusText = newStatus ? 'active' : 'paused';

      const toggleData: any = { isActive: newStatus, status: newStatusText, updatedAt: new Date() };
      const [updatedPopup] = await db
        .update(popups)
        .set(toggleData)
        .where(eq(popups.id, req.params.id))
        .returning();

      res.json(updatedPopup);
    } catch (error) {
      console.error("Error toggling popup status:", error);
      res.status(500).json({ message: "Failed to toggle popup status" });
    }
  });

  // Записать показ попапа (для фронтенда)
  router.post('/:id/impression', async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      
      // Увеличиваем счетчик показов
      const incImp: any = { currentImpressions: sql`${popups.currentImpressions} + 1` };
      await db.update(popups).set(incImp).where(eq(popups.id, req.params.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking popup impression:", error);
      res.status(500).json({ message: "Failed to track popup impression" });
    }
  });

  // Записать клик по попапу (для фронтенда)
  router.post('/:id/click', async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;

      // Увеличиваем счетчик кликов
      const incClick: any = { currentClicks: sql`${popups.currentClicks} + 1` };
      await db.update(popups).set(incClick).where(eq(popups.id, req.params.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking popup click:", error);
      res.status(500).json({ message: "Failed to track popup click" });
    }
  });

  return router;
}