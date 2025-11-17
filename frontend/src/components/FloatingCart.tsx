import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, X, Minus, Plus, ChevronDown } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from 'react-i18next';

interface FloatingCartProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function FloatingCart({ isVisible, onToggle }: FloatingCartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const floatingRef = useRef<HTMLDivElement>(null);
  
  const { cartItems, updateQuantity, getCartTotal } = useCart();
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!floatingRef.current) return;
    
    const rect = floatingRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.y));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isVisible || cartItems.length === 0) return null;

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Floating Cart */}
      <div
        ref={floatingRef}
        className="fixed z-50 select-none transition-all duration-300 ease-out"
        style={{
          left: position.x,
          top: position.y,
          transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {/* Compact Circle Mode */}
        {!isExpanded && (
          <div
            className="relative group cursor-move"
            onMouseDown={handleMouseDown}
            onClick={() => !isDragging && setIsExpanded(true)}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border-2 border-white/20 backdrop-blur-sm">
              <ShoppingCart className="h-6 w-6 text-primary-foreground" />
            </div>
            
            {/* Badge */}
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground font-bold text-xs flex items-center justify-center animate-bounce">
              {cartItems.length}
            </Badge>

            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          </div>
        )}

        {/* Expanded Mini-Window Mode */}
        {isExpanded && (
          <div className="bg-background/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl w-80 max-h-96 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                {t('cart')} ({cartItems.length})
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggle}
                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Items */}
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
              {cartItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(item.price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-2 w-2" />
                    </Button>
                    
                    <span className="text-xs w-4 text-center">{item.quantity}</span>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-2 w-2" />
                    </Button>
                  </div>
                </div>
              ))}

              {cartItems.length > 4 && (
                <div className="text-center py-2">
                  <span className="text-xs text-muted-foreground">
                    +{cartItems.length - 4} ещё...
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gradient-to-r from-muted/30 to-muted/50 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">{t('total')}:</span>
                <span className="text-sm font-bold text-primary">
                  {formatPrice(getCartTotal)}
                </span>
              </div>
              <Button
                onClick={onToggle}
                className="w-full h-7 text-xs"
              >
                {t('viewCart')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}