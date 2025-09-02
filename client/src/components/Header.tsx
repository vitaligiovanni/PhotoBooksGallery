import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { ShoppingCart, User, Menu, Camera } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ShoppingCart as Cart } from "./ShoppingCart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mock cart count - in real app would come from cart state
  const cartCount = 3;

  return (
    <>
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <Camera className="text-primary text-2xl" />
              <span className="font-serif font-bold text-xl text-foreground">ФотоКрафт</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/catalog" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-catalog">
                {t('catalog')}
              </Link>
              <Link href="/editor" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-editor">
                {t('editor')}
              </Link>
              <Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-blog">
                {t('blog')}
              </Link>
              <a href="#about" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-about">
                {t('about')}
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-contact">
                {t('contact')}
              </a>
            </nav>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Cart */}
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setIsCartOpen(true)}
                data-testid="button-cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {cartCount}
                  </Badge>
                )}
              </Button>

              {/* Admin Panel (for admins only) */}
              {isAuthenticated && (user as any)?.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" data-testid="button-admin">
                    CRM
                  </Button>
                </Link>
              )}

              {/* User Account */}
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-logout"
                >
                  <User className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/api/login'}
                  data-testid="button-login"
                >
                  <User className="h-5 w-5" />
                </Button>
              )}

              {/* Mobile Menu */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <nav className="flex flex-col space-y-2">
                <Link href="/catalog" className="text-muted-foreground hover:text-primary transition-colors py-2" data-testid="link-mobile-catalog">
                  {t('catalog')}
                </Link>
                <Link href="/editor" className="text-muted-foreground hover:text-primary transition-colors py-2" data-testid="link-mobile-editor">
                  {t('editor')}
                </Link>
                <Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors py-2" data-testid="link-mobile-blog">
                  {t('blog')}
                </Link>
                <a href="#about" className="text-muted-foreground hover:text-primary transition-colors py-2" data-testid="link-mobile-about">
                  {t('about')}
                </a>
                <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors py-2" data-testid="link-mobile-contact">
                  {t('contact')}
                </a>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Shopping Cart Sidebar */}
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
