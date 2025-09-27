import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertCategorySchema, insertProductSchema, insertOrderSchema } from "@shared/schema";
import { ObjectStorageService } from "../objectStorage";
import { mockAuth, requireAdmin } from "./middleware";

export function createEcommerceRouter() {
  const router = Router();

  // Category routes
  router.get('/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  router.post('/categories', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      
      // Normalize image URL if it's a Google Storage URL
      if (categoryData.imageUrl && categoryData.imageUrl.startsWith('https://storage.googleapis.com/')) {
        const objectStorageService = new ObjectStorageService();
        categoryData.imageUrl = objectStorageService.normalizeObjectEntityPath(categoryData.imageUrl);
        console.log('Normalized category image URL:', categoryData.imageUrl);
      }
      
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  router.put('/categories/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const categoryData = insertCategorySchema.partial().parse(req.body);
      
      // Normalize image URL if it's a Google Storage URL
      if (categoryData.imageUrl && categoryData.imageUrl.startsWith('https://storage.googleapis.com/')) {
        const objectStorageService = new ObjectStorageService();
        categoryData.imageUrl = objectStorageService.normalizeObjectEntityPath(categoryData.imageUrl);
        console.log('Normalized category image URL:', categoryData.imageUrl);
      }
      
      const category = await storage.updateCategory(req.params.id, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  router.delete('/categories/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Product routes
  router.get('/products', async (req, res) => {
    try {
      const categorySlug = req.query.category as string;
      let categoryId: string | undefined;
      
      if (categorySlug) {
        // Find category by slug first
        const categories = await storage.getCategories();
        const category = categories.find(cat => cat.slug === categorySlug);
        categoryId = category?.id;
      }
      
      const products = await storage.getProducts(categoryId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  router.get('/products/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query required" });
      }
      const products = await storage.searchProducts(query);
      res.json(products);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  router.get('/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  router.post('/products', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      
      // Ensure categoryId is not empty string - convert to null if empty
      if (productData.categoryId === "" || !productData.categoryId) {
        return res.status(400).json({ message: "Выберите категорию для товара" });
      }

      // Normalize image and video URLs if they are Google Storage URLs
      const objectStorageService = new ObjectStorageService();
      
      // Normalize image URLs
      if (productData.imageUrl && productData.imageUrl.startsWith('https://storage.googleapis.com/')) {
        productData.imageUrl = objectStorageService.normalizeObjectEntityPath(productData.imageUrl);
        console.log('Normalized product image URL:', productData.imageUrl);
      }
      
      if (productData.images) {
        productData.images = productData.images.map((img: string) =>
          img.startsWith('https://storage.googleapis.com/')
            ? objectStorageService.normalizeObjectEntityPath(img)
            : img
        );
      }
      
      // Normalize video URLs
      if (productData.videoUrl && productData.videoUrl.startsWith('https://storage.googleapis.com/')) {
        productData.videoUrl = objectStorageService.normalizeObjectEntityPath(productData.videoUrl);
        console.log('Normalized product video URL:', productData.videoUrl);
      }
      
      if (productData.videos) {
        productData.videos = productData.videos.map((video: string) =>
          video.startsWith('https://storage.googleapis.com/')
            ? objectStorageService.normalizeObjectEntityPath(video)
            : video
        );
      }
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof Error && error.message?.includes('violates foreign key constraint')) {
        return res.status(400).json({ message: "Выбранная категория не существует" });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  router.put('/products/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      
      // Clean empty strings for numeric fields to prevent database errors
      const cleanedData: any = { ...productData };
      const numericFields = [
        'price', 'originalPrice', 'additionalSpreadPrice', 'weight',
        'minCustomPrice', 'costPrice', 'materialCosts', 'laborCosts',
        'overheadCosts', 'shippingCosts', 'otherCosts', 'expectedProfitMargin'
      ];
      
      numericFields.forEach(field => {
        if (cleanedData[field] === '') {
          delete cleanedData[field]; // Remove empty string fields
        }
      });
      
      // Clean empty strings for foreign key fields
      const foreignKeyFields = [
        'currencyId', 'categoryId', 'costCurrencyId',
        'additionalSpreadCurrencyId', 'minCustomPriceCurrencyId'
      ];
      
      foreignKeyFields.forEach(field => {
        if (cleanedData[field] === '') {
          cleanedData[field] = null;
        }
      });

      // Normalize image and video URLs if they are Google Storage URLs
      const objectStorageService = new ObjectStorageService();
      
      // Normalize image URLs
      if (cleanedData.imageUrl && cleanedData.imageUrl.startsWith('https://storage.googleapis.com/')) {
        cleanedData.imageUrl = objectStorageService.normalizeObjectEntityPath(cleanedData.imageUrl);
        console.log('Normalized product image URL:', cleanedData.imageUrl);
      }
      
      if (cleanedData.images) {
        cleanedData.images = cleanedData.images.map((img: string) =>
          img.startsWith('https://storage.googleapis.com/')
            ? objectStorageService.normalizeObjectEntityPath(img)
            : img
        );
      }
      
      // Normalize video URLs
      if (cleanedData.videoUrl && cleanedData.videoUrl.startsWith('https://storage.googleapis.com/')) {
        cleanedData.videoUrl = objectStorageService.normalizeObjectEntityPath(cleanedData.videoUrl);
        console.log('Normalized product video URL:', cleanedData.videoUrl);
      }
      
      if (cleanedData.videos) {
        cleanedData.videos = cleanedData.videos.map((video: string) =>
          video.startsWith('https://storage.googleapis.com/')
            ? objectStorageService.normalizeObjectEntityPath(video)
            : video
        );
      }
      
      const product = await storage.updateProduct(req.params.id, cleanedData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  router.delete('/products/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  router.patch('/products/:id/costs', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      // Validate cost data - convert empty strings to null or 0
      const costsData = {
        costPrice: req.body.costPrice && req.body.costPrice !== '' ? req.body.costPrice : '0',
        costCurrencyId: req.body.costCurrencyId && req.body.costCurrencyId !== '' ? req.body.costCurrencyId : null,
        materialCosts: req.body.materialCosts && req.body.materialCosts !== '' ? req.body.materialCosts : '0',
        laborCosts: req.body.laborCosts && req.body.laborCosts !== '' ? req.body.laborCosts : '0',
        overheadCosts: req.body.overheadCosts && req.body.overheadCosts !== '' ? req.body.overheadCosts : '0',
        shippingCosts: req.body.shippingCosts && req.body.shippingCosts !== '' ? req.body.shippingCosts : '0',
        otherCosts: req.body.otherCosts && req.body.otherCosts !== '' ? req.body.otherCosts : '0',
        expectedProfitMargin: req.body.expectedProfitMargin && req.body.expectedProfitMargin !== '' ? req.body.expectedProfitMargin : '30',
      };

      const product = await storage.updateProduct(req.params.id, costsData);
      res.json(product);
    } catch (error) {
      console.error("Error updating product costs:", error);
      res.status(500).json({ message: "Failed to update product costs" });
    }
  });

  // Order routes
  router.get('/orders', mockAuth, async (req: any, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  router.get('/orders/:id', mockAuth, async (req: any, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  router.post('/orders', async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  router.put('/orders/:id', mockAuth, requireAdmin, async (req: any, res) => {
    try {
      const orderData = insertOrderSchema.partial().parse(req.body);
      const order = await storage.updateOrder(req.params.id, orderData);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  return router;
}