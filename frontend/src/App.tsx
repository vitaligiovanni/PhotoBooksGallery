import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nextProvider } from 'react-i18next';
import i18n from './lib/i18n';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { HelmetProvider } from 'react-helmet-async';

// Pages
const Landing = lazy(() => import("@/pages/Landing"));
const Catalog = lazy(() => import("@/pages/Catalog.tsx")); // legacy query param based
const CatalogPathPage = lazy(() => import("@/pages/CatalogPathPage"));
const Product = lazy(() => import("@/pages/Product"));
const Cart = lazy(() => import("@/pages/Cart"));
const Editor = lazy(() => import("@/pages/Editor"));
const Admin = lazy(() => import("@/pages/Admin"));
const Login = lazy(() => import("@/pages/Login"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const About = lazy(() => import("@/pages/About"));
const Contacts = lazy(() => import("@/pages/Contacts"));
const CurrencySettings = lazy(() => import("@/pages/CurrencySettings").then(m => ({ default: m.CurrencySettings })));
const Page = lazy(() => import("@/pages/Page").then(m => ({ default: m.Page })));
const GraduationAlbums = lazy(() => import("@/pages/GraduationAlbums"));
const NotFound = lazy(() => import("@/pages/not-found"));
// Explicit .tsx extension to avoid failed dynamic import in some dev edge cases
const AppPopups = lazy(() => import("@/components/AppPopups.tsx").then(m => ({ default: m.AppPopups })));
const PremiumPreview = lazy(() => import("@/pages/PremiumPreview"));
const Profile = lazy(() => import("@/pages/Profile"));
const Upload = lazy(() => import("@/pages/Upload"));
const CreateAR = lazy(() => import("@/pages/CreateAR"));
const CreateARSimple = lazy(() => import("@/pages/CreateARSimple"));
const AdminAREdit = lazy(() => import("@/pages/AdminAREdit"));
const AdminARList = lazy(() => import("@/pages/AdminARList"));
const LivingPhotos = lazy(() => import("@/pages/LivingPhotos"));
const ARViewRedirect = lazy(() => import("@/pages/ARViewRedirect"));
import { AppLayout } from "@/components/layout/AppLayout";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

function HomePage() {
  // Всегда показываем Landing страницу - она более красивая
  return <Landing />;
}

function Router() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Загрузка...</div>}>
      <Switch>
        <Route path="/" component={HomePage} />
  {/* New path-based catalog routing (SEO friendly) */}
  <Route path="/catalog/:categorySlug/:subcategorySlug" component={CatalogPathPage} />
  <Route path="/catalog/:categorySlug" component={CatalogPathPage} />
  {/* Legacy fallback - only for /catalog without parameters */}
  <Route path="/catalog" component={Catalog} />
        <Route path="/product/:id" component={Product} />
        <Route path="/cart" component={Cart} />
        <Route path="/editor" component={Editor} />
        <Route path="/profile" component={Profile} />
  <Route path="/upload" component={Upload} />
        <Route path="/create-ar" component={CreateAR} />
        <Route path="/ar/create" component={CreateARSimple} />
        <Route path="/ar/view/:id" component={ARViewRedirect} />
        <Route path="/living-photos" component={LivingPhotos} />
        <Route path="/login" component={Login} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/currencies" component={CurrencySettings} />
        <Route path="/admin/ar" component={AdminARList} />
        <Route path="/admin/ar/:id/edit" component={AdminAREdit} />
  <Route path="/preview/premium" component={PremiumPreview} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/graduation-albums" component={GraduationAlbums} />
        <Route path="/about" component={About} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/page/:slug" component={Page} />
        <Route path="/:slug" component={Page} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function LanguageRouter() {
  const [location] = useLocation();
  const match = location.match(/^\/(ru|hy|en)(?:\/(.*)|$)/);
  const lang = match ? (match[1] as 'ru'|'hy'|'en') : null;
  const base = lang ? `/${lang}` : '';
  if (lang && i18n.language !== lang) {
    // Change i18n language based on URL prefix
    i18n.changeLanguage(lang);
  }
  return (
    <WouterRouter base={base}>
      <Router />
    </WouterRouter>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <CurrencyProvider>
            <TooltipProvider>
              <Toaster />
              <AppLayout>
                <LanguageRouter />
                <Suspense fallback={null}>
                  <AppPopups />
                </Suspense>
                <PWAInstallPrompt />
              </AppLayout>
            </TooltipProvider>
          </CurrencyProvider>
        </I18nextProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
