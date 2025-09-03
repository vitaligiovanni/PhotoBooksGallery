import { useParams } from "wouter";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import type { Product } from "@shared/schema";
import { PHOTOBOOK_FORMAT_LABELS } from "@shared/schema";
import type { LocalizedText } from "@/types";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { getFreeShippingThreshold } = useSettings();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [spreads, setSpreads] = useState(10); // Default to minimum spreads
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
    
    addToCart(configuredProduct, quantity, Object.keys(options).length > 0 ? options : undefined);
    
    const productName = (product.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || 'Товар';
    toast({
      title: "Добавлено в корзину",
      description: `${productName} добавлен в корзину`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Navigate to cart
    window.location.href = '/cart';
  };

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
            <h1 className="text-2xl font-bold text-foreground mb-4">Товар не найден</h1>
            <p className="text-muted-foreground mb-8">Возможно, товар был удален или ссылка неверна</p>
            <Button onClick={() => window.location.href = '/catalog'}>
              Вернуться в каталог
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const name = (product.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || 'Untitled';
  const description = (product.description as LocalizedText)?.[i18n.language as keyof LocalizedText] || '';
  const options = (product.options as Record<string, any>) || {};

  // Get all available images
  const images = product.images && product.images.length > 0 
    ? product.images 
    : [product.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600'];

  const hasMultipleImages = images.length > 1;

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
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square overflow-hidden rounded-lg border border-border">
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
                  <span className="text-sm text-muted-foreground ml-2">(24 отзыва)</span>
                </div>
                {product.inStock ? (
                  <Badge variant="secondary" className="bg-green-500 text-white">{t('inStock')}</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-red-500 text-white">{t('outOfStock')}</Badge>
                )}
                {product.isOnSale && product.discountPercentage && product.discountPercentage > 0 && (
                  <Badge className="bg-red-500 text-white">
                    -{product.discountPercentage}% скидка
                  </Badge>
                )}
                {product.stockQuantity !== undefined && (
                  <span className="text-sm text-muted-foreground">
                    Осталось: {product.stockQuantity} шт.
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
                <h3 className="font-semibold text-lg">Параметры фотокниги</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Формат:</span>
                    <span className="ml-2 font-medium">
                      {PHOTOBOOK_FORMAT_LABELS[product.photobookFormat as keyof typeof PHOTOBOOK_FORMAT_LABELS] || product.photobookFormat}
                    </span>
                  </div>
                  {product.photobookSize && (
                    <div>
                      <span className="text-muted-foreground">Размер:</span>
                      <span className="ml-2 font-medium">{product.photobookSize} см</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Мин. разворотов:</span>
                    <span className="ml-2 font-medium">{product.minSpreads || 10}</span>
                  </div>
                  {product.additionalSpreadPrice && Number(product.additionalSpreadPrice) > 0 && (
                    <div>
                      <span className="text-muted-foreground">Доп. разворот:</span>
                      <span className="ml-2 font-medium">₽{Number(product.additionalSpreadPrice).toLocaleString()}</span>
                    </div>
                  )}
                  {product.paperType && (
                    <div>
                      <span className="text-muted-foreground">Тип бумаги:</span>
                      <span className="ml-2 font-medium">
                        {product.paperType === 'matte' ? 'Матовая' : 
                         product.paperType === 'glossy' ? 'Глянцевая' : 
                         product.paperType === 'satin' ? 'Сатиновая' : 
                         product.paperType === 'premium' ? 'Премиум' : product.paperType}
                      </span>
                    </div>
                  )}
                  {product.coverMaterial && (
                    <div>
                      <span className="text-muted-foreground">Обложка:</span>
                      <span className="ml-2 font-medium">
                        {product.coverMaterial === 'hardcover' ? 'Твердая' : 
                         product.coverMaterial === 'softcover' ? 'Мягкая' : 
                         product.coverMaterial === 'leatherette' ? 'Кожзам' : 
                         product.coverMaterial === 'fabric' ? 'Ткань' : product.coverMaterial}
                      </span>
                    </div>
                  )}
                  {product.bindingType && (
                    <div>
                      <span className="text-muted-foreground">Переплет:</span>
                      <span className="ml-2 font-medium">
                        {product.bindingType === 'spiral' ? 'Спираль' : 
                         product.bindingType === 'perfect' ? 'Клеевой' : 
                         product.bindingType === 'saddle-stitch' ? 'Скрепка' : 
                         product.bindingType === 'ring' ? 'Кольца' : product.bindingType}
                      </span>
                    </div>
                  )}
                  {product.allowCustomization && (
                    <div>
                      <span className="text-muted-foreground">Кастомизация:</span>
                      <span className="ml-2 font-medium text-green-600">Доступна</span>
                    </div>
                  )}
                </div>

                {/* Spreads Selector */}
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">Количество разворотов</label>
                  <div className="flex items-center space-x-4">
                    <Select value={spreads.toString()} onValueChange={(value) => setSpreads(Number(value))}>
                      <SelectTrigger className="w-32" data-testid="select-spreads">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 41 }, (_, i) => i + 10).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} разворотов
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {spreads > (product.minSpreads || 10) && (
                      <span className="text-sm text-muted-foreground">
                        +{spreads - (product.minSpreads || 10)} дополнительных
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Price */}
            <div className="border-t border-b border-border py-6">
              <div className="flex items-center space-x-4">
                <span className="font-bold text-3xl text-primary" data-testid="text-product-price">
                  ₽{product.photobookFormat ? calculateTotalPrice().toLocaleString() : Number(product.price).toLocaleString()}
                </span>
                {/* Show original price and discount if product is on sale */}
                {product.isOnSale && product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                  <>
                    <span className="text-muted-foreground line-through">
                      ₽{Number(product.originalPrice).toLocaleString()}
                    </span>
                    {product.discountPercentage && product.discountPercentage > 0 && (
                      <Badge className="bg-red-500 text-white">-{product.discountPercentage}%</Badge>
                    )}
                  </>
                )}
                {product.photobookFormat && spreads > (product.minSpreads || 10) && (
                  <span className="text-sm text-muted-foreground">
                    Базовая: ₽{Number(product.price).toLocaleString()} + ₽{(calculateTotalPrice() - Number(product.price)).toLocaleString()} за доп. развороты
                  </span>
                )}
              </div>
            </div>

            {/* Options */}
            {Object.keys(options).length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Опции</h3>
                
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
                        <SelectValue placeholder={`Выберите ${key}`} />
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
              <label className="text-sm font-medium mb-2 block">Количество</label>
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

            {/* Shipping Information */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Информация о доставке
              </h3>
              <div className="space-y-2 text-sm">
                {product.photobookFormat ? (
                  <>
                    {calculateTotalPrice() * quantity >= getFreeShippingThreshold() ? (
                      <div className="text-green-600 font-medium">
                        🎉 Бесплатная доставка (заказ от ₽{getFreeShippingThreshold().toLocaleString()})
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {t('delivery')}: ₽300 ({t('freeShipping')} ₽{getFreeShippingThreshold().toLocaleString()})
                        <div className="text-xs">
                          До бесплатной доставки: ₽{(getFreeShippingThreshold() - calculateTotalPrice() * quantity).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {Number(product.price) * quantity >= getFreeShippingThreshold() ? (
                      <div className="text-green-600 font-medium">
                        🎉 Бесплатная доставка (заказ от ₽{getFreeShippingThreshold().toLocaleString()})
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {t('delivery')}: ₽300 ({t('freeShipping')} ₽{getFreeShippingThreshold().toLocaleString()})
                        <div className="text-xs">
                          До бесплатной доставки: ₽{(getFreeShippingThreshold() - Number(product.price) * quantity).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="text-xs text-muted-foreground">
                  Время изготовления: {product.productionTime || 7} дней
                </div>
                <div className="text-xs text-muted-foreground">
                  Время доставки: {product.shippingTime || 1} день
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
          <h2 className="font-serif text-2xl font-bold text-foreground mb-8">Отзывы покупателей</h2>
          
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
      </div>

      <Footer />
    </div>
  );
}
