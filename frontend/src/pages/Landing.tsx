import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { buildAlternateUrls } from '@/lib/localePath';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { TrustIndicators } from "@/components/TrustIndicators";
import { FAQSection } from "@/components/FAQSection";
import { PremiumServices } from "@/components/PremiumServices";
import { HeroButtonGroup, CreatePhotobookButton } from "@/components/PremiumButtons";
import ContactSection from "@/components/ContactSection";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Medal, Truck, Palette, Headphones, Star, Plus, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category, Product, Review } from "@shared/schema";
import QuickPhotobookPreview from "@/components/QuickPhotobookPreview";

function CategoriesGrid() {
  const { t } = useTranslation(); // still used below in JSX
  
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {(categories || [])
        .filter(category => !category.parentId) // Показываем только родительские категории
        .map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
    </div>
  );
}

function ProductsGrid({ onAddToCart }: { onAddToCart: (product: Product) => void }) {
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {(products || []).slice(0, 8).map((product: any) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}

function ReviewsSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const reviewForm = useForm({
    resolver: zodResolver(z.object({
      authorName: z.string().min(1, "Имя обязательно"),
      authorEmail: z.string().email("Некорректный email").optional().or(z.literal("")),
      rating: z.number().min(1).max(5),
      comment: z.string().min(10, "Комментарий должен содержать минимум 10 символов"),
      gender: z.string().min(1, "Пол обязательно указать"),
      profilePhoto: z.string().optional(),
      productId: z.string().optional(), // Связь с товаром
    })),
    defaultValues: {
      authorName: "",
      authorEmail: "",
      rating: 5,
      comment: "",
      gender: "male",
      profilePhoto: "",
      productId: "general",
    }
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      reviewForm.reset();
      setShowReviewForm(false);
      setProfilePreview(null); // Reset photo preview
      toast({
        title: "Спасибо за отзыв!",
        description: "Ваш отзыв отправлен на модерацию и скоро появится на сайте.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить отзыв. Попробуйте снова.",
        variant: "destructive",
      });
    }
  });

  const handleSubmitReview = async (data: any) => {
    // Если выбран "общий отзыв", отправляем null как productId
    const reviewData = {
      ...data,
      productId: data.productId === "general" ? null : data.productId
    };
    createReviewMutation.mutate(reviewData);
  };

  const handlePhotoUpload = async (file: File) => {
    console.log('Starting photo upload process', { fileName: file.name, fileSize: file.size, fileType: file.type });
    setUploadingPhoto(true);
    try {
      // Use the new POST endpoint with FormData
      console.log('Step 1: Creating FormData for upload...');
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Step 2: Uploading file to /api/local-upload...');
      const uploadResult = await fetch('/api/local-upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload result:', { status: uploadResult.status, statusText: uploadResult.statusText, ok: uploadResult.ok });

      if (uploadResult.ok) {
        const uploadResponse = await uploadResult.json();
        console.log('Upload response:', uploadResponse);
        
        // Set profile photo in form with the returned URL
        reviewForm.setValue('profilePhoto', uploadResponse.url);
        setProfilePreview(URL.createObjectURL(file));
        console.log('Photo upload completed successfully!');
        toast({
          title: "Фото загружено!",
          description: "Ваша фотография успешно загружена.",
        });
      } else {
        const errorText = await uploadResult.text();
        console.error('Upload failed with details:', { status: uploadResult.status, statusText: uploadResult.statusText, errorText });
        throw new Error(`Upload failed with status: ${uploadResult.status} - ${errorText}`);
      }
    } catch (error: unknown) {
      const err = error as { message?: string; stack?: string };
      console.error('Photo upload error:', error);
      console.error('Error details:', { message: err?.message, stack: err?.stack });
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить фотографию: ${err?.message ?? 'Неизвестная ошибка'}`,
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoUpload(file);
      }
    };
    input.click();
  };

  const getDefaultAvatar = (gender: string, name: string) => {
    const initial = name?.charAt(0)?.toUpperCase() || '?';
    const bgColor = gender === 'female' ? 'bg-pink-100' : gender === 'male' ? 'bg-blue-100' : 'bg-gray-100';
    const textColor = gender === 'female' ? 'text-pink-600' : gender === 'male' ? 'text-blue-600' : 'text-gray-600';
    
    return (
      <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center ${textColor} font-semibold text-lg`}>
        {initial}
      </div>
    );
  };

  const ReviewAvatar = ({ review }: { review: any }) => {
    const [imageError, setImageError] = useState(false);
    
    if (review.profilePhoto && !imageError) {
      return (
        <img 
          src={review.profilePhoto} 
          alt={`${review.authorName} avatar`}
          className="w-12 h-12 rounded-full object-cover"
          onError={() => setImageError(true)}
        />
      );
    }
    
    return getDefaultAvatar(review.gender || 'other', review.authorName);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex text-yellow-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">{t('customerReviews')}</h2>
          <p className="text-muted-foreground text-lg">{t('whatClientsSay')}</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(reviews || []).slice(0, 6).map((review: any) => (
              <Card key={review.id} className="border border-border">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="mr-4">
                      <ReviewAvatar review={review} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{review.authorName}</h4>
                      {renderStars(review.rating)}
                      {/* Show product name if review is for specific product */}
                      {review.productId && (
                        <div className="mt-1">
                          {(() => {
                            const product = products?.find((p: any) => p.id === review.productId);
                            if (product) {
                              type Localized = { ru?: string; hy?: string; en?: string };
                              const productName = typeof product.name === 'object'
                                ? ((product.name as Localized).ru ?? (product.name as Localized).hy ?? (product.name as Localized).en ?? 'Товар')
                                : (product.name ?? 'Товар');
                              return (
                                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                                  {String(productName)}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground italic">"{review.comment}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          {!showReviewForm ? (
            <Button onClick={() => setShowReviewForm(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              {t('leaveReview')}
            </Button>
          ) : (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">{t('leaveReview')}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReviewForm(false)}
                  >
                    ×
                  </Button>
                </div>
                
                <Form {...reviewForm}>
                  <form onSubmit={reviewForm.handleSubmit(handleSubmitReview)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={reviewForm.control}
                        name="authorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('yourName')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('enterYourName')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={reviewForm.control}
                        name="authorEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('emailOptional')}</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="your@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={reviewForm.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('gender')}</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите пол" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="male">{t('male')}</SelectItem>
                                  <SelectItem value="female">{t('female')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem>
                        <FormLabel>Фото профиля (необязательно)</FormLabel>
                        <div className="flex items-center gap-3">
                          {profilePreview || reviewForm.watch('profilePhoto') ? (
                            <div className="flex items-center gap-2">
                              <img 
                                src={profilePreview || reviewForm.watch('profilePhoto')} 
                                alt="Profile preview"
                                className="w-12 h-12 rounded-full object-cover"
                                onError={(e) => {
                                  // If image fails to load, fall back to default avatar
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setProfilePreview(null);
                                  reviewForm.setValue('profilePhoto', '');
                                }}
                              >
                                Удалить
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {getDefaultAvatar(reviewForm.watch('gender') || 'male', reviewForm.watch('authorName') || '')}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handlePhotoSelect}
                                disabled={uploadingPhoto}
                              >
                                {uploadingPhoto ? t('uploading') : t('uploadPhoto')}
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormItem>
                    </div>

                    {/* Product Selector */}
                    <FormField
                      control={reviewForm.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('selectProduct')} (необязательно)</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger data-testid="select-product">
                                <SelectValue placeholder="Выберите товар для отзыва" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">Общий отзыв о магазине</SelectItem>
                                {(products || []).map((product: any) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {typeof product.name === 'object' ? product.name.ru || product.name.hy || product.name.en : product.name || 'Untitled'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={reviewForm.control}
                      name="rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Оценка</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => field.onChange(star)}
                                  className="text-2xl hover:scale-110 transition-transform"
                                >
                                  <Star
                                    className={`h-6 w-6 ${
                                      star <= field.value
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300 hover:text-yellow-400'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={reviewForm.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('yourReview')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t('reviewPlaceholder')}
                              className="min-h-24"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowReviewForm(false);
                          setProfilePreview(null);
                          reviewForm.reset();
                        }}
                      >
                        {t('cancel')}
                      </Button>
                      <Button type="submit" disabled={createReviewMutation.isPending}>
                        {createReviewMutation.isPending ? t('sending') : t('submitReview')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [dragActive, setDragActive] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

  const scrollToEditor = () => {
    document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      setSelectedPhotos(files);
      toast({
        title: "Фото загружены!",
        description: `Загружено ${files.length} фото. Создаём мгновенный предпросмотр…`,
      });
    }
  }, [toast]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      setSelectedPhotos(files);
      toast({
        title: "Фото загружены!",
        description: `Загружено ${files.length} фото. Создаём мгновенный предпросмотр…`,
      });
    }
  }, [toast]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    input.onchange = handleFileUpload as any;
    input.click();
  };

  return (
    <>
      <Helmet htmlAttributes={{ lang: ((): any => {
        const m = window.location.pathname.match(/^\/(ru|hy|en)(?:\/?|$)/);
        return m ? m[1] : 'x-default';
      })() }}>
        {(() => {
          const m = window.location.pathname.match(/^\/(ru|hy|en)(?:\/?|$)/);
          const currentLang = m ? m[1] : 'ru';
          // Localized fields derived from i18n
          const localizedBusinessName = t('brandLocalBusinessName', { defaultValue: 'PhotoBooksGallery' });
          const localizedWebsiteDesc = t('landingPageDescription');
          const offerCatalogTitle = t('offerCatalogTitle', { defaultValue: t('categoriesTitle') });
          const offerPhotobooks = t('offerPhotobooks', { defaultValue: 'Photobooks' });
          const offerGraduation = t('offerGraduationAlbums', { defaultValue: 'Graduation albums' });
          const offerFrames = t('offerFrames', { defaultValue: 'Photo frames' });
          const offerAR = t('offerARPhotos', { defaultValue: 'Living photos AR' });
          (window as any).__JSONLD = {
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
        <title>{t('landingPageTitle')}</title>
        <meta name="description" content={t('landingPageDescription')} />
        <meta name="keywords" content={t('landingPageKeywords')} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://photobooksgallery.am/" />
        <meta property="og:title" content={t('landingPageTitle')} />
        <meta property="og:description" content={t('landingPageDescription')} />
        <meta property="og:image" content="https://photobooksgallery.am/og-image.jpg" />
        <meta property="og:site_name" content="PhotoBooksGallery" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://photobooksgallery.am/" />
        <meta property="twitter:title" content={t('landingPageTitle')} />
        <meta property="twitter:description" content={t('landingPageDescription')} />
        <meta property="twitter:image" content="https://photobooksgallery.am/og-image.jpg" />
        <meta name="twitter:site" content="@photobooksgallery" />
        
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
        
        {/* Schema.org LocalBusiness + Organization (localized) */}
        <script type="application/ld+json">
          {JSON.stringify((() => {
            const jsonldState = (window as any).__JSONLD || {};
            const currentLang = jsonldState.currentLang || 'ru';
            const localizedBusinessName = jsonldState.localizedBusinessName || 'PhotoBooksGallery';
            const localizedWebsiteDesc = jsonldState.localizedWebsiteDesc || 'Онлайн фотосервис в Армении';
            const offerCatalogTitle = jsonldState.offerCatalogTitle || 'Каталог предложений';
            const offerPhotobooks = jsonldState.offerPhotobooks || 'Photobooks';
            const offerGraduation = jsonldState.offerGraduation || 'Graduation albums';
            const offerFrames = jsonldState.offerFrames || 'Photo frames';
            const offerAR = jsonldState.offerAR || 'Living photos AR';
            return {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://photobooksgallery.am/#organization",
                  "name": "PhotoBooksGallery",
                  "url": "https://photobooksgallery.am",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://photobooksgallery.am/logo.png"
                  },
                  "sameAs": [
                    "https://www.facebook.com/photobooksgallery",
                    "https://instagram.com/photo_books_gallery"
                  ],
                  "contactPoint": [
                    {
                      "@type": "ContactPoint",
                      "contactType": "customer support",
                      "telephone": "+374-55-54-88-40",
                      "availableLanguage": ["ru","hy","en"]
                    },
                    {
                      "@type": "ContactPoint",
                      "contactType": "WhatsApp",
                      "telephone": "+374-77-54-88-40"
                    }
                  ]
                },
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
                  "areaServed": {
                    "@type": "Country",
                    "name": "Armenia"
                  },
                  "openingHoursSpecification": [
                    {
                      "@type": "OpeningHoursSpecification",
                      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                      "opens": "10:00",
                      "closes": "19:00"
                    },
                    {
                      "@type": "OpeningHoursSpecification",
                      "dayOfWeek": "Saturday",
                      "opens": "11:00",
                      "closes": "17:00"
                    }
                  ],
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
      
      <div className="min-h-screen page-bg landing-content">
        <Header />
        {/* Video Hero Section (dynamic sizing) */}
        <DynamicAdaptiveHero t={t} scrollToEditor={scrollToEditor} />
      {/* Categories Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-categories-title">
              {t('categoriesTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-categories-subtitle">
              {t('categoriesSubtitle')}
            </p>
          </div>

          <div className="stable-container">
            <CategoriesGrid />
          </div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <TrustIndicators />
        </div>
      </section>

      {/* Premium Services Section */}
      <PremiumServices />

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

          <div className="stable-container">
            <ProductsGrid onAddToCart={handleAddToCart} />
          </div>
        </div>
      </section>
      {/* Photo Editor Section - Enhanced with WOW Effect */}
      <section id="editor" className="py-24 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 -left-10 w-20 h-20 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full animate-bounce"></div>
          <div className="absolute bottom-20 right-1/4 w-16 h-16 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full animate-ping"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full mb-6">
              <span className="animate-pulse mr-2">✨</span>
              <span className="font-semibold">{t('interactiveEditorMagic')}</span>
              <span className="animate-pulse ml-2">✨</span>
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 mb-6" data-testid="text-editor-title">
              {t('interactiveEditorMainTitle')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
              {t('interactiveEditorDescription')}
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">{t('interactiveEditorBadge1')}</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{t('interactiveEditorBadge2')}</span>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">{t('interactiveEditorBadge3')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Process steps with animations */}
            <div className="space-y-8">
              <div className="text-center lg:text-left mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('interactiveEditorHowTitle')}</h3>
                <p className="text-gray-600">{t('interactiveEditorHowSubtitle')}</p>
              </div>

              {/* Step 1 */}
              <div className="flex items-start space-x-6 group">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-gray-900 mb-2 flex items-center">
                    {t('editorStep1Title')}
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full animate-bounce">
                      {t('editorStep1Badge')}
                    </span>
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {t('editorStep1Description')}
                  </p>
                  <div className="flex items-center mt-2 text-sm text-blue-600">
                    <span className="animate-pulse">⚡</span>
                    <span className="ml-1">{t('editorStep1Feature')}</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-6 group">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-gray-900 mb-2 flex items-center">
                    {t('editorStep2Title')}
                    <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full animate-pulse">
                      {t('editorStep2Badge')}
                    </span>
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {t('editorStep2Description')}
                  </p>
                  <div className="flex items-center mt-2 text-sm text-purple-600">
                    <span className="animate-spin">🔄</span>
                    <span className="ml-1">{t('editorStep2Feature')}</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-6 group">
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-gray-900 mb-2 flex items-center">
                    {t('editorStep3Title')}
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {t('editorStep3Badge')}
                    </span>
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {t('editorStep3Description')}
                  </p>
                  <div className="flex items-center mt-2 text-sm text-green-600">
                    <span>👆</span>
                    <span className="ml-1">{t('editorStep3Feature')}</span>
                  </div>
                </div>
              </div>

              {/* CTA section */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                <h4 className="font-bold text-lg text-gray-900 mb-2">🚀 Готовы попробовать?</h4>
                <p className="text-gray-600 mb-4">Начните создавать свою фотокнигу прямо сейчас!</p>
                <CreatePhotobookButton 
                  onClick={() => window.location.href = '/login'}
                  className="data-testid-button-start-creating"
                >
                  Начать создание
                </CreatePhotobookButton>
              </div>
            </div>

            {/* Right side - Interactive editor area */}
            <div className="relative">
              <Card 
                className={`border-2 border-dashed cursor-pointer transition-all duration-500 relative overflow-hidden ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50 scale-105 shadow-2xl' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:scale-102 shadow-lg hover:shadow-xl'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleClick}
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500"></div>
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
                    animation: 'float 6s ease-in-out infinite'
                  }}></div>
                </div>

                <CardContent className="p-12 text-center space-y-8 relative z-10">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-500 ${
                    dragActive ? 'bg-blue-600 text-white scale-110' : 'bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600'
                  }`}>
                    <Upload className={`transition-all duration-500 ${dragActive ? 'w-10 h-10 animate-bounce' : 'w-8 h-8'}`} />
                  </div>
                  
                  <div>
                    <h3 className={`font-bold text-xl mb-3 transition-colors duration-300 ${
                      dragActive ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {dragActive ? '🎉 Отпустите для создания магии!' : '📸 Перетащите фото сюда'}
                    </h3>
                    <p className={`transition-colors duration-300 ${
                      dragActive ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      {dragActive ? 'Создаем ваш шедевр...' : 'или нажмите для выбора файлов'}
                    </p>
                  </div>

                  {!dragActive && (
                    <div className="space-y-4">
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all duration-300"
                      >
                        <span className="mr-2">📁</span>
                        Выбрать файлы
                      </Button>
                      <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                        <span className="bg-gray-100 px-3 py-1 rounded-full">JPG</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-full">PNG</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-full">HEIC</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedPhotos.length > 0 && (
                <div className="mt-8 animate-in slide-in-from-bottom duration-500">
                  {/* Success message */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3">
                        ✓
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-800">Отлично! Фото загружены</h4>
                        <p className="text-green-600 text-sm">Готовим для вас 10 разворотов...</p>
                      </div>
                    </div>
                  </div>

                  <QuickPhotobookPreview photos={selectedPhotos} />
                  
                  <div className="mt-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-600">
                          Выбрано фото: <span className="font-bold text-gray-900">{selectedPhotos.length}</span>
                        </div>
                        <div className="text-sm text-green-600 flex items-center">
                          <span className="animate-pulse mr-1">🟢</span>
                          Готово к созданию
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedPhotos([])}
                          data-testid="button-clear-selected-photos"
                          className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                        >
                          <span className="mr-2">🗑️</span>
                          Очистить
                        </Button>
                        <CreatePhotobookButton
                          onClick={() => (window.location.href = '/login?redirect=/editor')}
                          className="data-testid-button-proceed-to-editor"
                        >
                          Продолжить в редакторе
                        </CreatePhotobookButton>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs text-gray-500 text-center">
                      💡 После регистрации вас ждет полный редактор с готовыми 10 разворотами
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* Features */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">{t('whyChooseUs')}</h2>
            <p className="text-muted-foreground text-lg">{t('qualityAndService')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Medal className="text-primary h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('premiumQuality')}</h3>
              <p className="text-muted-foreground text-sm">{t('professionalPrint')}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="text-secondary h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('fastDelivery')}</h3>
              <p className="text-muted-foreground text-sm">{t('fastDeliveryDesc')}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Palette className="text-accent h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('easyEditor')}</h3>
              <p className="text-muted-foreground text-sm">{t('easyEditorDesc')}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="text-primary h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('support247')}</h3>
              <p className="text-muted-foreground text-sm">{t('support247Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FAQSection />
        </div>
      </section>

      <ReviewsSection />
      
      {/* Contact Section */}
      <ContactSection />
      
      {/* Call to Action */}
      <section className="py-20 hero-gradient text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
            {t('readyToCreate')}
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            {t('saveMemories')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => window.location.href = '/login'}
              data-testid="button-cta-create"
            >
              {t('createPhotobook')}
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary"
              data-testid="button-cta-contact"
            >
              {t('contactUs')}
            </Button>
          </div>
        </div>
      </section>
      <Footer />
      </div>
    </>
  );
}

interface DynamicHeroProps {
  t: any;
  scrollToEditor: () => void;
}

function DynamicAdaptiveHero({ t, scrollToEditor }: DynamicHeroProps) {
  return (
  <section id="hero-wrapper" className="hero-video-wrapper hero-video-overlay">
      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/og-image.jpg"
        onError={(e) => console.warn('[HeroVideo] error loading video', e)}
        onLoadedData={() => console.log('[HeroVideo] loaded')}
      >
  <source src="/videos/photobooksgallery-heder-video.mp4" type="video/mp4" />
        Ваш браузер не поддерживает видео.
      </video>
      <div className="hero-video-content">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl lg:max-w-4xl space-y-6 md:space-y-8 text-white">
            <h1 className="font-serif font-bold leading-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-xl" data-testid="text-hero-title">
              {t('heroTitle')}
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-95 leading-relaxed drop-shadow" data-testid="text-hero-subtitle">
              {t('heroSubtitle')}
            </p>
            <div className="pt-2">
              <HeroButtonGroup
                onCreateClick={scrollToEditor}
                onViewClick={() => {
                  document.getElementById('examples')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-background/95" />
    </section>
  );
}
