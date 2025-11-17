import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CategoryCard } from '@/components/CategoryCard';
import { ProductCard } from '@/components/ProductCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import type { Product, Category } from '@shared/schema';
import type { LocalizedText } from '@/types';

export default function CategoryPage() {
  const { categorySlug } = useParams();
  const { t, i18n } = useTranslation();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [bannerImagePreview, setBannerImagePreview] = useState('');

  // Получаем все категории для поиска текущей и подкатегорий
  const { data: allCategories = [], isLoading: loadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories/flat', i18n.language],
    queryFn: async () => {
      const res = await fetch(`/api/categories/flat?lang=${i18n.language}`);
      if (!res.ok) throw new Error('Failed to load categories');
      return res.json();
    }
  });

  // Найти текущую категорию по slug
  const currentCategory = allCategories.find(cat => cat.slug === categorySlug);
  
  // Найти подкатегории текущей категории
  const subcategories = allCategories.filter(cat => 
    cat.parentId === currentCategory?.id
  );

  // Получить продукты для текущей категории
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products', { category: categorySlug }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categorySlug) params.set('category', categorySlug);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    },
    enabled: !!categorySlug,
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

  const handleCreateSubcategory = async (formData: FormData) => {
    if (!currentCategory) return;
    
    setCreating(true);
    try {
      const subcategoryData = {
        translations: {
          ru: {
            name: formData.get('name_ru') as string,
            description: formData.get('description_ru') as string || '',
            slug: formData.get('slug') as string || '',
          },
          hy: {
            name: formData.get('name_hy') as string || '',
            description: formData.get('description_hy') as string || '',
          },
          en: {
            name: formData.get('name_en') as string || '',
            description: formData.get('description_en') as string || '',
          },
        },
        parent_id: currentCategory.id,
        coverImage: formData.get('coverImage') as string || null,
        bannerImage: formData.get('bannerImage') as string || null,
      };

      const response = await fetch('/api/categories/subcategory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(subcategoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка создания подкатегории');
      }

      // Обновляем данные
      queryClient.invalidateQueries({ queryKey: ['/api/categories/flat'] });
      
      setShowCreateModal(false);
      setCoverImagePreview('');
      setBannerImagePreview('');
      toast({
        title: t('success') || 'Успешно',
        description: t('subcategoryCreated') || 'Подкатегория создана',
      });
    } catch (error) {
      console.error('Error creating subcategory:', error);
      toast({
        variant: 'destructive',
        title: t('error') || 'Ошибка',
        description: error instanceof Error ? error.message : (t('subcategoryCreateError') || 'Не удалось создать подкатегорию'),
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCoverImagePreview(url);
  };

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setBannerImagePreview(url);
  };

  if (loadingCategories) {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
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

  if (!currentCategory) {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-muted-foreground mb-4">
              {t('categoryNotFound') || 'Категория не найдена'}
            </h1>
            <Link href="/">
              <a className="text-primary hover:underline">
                {t('backToHome') || 'Вернуться на главную'}
              </a>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const categoryName = (currentCategory.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || currentCategory.slug;
  const categoryDescription = (currentCategory.description as LocalizedText)?.[i18n.language as keyof LocalizedText] || '';

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
            <span className="text-foreground">{categoryName}</span>
          </nav>
        </div>
      </section>

      {/* Category Header */}
      <section className="py-10 bg-muted/40">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {categoryName}
          </h1>
          {categoryDescription && (
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {categoryDescription}
            </p>
          )}
          <div className="mt-6">
            <Badge variant="secondary" className="text-sm">
              {products.length} {t('products') || 'товаров'}
            </Badge>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4">
          {/* Подкатегории */}
          {/* Подкатегории */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                {t('subcategories') || 'Подкатегории'}
              </h2>
              <div className="flex items-center gap-2">
                {subcategories.length > 0 && (
                  <Badge variant="outline">
                    {subcategories.length}
                  </Badge>
                )}
                {isAdmin && (
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    {t('createSubcategory') || 'Создать подкатегорию'}
                  </button>
                )}
              </div>
            </div>
            
            {subcategories.length > 0 ? (
              <div className="flex flex-wrap gap-6 justify-start">
                {subcategories.map((subcategory) => (
                  <div key={subcategory.id} className="flex-shrink-0 w-64">
                    <CategoryCard category={subcategory} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-muted-foreground">📂</span>
                  </div>
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    {t('noSubcategoriesYet') || 'Подкатегорий пока нет'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t('noSubcategoriesDescription') || 'Здесь будут отображаться подкатегории, когда они появятся'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Товары */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-bold text-foreground">
                {subcategories.length > 0 
                  ? (t('allProductsInCategory') || 'Все товары в категории')
                  : (t('products') || 'Товары')
                }
              </h2>
              {!loadingProducts && (
                <Badge variant="secondary">
                  {products.length}
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
              <div className="text-center py-16 bg-muted/20 rounded-lg">
                <p className="text-muted-foreground text-lg mb-4">
                  {t('noProducts') || 'В этой категории пока нет товаров'}
                </p>
                <Link href="/catalog">
                  <a className="inline-flex items-center text-primary hover:underline">
                    {t('browseAllProducts') || 'Посмотреть все товары'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Модальное окно создания подкатегории */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleCreateSubcategory(formData);
            }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">
                    {t('createSubcategory') || 'Создать подкатегорию'}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCoverImagePreview('');
                      setBannerImagePreview('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Названия на разных языках */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('name') || 'Название'} (RU) *
                    </label>
                    <input 
                      name="name_ru"
                      type="text" 
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Название на русском"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('name') || 'Название'} (HY)
                    </label>
                    <input 
                      name="name_hy"
                      type="text" 
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Название на армянском"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('name') || 'Название'} (EN)
                    </label>
                    <input 
                      name="name_en"
                      type="text" 
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Название на английском"
                    />
                  </div>

                  {/* Описания */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('description') || 'Описание'} (RU)
                    </label>
                    <textarea 
                      name="description_ru"
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Описание на русском"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('description') || 'Описание'} (HY)
                    </label>
                    <textarea 
                      name="description_hy"
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Описание на армянском"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('description') || 'Описание'} (EN)
                    </label>
                    <textarea 
                      name="description_en"
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Описание на английском"
                    />
                  </div>

                  {/* Slug и изображение */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Slug (URL)
                    </label>
                    <input 
                      name="slug"
                      type="text" 
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="slug-podkategorii (автогенерируется)"
                    />
                  </div>

                  {/* Изображения */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Обложка карточки */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        📋 {t('coverImage') || 'Изображение обложки'}
                      </label>
                      <div className="space-y-3">
                        <input 
                          name="coverImage"
                          type="url" 
                          onChange={handleCoverImageChange}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="https://example.com/cover.jpg"
                        />
                        <p className="text-xs text-muted-foreground">
                          Изображение для карточки подкатегории в каталоге (рекомендуется 400x300px)
                        </p>
                        {/* Превью обложки */}
                        {coverImagePreview && (
                          <div className="border rounded-lg overflow-hidden bg-gray-50">
                            <div className="aspect-square max-w-48">
                              <img 
                                src={coverImagePreview} 
                                alt="Превью обложки"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="p-2 text-xs text-center text-muted-foreground">
                              Превью обложки карточки
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Баннер страницы */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        🎨 {t('bannerImage') || 'Изображение баннера'}
                      </label>
                      <div className="space-y-3">
                        <input 
                          name="bannerImage"
                          type="url" 
                          onChange={handleBannerImageChange}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="https://example.com/banner.jpg"
                        />
                        <p className="text-xs text-muted-foreground">
                          Изображение для hero-баннера страницы подкатегории (рекомендуется 1920x600px)
                        </p>
                        {/* Превью баннера */}
                        {bannerImagePreview && (
                          <div className="border rounded-lg overflow-hidden bg-gray-50">
                            <div className="aspect-video max-w-64">
                              <img 
                                src={bannerImagePreview} 
                                alt="Превью баннера"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="p-2 text-xs text-center text-muted-foreground">
                              Превью hero-баннера
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 mt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCoverImagePreview('');
                      setBannerImagePreview('');
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t('cancel') || 'Отмена'}
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {creating 
                      ? (t('creating') || 'Создание...') 
                      : (t('create') || 'Создать')
                    }
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}