import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertUserThemeSchema, insertReviewSchema, BUILT_IN_THEMES } from "../../shared/schema.js";
import { mockAuth, requireAdmin } from "./middleware";

export function createSettingsRouter() {
  const router = Router();

  // Settings API routes
  router.get('/settings', async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  router.get('/settings/:key', async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  router.put('/settings/:key', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const setting = await storage.updateSetting(req.params.key, req.body.value, req.body.description);
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // User theme routes
  router.get('/user/theme', mockAuth, async (req: any, res) => {
    try {
      const userId = 'local-admin'; // For local development
      const theme = await storage.getUserTheme(userId);
      
      // Return user theme or default theme if none exists
      const response = {
        theme: theme || { themeName: 'default', customColors: null },
        availableThemes: Object.values(BUILT_IN_THEMES)
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching user theme:", error);
      res.status(500).json({ message: "Failed to fetch user theme" });
    }
  });

  router.put('/user/theme', mockAuth, async (req: any, res) => {
    try {
      const userId = 'local-admin'; // For local development
      
      // Validate request body
      const validatedData = insertUserThemeSchema.parse({
        userId,
        themeName: req.body.themeName,
        customColors: req.body.customColors || null
      });
      
      const userTheme = await storage.upsertUserTheme(validatedData);
      res.json(userTheme);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid theme data",
          errors: error.errors 
        });
      }
      console.error("Error updating user theme:", error);
      res.status(500).json({ message: "Failed to update user theme" });
    }
  });

  // Review routes
  router.get('/reviews', async (req, res) => {
    try {
      const reviews = await storage.getApprovedReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  router.get('/admin/reviews', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const status = req.query.status as string;
      const reviews = await storage.getReviews(status);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching admin reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  router.post('/reviews', mockAuth, async (req: any, res) => {
    try {
      const userId = 'local-admin'; // For local development
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const reviewData = insertReviewSchema.parse({
        userId: userId,
        authorName: req.body.authorName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Пользователь',
        authorEmail: req.body.authorEmail || user.email,
        profilePhoto: req.body.profilePhoto || null,
        gender: req.body.gender || 'other',
        rating: req.body.rating,
        comment: req.body.comment,
        status: "pending"
      });

      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid review data",
          errors: error.errors 
        });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  router.post('/admin/reviews', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      // Admin can create promoted reviews
      const reviewData = insertReviewSchema.parse({
        userId: null, // No user ID for promoted reviews
        authorName: req.body.authorName,
        authorEmail: req.body.authorEmail || null,
        profilePhoto: req.body.profilePhoto || null,
        gender: req.body.gender || 'other',
        rating: req.body.rating,
        comment: req.body.comment,
        status: "approved", // Auto-approve admin-created reviews
        isPromoted: true,
        sortOrder: req.body.sortOrder || 0
      });

      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid review data",
          errors: error.errors 
        });
      }
      console.error("Error creating promoted review:", error);
      res.status(500).json({ message: "Failed to create promoted review" });
    }
  });

  router.put('/admin/reviews/:id/approve', async (req: any, res) => {
    try {
      const review = await storage.approveReview(req.params.id);
      res.json(review);
    } catch (error) {
      console.error("Error approving review:", error);
      res.status(500).json({ message: "Failed to approve review" });
    }
  });

  router.put('/admin/reviews/:id/reject', async (req: any, res) => {
    try {
      const review = await storage.rejectReview(req.params.id);
      res.json(review);
    } catch (error) {
      console.error("Error rejecting review:", error);
      res.status(500).json({ message: "Failed to reject review" });
    }
  });

  router.delete('/admin/reviews/:id', async (req: any, res) => {
    try {
      await storage.deleteReview(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  return router;
}