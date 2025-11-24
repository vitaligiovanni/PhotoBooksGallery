import { useState, useCallback, useEffect } from 'react';
import type { Product } from '@shared/schema';
import type { CartItem, LocalizedText } from '@/types';

// Storage key for localStorage
const CART_STORAGE_KEY = 'photobooksgallery-cart';

// Global cart state and listeners
let globalCartItems: CartItem[] = [];
let globalListeners: Array<(items: CartItem[]) => void> = [];

// Load initial cart from localStorage
const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    const items = stored ? JSON.parse(stored) : [];
    globalCartItems = Array.isArray(items) ? items : [];
    return globalCartItems;
  } catch {
    globalCartItems = [];
    return [];
  }
};

// Save cart to localStorage and notify all listeners
const saveCartAndNotify = (items: CartItem[]) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
  
  globalCartItems = [...items];
  globalListeners.forEach(listener => listener([...items]));
};

// Initialize global cart
loadCartFromStorage();

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([...globalCartItems]);
  
  // Subscribe to global cart changes
  useEffect(() => {
    const listener = (newItems: CartItem[]) => {
      setCartItems([...newItems]);
    };
    
    globalListeners.push(listener);
    
    // Cleanup subscription
    return () => {
      globalListeners = globalListeners.filter(l => l !== listener);
    };
  }, []);

  const addToCart = useCallback((product: Product, quantity: number = 1, options?: Record<string, any>) => {
    const productName = typeof product.name === 'object' 
      ? (product.name as LocalizedText)?.ru || (product.name as LocalizedText)?.en || 'Untitled'
      : (product.name as string) || 'Untitled';

    // Calculate actual price with discount
    const basePrice = Number(product.price);
    let actualPrice = basePrice;
    let originalPrice = product.originalPrice ? Number(product.originalPrice) : basePrice;
    
    // If there's a discount, calculate the discounted price
    if (product.isOnSale && product.discountPercentage && product.discountPercentage > 0) {
      actualPrice = Math.round(basePrice * (1 - product.discountPercentage / 100));
      originalPrice = basePrice; // Keep original as the base price
    }

    const newItem: CartItem = {
      id: product.id,
      name: productName,
      price: actualPrice,
      originalPrice: originalPrice,
      discountPercentage: product.discountPercentage || undefined,
      quantity,
      imageUrl: (product.images && product.images.length > 0) 
        ? product.images[0] 
        : product.imageUrl || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80',
      options,
      isReadyMade: product.isReadyMade || false

    };

    const currentItems = [...globalCartItems];
    const existingItemIndex = currentItems.findIndex(item => 
      item.id === product.id && JSON.stringify(item.options) === JSON.stringify(options)
    );
    
    if (existingItemIndex >= 0) {
      currentItems[existingItemIndex].quantity += quantity;
    } else {
      currentItems.push(newItem);
    }
    
    saveCartAndNotify(currentItems);
  }, []);

  // Добавление AR дополнения как отдельной позиции корзины
  const addARAddon = useCallback((baseProduct: Product, arPrice: number, addonName: string) => {
    const currentItems = [...globalCartItems];
    const addonId = `${baseProduct.id}-AR`;
    const existingIndex = currentItems.findIndex(i => i.id === addonId);
    if (existingIndex >= 0) {
      // Уже существует — ничего не делаем (чтобы не дублировать)
      return;
    }
    const imgUrl = (baseProduct.images && baseProduct.images.length > 0)
      ? baseProduct.images[0]
      : (typeof baseProduct.imageUrl === 'string' ? baseProduct.imageUrl : undefined);
    const addonItem: CartItem = {
      id: addonId,
      name: addonName,
      price: arPrice,
      quantity: 1,
      imageUrl: imgUrl,
      options: { parentProductId: baseProduct.id },
      isReadyMade: true,
      isARAddon: true,
    };
    currentItems.push(addonItem);
    saveCartAndNotify(currentItems);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    const updatedItems = globalCartItems.filter(item => item.id !== productId);
    saveCartAndNotify(updatedItems);
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    const updatedItems = globalCartItems.map(item => {
      if (item.id === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    saveCartAndNotify(updatedItems);
  }, []);

  const clearCart = useCallback(() => {
    saveCartAndNotify([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  const getCartCount = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal: getCartTotal(),
    getCartCount: getCartCount(),
    addARAddon
  };
}