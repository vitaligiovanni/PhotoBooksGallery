import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useTranslation } from 'react-i18next';
import { ShoppingCart, User, Menu, Camera, Palette, Shuffle } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CurrencySelector } from "./CurrencySelector";
import { ShoppingCart as Cart } from "./ShoppingCart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { cartItems } = useCart();
  const { currentTheme, availableThemes, changeTheme, isLoading: themeLoading } = useTheme();
  const { toast } = useToast();
  const [location] = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Calculate cart count from cartItems to ensure reactivity
  const cartCount = Array.isArray(cartItems) ? cartItems.reduce((sum, item) => sum + item.quantity, 0) : 0;

  const handleThemeChange = async (themeName: string) => {
    try {
      await changeTheme(themeName);
      toast({
        title: "Тема изменена",
        description: `Активирована тема "${availableThemes.find(t => t.name === themeName)?.label}"`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить тему",
        variant: "destructive",
      });
    }
  };

  const handleRandomTheme = async () => {
    const otherThemes = availableThemes.filter(t => t.name !== currentTheme.name);
    const randomTheme = otherThemes[Math.floor(Math.random() * otherThemes.length)];
    await handleThemeChange(randomTheme.name);
  };

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
              
              {/* Currency Selector */}
              <CurrencySelector />

              {/* Theme Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={themeLoading}
                    data-testid="button-theme"
                  >
                    <Palette className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {availableThemes.map((theme) => (
                    <DropdownMenuItem
                      key={theme.name}
                      onClick={() => handleThemeChange(theme.name)}
                      className="cursor-pointer"
                      data-testid={`theme-option-${theme.name}`}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <div className="flex space-x-1">
                          <div 
                            className="w-3 h-3 rounded border"
                            style={{ backgroundColor: theme.colors.primary }}
                          />
                          <div 
                            className="w-3 h-3 rounded border"
                            style={{ backgroundColor: theme.colors.accent }}
                          />
                        </div>
                        <span className="flex-1">{theme.label}</span>
                        {currentTheme.name === theme.name && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <DropdownMenuItem
                      onClick={handleRandomTheme}
                      className="cursor-pointer text-primary font-medium"
                      data-testid="theme-option-random"
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <Shuffle className="w-4 h-4" />
                        <span>Случайная тема</span>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

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
                
                {/* Theme selector for mobile */}
                <div className="border-t border-border pt-2 mt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Цветовая тема:</p>
                  <div className="grid grid-cols-1 gap-1">
                    {availableThemes.map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => handleThemeChange(theme.name)}
                        className={`flex items-center space-x-3 p-2 rounded-md text-left transition-colors ${
                          currentTheme.name === theme.name 
                            ? 'bg-accent text-accent-foreground' 
                            : 'hover:bg-accent/50'
                        }`}
                        disabled={themeLoading}
                        data-testid={`mobile-theme-option-${theme.name}`}
                      >
                        <div className="flex space-x-1">
                          <div 
                            className="w-3 h-3 rounded border"
                            style={{ backgroundColor: theme.colors.primary }}
                          />
                          <div 
                            className="w-3 h-3 rounded border"
                            style={{ backgroundColor: theme.colors.accent }}
                          />
                        </div>
                        <span className="text-sm">{theme.label}</span>
                        {currentTheme.name === theme.name && (
                          <div className="w-2 h-2 bg-primary rounded-full ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
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
