import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { I18nextProvider } from 'react-i18next';
import i18n from './lib/i18n';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

// Pages
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import Product from "@/pages/Product";
import Cart from "@/pages/Cart";
import Editor from "@/pages/Editor";
import Admin from "@/pages/Admin";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import { CurrencySettings } from "@/pages/CurrencySettings";
import NotFound from "@/pages/not-found";

function HomePage() {
  // Всегда показываем Landing страницу - она более красивая
  return <Landing />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/catalog/:category?" component={Catalog} />
      <Route path="/product/:id" component={Product} />
      <Route path="/cart" component={Cart} />
      <Route path="/editor" component={Editor} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/currencies" component={CurrencySettings} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CurrencyProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

export default App;
