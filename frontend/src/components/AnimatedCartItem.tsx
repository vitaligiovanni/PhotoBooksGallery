import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, X, Sparkles } from "lucide-react";
import { useCurrency } from '@/contexts/CurrencyContext';

interface AnimatedCartItemProps {
  item: any;
  index: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export function AnimatedCartItem({ item, index, onUpdateQuantity, onRemove }: AnimatedCartItemProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { formatPrice } = useCurrency();

  const handleQuantityChange = (delta: number) => {
    setIsFlipping(true);
    setTimeout(() => {
      onUpdateQuantity(item.id, delta);
      setIsFlipping(false);
    }, 150);
  };

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(item.id), 300);
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isRemoving 
          ? 'scale-95 opacity-0 translate-x-full' 
          : 'scale-100 opacity-100 translate-x-0'
      }`}
      style={{
        animationDelay: `${index * 100}ms`,
        animation: 'slideInLeft 400ms ease-out forwards'
      }}
    >
      <div className="group relative overflow-hidden bg-gradient-to-br from-card to-card/50 rounded-2xl border border-border/50 p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
        {/* Floating particles effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Sparkles className="absolute top-2 right-2 h-3 w-3 text-primary/30 animate-pulse" />
          <Sparkles className="absolute bottom-4 left-4 h-2 w-2 text-primary/20 animate-pulse animation-delay-300" />
        </div>

        {/* Background gradient animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />

        <div className="relative flex items-center gap-4">
          {/* Product Image with 3D effect */}
          <div className="relative">
            <div 
              className={`relative transform transition-all duration-300 ${
                isFlipping ? 'rotate-y-180 scale-110' : 'rotate-y-0'
              } group-hover:scale-105`}
            >
              <img 
                src={item.imageUrl} 
                alt={item.name}
                className="w-16 h-16 object-cover rounded-xl ring-2 ring-primary/10 shadow-lg transition-all duration-300 group-hover:ring-primary/20"
              />
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Floating badge */}
            {item.discountPercentage && (
              <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs animate-bounce shadow-lg">
                -{item.discountPercentage}%
              </Badge>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-sm leading-tight transition-colors group-hover:text-primary">
                {item.name}
              </h4>
              
              {/* Animated remove button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRemove}
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:scale-110 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              >
                <X className="h-3 w-3 transition-transform hover:rotate-90" />
              </Button>
            </div>
            
            {item.options && (
              <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {Object.values(item.options).join(', ')}
              </p>
            )}
            
            {/* Price Section with animations */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary transition-all duration-300 group-hover:scale-105">
                    {formatPrice(item.price)}
                  </span>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <span className="text-xs text-muted-foreground line-through opacity-60">
                      {formatPrice(item.originalPrice)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  за единицу
                </span>
              </div>
              
              {/* Animated Quantity Controls */}
              <div className="flex items-center bg-background/80 backdrop-blur rounded-full border border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-l-full hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3 transition-transform hover:scale-110" />
                </Button>
                
                <div className={`px-3 py-1 text-sm font-bold min-w-[2rem] text-center transition-all duration-200 ${
                  isFlipping ? 'scale-125 text-primary' : 'scale-100'
                }`}>
                  {item.quantity}
                </div>
                
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-r-full hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95"
                  onClick={() => handleQuantityChange(1)}
                >
                  <Plus className="h-3 w-3 transition-transform hover:scale-110 hover:rotate-90" />
                </Button>
              </div>
            </div>

            {/* Subtle total for this item */}
            <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 pt-1 border-t border-border/30">
              Итого: {formatPrice(item.price * item.quantity)}
            </div>
          </div>
        </div>

        {/* Animated border on hover */}
        <div className="absolute inset-0 rounded-2xl border-2 border-primary/0 group-hover:border-primary/20 transition-all duration-300 pointer-events-none" />
      </div>

      {/* Custom CSS for 3D transforms */}
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}