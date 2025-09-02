import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Link } from "wouter";
import type { Product } from "@shared/schema";
import type { LocalizedText } from "@/types";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { t, i18n } = useTranslation();
  
  const name = (product.name as LocalizedText)?.[i18n.language as keyof LocalizedText] || 'Untitled';
  const description = (product.description as LocalizedText)?.[i18n.language as keyof LocalizedText] || '';

  return (
    <Card className="product-card group overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] rounded-xl" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden relative">
          <img 
            src={(product.images && product.images.length > 0) ? product.images[0] : (product.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300')} 
            alt={name}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
            data-testid={`img-product-${product.id}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Цена</span>
            <span className="font-bold text-primary text-xl" data-testid={`text-product-price-${product.id}`}>
              ₽{Number(product.price).toLocaleString()}
            </span>
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
