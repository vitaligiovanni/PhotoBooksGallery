import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
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

function CategoriesGrid() {
  const { t } = useTranslation();
  
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
      {(categories || []).map((category) => (
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
  const { toast } = useToast();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const reviewForm = useForm({
    resolver: zodResolver(z.object({
      authorName: z.string().min(1, "Имя обязательно"),
      authorEmail: z.string().email("Некорректный email").optional().or(z.literal("")),
      rating: z.number().min(1).max(5),
      comment: z.string().min(10, "Комментарий должен содержать минимум 10 символов"),
      gender: z.string().min(1, "Пол обязательно указать"),
      profilePhoto: z.string().optional(),
    })),
    defaultValues: {
      authorName: "",
      authorEmail: "",
      rating: 5,
      comment: "",
      gender: "male",
      profilePhoto: "",
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
    createReviewMutation.mutate(data);
  };

  const handlePhotoUpload = async (file: File) => {
    console.log('Starting photo upload process', { fileName: file.name, fileSize: file.size, fileType: file.type });
    setUploadingPhoto(true);
    try {
      // Get upload URL
      console.log('Step 1: Getting upload URL...');
      const uploadResponse = await apiRequest("POST", "/api/objects/upload") as any;
      console.log('Upload URL response:', uploadResponse);
      const uploadURL = uploadResponse.uploadURL;

      // Upload the file
      console.log('Step 2: Uploading file to:', uploadURL);
      const uploadResult = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      console.log('Upload result:', { status: uploadResult.status, statusText: uploadResult.statusText, ok: uploadResult.ok });

      if (uploadResult.ok) {
        // Normalize the uploaded file path
        console.log('Step 3: Normalizing path...');
        const rawPath = uploadURL.split('?')[0];
        console.log('Raw path for normalization:', rawPath);
        
        const normalizeResponse = await apiRequest("POST", "/api/objects/normalize", {
          rawPath: rawPath
        }) as any;
        
        console.log('Normalize response:', normalizeResponse);
        
        // Set profile photo in form with normalized path
        reviewForm.setValue('profilePhoto', normalizeResponse.normalizedPath);
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
    } catch (error) {
      console.error('Photo upload error:', error);
      console.error('Error details:', { message: error.message, stack: error.stack });
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить фотографию: ${error.message}`,
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
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">Отзывы клиентов</h2>
          <p className="text-muted-foreground text-lg">Что говорят о нас наши клиенты</p>
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
                    <div>
                      <h4 className="font-semibold text-foreground">{review.authorName}</h4>
                      {renderStars(review.rating)}
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
              Оставить отзыв
            </Button>
          ) : (
            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Оставить отзыв</h3>
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
                            <FormLabel>Ваше имя</FormLabel>
                            <FormControl>
                              <Input placeholder="Введите ваше имя" {...field} />
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
                            <FormLabel>Email (необязательно)</FormLabel>
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
                            <FormLabel>Пол</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите пол" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="male">Мужской</SelectItem>
                                  <SelectItem value="female">Женский</SelectItem>
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
                                {uploadingPhoto ? "Загружается..." : "Загрузить фото"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormItem>
                    </div>

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
                          <FormLabel>Ваш отзыв</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Расскажите о вашем опыте использования наших услуг..."
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
                        Отмена
                      </Button>
                      <Button type="submit" disabled={createReviewMutation.isPending}>
                        {createReviewMutation.isPending ? "Отправляем..." : "Отправить отзыв"}
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
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      toast({
        title: "Фото загружены!",
        description: `Загружено ${files.length} фото. Перенаправляем в редактор...`,
      });
      // Redirect to editor with photos
      setTimeout(() => {
        window.location.href = '/editor';
      }, 1000);
    }
  }, [toast]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      toast({
        title: "Фото загружены!",
        description: `Загружено ${files.length} фото. Перенаправляем в редактор...`,
      });
      setTimeout(() => {
        window.location.href = '/editor';
      }, 1000);
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
    <div className="min-h-screen page-bg">
      <Header />
      {/* Hero Section */}
      <section className="hero-gradient text-white py-20 lg:py-32 bg-[#5c6d91]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight" data-testid="text-hero-title">
                {t('heroTitle')}
              </h1>
              <p className="text-xl opacity-90 leading-relaxed" data-testid="text-hero-subtitle">
                {t('heroSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 shadow-lg"
                  onClick={scrollToEditor}
                  data-testid="button-create-photobook"
                >
                  {t('createPhotobook')}
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-primary"
                  data-testid="button-view-examples"
                >
                  {t('viewExamples')}
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="grid grid-cols-2 gap-4 transform rotate-3">
                <img src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                     alt="Elegant leather photobook" 
                     className="rounded-xl shadow-2xl transform -rotate-6" />
                <img src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                     alt="Open wedding photobook" 
                     className="rounded-xl shadow-2xl transform rotate-6 mt-8" />
                <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                     alt="Family vacation photobook" 
                     className="rounded-xl shadow-2xl transform rotate-3 -mt-4" />
                <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                     alt="Baby memories photobook" 
                     className="rounded-xl shadow-2xl transform -rotate-3" />
              </div>
            </div>
          </div>
        </div>
      </section>
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

          <CategoriesGrid />
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
              <p className="text-muted-foreground">Выбор наших клиентов</p>
            </div>
            <Button variant="ghost" onClick={() => window.location.href = '/catalog'} data-testid="button-view-all-products">
              {t('viewAll')}
            </Button>
          </div>

          <ProductsGrid onAddToCart={handleAddToCart} />
        </div>
      </section>
      {/* Photo Editor Section */}
      <section id="editor" className="py-16 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-editor-title">
              {t('editorTitle')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Создайте уникальную фотокнигу за несколько минут с помощью нашего простого редактора
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t('uploadPhotos')}</h3>
                  <p className="text-muted-foreground">Перетащите ваши любимые фото или выберите их из галереи</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t('autoLayout')}</h3>
                  <p className="text-muted-foreground">Наш алгоритм создаст красивую раскладку на 10 разворотов</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t('personalize')}</h3>
                  <p className="text-muted-foreground">Добавьте текст, измените порядок фото и настройте дизайн</p>
                </div>
              </div>

              <Button 
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-start-creating"
              >
                {t('startCreating')}
              </Button>
            </div>

            <div className="relative">
              <Card 
                className={`border-2 border-dashed cursor-pointer transition-all duration-200 ${
                  dragActive 
                    ? 'border-primary bg-primary/5 scale-105' 
                    : 'border-border hover:border-primary/50 hover:bg-primary/2'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleClick}
              >
                <CardContent className="p-8 text-center space-y-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors ${
                    dragActive ? 'bg-primary text-white' : 'bg-primary/20 text-primary'
                  }`}>
                    <Upload className="text-2xl h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {dragActive ? 'Отпустите фото здесь' : 'Перетащите фото сюда'}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {dragActive ? 'Загружаем ваши фото...' : 'или нажмите для выбора файлов'}
                    </p>
                  </div>
                  {!dragActive && (
                    <Button variant="outline" size="sm">
                      Выбрать файлы
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* Features */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">Почему выбирают нас</h2>
            <p className="text-muted-foreground text-lg">Качество и сервис на высшем уровне</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Medal className="text-primary h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Премиум качество</h3>
              <p className="text-muted-foreground text-sm">Профессиональная печать на лучших материалах</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="text-secondary h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Быстрая доставка</h3>
              <p className="text-muted-foreground text-sm">Доставим ваш заказ в течение 3-5 рабочих дней</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Palette className="text-accent h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Легкий редактор</h3>
              <p className="text-muted-foreground text-sm">Интуитивный интерфейс для создания фотокниг</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="text-primary h-8 w-8" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Поддержка 24/7</h3>
              <p className="text-muted-foreground text-sm">Всегда готовы помочь с вашими вопросами</p>
            </div>
          </div>
        </div>
      </section>
      <ReviewsSection />
      {/* Call to Action */}
      <section className="py-20 hero-gradient text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4">
            Готовы создать свою фотокнигу?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Сохраните ваши воспоминания в красивой фотокниге. 
            Начните прямо сейчас и получите скидку 15% на первый заказ!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => window.location.href = '/api/login'}
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
              Связаться с нами
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
