import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import type { Product, Category } from '@shared/schema';

type SortKey = 'popular' | 'price_asc' | 'price_desc' | 'newest';

export default function Catalog() {
  const { t, i18n } = useTranslation();
  const { addToCart } = useCart();
  const { toast } = useToast();

  // UI state
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('popular');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Data fetching
  const { data: categories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const productsQueryKey = useMemo(() => {
    const key: any[] = ['/api/products'];
    if (selectedCategory && selectedCategory !== 'all') key.push({ category: selectedCategory });
    return key;
  }, [selectedCategory]);

  const { data: products = [], isLoading: loadingProducts, error } = useQuery<Product[]>({
    queryKey: productsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    },
  });

  // Derived data: filter, search, stock
  const filtered = useMemo(() => {
    let list = products.slice();

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
  }, [products, query, i18n.language, inStockOnly, priceRange, sortBy]);

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
  React.useEffect(() => { setPage(1); }, [query, selectedCategory, sortBy, priceRange, inStockOnly]);

  return (
    <div className="min-h-screen page-bg">
      <Header />
      <section className="py-10 bg-muted/40 border-b">
        <div className="container mx-auto px-4">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">{t('catalog') || 'Каталог'}</h1>
          <p className="text-muted-foreground">{t('findYourBestProduct') || 'Найдите то, что вам подходит'}</p>
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
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
              {(query || selectedCategory !== 'all' || inStockOnly || priceRange[0] > 0 || priceRange[1] < 100000) && (
                <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setSelectedCategory('all'); setSortBy('popular'); setPriceRange([0, 100000]); setInStockOnly(false); }}>
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
