import { useState, useCallback } from 'react';
import type { Product } from '@shared/schema';
import type { CartItem, LocalizedText } from '@/types';

// Global cart state
let globalCartItems: CartItem[] = [];
let globalSetCartItems: ((items: CartItem[]) => void) | null = null;
let globalCartListeners: Array<(items: CartItem[]) => void> = [];

const notifyListeners = (items: CartItem[]) => {
  globalCartListeners.forEach(listener => listener(items));
};

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>(globalCartItems);

  // Register this component as a listener
  const updateLocalState = useCallback((items: CartItem[]) => {
    setCartItems(items);
  }, []);

  // Register/unregister listener
  if (!globalCartListeners.includes(updateLocalState)) {
    globalCartListeners.push(updateLocalState);
  }

  // Set global updater function
  if (!globalSetCartItems) {
    globalSetCartItems = (items: CartItem[]) => {
      globalCartItems = items;
      notifyListeners(items);
    };
  }

  const addToCart = useCallback((product: Product, quantity: number = 1, options?: Record<string, any>) => {
    const productName = typeof product.name === 'object' 
      ? (product.name as LocalizedText)?.ru || (product.name as LocalizedText)?.en || 'Untitled'
      : (product.name as string) || 'Untitled';

    // Calculate actual price (considering discounts)
    const actualPrice = product.isOnSale && product.originalPrice 
      ? Number(product.price) 
      : Number(product.price);

    const cartItem: CartItem = {
      id: product.id,
      name: productName,
      price: actualPrice,
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      discountPercentage: product.discountPercentage || undefined,
      quantity,
      imageUrl: (product.images && product.images.length > 0) 
        ? product.images[0] 
        : product.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80',
      options
    };

    const existingItemIndex = globalCartItems.findIndex(item => item.id === product.id);
    
    let newItems: CartItem[];
    if (existingItemIndex >= 0) {
      // Update existing item
      newItems = globalCartItems.map((item, index) => 
        index === existingItemIndex 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      // Add new item
      newItems = [...globalCartItems, cartItem];
    }

    globalSetCartItems?.(newItems);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    const newItems = globalCartItems.filter(item => item.id !== productId);
    globalSetCartItems?.(newItems);
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    const newItems = globalCartItems.map(item => {
      if (item.id === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    globalSetCartItems?.(newItems);
  }, []);

  const clearCart = useCallback(() => {
    globalSetCartItems?.([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return globalCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, []);

  const getCartCount = useCallback(() => {
    return globalCartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, []);

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal: getCartTotal(),
    getCartCount: getCartCount()
  };
}