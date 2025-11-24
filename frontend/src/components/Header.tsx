import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useTranslation } from 'react-i18next';
import { ShoppingCart, User, Camera, Menu, X, LogOut, Settings } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CurrencySelector } from "./CurrencySelector";
import { ShoppingCart as CartSheet } from "./ShoppingCart";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import type { Page } from "@shared/schema";
import { useState, useEffect, useRef } from "react";

export function Header() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { cartItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load dynamic pages
  const { data: constructorPages = [] } = useQuery<Page[]>({
    queryKey: ['constructor-pages', i18n.language],
    queryFn: async () => {
      // Передаем язык чтобы сервер (если поддерживает) вернул нужные локализации
      const r = await fetch(`/api/constructor/pages?lang=${i18n.language}`);
      if (!r.ok) throw new Error('Failed to load pages');
      return r.json();
    },
  });

  const headerNavPages = Array.isArray(constructorPages)
    ? constructorPages.filter((p: any) => p.showInHeaderNav && p.isPublished !== false)
    : [];

  // Функция получения локализованного заголовка для динамических страниц
  const resolvePageTitle = (p: any) => {
    const titleObj = p?.title || {};
    if (typeof titleObj === 'string') return titleObj;
    const lang = i18n.language;
    return titleObj?.[lang] || titleObj?.ru || titleObj?.hy || titleObj?.en || p.slug;
  };

  const cartCount = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  const headerRef = useRef<HTMLElement | null>(null);

  // Устанавливаем динамическую высоту header в CSS переменную, чтобы hero мог занять остаток экрана без полос
  useEffect(() => {
    function applyHeight() {
      if (headerRef.current) {
        const h = headerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--app-header-height', h + 'px');
      }
    }
    applyHeight();
    window.addEventListener('resize', applyHeight);
    return () => window.removeEventListener('resize', applyHeight);
  }, []);

  return (
    <header ref={headerRef} className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="w-full px-3 sm:px-4 lg:px-8 mx-auto max-w-screen-xl">
        {/* DESKTOP: одна строка */}
        <div className="hidden md:flex h-16 items-center gap-8">
          {/* Левая часть: логотип */}
          <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
            <Camera className="text-primary h-7 w-7" />
            <span className="font-serif font-bold text-xl tracking-tight text-foreground">PhotoBooksGallery</span>
          </Link>
          {/* Навигация */}
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/catalog" className="hover:text-primary text-muted-foreground" data-testid="link-catalog">{t('catalog')}</Link>
            <Link href="/graduation-albums" className="hover:text-primary text-muted-foreground" data-testid="link-graduation-albums">{t('graduationAlbums')}</Link>
            <Link href="/living-photos" className="hover:text-primary text-muted-foreground font-medium" data-testid="link-living-photos">
              {i18n.language === 'ru' ? 'Живые фото' : i18n.language === 'hy' ? 'Կենդանի լուսանկարներ' : 'Living Photos'}
            </Link>
            <Link href="/editor" className="text-primary font-medium" data-testid="link-editor">{t('editor')}</Link>
            <Link href="/blog" className="hover:text-primary text-muted-foreground" data-testid="link-blog">{t('blog')}</Link>
            <Link href="/about" className="hover:text-primary text-muted-foreground" data-testid="link-about">{t('about')}</Link>
            <Link href="/contacts" className="hover:text-primary text-muted-foreground" data-testid="link-contact">{t('contact')}</Link>
            {headerNavPages.map((p: any) => (
              <Link
                key={p.id}
                href={`/page/${p.slug}`}
                className="hover:text-primary text-muted-foreground"
                data-testid={`link-page-${p.slug}`}
              >
                {resolvePageTitle(p)}
              </Link>
            ))}
          </nav>
          {/* Правая часть */}
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher />
            <CurrencySelector />
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
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2" data-testid="button-user-menu">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user?.firstName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('profile')}
                      </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {t('adminPanel')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-red-600">
                    <LogOut className="h-4 w-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAuthModal(true)}
                data-testid="button-login"
                aria-label="Login"
              >
                <User className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* MOBILE: верхний ряд только логотип по центру */}
        <div className="md:hidden flex items-center justify-center h-14">
          <Link href="/" className="flex items-center space-x-2" data-testid="link-home-mobile">
            <Camera className="text-primary h-6 w-6" />
            <span className="font-serif font-bold text-lg tracking-tight text-foreground">PhotoBooksGallery</span>
          </Link>
        </div>

        {/* MOBILE: второй ряд с иконками (cart, user, currency, language, burger) */}
        <div className="md:hidden flex items-center gap-2 justify-between h-12 border-t border-border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={() => setIsCartOpen(true)}
              data-testid="button-cart-mobile"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {cartCount}
                </Badge>
              )}
            </Button>
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="button-user-menu-mobile">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('profile')}
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {t('crmPanel')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-red-600">
                    <LogOut className="h-4 w-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAuthModal(true)}
                data-testid="button-login-mobile"
                aria-label="Login"
              >
                <User className="h-5 w-5" />
              </Button>
            )}
            <CurrencySelector />
            <LanguageSwitcher />
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Menu"
            onClick={() => setIsMobileMenuOpen(o => !o)}
            data-testid="button-burger"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* MOBILE: выпадающее меню (только ссылки + CRM) */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border pt-4 pb-6 animate-in fade-in slide-in-from-top-2">
            <div className="grid gap-2 text-sm">
              <Link href="/catalog" className="px-3 py-2 rounded-md bg-muted hover:bg-muted/70 transition-colors" data-testid="mnav-catalog" onClick={() => setIsMobileMenuOpen(false)}>{t('catalog')}</Link>
              <Link href="/graduation-albums" className="px-3 py-2 rounded-md hover:bg-muted transition-colors" data-testid="mnav-graduation-albums" onClick={() => setIsMobileMenuOpen(false)}>{t('graduationAlbums')}</Link>
              <Link href="/living-photos" className="px-3 py-2 rounded-md hover:bg-muted transition-colors font-medium" data-testid="mnav-living-photos" onClick={() => setIsMobileMenuOpen(false)}>
                {i18n.language === 'ru' ? 'Живые фото' : i18n.language === 'hy' ? 'Կենդանի լուսանկարներ' : 'Living Photos'}
              </Link>
              <Link href="/editor" className="px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors" data-testid="mnav-editor" onClick={() => setIsMobileMenuOpen(false)}>{t('editor')}</Link>
              <Link href="/blog" className="px-3 py-2 rounded-md hover:bg-muted transition-colors" data-testid="mnav-blog" onClick={() => setIsMobileMenuOpen(false)}>{t('blog')}</Link>
              <Link href="/about" className="px-3 py-2 rounded-md hover:bg-muted transition-colors" data-testid="mnav-about" onClick={() => setIsMobileMenuOpen(false)}>{t('about')}</Link>
              <Link href="/contacts" className="px-3 py-2 rounded-md hover:bg-muted transition-colors" data-testid="mnav-contacts" onClick={() => setIsMobileMenuOpen(false)}>{t('contact')}</Link>
              {headerNavPages.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/page/${p.slug}`}
                  className="px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  data-testid={`mnav-page-${p.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {resolvePageTitle(p)}
                </Link>
              ))}
              {isAuthenticated && isAdmin && (
                <Link href="/admin" className="px-3 py-2 rounded-md hover:bg-muted transition-colors" data-testid="mnav-admin" onClick={() => setIsMobileMenuOpen(false)}>
                  {t('crmPanel')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      
      {/* Модальное окно авторизации */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(userData) => {
          setShowAuthModal(false);
          if (userData.role === 'admin') {
            window.location.href = '/admin';
          } else {
            window.location.href = '/profile';
          }
        }}
      />
    </header>
  );
}
