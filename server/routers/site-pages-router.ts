import express from "express";
import { db } from "../db";
import { sitePages, updateSitePageSchema, SITE_PAGE_KEYS } from "../../shared/schema.js";
import { asc, eq } from "drizzle-orm";

export function createSitePagesRouter() {
  const router = express.Router();
  router.get("/api/site-pages", async (_req, res) => {
    try {
      const rows = await db.select().from(sitePages).orderBy(asc(sitePages.sortOrder));
      if (!rows || rows.length === 0) {
        // Seed minimal defaults if empty
        const defs = (SITE_PAGE_KEYS as readonly string[]).map((key, i) => ({
          key,
          title: {
            ru: key === "catalog" ? "Каталог" : key === "editor" ? "Редактор" : key === "blog" ? "Блог" : key === "about" ? "О нас" : "Контакты",
            en: key[0].toUpperCase() + key.slice(1),
          },
          description: {},
          isPublished: true,
          showInHeaderNav: true,
          sortOrder: (i + 1) * 10,
        }));
        await db.insert(sitePages).values(defs).onConflictDoNothing();
        const seeded = await db.select().from(sitePages).orderBy(asc(sitePages.sortOrder));
        return res.json(seeded);
      }
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: "failed_to_list_site_pages", detail: e?.message ?? String(e) });
    }
  });

  router.get("/api/site-pages/:key", async (req, res) => {
    try {
      const key = req.params.key;
      const [row] = await db.select().from(sitePages).where(eq(sitePages.key, key));
      if (!row) return res.status(404).json({ error: "not_found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ error: "failed_to_get_site_page", detail: e?.message ?? String(e) });
    }
  });

  router.patch("/api/site-pages/:key", express.json(), async (req, res) => {
    try {
      const key = req.params.key;
      const parsed = updateSitePageSchema.parse(req.body);
      await db.update(sitePages).set(parsed).where(eq(sitePages.key, key));
      const [row] = await db.select().from(sitePages).where(eq(sitePages.key, key));
      res.json(row);
    } catch (e: any) {
      const status = e?.name === "ZodError" ? 400 : 500;
      res.status(status).json({ error: "failed_to_update_site_page", detail: e?.issues ?? e?.message ?? String(e) });
    }
  });

  return router;
}
