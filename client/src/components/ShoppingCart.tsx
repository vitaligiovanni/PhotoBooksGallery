import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from 'react-i18next';
import { Minus, Plus, X } from "lucide-react";
import { Link } from "wouter";
import { useCart } from "@/hooks/useCart";

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const { t } = useTranslation();
  const { cartItems, updateQuantity, removeFromCart, getCartTotal } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full max-w-md">
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
              cartItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 bg-muted rounded-lg" data-testid={`cart-item-${item.id}`}>
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-md"
                    data-testid={`img-cart-item-${item.id}`}
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground" data-testid={`text-cart-item-name-${item.id}`}>
                      {item.name}
                    </h4>
                    {item.options && (
                      <p className="text-muted-foreground text-sm">
                        {Object.values(item.options).join(', ')}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary" data-testid={`text-cart-item-price-${item.id}`}>
                            ₽{item.price.toLocaleString()}
                          </span>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <>
                              <span className="text-sm text-muted-foreground line-through">
                                ₽{item.originalPrice.toLocaleString()}
                              </span>
                              {item.discountPercentage && (
                                <Badge className="bg-red-500 text-white text-xs">
                                  -{item.discountPercentage}%
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          за шт.
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="text-sm w-8 text-center" data-testid={`text-cart-item-quantity-${item.id}`}>
                          {item.quantity}
                        </span>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.id, 1)}
                          data-testid={`button-increase-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                          data-testid={`button-remove-${item.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          {cartItems.length > 0 && (
            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-foreground">{t('total')}:</span>
                <span className="font-bold text-xl text-primary" data-testid="text-cart-total">
                  ₽{getCartTotal.toLocaleString()}
                </span>
              </div>
              
              <Link href="/cart" onClick={onClose}>
                <Button className="w-full" data-testid="button-checkout">
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
