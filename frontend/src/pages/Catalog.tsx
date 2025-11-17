import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { CategoryCard } from '@/components/CategoryCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import type { Product, Category } from '@shared/schema';

type SortKey = 'popular' | 'price_asc' | 'price_desc' | 'newest';

export default function Catalog() {
  const { t, i18n } = useTranslation();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [location] = useLocation();
  
  // ================= URL State Handling =================
  // Используем собственный триггер парсинга query, чтобы гарантировать реакцию даже если wouter не пересоздаёт компонент
  const [queryVersion, setQueryVersion] = useState(0);
  // Перехватываем pushState/replaceState для отслеживания изменений query без смены path
  useEffect(() => {
    const wrap = (type: 'pushState' | 'replaceState') => {
      const orig = (window.history as any)[type];
      (window.history as any)[type] = function(...args: any[]) {
        const ret = orig.apply(this, args);
        window.dispatchEvent(new Event('urlchange'));
        return ret;
      };
    };
    wrap('pushState');
    wrap('replaceState');
    const handler = () => setQueryVersion(v => v + 1);
    window.addEventListener('popstate', handler);
    window.addEventListener('urlchange', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      window.removeEventListener('urlchange', handler);
    };
  }, []);

  const parseUrl = () => {
    const sp = new URLSearchParams(window.location.search);
    return {
      categorySlug: sp.get('category') || 'all',
      subcategorySlug: sp.get('subcategory'),
    };
  };
  const { categorySlug: rawCategorySlug, subcategorySlug: rawSubcategorySlug } = parseUrl();

  // UI state
  const [query, setQuery] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>(rawCategorySlug);
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string | null>(rawSubcategorySlug);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null); // хранит ID активной (верхнего уровня или родителя подкатегории)
  const [currentSubcategoryId, setCurrentSubcategoryId] = useState<string | null>(null);
  
  // Реагируем на изменение query (включая programmatic history API)
  useEffect(() => {
    const { categorySlug, subcategorySlug } = parseUrl();
    setSelectedCategorySlug(categorySlug);
    setSelectedSubcategorySlug(subcategorySlug);

    // Redirect logic: if we have a resolvable category/subcategory pair -> move to path-based URL
    // Avoid redirect loops: only trigger if there's a subcategory or category != all AND we already resolved entities.
    // We delay actual redirect until categories loaded.
  }, [location, queryVersion]);
  const [sortBy, setSortBy] = useState<SortKey>('popular');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Data fetching with language dependency
  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['categories-flat', i18n.language],
    queryFn: () => fetch(`/api/categories/flat?lang=${i18n.language}`).then(res => res.json()),
    staleTime: 0, // Always refetch when language changes
  });

  // ===== Helpers to resolve category by slug (учитываем translations для локализованных slug) =====
  const resolveBySlug = (slug: string | null | undefined) => {
    if (!slug) return undefined;
    const lang = i18n.language;
    return categories.find(cat =>
      cat.slug === slug ||
      (cat.translations && (
        (cat.translations as any)[lang]?.slug === slug ||
        (cat.translations as any)?.ru?.slug === slug ||
        (cat.translations as any)?.en?.slug === slug ||
        (cat.translations as any)?.hy?.slug === slug
      ))
    );
  };

  const currentSubcategory = resolveBySlug(selectedSubcategorySlug || undefined) || undefined;
  let currentCategory = resolveBySlug(selectedCategorySlug);
  // Если есть подкатегория, определяем родительскую категорию независимо от выбранного category slug
  if (currentSubcategory && currentSubcategory.parentId) {
    const parent = categories.find(c => c.id === currentSubcategory.parentId);
    if (parent) currentCategory = parent;
  }
  const subcategories = categories.filter(cat => cat.parentId === currentCategory?.id);
  const hasSubcategories = subcategories.length > 0;
  
  // Debug logging
  console.log('[Catalog Debug]', {
    selectedCategorySlug,
    currentCategoryId: currentCategory?.id,
    currentCategoryName: currentCategory?.name,
    subcategoriesCount: subcategories.length,
    hasSubcategories,
    currentSubcategory: currentSubcategory?.name,
    willRender: hasSubcategories && selectedCategorySlug !== 'all' && !currentSubcategory
  });
  
  // Сохраняем ID текущей категории для обработки смены языка
  useEffect(() => {
    if (currentCategory && currentCategory.id !== currentCategoryId) {
      setCurrentCategoryId(currentCategory.id);
    }
    if (currentSubcategory && currentSubcategory.id !== currentSubcategoryId) {
      setCurrentSubcategoryId(currentSubcategory.id);
    } else if (!currentSubcategory && currentSubcategoryId) {
      setCurrentSubcategoryId(null);
    }
  }, [currentCategory, currentSubcategory, currentCategoryId, currentSubcategoryId]);

  // Обрабатываем смену языка - ищем категорию по ID и обновляем URL
  useEffect(() => {
    // Перегенерация slug в URL при смене языка / изменении translations
    if (categories.length === 0) return;
    const lang = i18n.language;
    // Если активна подкатегория – синхронизируем её slug
    if (currentSubcategory) {
      const translation = (currentSubcategory.translations as any)?.[lang];
      const targetSlug = translation?.slug || currentSubcategory.slug;
      const url = new URL(window.location.href);
      if (url.searchParams.get('subcategory') !== targetSlug) {
        url.searchParams.set('subcategory', targetSlug);
        // Убираем parameter category чтобы избежать конфликтов
        url.searchParams.delete('category');
        window.history.replaceState(null, '', url.toString());
        setSelectedSubcategorySlug(targetSlug);
      }
      // Также обновляем category (родителя) для визуального соответствия, но не обязателен в URL
      return;
    }
    // Иначе синхронизируем категорию верхнего уровня
    if (currentCategory && currentCategoryId) {
      const translation = (currentCategory.translations as any)?.[lang];
      const targetSlug = translation?.slug || currentCategory.slug;
      const url = new URL(window.location.href);
      if (targetSlug !== 'all' && url.searchParams.get('category') !== targetSlug) {
        url.searchParams.set('category', targetSlug);
        url.searchParams.delete('subcategory');
        window.history.replaceState(null, '', url.toString());
        setSelectedCategorySlug(targetSlug);
      }
    }
  }, [categories, i18n.language, currentCategoryId, currentSubcategoryId, currentCategory, currentSubcategory]);

  // Once categories loaded, if we have a subcategory or a category (not 'all'), build new path-based URL and navigate.
  useEffect(() => {
    if (categories.length === 0) return;
    // Only consider redirect if user used query style (has search params) and path-based page not already used.
    const url = new URL(window.location.href);
    const hasQueryCategory = url.searchParams.has('category');
    const hasQuerySubcategory = url.searchParams.has('subcategory');
    if (!hasQueryCategory && !hasQuerySubcategory) return; // nothing to convert
    // If user is already on /catalog/<slug> (handled by other page) skip (this component won't mount in that case actually)
    // Need resolved slugs
    if (currentSubcategory) {
      // Use parent category slug and subcategory slug (localized already in currentSubcategory.slug)
      const parent = categories.find(c => c.id === currentSubcategory.parentId);
      if (parent) {
        const target = `/catalog/${encodeURIComponent(parent.slug)}/${encodeURIComponent(currentSubcategory.slug)}`;
        if (window.location.pathname + window.location.search !== target) {
          window.history.replaceState(null, '', target);
        }
      }
    } else if (currentCategory && selectedCategorySlug !== 'all') {
      const target = `/catalog/${encodeURIComponent(currentCategory.slug)}`;
      if (window.location.pathname + window.location.search !== target) {
        window.history.replaceState(null, '', target);
      }
    }
  }, [categories, currentCategory, currentSubcategory, selectedCategorySlug]);
  



  const productsQueryKey = useMemo(() => {
    const key: any[] = ['/api/products'];
    if (selectedCategorySlug && selectedCategorySlug !== 'all') key.push({ category: selectedCategorySlug });
    if (selectedSubcategorySlug) key.push({ subcategory: selectedSubcategorySlug });
    return key;
  }, [selectedCategorySlug, selectedSubcategorySlug]);

  const { data: products = [], isLoading: loadingProducts, error } = useQuery<Product[]>({
    queryKey: productsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentSubcategory && currentSubcategory.id) {
        params.set('subcategoryId', currentSubcategory.id);
      } else if (currentCategory && selectedCategorySlug !== 'all') {
        params.set('categoryId', currentCategory.id);
      }
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    },
  });

  // Derived data: filter, search, stock
  const filtered = useMemo(() => {
    let list = products.slice();

    // Category/Subcategory filter
    if (currentSubcategory) {
      list = list.filter((p) => p.subcategoryId === currentSubcategory.id);
    } else if (currentCategory && selectedCategorySlug !== 'all') {
      list = list.filter((p) => p.categoryId === currentCategory.id);
    }

    // Search by localized name/description
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => {
        const name = typeof p.name === 'object' ? (p.name as any)[i18n.language] || (p.name as any).ru || '' : (p.name as any) || '';
        const desc = typeof p.description === 'object' ? (p.description as any)[i18n.language] || (p.description as any).ru || '' : (p.description as any) || '';
        return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
      });
    }

    // Stock filter
    if (inStockOnly) {
      list = list.filter((p) => p.inStock !== false);
    }

    // Price range (assumes numeric price)
    list = list.filter((p) => {
      const price = Number(p.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort
    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price_desc':
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'popular':
      default:
        // If we had analytics popularity, we'd use it; fallback: onSale first, then newest
        list.sort((a, b) => {
          const aScore = (a.isOnSale ? 1 : 0) + (new Date(a.createdAt || 0).getTime() / 1e13);
          const bScore = (b.isOnSale ? 1 : 0) + (new Date(b.createdAt || 0).getTime() / 1e13);
          return bScore - aScore;
        });
        break;
    }

    return list;
  }, [products, query, i18n.language, inStockOnly, priceRange, sortBy, currentCategory, currentSubcategory, selectedCategorySlug]);

  // Pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    const productName = typeof product.name === 'object' 
      ? (product.name as any)?.ru || (product.name as any)?.en || 'Товар'
      : product.name || 'Товар';
    toast({ title: t('addedToCart') || 'Добавлено в корзину', description: `${productName} ${t('addedToCart') || 'добавлен в корзину'}` });
  };

  // Reset page when filters change
  React.useEffect(() => { setPage(1); }, [query, selectedCategorySlug, selectedSubcategorySlug, sortBy, priceRange, inStockOnly]);

  return (
    <div className="min-h-screen page-bg">
      <Header />
      <section className="py-10 bg-muted/40 border-b">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
            <Link href="/catalog" className="hover:text-foreground transition-colors">
              {t('catalog') || 'Каталог'}
            </Link>
            {currentCategory && (
              <>
                <span>→</span>
                <Link href={`/catalog?category=${currentCategory.slug}`} className="hover:text-foreground transition-colors">
                  {typeof currentCategory.name === 'object' 
                    ? (currentCategory.name as any)[i18n.language] || (currentCategory.name as any).ru
                    : currentCategory.name}
                </Link>
              </>
            )}
            {currentSubcategory && (
              <>
                <span>→</span>
                <span className="text-foreground font-medium">
                  {typeof currentSubcategory.name === 'object' 
                    ? (currentSubcategory.name as any)[i18n.language] || (currentSubcategory.name as any).ru
                    : currentSubcategory.name}
                </span>
              </>
            )}
          </nav>
          
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {currentSubcategory 
              ? (typeof currentSubcategory.name === 'object' 
                  ? (currentSubcategory.name as any)[i18n.language] || (currentSubcategory.name as any).ru
                  : currentSubcategory.name)
              : currentCategory 
                ? (typeof currentCategory.name === 'object' 
                    ? (currentCategory.name as any)[i18n.language] || (currentCategory.name as any).ru
                    : currentCategory.name)
                : (t('catalog') || 'Каталог')
            }
          </h1>
          <p className="text-muted-foreground">
            {currentSubcategory || currentCategory
              ? (t('productsInCategory') || 'Товары в категории')
              : (t('findYourBestProduct') || 'Найдите то, что вам подходит')
            }
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="p-4 rounded-lg bg-card border">
              <h3 className="font-semibold mb-3">{t('search') || 'Поиск'}</h3>
              <Input
                placeholder={t('searchProducts') || 'Поиск товаров'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-lg bg-card border">
              <h3 className="font-semibold mb-3">{t('category') || 'Категория'}</h3>
              <Select value={selectedCategorySlug} onValueChange={(v) => {
                setSelectedCategorySlug(v);
                setSelectedSubcategorySlug(null);
                const url = new URL(window.location.href);
                if (v === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', v);
                url.searchParams.delete('subcategory');
                window.history.pushState(null, '', url.toString());
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('allCategories') || 'Все категории'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCategories') || 'Все категории'}</SelectItem>
                  {(!loadingCategories ? categories : []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>{
                      typeof cat.name === 'object' ? (cat.name as any)?.[i18n.language] || (cat.name as any)?.ru : (cat.name as any)
                    }</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-lg bg-card border">
              <h3 className="font-semibold mb-3">{t('price') || 'Цена'}</h3>
              <div className="px-2">
                <Slider
                  value={[priceRange[0], priceRange[1]]}
                  onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
                  min={0}
                  max={100000}
                  step={1000}
                />
                <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                  <span>{priceRange[0].toLocaleString()} ֏</span>
                  <span>{priceRange[1].toLocaleString()} ֏</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-card border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input id="inStock" type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                <label htmlFor="inStock" className="text-sm">{t('inStockOnly') || 'Только в наличии'}</label>
              </div>
              {(query || selectedCategorySlug !== 'all' || inStockOnly || priceRange[0] > 0 || priceRange[1] < 100000) && (
                <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setSelectedCategorySlug('all'); setSelectedSubcategorySlug(null); setSortBy('popular'); setPriceRange([0, 100000]); setInStockOnly(false); }}>
                  {t('reset') || 'Сбросить'}
                </Button>
              )}
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-9 space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('found') || 'Найдено'}: <Badge variant="secondary">{filtered.length}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{t('sortBy') || 'Сортировка'}</span>
                <Select value={sortBy} onValueChange={(val: SortKey) => setSortBy(val)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">{t('popular') || 'Популярные'}</SelectItem>
                    <SelectItem value="price_asc">{t('priceLowToHigh') || 'Цена: по возрастанию'}</SelectItem>
                    <SelectItem value="price_desc">{t('priceHighToLow') || 'Цена: по убыванию'}</SelectItem>
                    <SelectItem value="newest">{t('newest') || 'Новинки'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Loading state */}
            {(loadingProducts) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full" />
                ))}
              </div>
            )}

            {/* Error state */}
            {(!loadingProducts && error) && (
              <div className="p-6 border rounded-lg bg-destructive/5 text-destructive">
                {(error as any)?.message || 'Не удалось загрузить товары'}
              </div>
            )}

            {/* Subcategories */}
            {hasSubcategories && selectedCategorySlug !== 'all' && !currentSubcategory && (
              <div className="mb-12">
                <h3 className="font-serif text-2xl font-bold text-foreground mb-6">
                  {t('subcategories') || 'Подкатегории'} 
                  <Badge variant="outline" className="ml-2">{subcategories.length}</Badge>
                </h3>
                <div className="flex flex-wrap gap-6 justify-start">
                  {subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="flex-shrink-0 w-64">
                      <CategoryCard category={subcategory} />
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Empty state */}
            {(!loadingProducts && !error && filtered.length === 0) && (
              <div className="p-10 border rounded-lg text-center text-muted-foreground">
                {t('nothingFound') || 'Ничего не найдено. Измените фильтры.'}
              </div>
            )}

            {/* Grid */}
            {!loadingProducts && !error && filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {paged.map((product) => (
                  <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {t('prev') || 'Назад'}
                </Button>
                <div className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </div>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  {t('next') || 'Вперёд'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
