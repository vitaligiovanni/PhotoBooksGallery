import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { specialOffers, insertSpecialOfferSchema } from "../../../shared/schema";
import { eq, and, isNull, gte, lte, or } from "drizzle-orm";
import { mockAuth, requireAdmin } from "./middleware";

export function createSpecialOffersRouter() {
  const router = Router();

  // Получить все активные специальные предложения для фронтенда
  router.get('/active', async (req, res) => {
    try {
      const now = new Date();

      const activeOffers = await db
        .select()
        .from(specialOffers)
        .where(
          and(
            eq(specialOffers.isActive, true),
            eq(specialOffers.status, 'active'),
            or(
              isNull(specialOffers.startDate),
              lte(specialOffers.startDate, now)
            ),
            or(
              isNull(specialOffers.endDate),
              gte(specialOffers.endDate, now)
            )
          )
        );

      res.json(activeOffers);
    } catch (error) {
      console.error("Error fetching active special offers:", error);
      res.status(500).json({ message: "Failed to fetch active special offers" });
    }
  });

  // Получить все специальные предложения для админки
  router.get('/', mockAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const allOffers = await db
        .select()
        .from(specialOffers)
        .limit(limit)
        .offset(offset)
        .orderBy(specialOffers.createdAt);

      res.json(allOffers);
    } catch (error) {
      console.error("Error fetching special offers:", error);
      res.status(500).json({ message: "Failed to fetch special offers" });
    }
  });

  // Создать новое специальное предложение
  router.post('/', mockAuth, requireAdmin, async (req, res) => {
    try {
      const offerData = insertSpecialOfferSchema.parse(req.body);
      
      const [newOffer] = await db
        .insert(specialOffers)
        .values(offerData)
        .returning();

      res.status(201).json(newOffer);
    } catch (error) {
      console.error("Error creating special offer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid offer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create special offer" });
    }
  });

  // Обновить специальное предложение
  router.put('/:id', mockAuth, requireAdmin, async (req, res) => {
    try {
      const offerData = insertSpecialOfferSchema.partial().parse(req.body);
      
      const [updatedOffer] = await db
        .update(specialOffers)
        .set({
          ...offerData,
          updatedAt: new Date()
        })
        .where(eq(specialOffers.id, req.params.id))
        .returning();

      if (!updatedOffer) {
        return res.status(404).json({ message: "Special offer not found" });
      }

      res.json(updatedOffer);
    } catch (error) {
      console.error("Error updating special offer:", error);
      res.status(500).json({ message: "Failed to update special offer" });
    }
  });

  // Удалить специальное предложение
  router.delete('/:id', mockAuth, requireAdmin, async (req, res) => {
    try {
      const [deletedOffer] = await db
        .delete(specialOffers)
        .where(eq(specialOffers.id, req.params.id))
        .returning({ id: specialOffers.id });

      if (!deletedOffer) {
        return res.status(404).json({ message: "Special offer not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting special offer:", error);
      res.status(500).json({ message: "Failed to delete special offer" });
    }
  });

  return router;
}