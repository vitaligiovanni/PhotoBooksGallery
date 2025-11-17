import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { X } from "lucide-react";
import { Link } from "wouter";
import { useCart } from "@/hooks/useCart";
import { AnimatedCartItem } from "./AnimatedCartItem";

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const { t } = useTranslation();
  const { cartItems, updateQuantity, removeFromCart, getCartTotal } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full max-w-md sm:max-w-lg md:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            {t('cart')} ({cartItems.length})
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-cart">
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full">
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto py-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Корзина пуста
              </div>
            ) : (
              cartItems.map((item, index) => (
                <AnimatedCartItem
                  key={item.id}
                  item={item}
                  index={index}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                />
              ))
            )}
          </div>

          {/* Cart Footer */}
          {cartItems.length > 0 && (
            <div className="border-t border-border pt-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-foreground">{t('total')}:</span>
                <span className="font-bold text-xl text-primary" data-testid="text-cart-total">
                  ₽{getCartTotal.toLocaleString()}
                </span>
              </div>
              
              <Link href="/cart" onClick={onClose}>
                <Button className="w-full transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" data-testid="button-checkout">
                  {t('checkout')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
