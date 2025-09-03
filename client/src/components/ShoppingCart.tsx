import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from 'react-i18next';
import { Minus, Plus, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { CartItem } from "@/types";

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

// Initial cart data
const initialCartItems: CartItem[] = [
  {
    id: '1',
    name: 'Премиум фотокнига',
    price: 2890,
    quantity: 1,
    imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80',
    options: { cover: 'Кожаная обложка' }
  },
  {
    id: '2',
    name: 'Деревянная рамка',
    price: 1290,
    quantity: 2,
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80',
    options: { size: '20x30 см' }
  }
];

export function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const { t } = useTranslation();
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems);
  
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== id));
  };

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
                      <span className="font-semibold text-primary" data-testid={`text-cart-item-price-${item.id}`}>
                        ₽{item.price.toLocaleString()}
                      </span>
                      
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
                          onClick={() => removeItem(item.id)}
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
                  ₽{total.toLocaleString()}
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
