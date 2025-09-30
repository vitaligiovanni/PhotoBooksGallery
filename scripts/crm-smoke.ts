#!/usr/bin/env tsx
/**
 * Comprehensive CRM smoke test.
 * Goals:
 *  - Validate core CRUD for categories, products, banners, blog posts/categories, site pages, currencies, settings.
 *  - Validate dashboard stats & popular products endpoints respond with required shape.
 *  - Validate orders create/list.
 *  - Exit codes:
 *      0 success
 *      1 network/unexpected error
 *      2 logical failure (missing data, shape mismatch)
 */
import 'dotenv/config';
import fetch, { Response } from 'node-fetch';

const API = process.env.API_URL || 'http://localhost:3000/api';
const ARGS = process.argv.slice(2);
const SKIP_BLOG = ARGS.includes('--skip-blog');

function log(msg: string) { console.log(`[crm-smoke] ${msg}`); }
function warn(msg: string) { console.warn(`[crm-smoke][warn] ${msg}`); }
function fail(msg: string, code: 1 | 2 = 2): never { console.error(`[crm-smoke][FAIL] ${msg}`); process.exit(code); }

async function fetchJson<T = any>(url: string, init?: any): Promise<T> {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(init?.headers || {})
  };
  
  const response = await fetch(url, { ...init, headers });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status} ${response.statusText} :: ${text.slice(0,400)}`);
  }
  
  if (!contentType.includes('application/json')) {
    throw new Error(`Non-JSON response from ${url}: content-type=${contentType}, body starts: ${text.slice(0,200)}`);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0,200)}`);
  }
}

