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
    <Card className="product-card overflow-hidden border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1" data-testid={`card-product-${product.id}`}>
      <Link href={`/product/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden">
          <img 
            src={product.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300'} 
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            data-testid={`img-product-${product.id}`}
          />
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link href={`/product/${product.id}`} className="block">
          <h3 className="font-semibold text-foreground mb-2 line-clamp-2" data-testid={`text-product-name-${product.id}`}>
            {name}
          </h3>
          {description && (
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2" data-testid={`text-product-description-${product.id}`}>
              {description}
            </p>
          )}
        </Link>
        
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary text-lg" data-testid={`text-product-price-${product.id}`}>
            ₽{Number(product.price).toLocaleString()}
          </span>
          <Button 
            size="sm"
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
