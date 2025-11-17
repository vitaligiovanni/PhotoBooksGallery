import { Router } from 'express';
import { storage } from '../storage';
import { mockAuth, requireAdmin } from './middleware';

const router = Router();

// GET /api/currencies - получить все валюты
router.get('/', async (req, res) => {
  try {
    const currencies = await storage.getCurrencies();
    res.json(currencies);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

// GET /api/currencies/base - получить базовую валюту
router.get('/base', async (req, res) => {
  try {
    const baseCurrency = await storage.getBaseCurrency();
    if (!baseCurrency) {
      return res.status(404).json({ error: 'Base currency not found' });
    }
    res.json(baseCurrency);
  } catch (error) {
    console.error('Error fetching base currency:', error);
    res.status(500).json({ error: 'Failed to fetch base currency' });
  }
});

// GET /api/exchange-rates - получить курсы валют
router.get('/exchange-rates', async (req, res) => {
  try {
    const exchangeRates = await storage.getExchangeRates();
    res.json(exchangeRates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// PUT /api/currencies/base - установить базовую валюту (админ)
router.put('/base', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { baseCurrencyId } = req.body;
    if (!baseCurrencyId) {
      return res.status(400).json({ error: 'baseCurrencyId is required' });
    }
    
    await storage.setBaseCurrency(baseCurrencyId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting base currency:', error);
    res.status(500).json({ error: 'Failed to set base currency' });
  }
});

// POST /api/admin/currencies - создать валюту (админ)
router.post('/admin/currencies', mockAuth, requireAdmin, async (req, res) => {
  try {
    const currency = await storage.createCurrency(req.body);
    res.json(currency);
  } catch (error) {
    console.error('Error creating currency:', error);
    res.status(500).json({ error: 'Failed to create currency' });
  }
});

// PUT /api/admin/currencies/:id - обновить валюту (админ)
router.put('/admin/currencies/:id', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currency = await storage.updateCurrency(id, req.body);
    res.json(currency);
  } catch (error) {
    console.error('Error updating currency:', error);
    res.status(500).json({ error: 'Failed to update currency' });
  }
});

// DELETE /api/admin/currencies/:id - удалить валюту (админ)
router.delete('/admin/currencies/:id', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteCurrency(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting currency:', error);
    res.status(500).json({ error: 'Failed to delete currency' });
  }
});

// POST /api/admin/exchange-rates - создать курс валют (админ)
router.post('/admin/exchange-rates', mockAuth, requireAdmin, async (req, res) => {
  try {
    const exchangeRate = await storage.createExchangeRate(req.body);
    res.json(exchangeRate);
  } catch (error) {
    console.error('Error creating exchange rate:', error);
    res.status(500).json({ error: 'Failed to create exchange rate' });
  }
});

// PUT /api/exchange-rates/:id - обновить курс валют (админ)
router.put('/exchange-rates/:id', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rate } = req.body;
    const exchangeRate = await storage.updateExchangeRate(id, { rate });
    res.json(exchangeRate);
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json({ error: 'Failed to update exchange rate' });
  }
});

// DELETE /api/admin/exchange-rates/:id - удалить курс валют (админ)
router.delete('/admin/exchange-rates/:id', mockAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteExchangeRate(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting exchange rate:', error);
    res.status(500).json({ error: 'Failed to delete exchange rate' });
  }
});

export { router as currencyRouter };