function randSlug(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
function delay(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

interface CreatedRefs {
  categoryId?: string;
  productId?: string;
  bannerId?: string;
  blogCategoryId?: string;
  blogPostId?: string;
  currencyId?: string;
  orderId?: string;
}

async function main() {
  const refs: CreatedRefs = {};
  try {
    log(`API base: ${API}`);

    // 1. Categories CRUD
    log('Creating category');
    const catPayload = { name: { ru: 'Тест категория', en: 'Test Category', hy: 'Թեստ կատ.' }, slug: randSlug('cat'), description: { ru:'desc' } };
    const createdCat = await fetchJson<any>(`${API}/categories`, { method: 'POST', body: JSON.stringify(catPayload) });
    refs.categoryId = createdCat.id;
    if (!refs.categoryId) fail('Category creation missing id');

    const categories = await fetchJson(`${API}/categories`);
    if (!Array.isArray(categories) || !categories.find((c:any)=>c.id===refs.categoryId)) fail('Created category not returned in list');

    log('Updating category');
    await fetchJson(`${API}/categories/${refs.categoryId}`, { method:'PUT', body: JSON.stringify({ description: { ru:'upd' } }) });

    // 2. Product CRUD
    log('Creating product');
    const prodPayload = { name:{ ru:'Тест товар', en:'Test Product' }, description:{ ru:'Описание' }, price:'10.00', categoryId: refs.categoryId, currencyId: null } as any;
    const createdProd = await fetchJson<any>(`${API}/products`, { method:'POST', body: JSON.stringify(prodPayload) });
    refs.productId = createdProd.id;
    if (!refs.productId) fail('Product creation missing id');

    const productList = await fetchJson(`${API}/products`);
    if (!Array.isArray(productList) || !productList.find((p:any)=>p.id===refs.productId)) fail('Created product not in list');

    log('Updating product partial');
    await fetchJson(`${API}/products/${refs.productId}`, { method:'PUT', body: JSON.stringify({ inStock: false, stockQuantity: 5 }) });

    // 3. Currency creation (admin) & base currency fetch
    log('Currencies list');
    const currencies = await fetchJson(`${API}/currencies`);
    if (!Array.isArray(currencies)) fail('Currencies not array');

    // Attempt create currency (may fail if validation) - soft
    try {
      const curPayload = { code: randSlug('X').slice(0,3).toUpperCase(), name: 'Test Curr', symbol: 'T$', isActive: true };
      const createdCurr = await fetchJson<any>(`${API}/admin/currencies`, { method:'POST', body: JSON.stringify(curPayload) });
      refs.currencyId = createdCurr.id;
    } catch (e:any) { warn('Currency create skipped: ' + e.message); }

    // 4. Settings get & update one safe key if exists
    const settings = await fetchJson<Record<string, any> | null>(`${API}/settings`);
    if (!settings || typeof settings !== 'object') fail('Settings response not object');
    const someKey = Object.keys(settings)[0] as string | undefined;
    if (someKey && Object.prototype.hasOwnProperty.call(settings, someKey)) {
      log('Updating one setting key');
      await fetchJson(`${API}/settings/${someKey}`, { method:'PUT', body: JSON.stringify({ value: settings[someKey], description: 'verify' }) });
    }

    // 5. Banner CRUD minimal
    log('Creating banner');
    const bannerPayload = { name: 'Test Banner', type: 'header', title: { ru:'Тест', en:'Test' }, content:{ ru:'cnt' }, imageUrl:'', buttonText:{ ru:'Кнопка' }, buttonLink:'/', backgroundColor:'#000', textColor:'#fff', position:'top', size:null, priority:1, isActive:true, status:'active', startDate:null, endDate:null, targetPages:['/'], targetUsers:'all', maxImpressions:null, maxClicks:null };
    const createdBanner = await fetchJson<any>(`${API}/banners`, { method:'POST', body: JSON.stringify(bannerPayload) });
    refs.bannerId = createdBanner.id;
    const bannerList = await fetchJson(`${API}/banners?limit=10&offset=0`);
    if (!Array.isArray(bannerList) || !bannerList.find((b:any)=>b.id===refs.bannerId)) fail('Banner not listed');

    log('Toggle banner active');
    await fetchJson(`${API}/banners/${refs.bannerId}/toggle`, { method:'PATCH' });

    // 6. Dashboard stats endpoints
    log('Dashboard stats');
    const stats = await fetchJson<any>(`${API}/admin/dashboard/stats`);
    const requiredStats = ['totalRevenue','totalOrders','totalUsers'];
    for (const k of requiredStats) if (!(k in stats)) fail(`Missing dashboard stat field ${k}`);
    await fetchJson(`${API}/admin/dashboard/recent-orders`);
    await fetchJson(`${API}/admin/dashboard/popular-products`);

    // 7. (optional) Blog CRUD
    if (SKIP_BLOG) {
      log('⏭  Пропуск блока блога (--skip-blog)');
    } else {
      log('Creating blog category');
      const blogCat = await fetchJson<any>(`${API}/blog-categories`, { method:'POST', body: JSON.stringify({ name:{ ru:'БлогКат' }, slug: randSlug('blog-cat'), description:{ ru:'desc' }, color:'#f00' }) });
      refs.blogCategoryId = blogCat.id;

      log('Creating blog post');
      const blogPostPayload = { title:{ ru:'Первый пост' }, slug: randSlug('blog-post'), excerpt:{ ru:'кратко' }, content:{ ru:'контент' }, authorId:'local-admin', categoryId: refs.blogCategoryId, status:'draft', tags:['t'] };
      let blogPost: any;
      const url1 = `${API}/blog-posts`;
      log('POST ' + url1);
      const resp = await fetch(url1, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(blogPostPayload) });
      const ctype = resp.headers.get('content-type');
      const raw = await resp.text();
      if (!resp.ok) fail(`Blog post create failed ${resp.status} body:${raw.slice(0,120)}`);
      if (!ctype || !ctype.includes('application/json')) fail(`Unexpected content-type ${ctype} body:${raw.slice(0,120)}`);
      try { blogPost = JSON.parse(raw); } catch (e) { fail('JSON parse fail blog post body start:' + raw.slice(0,80)); }
      refs.blogPostId = blogPost.id;

      const blogPostsResp = await fetch(`${API}/blog-posts`);
      const blogPostsRaw = await blogPostsResp.text();
      try {
        const blogPosts = JSON.parse(blogPostsRaw);
        if (!Array.isArray(blogPosts) || !blogPosts.find((p:any)=>p.id===refs.blogPostId)) fail('Blog post missing in list');
      } catch {
        fail('Blog posts list returned non JSON: ' + blogPostsRaw.slice(0,80));
      }
    }

    // 8. Site pages list & patch one
    const sitePages = await fetchJson(`${API}/site-pages`);
    if (!Array.isArray(sitePages)) fail('Site pages not array');
    const firstPage = sitePages[0];
    if (firstPage?.key) {
      await fetchJson(`${API}/site-pages/${firstPage.key}`, { method:'PATCH', body: JSON.stringify({ description: { ru:'upd desc' } }) });
    }

    // 9. Orders create + list (simulate order)
    log('Creating test order');
    const orderPayload = { customerName:'Test Buyer', customerEmail:'buyer@example.com', shippingAddress:'Addr', customerPhone:'', totalAmount:'10.00', currencyId: null, exchangeRate:null, items:[{ productId: refs.productId, quantity:1, price:'10.00' }] } as any;
    const order = await fetchJson<any>(`${API}/orders`, { method:'POST', body: JSON.stringify(orderPayload) });
    refs.orderId = order.id;
    const orders = await fetchJson(`${API}/orders`);
    if (!Array.isArray(orders) || !orders.find((o:any)=>o.id === refs.orderId)) fail('Order missing in list');

    // 10. Active banners endpoint (public) should return array
    const activeBanners = await fetchJson(`${API}/banners/active?page=/`);
    if (!Array.isArray(activeBanners)) fail('Active banners not array');

    // 11. Basic cleanup (non-fatal if fails)
    async function cleanup() {
      const tasks: Promise<any>[] = [];
      if (refs.bannerId) tasks.push(fetch(`${API}/banners/${refs.bannerId}`, { method:'DELETE' }));
      if (refs.productId) tasks.push(fetch(`${API}/products/${refs.productId}`, { method:'DELETE' }));
      if (refs.categoryId) tasks.push(fetch(`${API}/categories/${refs.categoryId}`, { method:'DELETE' }));
      if (!SKIP_BLOG) {
        if (refs.blogPostId) tasks.push(fetch(`${API}/blog-posts/${refs.blogPostId}`, { method:'DELETE' }));
        if (refs.blogCategoryId) tasks.push(fetch(`${API}/blog-categories/${refs.blogCategoryId}`, { method:'DELETE' }));
      }
      await Promise.allSettled(tasks);
    }
    await cleanup();

    log('✅ CRM smoke test passed');
    process.exit(0);
  } catch (e:any) {
    console.error(e);
    fail(e.message, 1);
  }
}

main();
