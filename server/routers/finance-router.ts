import { Router } from "express";
import { storage } from "../storage";
import { insertCurrencySchema, insertExchangeRateSchema } from "@shared/schema";
import { mockAuth, requireAdmin } from "./middleware";

export function createFinanceRouter() {
  const router = Router();

  // Currency API routes
  router.get('/currencies', async (req, res) => {
    try {
      const currencies = await storage.getCurrencies();
      res.json(currencies);
    } catch (error) {
      console.error("Error fetching currencies:", error);
      res.status(500).json({ message: "Failed to fetch currencies" });
    }
  });

  router.get('/currencies/base', async (req, res) => {
    try {
      const baseCurrency = await storage.getBaseCurrency();
      res.json(baseCurrency);
    } catch (error) {
      console.error("Error fetching base currency:", error);
      res.status(500).json({ message: "Failed to fetch base currency" });
    }
  });

  router.get('/exchange-rates', async (req, res) => {
    try {
      const rates = await storage.getExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  // Admin-only currency management routes
  router.post('/admin/currencies', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const currencyData = insertCurrencySchema.parse(req.body);
      const currency = await storage.createCurrency(currencyData);
      res.status(201).json(currency);
    } catch (error) {
      console.error("Error creating currency:", error);
      res.status(500).json({ message: "Failed to create currency" });
    }
  });

  // Update currency metadata (admin only)
  router.put('/admin/currencies/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const updated = await storage.updateCurrency(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating currency:", error);
      res.status(500).json({ message: "Failed to update currency" });
    }
  });

  // Delete currency (admin only)
  router.delete('/admin/currencies/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteCurrency(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting currency:", error);
      res.status(500).json({ message: "Failed to delete currency" });
    }
  });

  router.post('/admin/exchange-rates', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const rateData = insertExchangeRateSchema.parse(req.body);
      const rate = await storage.createExchangeRate(rateData);
      res.status(201).json(rate);
    } catch (error) {
      console.error("Error creating exchange rate:", error);
      res.status(500).json({ message: "Failed to create exchange rate" });
    }
  });

  // Delete exchange rate (admin only)
  router.delete('/admin/exchange-rates/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteExchangeRate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting exchange rate:", error);
      res.status(500).json({ message: "Failed to delete exchange rate" });
    }
  });

  // Update base currency (admin only)
  router.put('/currencies/base', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const { baseCurrencyId } = req.body;
      if (!baseCurrencyId) {
        return res.status(400).json({ message: "baseCurrencyId is required" });
      }

      await storage.setBaseCurrency(baseCurrencyId);
      const baseCurrency = await storage.getBaseCurrency();
      res.json(baseCurrency);
    } catch (error) {
      console.error("Error updating base currency:", error);
      res.status(500).json({ message: "Failed to update base currency" });
    }
  });

  // Update exchange rate (admin only)
  router.put('/exchange-rates/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const { rate } = req.body;
      if (!rate || rate <= 0) {
        return res.status(400).json({ message: "Valid rate is required" });
      }

      const updatedRate = await storage.updateExchangeRate(req.params.id, { rate: rate.toString() });
      res.json(updatedRate);
    } catch (error) {
      console.error("Error updating exchange rate:", error);
      res.status(500).json({ message: "Failed to update exchange rate" });
    }
  });

  return router;
}