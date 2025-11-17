import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowRight, Package } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CartPreviewProps {
  onOpenFullCart: () => void;
}

export function CartPreview({ onOpenFullCart }: CartPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { cartItems, getCartTotal } = useCart();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const previewItems = cartItems.slice(0, 3);
  const hasMoreItems = cartItems.length > 3;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cart Icon with Badge */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="relative p-2 hover:bg-accent transition-all duration-200"
        onClick={onOpenFullCart}
      >
        <ShoppingCart className="h-5 w-5" />
        {cartItems.length > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground animate-pulse"
          >
            {cartItems.length}
          </Badge>
        )}
      </Button>

      {/* Hover Preview */}
      {isHovered && cartItems.length > 0 && (
        <div 
          className="absolute top-full right-0 mt-2 w-80 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-xl z-50 animate-in slide-in-from-top-2 duration-200"
          style={{ transform: 'translateX(-50%)', left: '50%' }}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {t('cart')} ({cartItems.length})
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {t('preview')}
              </span>
            </div>
          </div>

          {/* Preview Items */}
          <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
            {previewItems.map((item, index) => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors duration-150"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 200ms ease-out forwards'
                }}
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-10 h-10 object-cover rounded-md ring-1 ring-border/50"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>x{item.quantity}</span>
                    <span>•</span>
                    <span className="font-medium text-primary">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {hasMoreItems && (
              <div className="text-center py-2">
                <span className="text-xs text-muted-foreground">
                  +{cartItems.length - 3} больше товаров...
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/50 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">
                {t('total')}:
              </span>
              <span className="font-bold text-primary">
                {formatPrice(getCartTotal)}
              </span>
            </div>
            
            <Button 
              onClick={onOpenFullCart}
              className="w-full h-9 text-sm group transition-all duration-200 hover:shadow-md"
            >
              <span>{t('viewCart')}</span>
              <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}