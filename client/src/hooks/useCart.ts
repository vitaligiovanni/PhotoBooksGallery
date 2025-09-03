import { useState, useCallback } from 'react';
import type { Product } from '@shared/schema';
import type { CartItem, LocalizedText } from '@/types';

// Simple global state management
let globalCartItems: CartItem[] = [];
let listeners: Array<() => void> = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export function useCart() {
  const [, forceUpdate] = useState({});
  
  // Force component re-render
  const updateComponent = useCallback(() => {
    forceUpdate({});
  }, []);

  // Register listener on mount, unregister on unmount
  if (!listeners.includes(updateComponent)) {
    listeners.push(updateComponent);
  }

  const addToCart = useCallback((product: Product, quantity: number = 1, options?: Record<string, any>) => {
    const productName = typeof product.name === 'object' 
      ? (product.name as LocalizedText)?.ru || (product.name as LocalizedText)?.en || 'Untitled'
      : (product.name as string) || 'Untitled';

    // Calculate actual price (considering discounts)
    const actualPrice = Number(product.price);

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

    const existingItemIndex = globalCartItems.findIndex(item => 
      item.id === product.id && JSON.stringify(item.options) === JSON.stringify(options)
    );
    
    if (existingItemIndex >= 0) {
      // Update existing item
      globalCartItems[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      globalCartItems.push(cartItem);
    }

    notifyListeners();
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    globalCartItems = globalCartItems.filter(item => item.id !== productId);
    notifyListeners();
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    const item = globalCartItems.find(item => item.id === productId);
    if (item) {
      item.quantity = Math.max(1, item.quantity + delta);
      notifyListeners();
    }
  }, []);

  const clearCart = useCallback(() => {
    globalCartItems = [];
    notifyListeners();
  }, []);

  const getCartTotal = useCallback(() => {
    return globalCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, []);

  const getCartCount = useCallback(() => {
    return globalCartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, []);

  return {
    cartItems: [...globalCartItems], // Return a copy to prevent mutations
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal: getCartTotal(),
    getCartCount: getCartCount()
  };
}