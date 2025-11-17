import { useParams } from "wouter";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { Star, ShoppingCart, Heart, Package } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { Product } from "@shared/schema";
import { PHOTOBOOK_FORMAT_LABELS } from "@shared/public";
import type { LocalizedText } from "@/types";
import { ARAddon } from "@/components/ARAddon";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { getFreeShippingThreshold } = useSettings();
  const { convertPrice, formatPrice, currentCurrency, baseCurrency } = useCurrency();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [spreads, setSpreads] = useState(10); // Default to minimum spreads
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [hasARAddon, setHasARAddon] = useState(false);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Product not found");
        }
        throw new Error("Failed to fetch product");
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Calculate values that we need for useEffect (when product is available)
  const name = product ? (product.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || 'Untitled' : '';
  const description = product ? (product.description as LocalizedText)?.[i18n.language as keyof LocalizedText] || '' : '';
  
  // Get hashtags for current language
  const hashtags = product ? product.hashtags as { ru?: string[], hy?: string[], en?: string[] } || {} : {};
  const currentLanguageHashtags = hashtags[i18n.language as keyof typeof hashtags] || [];
  const hashtagsString = currentLanguageHashtags.join(', ').replace(/#/g, ''); // Remove # for meta keywords

  // Calculate total price for photobook
  const calculateTotalPrice = () => {
    if (!product) return 0;
    const basePrice = Number(product.price);
    const minSpreads = product.minSpreads || 10;
    const additionalSpreadPrice = Number(product.additionalSpreadPrice || 0);
    
    if (spreads <= minSpreads) {
      return basePrice;
    } else {
      const additionalSpreads = spreads - minSpreads;
      return basePrice + (additionalSpreads * additionalSpreadPrice);
    }
  };

  // Helper functions for price formatting with currency conversion
  const getProductCurrencyId = () => product?.currencyId || baseCurrency?.id || "";
  
  const formatProductPrice = (amount: number) => {
    const currencyId = getProductCurrencyId();
    if (!currentCurrency || !currencyId) return amount.toString();
    const convertedAmount = convertPrice(amount, currencyId, currentCurrency.id);
    return formatPrice(convertedAmount, currentCurrency.id);
  };

  const getConvertedPrice = (amount: number) => {
    const currencyId = getProductCurrencyId();
    if (!currentCurrency || !currencyId) return amount;
    return convertPrice(amount, currencyId, currentCurrency.id);
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!product) return;
    
    // Create a product copy with the current configuration
    const configuredProduct = {
      ...product,
      price: product.photobookFormat ? calculateTotalPrice().toString() : product.price,
    };
    
    const options: Record<string, any> = {
      ...selectedOptions,
    };
    
    if (product.photobookFormat) {
      options.spreads = spreads;
      options.format = product.photobookFormat;
      if (product.photobookSize) {
        options.size = product.photobookSize;
      }
    }
    
    // Include AR addon selection
    if (hasARAddon) {
      options.hasARAddon = true;
    }
    
    addToCart(configuredProduct, quantity, Object.keys(options).length > 0 ? options : undefined);
    
    const productName = (product.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || 'Товар';
    toast({
      title: t("addedToCart"),
      description: t("productAddedToCart", { productName }),
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Navigate to cart
    window.location.href = '/cart';
  };

  // Update SEO meta tags when product loads
  useEffect(() => {
    if (!product) return;

    // Update title
    document.title = `${name} | PhotoBooks Gallery`;

    // Update or create meta description
    const updateMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update or create meta property
    const updateMetaProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Basic SEO tags
    updateMeta('description', description.substring(0, 155));
    if (hashtagsString) {
      updateMeta('keywords', hashtagsString);
    }

    // Open Graph tags
    updateMetaProperty('og:title', name);
    updateMetaProperty('og:description', description.substring(0, 155));
    updateMetaProperty('og:type', 'product');
    if (product.imageUrl || (product.images && product.images.length > 0)) {
      updateMetaProperty('og:image', product.imageUrl || product.images![0]);
    }
    if (currentLanguageHashtags.length > 0) {
      updateMetaProperty('article:tag', currentLanguageHashtags.join(', '));
    }

    // Twitter Card tags
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', name);
    updateMeta('twitter:description', description.substring(0, 155));
    if (product.imageUrl || (product.images && product.images.length > 0)) {
      updateMeta('twitter:image', product.imageUrl || product.images![0]);
    }

    // Structured data for search engines
    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": name,
      "description": description,
      "image": product.images || [product.imageUrl].filter(Boolean),
      "brand": {
        "@type": "Brand",
        "name": "PhotoBooks Gallery"
      },
      "offers": {
        "@type": "Offer",
        "price": product.photobookFormat ? getConvertedPrice(calculateTotalPrice()) : getConvertedPrice(Number(product.price)),
        "priceCurrency": currentCurrency?.code || "AMD",
        "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "description": description
      },
      "keywords": hashtagsString,
      "additionalProperty": currentLanguageHashtags.map(tag => ({
        "@type": "PropertyValue",
        "name": "hashtag",
        "value": tag
      }))
    };

    // Insert structured data
    let structuredDataScript = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
    if (structuredDataScript) {
      structuredDataScript.textContent = JSON.stringify(structuredData);
    } else {
      structuredDataScript = document.createElement('script') as HTMLScriptElement;
      structuredDataScript.type = 'application/ld+json';
      structuredDataScript.textContent = JSON.stringify(structuredData);
      document.head.appendChild(structuredDataScript);
    }

    return () => {
      // Cleanup function to reset title when component unmounts
      document.title = 'PhotoBooks Gallery';
    };
  }, [product, name, description, hashtagsString, currentLanguageHashtags, i18n.language]);

  // Get all available images
  const images = product && product.images && product.images.length > 0
    ? product.images
    : product ? [product.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600'] : [];

  // Get all available videos
  const videos = product?.videos || [];
  const hasVideos = videos.length > 0 || product?.videoUrl;
  const hasMultipleImages = images.length > 1;

  // Conditional returns AFTER all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-foreground mb-4">{t("productNotFound")}</h1>
            <p className="text-muted-foreground mb-8">{t("productNotFoundDesc")}</p>
            <Button onClick={() => window.location.href = '/catalog'}>
              {t("backToCatalog")}
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const options = (product?.options as Record<string, any>) || {};

  return (
    <div className="min-h-screen page-bg">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">{t("home")}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/catalog">{t('catalog')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image Gallery */}
          <div className="space-y-4">
            {/* Main Image or Video */}
            <div className="aspect-square overflow-hidden rounded-lg border border-border relative">
              {showVideo && hasVideos ? (
                <video
                  src={product.videoUrl || videos[0]}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  muted
                  data-testid="video-product-main"
                  onError={(e) => {
                    const target = e.target as HTMLVideoElement;
                    console.error('Video playback error:', target.error);
                    setShowVideo(false);
                  }}
                />
              ) : (
                <img
                  src={images[activeImageIndex]}
                  alt={name}
                  className="w-full h-full object-cover transition-transform duration-300"
                  data-testid="img-product-main"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600';
                  }}
                />
              )}
              
              {/* Video Play Button */}
              {hasVideos && !showVideo && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-300"
                  data-testid="button-play-video"
                >
                  <div className="bg-blue-500 text-white rounded-full p-4">
                    <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </button>
              )}
              
              {/* Video Close Button */}
              {showVideo && (
                <button
                  onClick={() => setShowVideo(false)}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                  data-testid="button-close-video"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              )}
            </div>
            
            {/* Thumbnail gallery */}
            {hasMultipleImages && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <div 
                    key={index} 
                    className={`flex-shrink-0 w-16 h-16 rounded border overflow-hidden cursor-pointer transition-all duration-300 ${
                      index === activeImageIndex 
                        ? 'ring-2 ring-primary ring-offset-2 opacity-100 border-primary' 
                        : 'border-border opacity-60 hover:opacity-100 hover:border-primary/50'
                    }`}
                    onMouseEnter={() => setActiveImageIndex(index)}
                    onClick={() => setActiveImageIndex(index)}
                    data-testid={`thumbnail-product-${index}`}
                  >
                    <img 
                      src={image} 
                      alt={`${name} view ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Video Thumbnails */}
            {hasVideos && videos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">{t("videos")}</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {videos.map((video, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-16 h-16 rounded border border-border overflow-hidden cursor-pointer relative group"
                      onClick={() => {
                        setShowVideo(true);
                        // Set the video to play
                        if (product.videoUrl) {
                          // Handle main video URL
                        }
                      }}
                      data-testid={`video-thumbnail-${index}`}
                    >
                      <video
                        src={video}
                        className="w-full h-full object-cover"
                        muted
                        onLoadedData={(e) => {
                          // Capture thumbnail from video
                          const video = e.target as HTMLVideoElement;
                          video.currentTime = 1; // Seek to 1 second for thumbnail
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="text-product-name">
                {name}
              </h1>
              
              <div className="flex items-center flex-wrap gap-4 mb-4">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-accent" />
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">({t("reviewsCount", { count: 24 })})</span>
                </div>
                {product.inStock ? (
                  <Badge variant="secondary" className="bg-green-500 text-white">{t('inStock')}</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-red-500 text-white">{t('outOfStock')}</Badge>
                )}
                {product.isOnSale && product.discountPercentage && product.discountPercentage > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {t("discountPercentage", { percentage: product.discountPercentage })}
                  </Badge>
                )}
                {product.stockQuantity !== undefined && (
                  <span className="text-sm text-muted-foreground">
                    {t("stockLeft", { quantity: product.stockQuantity })}
                  </span>
                )}
              </div>

              <p className="text-muted-foreground text-lg leading-relaxed" data-testid="text-product-description">
                {description}
              </p>
            </div>

            {/* Photobook Information */}
            {product.photobookFormat && product.photobookFormat !== "none" && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-lg">{t("photobookParameters")}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("format")}:</span>
                    <span className="ml-2 font-medium">
                      {PHOTOBOOK_FORMAT_LABELS[product.photobookFormat as keyof typeof PHOTOBOOK_FORMAT_LABELS] || product.photobookFormat}
                    </span>
                  </div>
                  {product.photobookSize && (
                    <div>
                      <span className="text-muted-foreground">{t("size")}:</span>
                      <span className="ml-2 font-medium">{product.photobookSize} {t("cm")}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">{t("minSpreads")}:</span>
                    <span className="ml-2 font-medium">{product.minSpreads || 10}</span>
                  </div>
                  {product.additionalSpreadPrice && Number(product.additionalSpreadPrice) > 0 && (
                    <div>
                      <span className="text-muted-foreground">{t("additionalSpreadPrice")}:</span>
                      <span className="ml-2 font-medium">₽{Number(product.additionalSpreadPrice).toLocaleString()}</span>
                    </div>
                  )}
                  {product.paperType && (
                    <div>
                      <span className="text-muted-foreground">{t("paperType")}:</span>
                      <span className="ml-2 font-medium">
                        {product.paperType === 'matte' ? t("matte") :
                         product.paperType === 'glossy' ? t("glossy") :
                         product.paperType === 'satin' ? t("satin") :
                         product.paperType === 'premium' ? t("premium") : product.paperType}
                      </span>
                    </div>
                  )}
                  {product.coverMaterial && (
                    <div>
                      <span className="text-muted-foreground">{t("coverMaterial")}:</span>
                      <span className="ml-2 font-medium">
                        {product.coverMaterial === 'hardcover' ? t("hardcover") :
                         product.coverMaterial === 'softcover' ? t("softcover") :
                         product.coverMaterial === 'leatherette' ? t("leatherette") :
                         product.coverMaterial === 'fabric' ? t("fabric") : product.coverMaterial}
                      </span>
                    </div>
                  )}
                  {product.bindingType && (
                    <div>
                      <span className="text-muted-foreground">{t("bindingType")}:</span>
                      <span className="ml-2 font-medium">
                        {product.bindingType === 'spiral' ? t("spiral") :
                         product.bindingType === 'perfect' ? t("perfect") :
                         product.bindingType === 'saddle-stitch' ? t("saddleStitch") :
                         product.bindingType === 'ring' ? t("ring") : product.bindingType}
                      </span>
                    </div>
                  )}
                  {product.allowCustomization && (
                    <div>
                      <span className="text-muted-foreground">{t("customization")}:</span>
                      <span className="ml-2 font-medium text-green-600">{t("available")}</span>
                    </div>
                  )}
                </div>

                {/* Spreads Selector */}
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">{t("spreadsCount")}</label>
                  <div className="flex items-center space-x-4">
                    <Select value={spreads.toString()} onValueChange={(value) => setSpreads(Number(value))}>
                      <SelectTrigger className="w-32" data-testid="select-spreads">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 41 }, (_, i) => i + 10).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {t("spreadsCountValue", { count: num })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {spreads > (product.minSpreads || 10) && (
                      <span className="text-sm text-muted-foreground">
                        {t("additionalSpreads", { count: spreads - (product.minSpreads || 10) })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Price */}
            <div className="border-t border-b border-border py-6">
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold text-primary mb-2">
                  {formatProductPrice(product.photobookFormat ? calculateTotalPrice() : Number(product.price))}
                </span>
                {/* Show original price and discount if product is on sale */}
                {product.isOnSale && product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                  <>
                    <span className="text-muted-foreground line-through">
                      {formatProductPrice(Number(product.originalPrice))}
                    </span>
                    {product.discountPercentage && product.discountPercentage > 0 && (
                      <Badge className="bg-red-500 text-white">-{product.discountPercentage}%</Badge>
                    )}
                  </>
                )}
                {product.photobookFormat && spreads > (product.minSpreads || 10) && (
                  <span className="text-sm text-muted-foreground">
                    {t("basePricePlusAdditional", {
                      basePrice: formatProductPrice(Number(product.price)),
                      additionalPrice: formatProductPrice(calculateTotalPrice() - Number(product.price))
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Options */}
            {Object.keys(options).length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">{t("options")}</h3>
                
                {Object.entries(options).map(([key, values]) => (
                  <div key={key}>
                    <label className="text-sm font-medium mb-2 block capitalize">
                      {key}
                    </label>
                    <Select 
                      value={selectedOptions[key] || ''} 
                      onValueChange={(value) => setSelectedOptions(prev => ({ ...prev, [key]: value }))}
                    >
                      <SelectTrigger data-testid={`select-${key}`}>
                        <SelectValue placeholder={t("selectOption", { option: key })} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(values) ? values.map((value: string) => (
                          <SelectItem key={value} value={value}>{value}</SelectItem>
                        )) : (
                          <SelectItem value={values.toString()}>{values.toString()}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t("quantity")}</label>
              <Select value={quantity.toString()} onValueChange={(value) => setQuantity(Number(value))}>
                <SelectTrigger className="w-24" data-testid="select-quantity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AR Addon */}
            <ARAddon
              productId={product.id}
              productName={name}
              onARToggle={setHasARAddon}
            />

            {/* Shipping Information */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t("shippingInfo")}
              </h3>
              <div className="space-y-2 text-sm">
                {product.photobookFormat ? (
                  <>
                    {getConvertedPrice(calculateTotalPrice()) * quantity >= getFreeShippingThreshold() ? (
                      <div className="text-green-600 font-medium">
                        🎉 {t("freeShippingThreshold", { threshold: getFreeShippingThreshold().toLocaleString() })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {t('delivery')}: {formatProductPrice(300)} ({t('freeShipping')} {getFreeShippingThreshold().toLocaleString()})
                        <div className="text-xs">
                          До бесплатной доставки: {formatProductPrice(getFreeShippingThreshold() - getConvertedPrice(calculateTotalPrice()) * quantity)}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {getConvertedPrice(Number(product.price)) * quantity >= getFreeShippingThreshold() ? (
                      <div className="text-green-600 font-medium">
                        🎉 {t("freeShippingThreshold", { threshold: getFreeShippingThreshold().toLocaleString() })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {t('delivery')}: {formatProductPrice(300)} ({t('freeShipping')} {getFreeShippingThreshold().toLocaleString()})
                        <div className="text-xs">
                          До бесплатной доставки: {formatProductPrice(getFreeShippingThreshold() - getConvertedPrice(Number(product.price)) * quantity)}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="text-xs text-muted-foreground">
                  {t("productionTime")}: {product.productionTime || 7} {t("days")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("shippingTime")}: {product.shippingTime || 1} {t("day")}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div className="flex space-x-4">
                <Button 
                  size="lg" 
                  className="flex-1"
                  onClick={handleBuyNow}
                  data-testid="button-buy-now"
                >
                  {t('buyNow')}
                </Button>
                
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleAddToCart}
                  data-testid="button-add-to-cart"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {t('addToCart')}
                </Button>
              </div>
              
              <Button variant="ghost" className="w-full" data-testid="button-add-to-wishlist">
                <Heart className="h-4 w-4 mr-2" />
                {t('addToWishlist')}
              </Button>
            </div>

            {/* Additional Info */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                {product.shippingTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('delivery')}:</span>
                    <span className="font-medium">{product.shippingTime} {product.shippingTime === 1 ? 'день' : product.shippingTime < 5 ? 'дня' : 'дней'}</span>
                  </div>
                )}
                {product.productionTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Срок изготовления:</span>
                    <span className="font-medium">{product.productionTime} {product.productionTime === 1 ? 'день' : product.productionTime < 5 ? 'дня' : 'дней'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Гарантия:</span>
                  <span className="font-medium">12 месяцев</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Возврат:</span>
                  <span className="font-medium">30 дней</span>
                </div>
                {product.weight && Number(product.weight) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Вес:</span>
                    <span className="font-medium">{Number(product.weight).toLocaleString()} кг</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-8">{t("customerReviews")}</h2>
          
          <div className="grid gap-6">
            {/* Mock reviews */}
            {[
              { name: 'Анна М.', rating: 5, review: 'Отличное качество печати! Фотокнига получилась именно такой, как я хотела.', date: '2024-01-15' },
              { name: 'Дмитрий К.', rating: 5, review: 'Быстрая доставка, качественная упаковка. Очень доволен покупкой.', date: '2024-01-10' },
              { name: 'Елена П.', rating: 4, review: 'Хорошее качество, но хотелось бы больше вариантов обложек.', date: '2024-01-05' }
            ].map((review, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-primary">{review.name[0]}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">{review.name}</h4>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < review.rating ? 'fill-current text-accent' : 'text-muted-foreground'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{review.date}</span>
                  </div>
                  <p className="text-muted-foreground">{review.review}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Hidden hashtags for SEO - invisible to users but crawlable by search engines */}
        {currentLanguageHashtags.length > 0 && (
          <div style={{ display: 'none' }} className="hidden-hashtags" aria-hidden="true">
            <div itemProp="keywords">
              {currentLanguageHashtags.map((tag, index) => (
                <span key={index} className="hashtag" itemProp="hashtag">
                  {tag}
                </span>
              ))}
            </div>
            {/* Additional SEO-friendly representations */}
            <meta name="product-tags" content={hashtagsString} />
            <meta name="product-hashtags" content={currentLanguageHashtags.join(' ')} />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
