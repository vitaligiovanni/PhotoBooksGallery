import { useState, useEffect } from 'react';
import { ShoppingCart } from './ShoppingCart';
import { MobileCartDrawer } from './MobileCartDrawer';
import { FloatingCart } from './FloatingCart';
import { CartPreview } from './CartPreview';

interface SmartCartManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SmartCartManager({ isOpen, onClose }: SmartCartManagerProps) {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  const [cartMode, setCartMode] = useState<'sheet' | 'drawer' | 'floating'>('sheet');
  const [showFloating, setShowFloating] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });

      // Smart positioning logic
      if (width < 640) {
        // Mobile: use bottom drawer
        setCartMode('drawer');
      } else if (width < 1024) {
        // Tablet: use sheet but optimized
        setCartMode('sheet');
      } else {
        // Desktop: can use any mode, default to sheet
        setCartMode('sheet');
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-show floating cart after user adds items (you can trigger this from your add-to-cart logic)
  useEffect(() => {
    // This would be triggered when items are added to cart
    // For now, we'll show it on desktop when cart has items
    if (screenSize.width >= 1024 && !isOpen) {
      setShowFloating(true);
    } else {
      setShowFloating(false);
    }
  }, [screenSize.width, isOpen]);

  const handleToggleFloating = () => {
    setShowFloating(!showFloating);
    if (!showFloating) {
      onClose(); // Close other cart views
    }
  };

  const handleOpenFullCart = () => {
    setShowFloating(false);
    // This would trigger the main cart to open
    // You'll need to implement this in your parent component
  };

  return (
    <>
      {/* Floating Cart - Desktop only */}
      {screenSize.width >= 1024 && (
        <FloatingCart 
          isVisible={showFloating} 
          onToggle={handleToggleFloating}
        />
      )}

      {/* Cart Preview for Header - Desktop/Tablet */}
      {screenSize.width >= 640 && (
        <CartPreview onOpenFullCart={handleOpenFullCart} />
      )}

      {/* Main Cart Components */}
      {cartMode === 'drawer' ? (
        <MobileCartDrawer 
          isOpen={isOpen} 
          onClose={onClose} 
        />
      ) : (
        <ShoppingCart 
          isOpen={isOpen} 
          onClose={onClose} 
        />
      )}
    </>
  );
}

// Hook for managing cart visibility and smart features
export function useSmartCart() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen(!isCartOpen);

  return {
    isCartOpen,
    openCart,
    closeCart,
    toggleCart
  };
}