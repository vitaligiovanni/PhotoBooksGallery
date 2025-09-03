import { useParams } from "wouter";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter } from "lucide-react";
import type { Product } from "@shared/schema";

export default function Catalog() {
  const { category } = useParams<{ category?: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [priceRange, setPriceRange] = useState("all");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", category],
    queryFn: async () => {
      const url = category ? `/api/products?category=${category}` : "/api/products";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<Product[]>({
    queryKey: ["/api/products/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Failed to search products");
      return response.json();
    },
    enabled: !!searchQuery.trim(),
  });

  const handleAddToCart = (product: Product) => {
    toast({
      title: "Added to cart",
      description: `${Object.values(product.name as any)[0]} added to cart`,
    });
  };

  const filteredProducts = searchQuery ? searchResults : products;

  // Filter and sort logic
  const processedProducts = filteredProducts
    ?.filter((product) => {
      if (priceRange === "all") return true;
      const price = Number(product.price);
      switch (priceRange) {
        case "0-1000": return price <= 1000;
        case "1000-3000": return price > 1000 && price <= 3000;
        case "3000+": return price > 3000;
        default: return true;
      }
    })
    ?.sort((a, b) => {
      const aName = Object.values(a.name as any)[0] || '';
      const bName = Object.values(b.name as any)[0] || '';
      switch (sortBy) {
        case "price-low": return Number(a.price) - Number(b.price);
        case "price-high": return Number(b.price) - Number(a.price);
        case "name": return (aName as string).localeCompare(bName as string);
        default: return 0;
      }
    });

  const categoryName = category ? 
    (category === 'photobooks' ? t('photobooks') :
     category === 'frames' ? t('photoframes') :
     category === 'boxes' ? t('giftBoxes') :
     category === 'souvenirs' ? t('photoSouvenirs') :
     category) : t('catalog');

  return (
    <div className="min-h-screen page-bg">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Главная</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/catalog">{t('catalog')}</BreadcrumbLink>
            </BreadcrumbItem>
            {category && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{categoryName}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-4" data-testid="text-catalog-title">
            {categoryName}
          </h1>
          <p className="text-muted-foreground text-lg">
            {category ? `Выберите из нашей коллекции ${categoryName.toLowerCase()}` : "Полный каталог наших товаров"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Фильтры
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Поиск</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Найти товар..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Цена</label>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger data-testid="select-price-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все цены</SelectItem>
                      <SelectItem value="0-1000">До ₽1,000</SelectItem>
                      <SelectItem value="1000-3000">₽1,000 - ₽3,000</SelectItem>
                      <SelectItem value="3000+">От ₽3,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Сортировка</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger data-testid="select-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">По названию</SelectItem>
                      <SelectItem value="price-low">Цена: по возрастанию</SelectItem>
                      <SelectItem value="price-high">Цена: по убыванию</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {/* Results Info */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground" data-testid="text-results-count">
                {isLoading || isSearching ? "Загрузка..." : 
                 `Найдено ${processedProducts?.length || 0} товаров`}
              </p>
            </div>

            {/* Products */}
            {isLoading || isSearching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full" />
                ))}
              </div>
            ) : processedProducts?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg" data-testid="text-no-products">
                  {searchQuery ? "По вашему запросу ничего не найдено" : "В этой категории пока нет товаров"}
                </p>
                {searchQuery && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery("")}
                    className="mt-4"
                    data-testid="button-clear-search"
                  >
                    Очистить поиск
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {processedProducts?.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
