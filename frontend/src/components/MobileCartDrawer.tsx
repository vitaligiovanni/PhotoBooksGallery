import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from 'react-i18next';
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { Link } from "wouter";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from '@/contexts/CurrencyContext';

interface MobileCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Centralized scroll lock helpers (prevents layout shift when scrollbar disappears)
let scrollLockCounter = 0;
const originalLockState: { paddingRight?: string; overflow?: string } = {};

function lockScroll() {
  if (typeof window === 'undefined') return;
  const docEl = document.documentElement;
  const body = document.body;
  // Если html ВСЕГДА имеет scrollbar (overflow-y:scroll), то скрытие body overflow не меняет ширину.
  // В этом случае paddingRight НЕ НУЖЕН и только создаёт «белую полосу».
  const htmlStyles = getComputedStyle(docEl);
  const forceScrollbar = htmlStyles.overflowY === 'scroll';
  if (scrollLockCounter === 0) {
    originalLockState.paddingRight = body.style.paddingRight;
    originalLockState.overflow = body.style.overflow;
    if (!forceScrollbar) {
      const scrollBarWidth = window.innerWidth - docEl.clientWidth;
      if (scrollBarWidth > 0) {
        body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }
    body.style.overflow = 'hidden';
    body.dataset.scrollLocked = '1';
  }
  scrollLockCounter++;
}

function unlockScroll() {
  if (typeof window === 'undefined') return;
  if (scrollLockCounter > 0) scrollLockCounter--;
  if (scrollLockCounter === 0) {
    if (originalLockState.paddingRight !== undefined) {
      document.body.style.paddingRight = originalLockState.paddingRight;
    }
    if (originalLockState.overflow !== undefined) {
      document.body.style.overflow = originalLockState.overflow;
    } else {
      document.body.style.overflow = '';
    }
    delete document.body.dataset.scrollLocked;
  }
}

export function MobileCartDrawer({ isOpen, onClose }: MobileCartDrawerProps) {
  const [dragStartY, setDragStartY] = useState(0);
  const [currentTranslateY, setCurrentTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  
  const { t } = useTranslation();
  const { cartItems, updateQuantity, removeFromCart, getCartTotal } = useCart();
  const { formatPrice } = useCurrency();

  // Handle touch events for swipe-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY;
    
    if (diff > 0) { // Only allow downward swipes
      setCurrentTranslateY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (currentTranslateY > 150) { // Threshold for closing
      onClose();
    }
    setCurrentTranslateY(0);
    setIsDragging(false);
  };

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      lockScroll();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (isOpen) {
        unlockScroll();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-300 ease-out"
        style={{
          transform: isDragging ? `translateY(${currentTranslateY}px)` : 'translateY(0)',
          transition: isDragging ? 'none' : 'transform 300ms ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {t('cart')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {cartItems.length} {cartItems.length === 1 ? 'товар' : 'товаров'}
                </p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-lg">Корзина пуста</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                Добавьте товары для оформления заказа
              </p>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div 
                key={item.id} 
                className="flex gap-4 p-4 bg-card rounded-2xl border border-border/50 shadow-sm"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'slideInUp 300ms ease-out forwards'
                }}
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-xl ring-1 ring-border/20"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm leading-tight pr-2">
                      {item.name}
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {item.options && (
                    <p className="text-xs text-muted-foreground">
                      {Object.values(item.options).join(', ')}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary text-sm">
                          {formatPrice(item.price)}
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <>
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(item.originalPrice)}
                            </span>
                            {item.discountPercentage && (
                              <Badge className="bg-destructive text-destructive-foreground text-xs px-1.5">
                                -{item.discountPercentage}%
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        за единицу
                      </span>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center bg-muted/50 rounded-full border">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-l-full hover:bg-background"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <div className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                        {item.quantity}
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-r-full hover:bg-background"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <>
            <Separator />
            <div className="p-6 bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">{t('total')}:</span>
                <span className="text-xl font-bold text-primary">
                  {formatPrice(getCartTotal)}
                </span>
              </div>
              
              <Link href="/cart" onClick={onClose}>
                <Button 
                  className="w-full h-12 text-base font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {t('checkout')}
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}