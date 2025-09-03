import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Link } from "wouter";
import { PriceDisplay } from "./PriceDisplay";
import { useCurrency } from '@/contexts/CurrencyContext';
import { useState } from "react";
import type { Product } from "@shared/schema";
import type { LocalizedText } from "@/types";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { t, i18n } = useTranslation();
  const { baseCurrency } = useCurrency();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  const name = (product.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || 'Untitled';
  const description = (product.description as LocalizedText)?.[i18n.language as keyof LocalizedText] || '';

  // Get all available images
  const images = product.images && product.images.length > 0 
    ? product.images 
    : [product.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300'];

  const hasMultipleImages = images.length > 1;

  return (
    <Card className="product-card group overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] rounded-xl" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.id}`} className="block">
        <div className="flex gap-2 p-2">
          {/* Main Image */}
          <div className="flex-1 aspect-square overflow-hidden relative rounded-lg">
            <img 
              src={images[activeImageIndex]} 
              alt={name}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
              data-testid={`img-product-${product.id}`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Discount and Stock Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isOnSale && product.discountPercentage && product.discountPercentage > 0 && (
                <Badge variant="destructive" className="text-xs font-bold">
                  -{product.discountPercentage}%
                </Badge>
              )}
              {product.inStock && (
                <Badge variant="secondary" className="text-xs bg-green-500 text-white">
                  {t('inStock')}
                </Badge>
              )}
              {!product.inStock && (
                <Badge variant="secondary" className="text-xs bg-red-500 text-white">
                  {t('outOfStock')}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Thumbnail Gallery */}
          {hasMultipleImages && (
            <div className="flex flex-col gap-1 w-16">
              {images.slice(0, 4).map((image, index) => (
                <div 
                  key={index}
                  className={`aspect-square rounded cursor-pointer overflow-hidden transition-all duration-300 ${
                    index === activeImageIndex 
                      ? 'ring-2 ring-primary ring-offset-1 opacity-100' 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  onMouseEnter={() => !isHovered && setActiveImageIndex(index)}
                  onMouseLeave={() => setIsHovered(false)}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveImageIndex(index);
                    setIsHovered(true);
                  }}
                  data-testid={`thumbnail-${product.id}-${index}`}
                >
                  <img 
                    src={image}
                    alt={`${name} view ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-200 hover:scale-110"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300';
                    }}
                  />
                </div>
              ))}
              {images.length > 4 && (
                <div className="aspect-square rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-muted-foreground font-medium">
                  +{images.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </Link>
      
      <CardContent className="p-6 relative">
        <Link href={`/product/${product.id}`} className="block">
          <h3 className="font-serif text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300" data-testid={`text-product-name-${product.id}`}>
            {name}
          </h3>
          {description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed" data-testid={`text-product-description-${product.id}`}>
              {description}
            </p>
          )}
        </Link>
        
        {/* Production and delivery info */}
        {(product.productionTime || product.shippingTime) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            {product.productionTime && (
              <span>{t('manufacturing')}: {product.productionTime} {t('days')}</span>
            )}
            {product.shippingTime && (
              <span>{t('delivery')}: {product.shippingTime} {t('days')}</span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{t('price')}</span>
            <PriceDisplay
              price={Number(product.price)}
              originalPrice={product.originalPrice ? Number(product.originalPrice) : undefined}
              fromCurrencyId={baseCurrency?.id || ""}
              className="mt-1"
              data-testid={`text-product-price-${product.id}`}
            />
          </div>
          <Button 
            size="sm"
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            onClick={(e) => {
              e.preventDefault();
              onAddToCart?.(product);
            }}
            data-testid={`button-add-to-cart-${product.id}`}
          >
            {t('addToCart')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
