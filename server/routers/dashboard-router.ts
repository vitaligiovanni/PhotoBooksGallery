import { Router } from "express";
import { db } from "../db";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import {
  orders,
  users,
  products,
  reviews,
  analyticsEvents,
} from "@shared/schema";
import { mockAuth, requireAdmin } from "./middleware";

export function createDashboardRouter() {
  const router = Router();

  // Helper: periods
  const getPeriods = (days = 30) => {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - days);
    const previousStart = new Date(currentStart);
    previousStart.setDate(currentStart.getDate() - days);
    return { now, currentStart, previousStart };
  };

  // GET /admin/dashboard/stats
  router.get("/admin/dashboard/stats", mockAuth, requireAdmin, async (req, res) => {
    try {
      const { currentStart, previousStart, now } = getPeriods(30);

      // Fetch core data
      const [allOrders, currentOrders, previousOrders, allUsers, newUsers, previousPeriodNewUsers, allProducts, lowStock, allReviews, pendingReviewsList, allEvents, currentEvents, previousEvents] = await Promise.all([
        db.select().from(orders).orderBy(desc(orders.createdAt)),
        db.select().from(orders).where(and(gte(orders.createdAt, currentStart), lt(orders.createdAt, now))).orderBy(desc(orders.createdAt)),
        db.select().from(orders).where(and(gte(orders.createdAt, previousStart), lt(orders.createdAt, currentStart))).orderBy(desc(orders.createdAt)),
        db.select().from(users),
        db.select().from(users).where(and(gte(users.createdAt as any, currentStart), lt(users.createdAt as any, now))),
        db.select().from(users).where(and(gte(users.createdAt as any, previousStart), lt(users.createdAt as any, currentStart))),
        db.select().from(products),
        db.select().from(products).where(and(eq(products.inStock, true), lt(products.stockQuantity, 5))),
        db.select().from(reviews),
        db.select().from(reviews).where(eq(reviews.status as any, 'pending')),
        db.select().from(analyticsEvents),
        db.select().from(analyticsEvents).where(and(gte(analyticsEvents.createdAt as any, currentStart), lt(analyticsEvents.createdAt as any, now))),
        db.select().from(analyticsEvents).where(and(gte(analyticsEvents.createdAt as any, previousStart), lt(analyticsEvents.createdAt as any, currentStart))),
      ]);

      const sum = (arr: any[], key: string) => arr.reduce((acc, it) => acc + (it[key] ? parseFloat(it[key]) : 0), 0);
      const totalRevenue = sum(allOrders, 'totalAmount');
      const currentRevenue = sum(currentOrders, 'totalAmount');
      const previousRevenue = sum(previousOrders, 'totalAmount');

      const currentOrdersCount = currentOrders.length;
      const previousOrdersCount = previousOrders.length;

      const totalOrdersCount = allOrders.length;
      const totalUsersCount = allUsers.length;
      const totalProductsCount = allProducts.length;
      const totalReviewsCount = allReviews.length;

      const totalViews = allEvents.length;
      const currentViews = currentEvents.length;
      const previousViews = previousEvents.length;

      const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
      const conversionRate = totalViews > 0 ? (totalOrdersCount / totalViews) * 100 : 0;

      const pendingOrdersCount = allOrders.filter(o => o.status === 'pending').length;
      const lowStockProductsCount = lowStock.length;
      const pendingReviewsCount = pendingReviewsList.length;
  const newCustomersCount = newUsers.length;
  const previousNewCustomersCount = previousPeriodNewUsers.length;

      res.json({
        totalRevenue,
        totalOrders: totalOrdersCount,
        totalUsers: totalUsersCount,
        totalViews,
        currentRevenue,
        previousRevenue,
        currentOrders: currentOrdersCount,
        previousOrders: previousOrdersCount,
        currentUsers: newCustomersCount, // interpreting as new users in current period
  previousUsers: previousNewCustomersCount,
        currentViews,
        previousViews,
        totalProducts: totalProductsCount,
        totalReviews: totalReviewsCount,
        conversionRate,
        averageOrderValue,
        pendingOrders: pendingOrdersCount,
        lowStockProducts: lowStockProductsCount,
        pendingReviews: pendingReviewsCount,
        newCustomers: newCustomersCount,
      });
    } catch (error) {
      console.error('Error computing dashboard stats:', error);
      res.status(500).json({ message: 'Failed to compute dashboard stats' });
    }
  });

  // GET /admin/dashboard/recent-orders
  router.get("/admin/dashboard/recent-orders", mockAuth, requireAdmin, async (req, res) => {
    try {
      const recent = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10);
      res.json(recent);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      res.status(500).json({ message: 'Failed to fetch recent orders' });
    }
  });

  // GET /admin/dashboard/popular-products
  router.get("/admin/dashboard/popular-products", mockAuth, requireAdmin, async (req, res) => {
    try {
      // Aggregate sales by productId from orders
      const all = await db.select().from(orders);
      const salesMap = new Map<string, { salesCount: number; revenue: number }>();
      for (const o of all) {
        const items = (o.items as any[]) || [];
        for (const it of items) {
          const pid = it.productId || it.id;
          if (!pid) continue;
          const qty = Number(it.quantity || 1);
          const price = parseFloat(it.price || 0);
          const entry = salesMap.get(pid) || { salesCount: 0, revenue: 0 };
          entry.salesCount += qty;
          entry.revenue += price * qty;
          salesMap.set(pid, entry);
        }
      }

      // Views per product from analytics events
      const productEvents = await db.select().from(analyticsEvents).where(eq(analyticsEvents.entityType as any, 'product'));
      const viewsMap = new Map<string, number>();
      for (const ev of productEvents) {
        const pid = ev.entityId as string;
        if (!pid) continue;
        viewsMap.set(pid, (viewsMap.get(pid) || 0) + 1);
      }

      // Merge with products data
      const allProductsRows = await db.select().from(products);
      const combined = allProductsRows.map(p => {
        const sales = salesMap.get(p.id) || { salesCount: 0, revenue: 0 };
        const views = viewsMap.get(p.id) || 0;
        const nameObj = p.name as any;
        const name = nameObj?.ru || nameObj?.en || nameObj || 'Товар';
        return {
          id: p.id,
          name,
          price: parseFloat((p.price as any) || '0'),
          salesCount: sales.salesCount,
          viewsCount: views,
        };
      });

      // Sort by salesCount desc, then views
      combined.sort((a, b) => (b.salesCount - a.salesCount) || (b.viewsCount - a.viewsCount));
      res.json(combined.slice(0, 10));
    } catch (error) {
      console.error('Error fetching popular products:', error);
      res.status(500).json({ message: 'Failed to fetch popular products' });
    }
  });

  return router;
}
