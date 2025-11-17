import React from 'react';
import { useParams, Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Plus, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import type { Product, Category } from '@shared/schema';
import type { LocalizedText } from '@/types';

export default function SubcategoryPage() {
  const { categorySlug, subcategorySlug } = useParams();
  const { t, i18n } = useTranslation();
  const { addToCart } = useCart();
  const { toast } = useToast();

  // Получаем все категории для поиска текущей и подкатегории
  const { data: allCategories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories/flat', i18n.language],
    queryFn: async () => {
      const res = await fetch(`/api/categories/flat?lang=${i18n.language}`);
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    }
  });

  // Найти родительскую категорию по slug
  const parentCategory = allCategories.find(cat => cat.slug === categorySlug);
  
  // Найти текущую подкатегорию по slug
  const currentSubcategory = allCategories.find(cat => 
    cat.slug === subcategorySlug && cat.parentId === parentCategory?.id
  );

  // Получить продукты для подкатегории
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products', { subcategory: subcategorySlug }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (subcategorySlug) params.set('subcategory', subcategorySlug);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    },
    enabled: !!subcategorySlug,
  });

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    const productName = typeof product.name === 'object' 
      ? (product.name as any)?.ru || (product.name as any)?.en || 'Товар'
      : product.name || 'Товар';
    toast({ 
      title: t('addedToCart') || 'Добавлено в корзину', 
      description: `${productName} ${t('addedToCart') || 'добавлен в корзину'}` 
    });
  };

  if (loadingCategories) {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!currentSubcategory || !parentCategory) {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-muted-foreground mb-4">
              {t('subcategoryNotFound') || 'Подкатегория не найдена'}
            </h1>
            <Link href="/catalog">
              <a className="text-primary hover:underline">
                {t('backToCatalog') || 'Вернуться в каталог'}
              </a>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const subcategoryName = (currentSubcategory.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || currentSubcategory.slug;
  const subcategoryDescription = (currentSubcategory.description as LocalizedText)?.[i18n.language as keyof LocalizedText] || '';
  const parentCategoryName = (parentCategory.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || parentCategory.slug;

  return (
    <div className="min-h-screen page-bg">
      <Header />
      
      {/* Breadcrumbs */}
      <section className="py-4 bg-muted/20 border-b">
        <div className="container mx-auto px-4">
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link href="/">
              <a className="hover:text-primary">{t('home') || 'Главная'}</a>
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/catalog/${categorySlug}`}>
              <a className="hover:text-primary">{parentCategoryName}</a>
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{subcategoryName}</span>
          </nav>
        </div>
      </section>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={currentSubcategory.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=600'} 
            alt={subcategoryName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>
        
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="mb-4">
              <Badge variant="secondary" className="mb-4">
                {parentCategoryName}
              </Badge>
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {subcategoryName}
            </h1>
            
            {subcategoryDescription && (
              <p className="text-white/90 text-lg sm:text-xl leading-relaxed mb-8 max-w-2xl">
                {subcategoryDescription}
              </p>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-5 w-5" />
                {t('createPhotobook') || 'Создать фотокнигу'}
              </Button>
              
              {products.length > 0 && (
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-black">
                  {t('viewProducts') || 'Смотреть товары'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          
          {/* Additional Description */}
          {subcategoryDescription && (
            <div className="mb-12">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-6">
                  {t('whyChoose') || 'Почему выбирают'} {subcategoryName}
                </h2>
                <div className="prose prose-lg mx-auto text-muted-foreground">
                  <p>{subcategoryDescription}</p>
                </div>
              </div>
            </div>
          )}

          {/* Products Section */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {t('availableProducts') || 'Доступные товары'}
                </h2>
                <p className="text-muted-foreground">
                  {t('chooseFromSelection') || 'Выберите из нашего ассортимента'}
                </p>
              </div>
              
              {!loadingProducts && (
                <Badge variant="secondary" className="text-sm">
                  {products.length} {t('products') || 'товаров'}
                </Badge>
              )}
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-muted/20 rounded-xl">
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                    {t('noProductsYet') || 'Товаров пока нет'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t('noProductsDescription') || 'В этой подкатегории пока нет товаров, но вы можете создать свой уникальный проект'}
                  </p>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('createCustom') || 'Создать индивидуально'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Features Section */}
          <div className="mt-16 pt-16 border-t">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  {t('ourAdvantages') || 'Наши преимущества'}
                </h2>
                <p className="text-muted-foreground text-lg">
                  {t('whyChooseUs') || 'Почему клиенты выбирают нас'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📸</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t('professionalQuality') || 'Профессиональное качество'}</h3>
                  <p className="text-muted-foreground">{t('qualityDescription') || 'Используем только качественные материалы и современное оборудование'}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t('individualDesign') || 'Индивидуальный дизайн'}</h3>
                  <p className="text-muted-foreground">{t('designDescription') || 'Каждая фотокнига создается с учетом ваших пожеланий и предпочтений'}</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🚚</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t('fastDelivery') || 'Быстрая доставка'}</h3>
                  <p className="text-muted-foreground">{t('deliveryDescription') || 'Оперативно изготавливаем и доставляем ваш заказ в удобное время'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}