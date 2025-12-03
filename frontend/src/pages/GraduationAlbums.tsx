import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useQuery } from '@tanstack/react-query';
import { ProductCard } from "@/components/ProductCard";
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@shared/schema';

const GraduationAlbums: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const currentLang = i18n.language as "ru" | "hy" | "en";

  // Fetch products that should appear on graduation albums page
  const { data: graduationProducts = [] } = useQuery({
    queryKey: ['products-graduation-albums'],
    queryFn: async () => {
      const response = await fetch('/api/products?special=graduation-albums');
      if (!response.ok) throw new Error('Failed to fetch graduation products');
      return response.json();
    }
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

  return (
    <>
      <Helmet>
        <title>{t('graduationPageTitle')}</title>
        <meta name="description" content={t('graduationPageDescription')} />
        <meta name="keywords" content={t('graduationPageKeywords')} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://photobooksgallery.am/graduation-albums" />
        <meta property="og:title" content={t('graduationPageTitle')} />
        <meta property="og:description" content={t('graduationPageDescription')} />
        <meta property="og:image" content="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630" />
        <meta property="og:site_name" content="PhotoBooksGallery" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://photobooksgallery.am/graduation-albums" />
        <meta property="twitter:title" content={t('graduationPageTitle')} />
        <meta property="twitter:description" content={t('graduationPageDescription')} />
        <meta property="twitter:image" content="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630" />
        <meta name="twitter:site" content="@photobooksgallery" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="PhotoBooksGallery" />
        <link rel="canonical" href={`https://photobooksgallery.am${window.location.pathname}${window.location.search || ''}`} />
        
        {/* hreflang for multilingual support */}
        <link rel="alternate" hrefLang="ru" href={`https://photobooksgallery.am${window.location.pathname}?lang=ru`} />
        <link rel="alternate" hrefLang="hy" href={`https://photobooksgallery.am${window.location.pathname}?lang=hy`} />
        <link rel="alternate" hrefLang="en" href={`https://photobooksgallery.am${window.location.pathname}?lang=en`} />
        <link rel="alternate" hrefLang="x-default" href={`https://photobooksgallery.am${window.location.pathname}`} />

        {/* Structured Data for Graduation Albums Service */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
       "name": t('graduationHeroTitle'),
            "description": t('graduationPageDescription'),
            "provider": {
              "@type": "Organization",
              "name": "PhotoBooksGallery",
              "url": "https://photobooksgallery.am"
            },
            "areaServed": "Armenia",
            "offers": {
              "@type": "Offer",
              "description": t('graduationHeroSubtitle')
            }
          })}
        </script>
      </Helmet>
      
      <Header />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white pt-20 pb-20">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                {t('graduationHeroTitle')}
              </h1>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                {t('graduationHeroSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-indigo-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors">
                  {t('createPhotobook')}
                </button>
                <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white hover:text-indigo-600 transition-colors">
                  {t('viewAll')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Quality Feature */}
                <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-5xl mb-6">🏆</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {t('graduationQualityTitle')}
                  </h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {t('graduationQualityDesc')}
                  </p>
                </div>

                {/* AR Feature */}
                <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-5xl mb-6">📱</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {t('graduationARTitle')}
                  </h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {t('graduationARDesc')}
                  </p>
                  <p className="text-sm text-indigo-600 mt-4 font-medium">
                    {t('graduationARPricing')}
                  </p>
                </div>

                {/* Memory Feature */}
                <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div className="text-5xl mb-6">💝</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {t('graduationMemoryTitle')}
                  </h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {t('graduationMemoryDesc')}
                  </p>
                </div>

                {/* Modern Approach Feature */}
                <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-3">
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="text-5xl">🚀</div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        {t('graduationModernTitle')}
                      </h3>
                      <p className="text-gray-600 text-lg leading-relaxed">
                        {t('graduationModernDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        {graduationProducts.length > 0 && (
          <section className="py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {t('graduationAlbums')}
                  </h2>
                  <p className="text-xl text-gray-600">
                    {t('graduationPageDescription')}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {graduationProducts.map((product: any) => (
                    <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-20 bg-indigo-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {t('readyToCreate')}
              </h2>
              <p className="text-xl mb-8 opacity-90">
                {t('graduationHeroSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-indigo-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors">
                  {t('contactCTAButton')}
                </button>
                <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white hover:text-indigo-600 transition-colors">
                  {t('viewExamples')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default GraduationAlbums;