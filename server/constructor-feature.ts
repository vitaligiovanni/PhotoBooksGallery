/**
 * constructor-feature.ts
 *
 * Универсальный шаблон "Конструктора страниц" для вашего проекта:
 * - Drizzle schema (pages, blocks)
 * - Express router для /api/constructor/*
 * - React admin component (ConstructorApp) — использует react-query, tailwind, radix, lucide
 *
 * Интеграция:
 * - Сервер: вынести sections `//// SERVER` в ваш backend (Express app).
 * - Клиент: вынести раздел `//// CLIENT` в ваш frontend (React app).
 *
 * Этот файл — одностраничный шаблон чтобы быстро просмотреть логику и подключить.
 */

/////////////////////////////////////////
//  IMPORTS (общие указания)
//  Серверная часть: Express, Drizzle db (у вас уже есть)
//  Клиентская часть: React, react-query, tailwind, radix, lucide-react
/////////////////////////////////////////

/* ======= SERVER PART =======
   Скопируйте блок SERVER в ваш backend (server/src/...).
   Убедитесь, что у вас в проекте:
   - drizzle-orm
   - express
   - body-parser (или express.json)
   - любая auth middleware (mockAuth / realAuth)
*/

//// SERVER
import express from "express";
import { z } from "zod";
import { eq, asc, sql } from "drizzle-orm";
import { pages, blocks } from "@shared/schema";

/** Drizzle schema — используем существующие таблицы из shared/schema */

/**
 * Router: /api/constructor
 * - GET /pages
 * - POST /pages
 * - GET /pages/:slug (with blocks)
 * - GET /pages/:id/blocks
 * - POST /pages/:id/blocks   <-- create block
 * - PATCH /blocks/:id
 * - DELETE /blocks/:id
 *
 * Добавлено подробное логирование и валидация входящих данных.
 */

