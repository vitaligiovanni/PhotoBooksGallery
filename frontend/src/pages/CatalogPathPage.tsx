// React import omitted (automatic JSX runtime)
import { useRoute } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useCatalogPath } from '@/hooks/useCatalogPath';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { CategoryCard } from '@/components/CategoryCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import type { Product } from '@shared/schema';

export default function CatalogPathPage() {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  // Match both /catalog/:categorySlug and /catalog/:categorySlug/:subcategorySlug
  const [matchWithSub, paramsWithSub] = useRoute('/catalog/:categorySlug/:subcategorySlug');
  const [matchWithoutSub, paramsWithoutSub] = useRoute('/catalog/:categorySlug');
  
  // Определяем параметры в зависимости от того, какой роут сработал
  const categorySlug = matchWithSub ? paramsWithSub?.categorySlug : paramsWithoutSub?.categorySlug;
  const subcategorySlug = matchWithSub ? paramsWithSub?.subcategorySlug : undefined;

  const { data, isLoading, error } = useCatalogPath({ categorySlug, subcategorySlug, enabled: !!categorySlug });

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

  const title = data?.subcategory?.name || data?.category?.name || t('catalog') || 'Каталог';

  // Если это подкатегория, показываем красивый hero-баннер
  if (subcategorySlug && data?.subcategory) {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        
        {/* Breadcrumbs */}
        <section className="py-4 bg-muted/20 border-b">
          <div className="container mx-auto px-4">
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-primary">
                {t('home') || 'Главная'}
              </Link>
              <span>→</span>
              <Link href="/catalog" className="hover:text-primary">
                {t('catalog') || 'Каталог'}
              </Link>
              {data?.category && (
                <>
                  <span>→</span>
                  <Link href={`/catalog/${data.category.slug}`} className="hover:text-primary">
                    {data.category.name}
                  </Link>
                </>
              )}
              <span>→</span>
              <span className="text-foreground">{data.subcategory.name}</span>
            </nav>
          </div>
        </section>

        {/* Hero Banner Section for Subcategory */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src={(data.subcategory as any).bannerImage || data.subcategory.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=600'} 
              alt={data.subcategory.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          </div>
          
          <div className="relative container mx-auto px-4 py-20 lg:py-32">
            <div className="max-w-3xl">
              <div className="mb-4">
                <Badge variant="secondary" className="mb-4">
                  {data.category?.name || t('photobooks') || 'Фотокниги'}
                </Badge>
              </div>
              
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {data.subcategory.name}
              </h1>
              
              {data.subcategory.description && (
                <p className="text-white/90 text-lg sm:text-xl leading-relaxed mb-8 max-w-2xl">
                  {data.subcategory.description}
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/editor" className="inline-block">
                  <Badge className="bg-primary hover:bg-primary/90 text-white px-6 py-3 text-base cursor-pointer">
                    {t('createPhotobook') || 'Создать фотокнигу'}
                  </Badge>
                </Link>
                
                {data.counts.products > 0 && (
                  <Badge variant="outline" className="text-white border-white hover:bg-white hover:text-black px-6 py-3 text-base">
                    {data.counts.products} {t('products') || 'товаров'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            
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
                
                {!isLoading && (
                  <Badge variant="secondary" className="text-sm">
                    {data.counts.products} {t('products') || 'товаров'}
                  </Badge>
                )}
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-80 w-full" />
                  ))}
                </div>
              ) : data.products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {data.products.map((product) => (
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
                    <Link href="/editor">
                      <Badge className="bg-primary hover:bg-primary/90 text-white px-6 py-3 cursor-pointer">
                        {t('createCustom') || 'Создать индивидуально'}
                      </Badge>
                    </Link>
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

  // Обычное отображение для категорий (не подкатегорий) - теперь с красивым дизайном
  return (
    <div className="min-h-screen page-bg">
      <Helmet>
        <title>{data?.category?.name || t('catalog') || 'Каталог'} | Photobooks Gallery</title>
        <meta name="description" content={data?.category?.description || t('photobooksDescription') || 'Создайте уникальные фотокниги с профессиональным качеством. Широкий выбор форматов, материалов и дизайнов.'} />
        <meta name="keywords" content={`${data?.category?.name || 'фотокниги'}, фотокнига, печать, дизайн, подарок`} />
        <meta property="og:title" content={`${data?.category?.name || t('catalog')} | Photobooks Gallery`} />
        <meta property="og:description" content={data?.category?.description || t('photobooksDescription')} />
        <meta property="og:image" content={data?.category?.imageUrl || '/og-image.jpg'} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${window.location.origin}/catalog/${categorySlug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": data?.category?.name || t('catalog'),
            "description": data?.category?.description || t('photobooksDescription'),
            "url": `${window.location.origin}/catalog/${categorySlug}`,
            "mainEntity": {
              "@type": "ItemList",
              "numberOfItems": data?.counts?.products || 0,
              "itemListElement": data?.products?.map((product, index) => ({
                "@type": "Product",
                "position": index + 1,
                "name": product.name,
                "image": product.imageUrl,
                "offers": {
                  "@type": "Offer",
                  "price": product.price,
                  // Use currency code if present on populated product; otherwise fallback to currencyId or RUB
                  "priceCurrency": (product as any).currency?.code || (product as any).currencyId || "RUB"
                }
              })) || []
            }
          })}
        </script>
      </Helmet>

      <Header />

      {/* Breadcrumbs */}
      <section className="py-4 bg-muted/20 border-b">
        <div className="container mx-auto px-4">
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">
              {t('home') || 'Главная'}
            </Link>
            <span>→</span>
            <Link href="/catalog" className="hover:text-primary">
              {t('catalog') || 'Каталог'}
            </Link>
            {data?.category && (
              <>
                <span>→</span>
                <span className="text-foreground">{data.category.name}</span>
              </>
            )}
          </nav>
        </div>
      </section>

      {/* Hero Banner Section for Category */}
      {data?.category && (
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={(data.category as any).bannerImage || data.category.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=600'}
              alt={data.category.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          </div>

          <div className="relative container mx-auto px-4 py-20 lg:py-32">
            <div className="max-w-4xl">
              <div className="mb-4">
                <Badge variant="secondary" className="mb-4 text-lg px-4 py-2">
                  {t('photobooks') || 'Фотокниги'}
                </Badge>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {data.category.name}
              </h1>

              {data.category.description && (
                <p className="text-white/90 text-lg sm:text-xl leading-relaxed mb-8 max-w-3xl">
                  {data.category.description}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/editor" className="inline-block">
                  <Badge className="bg-primary hover:bg-primary/90 text-white px-6 py-3 text-base cursor-pointer">
                    {t('createPhotobook') || 'Создать фотокнигу'}
                  </Badge>
                </Link>

                {(data?.children?.length || 0) > 0 && (
                  <Badge variant="outline" className="text-white border-white hover:bg-white hover:text-black px-6 py-3 text-base">
                    {(data?.children?.length || 0)} {t('subcategories') || 'подкатегорий'}
                  </Badge>
                )}

                {data.counts.products > 0 && (
                  <Badge variant="outline" className="text-white border-white hover:bg-white hover:text-black px-6 py-3 text-base">
                    {data.counts.products} {t('products') || 'товаров'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Content Section */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">

          {/* About Section */}
          {data?.category && (
            <div className="mb-16">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-6">
                  {t('aboutCategory') || 'О категории'} {data.category.name}
                </h2>
                <div className="prose prose-lg mx-auto text-muted-foreground">
                  <p className="text-lg leading-relaxed">
                    {data.category.description ||
                     `Откройте для себя нашу коллекцию ${data.category.name.toLowerCase()}.
                     Мы предлагаем широкий выбор качественных фотокниг, созданных с использованием
                     современных технологий печати и премиальных материалов. Каждая фотокнига
                     - это уникальный способ сохранить ваши воспоминания.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subcategories Section */}
          {!subcategorySlug && data?.children && data.children.length > 0 && (
            <div className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    {t('subcategories') || 'Подкатегории'}
                  </h2>
                  <p className="text-muted-foreground">
                    {t('chooseSubcategory') || 'Выберите подходящую подкатегорию'}
                  </p>
                </div>

                <Badge variant="secondary" className="text-sm">
                  {data.children.length} {t('subcategories') || 'подкатегорий'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.children.map(ch => (
                  <CategoryCard key={ch.id} category={{
                    id: ch.id,
                    slug: ch.slug,
                    name: { ru: ch.name },
                    description: { ru: ch.description || '' },
                    parentId: ch.parentId || null,
                    imageUrl: ch.imageUrl || undefined,
                    coverImage: (ch as any).coverImage || undefined,
                    isActive: ch.isActive !== false,
                    translations: { ru: { name: ch.name, slug: ch.slug, description: ch.description || '' } }
                  } as any} />
                ))}
              </div>
            </div>
          )}

          {/* Products Section */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {(data?.children?.length || 0) > 0
                    ? (t('allProductsInCategory') || 'Все товары в категории')
                    : (t('products') || 'Товары')
                  }
                </h2>
                <p className="text-muted-foreground">
                  {t('chooseFromSelection') || 'Выберите из нашего ассортимента'}
                </p>
              </div>

              {!isLoading && data?.counts?.products !== undefined && (
                <Badge variant="secondary" className="text-sm">
                  {data.counts.products} {t('products') || 'товаров'}
                </Badge>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full" />
                ))}
              </div>
            ) : data?.products && data.products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.products.map((product) => (
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
                    {t('noProductsDescription') || 'В этой категории пока нет товаров, но вы можете создать свой уникальный проект'}
                  </p>
                  <Link href="/editor">
                    <Badge className="bg-primary hover:bg-primary/90 text-white px-6 py-3 cursor-pointer">
                      {t('createCustom') || 'Создать индивидуально'}
                    </Badge>
                  </Link>
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
