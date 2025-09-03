import { useState, useCallback, useEffect } from 'react';
import type { Product } from '@shared/schema';
import type { CartItem, LocalizedText } from '@/types';

// Storage key for localStorage
const CART_STORAGE_KEY = 'photocraft-cart';

// Load initial cart from localStorage
const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save cart to localStorage
const saveCartToStorage = (items: CartItem[]) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
};

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const loaded = loadCartFromStorage();
    return Array.isArray(loaded) ? loaded : [];
  });
  
  // Save to localStorage whenever cart changes
  useEffect(() => {
    if (Array.isArray(cartItems)) {
      saveCartToStorage(cartItems);
    }
  }, [cartItems]);

  const addToCart = useCallback((product: Product, quantity: number = 1, options?: Record<string, any>) => {
    const productName = typeof product.name === 'object' 
      ? (product.name as LocalizedText)?.ru || (product.name as LocalizedText)?.en || 'Untitled'
      : (product.name as string) || 'Untitled';

    // Calculate actual price (considering discounts)
    const actualPrice = Number(product.price);

    const newItem: CartItem = {
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

    setCartItems(currentItems => {
      const existingItemIndex = currentItems.findIndex(item => 
        item.id === product.id && JSON.stringify(item.options) === JSON.stringify(options)
      );
      
      let updatedItems;
      if (existingItemIndex >= 0) {
        // Update existing item
        updatedItems = [...currentItems];
        updatedItems[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        updatedItems = [...currentItems, newItem];
      }
      
      // Force save to localStorage immediately
      setTimeout(() => saveCartToStorage(updatedItems), 0);
      return updatedItems;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems(currentItems => currentItems.filter(item => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCartItems(currentItems => 
      currentItems.map(item => {
        if (item.id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  const getCartCount = useCallback(() => {
    if (!Array.isArray(cartItems)) return 0;
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

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