export function createConstructorRouter({ dbInstance }: { dbInstance: any }) {
  const router = express.Router();

  // simple helper
  const now = () => new Date();

  // zod schemas
  const createPageSchema = z.object({
    slug: z.string().min(1),
    title: z.record(z.string()).optional(), // jsonb field in schema
    description: z.record(z.string()).optional(), // jsonb field in schema
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    keywords: z.string().optional(),
    canonicalUrl: z.string().optional(),
    ogImage: z.string().optional(),
    twitterCard: z.string().optional(),
    structuredData: z.any().optional(),
    noindex: z.boolean().optional(),
    language: z.string().optional(),
    isPublished: z.boolean().optional(), // boolean field in schema
    isHomepage: z.boolean().optional(), // boolean field in schema
    showInHeaderNav: z.boolean().optional(), // whether to show page in header navigation
  });

  const createBlockSchema = z.object({
    pageId: z.string(),
    type: z.string(),
    content: z.any(), // allow object (JSONB)
    sortOrder: z.number().int().optional(),
    isVisible: z.boolean().optional(),
  });

  // GET /pages
  router.get("/pages", async (req, res) => {
    try {
      // Best-effort: ensure the column exists in dev environments
      try {
        await dbInstance.execute(sql`ALTER TABLE pages ADD COLUMN IF NOT EXISTS show_in_header_nav boolean DEFAULT false`);
        // Coerce legacy columns to jsonb with safe defaults if needed
        await dbInstance.execute(sql`DO $$ BEGIN
          BEGIN
            ALTER TABLE pages ALTER COLUMN title TYPE jsonb USING '{}'::jsonb;
          EXCEPTION WHEN others THEN
            -- ignore
          END;
          BEGIN
            ALTER TABLE pages ALTER COLUMN description TYPE jsonb USING NULL::jsonb;
          EXCEPTION WHEN others THEN
            -- ignore
          END;
        END $$;`);
      } catch (e) {
        // ignore if no permissions
      }
      let all: any[];
      try {
        all = await dbInstance
          .select({
            id: pages.id,
            slug: pages.slug,
            title: pages.title,
            description: pages.description,
            structuredData: pages.structuredData,
            isPublished: pages.isPublished,
            showInHeaderNav: (pages as any).showInHeaderNav ?? (sql`NULL`.as("showInHeaderNav") as any),
            sortOrder: pages.sortOrder,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
          })
          .from(pages);
      } catch (selErr) {
        console.warn("[constructor] Typed select failed, falling back to raw SQL:", selErr);
        const raw = await dbInstance.execute(sql`SELECT id, slug, is_published as "isPublished", show_in_header_nav as "showInHeaderNav", sort_order as "sortOrder", structured_data as "structuredData", created_at as "createdAt", updated_at as "updatedAt" FROM pages`);
        all = (raw as any).rows || (raw as any) || [];
        // synthesize title/description for UI friendliness
        all = all.map((r: any) => ({
          ...r,
          title: { ru: r.slug },
          description: null,
        }));
      }
      const withFlag = (all as any[]).map((p) => {
        const fromStructured = (p as any)?.structuredData?.['_flags']?.showInHeaderNav === true;
        // prefer explicit column if present on the row, else fallback to structuredData flag
        const hasColumn = Object.prototype.hasOwnProperty.call(p, 'showInHeaderNav');
        const value = hasColumn ? (p as any).showInHeaderNav === true : fromStructured;
        return { ...p, showInHeaderNav: value };
      });
      console.log("[constructor] GET /pages ->", withFlag.length, "pages");
      res.json(withFlag);
    } catch (err: any) {
      console.error("[constructor] GET /pages error:", err);
      res.status(500).json({ error: "Server error retrieving pages", details: err?.message ?? String(err) });
    }
  });

  // POST /pages
  router.post("/pages", express.json(), async (req, res) => {
    try {
      // Ensure column exists if schema drifted
      try {
        await dbInstance.execute(sql`ALTER TABLE pages ADD COLUMN IF NOT EXISTS show_in_header_nav boolean DEFAULT false`);
        await dbInstance.execute(sql`DO $$ BEGIN
          BEGIN
            ALTER TABLE pages ALTER COLUMN title TYPE jsonb USING '{}'::jsonb;
          EXCEPTION WHEN others THEN END;
          BEGIN
            ALTER TABLE pages ALTER COLUMN description TYPE jsonb USING NULL::jsonb;
          EXCEPTION WHEN others THEN END;
        END $$;`);
      } catch (e) {
        // ignore
      }
      const parsed = createPageSchema.parse(req.body);
      // Extract flag and persist it safely in structuredData._flags to avoid schema drift issues
      const { showInHeaderNav, structuredData: sd, ...rest } = parsed as any;
      const mergedStructured = {
        ...(sd || {}),
        _flags: { ...((sd || {})._flags || {}), showInHeaderNav: !!showInHeaderNav },
      };
      const insert: any = {
        ...rest,
        structuredData: mergedStructured,
        showInHeaderNav: !!showInHeaderNav,
        createdAt: now(),
        updatedAt: now(),
      };
      const result = await dbInstance
        .insert(pages)
        .values(insert)
        .returning({
          id: pages.id,
          slug: pages.slug,
          title: pages.title,
          description: pages.description,
          metaTitle: pages.metaTitle,
          metaDescription: pages.metaDescription,
          keywords: pages.keywords,
          canonicalUrl: pages.canonicalUrl,
          ogImage: pages.ogImage,
          twitterCard: pages.twitterCard,
          structuredData: pages.structuredData,
          noindex: pages.noindex,
          language: pages.language,
          isPublished: pages.isPublished,
          isHomepage: pages.isHomepage,
          showInHeaderNav: (pages as any).showInHeaderNav ?? (sql`NULL`.as("showInHeaderNav") as any),
          sortOrder: pages.sortOrder,
          createdAt: pages.createdAt,
          updatedAt: pages.updatedAt,
        });
      console.log("[constructor] Created page:", result[0]?.id ?? result[0]);
      res.status(201).json(result[0]);
    } catch (err: any) {
      console.error("[constructor] POST /pages error:", err?.message ?? err);
      res.status(400).json({ error: err?.message ?? "Invalid payload" });
    }
  });

  // GET /pages/:slug (with blocks)
  router.get("/pages/:slug", async (req, res) => {
    const slug = req.params.slug;
    try {
      // find page
      let page: any;
      try {
        page = await dbInstance
          .select({
            id: pages.id,
            slug: pages.slug,
            title: pages.title,
            description: pages.description,
            structuredData: pages.structuredData,
            isPublished: pages.isPublished,
            showInHeaderNav: (pages as any).showInHeaderNav ?? (sql`NULL`.as("showInHeaderNav") as any),
            sortOrder: pages.sortOrder,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
          })
          .from(pages)
          .where(eq(pages.slug, slug))
          .then((rows: any[]) => rows[0]);
      } catch (selErr) {
        console.warn("[constructor] Typed select by slug failed, raw SQL fallback:", selErr);
        const raw = await dbInstance.execute(sql`SELECT id, slug, is_published as "isPublished", show_in_header_nav as "showInHeaderNav", sort_order as "sortOrder", structured_data as "structuredData", created_at as "createdAt", updated_at as "updatedAt" FROM pages WHERE slug = ${slug} LIMIT 1`);
        const r = ((raw as any).rows || [])[0];
        if (r) {
          page = { ...r, title: { ru: r.slug }, description: null };
        }
      }
      if (!page) return res.status(404).json({ error: "Page not found" });
      // Attach flag in response
      const fromStructured = (page as any)?.structuredData?.['_flags']?.showInHeaderNav === true;
      const hasColumn = Object.prototype.hasOwnProperty.call(page, 'showInHeaderNav');
      page = { ...page, showInHeaderNav: hasColumn ? (page as any).showInHeaderNav === true : fromStructured } as any;

      // blocks
      const pageBlocks = await dbInstance
        .select()
        .from(blocks)
        .where(eq(blocks.pageId, page.id))
        .orderBy(asc(blocks.sortOrder));

      res.json({ page, blocks: pageBlocks });
    } catch (err: any) {
      console.error("[constructor] GET /pages/:slug error:", err);
      res.status(500).json({ error: "Server error", details: err?.message ?? String(err) });
    }
  });

  // GET /pages/:id/blocks
  router.get("/pages/:id/blocks", async (req, res) => {
    const id = req.params.id;
    try {
      const pageBlocks = await dbInstance
        .select()
        .from(blocks)
        .where(eq(blocks.pageId, id))
        .orderBy(asc(blocks.sortOrder));
      res.json(pageBlocks);
    } catch (err) {
      console.error("[constructor] GET /pages/:id/blocks error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // POST /pages/:id/blocks  <-- основная точка: логируем и валидируем
  router.post("/pages/:id/blocks", express.json(), async (req, res) => {
    const pageId = req.params.id;
    console.log("[constructor] POST /pages/:id/blocks body:", req.body);
    try {
      // Валидация: используем schema + гарантируем pageId совпадает
      const parsed = createBlockSchema.parse({ ...req.body, pageId });
      // check page existence
      const page = await dbInstance.select().from(pages).where(eq(pages.id, pageId)).then((rows: any[]) => rows[0]);
      if (!page) {
        console.warn("[constructor] POST /blocks page not found:", pageId);
        return res.status(400).json({ error: "Parent page not found" });
      }

      const insert = {
        pageId,
        type: parsed.type,
        content: parsed.content ?? { ru: {}, en: {}, hy: {}, settings: {} },
        sortOrder: parsed.sortOrder ?? 0,
        isActive: parsed.isVisible ?? true,
        createdAt: now(),
        updatedAt: now(),
      };

      const inserted = await dbInstance.insert(blocks).values(insert).returning();
      console.log("[constructor] Created block:", inserted[0]);
      return res.status(201).json(inserted[0]);
    } catch (err: any) {
      console.error("[constructor] POST /pages/:id/blocks error:", err?.message ?? err);
      return res.status(500).json({ error: err?.message ?? "Block creation failed" });
    }
  });

  // PATCH /pages/:id  (partial update)
  router.patch("/pages/:id", express.json(), async (req, res) => {
    const id = req.params.id;
    console.log("[constructor] PATCH /pages/:id request:", { id, body: req.body });
    try {
      // Ensure column exists if schema drifted
      try {
        await dbInstance.execute(sql`ALTER TABLE pages ADD COLUMN IF NOT EXISTS show_in_header_nav boolean DEFAULT false`);
      } catch {}
      const updateData: any = { ...req.body, updatedAt: now() };
      // Ensure both explicit column and structuredData flag are set if provided
      if (Object.prototype.hasOwnProperty.call(updateData, 'showInHeaderNav')) {
        const flag = !!(updateData as any).showInHeaderNav;
        const sd = (updateData as any).structuredData || {};
        (updateData as any).structuredData = { ...sd, _flags: { ...(sd._flags || {}), showInHeaderNav: flag } };
        (updateData as any).showInHeaderNav = flag;
      }
      console.log("[constructor] Update data:", updateData);
      
      const updated = await dbInstance
        .update(pages)
        .set(updateData)
        .where(eq(pages.id, id))
        .returning({
          id: pages.id,
          slug: pages.slug,
          title: pages.title,
          description: pages.description,
          metaTitle: pages.metaTitle,
          metaDescription: pages.metaDescription,
          keywords: pages.keywords,
          canonicalUrl: pages.canonicalUrl,
          ogImage: pages.ogImage,
          twitterCard: pages.twitterCard,
          structuredData: pages.structuredData,
          noindex: pages.noindex,
          language: pages.language,
          isPublished: pages.isPublished,
          isHomepage: pages.isHomepage,
          showInHeaderNav: (pages as any).showInHeaderNav ?? (sql`NULL`.as("showInHeaderNav") as any),
          sortOrder: pages.sortOrder,
          createdAt: pages.createdAt,
          updatedAt: pages.updatedAt,
        });
      
      console.log("[constructor] PATCH /pages/:id success:", updated[0]);
      res.json(updated[0]);
    } catch (err) {
      console.error("[constructor] PATCH /pages/:id error:", err);
      res.status(500).json({ error: "Update failed", details: err instanceof Error ? err.message : String(err) });
    }
  });

  // PATCH /blocks/:id  (partial update)
  router.patch("/blocks/:id", express.json(), async (req, res) => {
    const id = req.params.id;
    console.log("[constructor] PATCH /blocks/:id request:", { id, body: req.body });
    try {
      const updateData = { ...req.body, updatedAt: now() };
      console.log("[constructor] Update data:", updateData);
      
      // Детальное логирование content, если он присутствует
      if (updateData.content && updateData.content.images) {
        console.log("[constructor] Content images:", JSON.stringify(updateData.content.images, null, 2));
      }
      
      const updated = await dbInstance
        .update(blocks)
        .set(updateData)
        .where(eq(blocks.id, id))
        .returning();
      
      console.log("[constructor] PATCH /blocks/:id success:", updated[0]);
      
      // Проверяем, что content сохранился корректно
      if (updated[0] && updated[0].content && updated[0].content.images) {
        console.log("[constructor] Saved content images:", JSON.stringify(updated[0].content.images, null, 2));
      }
      
      res.json(updated[0]);
    } catch (err) {
      console.error("[constructor] PATCH /blocks/:id error:", err);
      res.status(500).json({ error: "Update failed", details: err instanceof Error ? err.message : String(err) });
    }
  });

  // DELETE /blocks/:id
  router.delete("/blocks/:id", async (req, res) => {
    const id = req.params.id;
    try {
      await dbInstance.delete(blocks).where(eq(blocks.id, id));
      res.json({ success: true });
    } catch (err) {
      console.error("[constructor] DELETE /blocks/:id error:", err);
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // DELETE /pages/:id
  router.delete("/pages/:id", async (req, res) => {
    const id = req.params.id;
    try {
      // Сначала удаляем все блоки страницы
      await dbInstance.delete(blocks).where(eq(blocks.pageId, id));
      // Затем удаляем саму страницу
      await dbInstance.delete(pages).where(eq(pages.id, id));
      res.json({ success: true });
    } catch (err) {
      console.error("[constructor] DELETE /pages/:id error:", err);
      res.status(500).json({ error: "Delete failed" });
    }
  });

  return router;
}

//// END SERVER
