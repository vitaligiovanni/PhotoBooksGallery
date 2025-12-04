import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { Helmet } from 'react-helmet-async';
import { buildAlternateUrls } from '@/lib/localePath';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { CategoryCard } from "@/components/CategoryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";
import type { Product, Category } from "@shared/schema";

export default function Home() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories", "v2"], // Добавляем версию для инвалидации кэша
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    const productName = typeof product.name === 'object' 
      ? (product.name as any)?.ru || (product.name as any)?.en || 'Товар'
      : product.name || 'Товар';
    toast({
      title: "Добавлено в корзину",
      description: `${productName} добавлен в корзину`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-32 w-full mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet htmlAttributes={{ lang: ((): any => {
        const m = window.location.pathname.match(/^\/(ru|hy|en)(?:\/?|$)/);
        return m ? m[1] : 'x-default';
      })() }}>
        {(() => {
          const m = window.location.pathname.match(/^\/(ru|hy|en)(?:\/?|$)/);
          const currentLang = m ? m[1] : 'ru';
          const localizedBusinessName = t('brandLocalBusinessName', { defaultValue: 'PhotoBooksGallery' });
          const localizedWebsiteDesc = t('homePageDescription');
          const offerCatalogTitle = t('offerCatalogTitle', { defaultValue: t('categoriesTitle') });
          const offerPhotobooks = t('offerPhotobooks', { defaultValue: 'Photobooks' });
          const offerGraduation = t('offerGraduationAlbums', { defaultValue: 'Graduation albums' });
          const offerFrames = t('offerFrames', { defaultValue: 'Photo frames' });
          const offerAR = t('offerARPhotos', { defaultValue: 'Living photos AR' });
          (window as any).__JSONLD_HOME = {
            localizedBusinessName,
            localizedWebsiteDesc,
            currentLang,
            offerCatalogTitle,
            offerPhotobooks,
            offerGraduation,
            offerFrames,
            offerAR,
          };
          return null;
        })()}
        <title>{t('homePageTitle')}</title>
        <meta name="description" content={t('homePageDescription')} />
        <meta name="keywords" content={t('homePageKeywords')} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://photobooksgallery.am/" />
        <meta property="og:title" content={t('homePageTitle')} />
        <meta property="og:description" content={t('homePageDescription')} />
        <meta property="og:image" content="https://photobooksgallery.am/og-image.jpg" />
        <meta property="og:site_name" content="PhotoBooksGallery" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://photobooksgallery.am/" />
        <meta property="twitter:title" content={t('homePageTitle')} />
        <meta property="twitter:description" content={t('homePageDescription')} />
        <meta property="twitter:image" content="https://photobooksgallery.am/og-image.jpg" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="PhotoBooksGallery" />
        <link rel="canonical" href={`https://photobooksgallery.am${window.location.pathname}`} />
        {/* hreflang for multilingual support (path prefixes) */}
        {(() => {
          const alt = buildAlternateUrls('https://photobooksgallery.am', window.location.pathname);
          return (
            <>
              <link rel="alternate" hrefLang="ru" href={alt.ru} />
              <link rel="alternate" hrefLang="hy" href={alt.hy} />
              <link rel="alternate" hrefLang="en" href={alt.en} />
              <link rel="alternate" hrefLang="x-default" href={alt.xDefault} />
            </>
          );
        })()}
        <script type="application/ld+json">
          {JSON.stringify((() => {
            const s = (window as any).__JSONLD_HOME || {};
            const currentLang = s.currentLang || 'ru';
            const localizedBusinessName = s.localizedBusinessName || 'PhotoBooksGallery';
            const localizedWebsiteDesc = s.localizedWebsiteDesc || t('homePageDescription');
            const offerCatalogTitle = s.offerCatalogTitle || t('categoriesTitle');
            const offerPhotobooks = s.offerPhotobooks || 'Photobooks';
            const offerGraduation = s.offerGraduation || 'Graduation albums';
            const offerFrames = s.offerFrames || 'Photo frames';
            const offerAR = s.offerAR || 'Living photos AR';
            return {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "LocalBusiness",
                  "@id": "https://photobooksgallery.am/#localbusiness",
                  "name": localizedBusinessName,
                  "image": "https://photobooksgallery.am/og-image.jpg",
                  "url": "https://photobooksgallery.am",
                  "telephone": "+374-55-54-88-40",
                  "priceRange": "$$",
                  "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Online Service",
                    "addressLocality": "Yerevan",
                    "addressRegion": "Yerevan",
                    "postalCode": "0001",
                    "addressCountry": "AM"
                  },
                  "areaServed": { "@type": "Country", "name": "Armenia" },
                  "hasOfferCatalog": {
                    "@type": "OfferCatalog",
                    "name": offerCatalogTitle,
                    "itemListElement": [
                      { "@type": "OfferCatalog", "name": offerPhotobooks },
                      { "@type": "OfferCatalog", "name": offerGraduation },
                      { "@type": "OfferCatalog", "name": offerFrames },
                      { "@type": "OfferCatalog", "name": offerAR }
                    ]
                  }
                },
                {
                  "@type": "WebSite",
                  "@id": "https://photobooksgallery.am/#website",
                  "url": "https://photobooksgallery.am",
                  "name": "PhotoBooksGallery",
                  "description": localizedWebsiteDesc,
                  "publisher": { "@id": "https://photobooksgallery.am/#organization" },
                  "inLanguage": [currentLang]
                }
              ]
            };
          })())}
        </script>
      </Helmet>
      
      <div className="min-h-screen page-bg">
        <Header />
        {/* Welcome Section */}
        <section className="hero-gradient py-16 text-[#ffffff] bg-[#86aab2]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-4" data-testid="text-welcome-title">
            {t('welcome')}, {(user as any)?.firstName || t('friend')}!
          </h1>
          <p className="text-xl opacity-90 mb-8">
            {t('createUniquePhotobook')}
          </p>
          <Button 
            size="lg"
            className="bg-white text-primary hover:bg-white/90"
            onClick={() => window.location.href = '/editor'}
            data-testid="button-start-creating"
          >
            {t('startCreating')}
          </Button>
        </div>
      </section>
      {/* Categories Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-categories-title">
              {t('categoriesTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('categoriesSubtitle')}
            </p>
          </div>

          {categoriesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(categories || [])
                .filter((category: any) => !category.parentId || category.parentId === "null") // Показываем только основные категории
                .map((category: any) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}
        </div>
      </section>
      {/* Featured Products */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="text-popular-products">
                {t('popularProducts')}
              </h2>
              <p className="text-muted-foreground">{t('clientChoice')}</p>
            </div>
            <Button variant="ghost" onClick={() => window.location.href = '/catalog'} data-testid="button-view-all-products">
              {t('viewAll')}
            </Button>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(products || []).slice(0, 8).map((product: any) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
      </div>
    </>
  );
}
