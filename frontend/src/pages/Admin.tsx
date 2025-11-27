// Admin.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

// UI компоненты
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Иконки
import { Edit, Trash2, Calculator, BarChart3, Activity, Star, Eye, Coins, Banknote, TrendingUp, Target, Video } from "lucide-react";

// Менеджеры
import { CategoryManager } from "@/components/admin/managers/CategoryManager";
import { ProductsManager } from "@/components/admin/managers/ProductsManager";
import { CustomersManager } from "@/components/admin/managers/CustomersManager";
import { OrdersManager } from "@/components/admin/managers/OrdersManager";
import { ReviewsManager } from "@/components/admin/managers/ReviewsManager";
import { BlogManager } from "@/components/admin/managers/BlogManager";
import { FinancesManager } from "@/components/admin/managers/FinancesManager";
import { CommentsManager } from "@/components/admin/managers/CommentsManager";
import { BannersManager } from "@/components/admin/managers/BannersManager";
import { SpecialOffersManager } from "@/components/admin/managers/SpecialOffersManager";
import { DashboardStats } from "@/components/admin/managers/DashboardStats";
import { UploadsManager } from "@/components/admin/managers/UploadsManager";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { ConstructorApp } from "@/components/constructor/ConstructorApp";
import { CurrencySettings } from "@/pages/CurrencySettings";
import { SettingsManager } from "@/components/admin/managers/SettingsManager";

// Функция для получения навигационных пунктов
function getNavigationItems(t: any) {
  return [
    { id: "dashboard", label: t("dashboard"), icon: Activity, color: "text-gray-600" },
    { id: "uploads", label: "Загрузки фото", icon: Eye, color: "text-blue-600" },
    { id: "ar-projects", label: "AR Проекты (Живое Фото)", icon: Video, color: "text-indigo-600" },
    { id: "categories", label: t("categories"), icon: Edit, color: "text-gray-600" },
    { id: "products", label: t("products"), icon: Calculator, color: "text-gray-600" },
    { id: "customers", label: t("customers"), icon: Star, color: "text-gray-600" },
    { id: "orders", label: t("orders"), icon: BarChart3, color: "text-gray-600" },
    { id: "reviews", label: t("reviews"), icon: Eye, color: "text-gray-600" },
    { id: "banners", label: "Баннеры", icon: Target, color: "text-blue-600" },
    { id: "special-offers", label: "Спец. предложения", icon: TrendingUp, color: "text-green-600" },
    { id: "analytics", label: "Аналитика", icon: BarChart3, color: "text-purple-600" },
    { id: "blog", label: t("blog"), icon: Edit, color: "text-gray-600" },
    { id: "currencies", label: t("currencies"), icon: Coins, color: "text-gray-600" },
    { id: "finances", label: t("finances"), icon: Banknote, color: "text-gray-600" },
    { id: "comments", label: t("comments"), icon: Edit, color: "text-gray-600" },
    { id: "constructor", label: t("constructor"), icon: Calculator, color: "text-gray-600" },
    { id: "settings", label: t("settings"), icon: Edit, color: "text-gray-600" },
  ];
}

export default function Admin() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [originalLanguage] = useState(i18n.language);

  // Force Russian language for Admin panel and restore on unmount - v2
  useEffect(() => {
    const currentLang = i18n.language;
    if (currentLang !== 'ru') {
      i18n.changeLanguage('ru');
    }
    
    return () => {
      // Restore original language when leaving Admin panel
      i18n.changeLanguage(originalLanguage);
    };
  }, [originalLanguage]);

  // Redirect если нет доступа
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== "admin")) {
      toast({
        title: "Доступ запрещен",
        description: "Требуются права администратора. Перенаправление на вход...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading || !isAuthenticated || (user as any)?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Загрузка админ панели...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-2">Добро пожаловать в панель управления PhotoBooksGallery</p>
            </div>
            <DashboardStats />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Последние заказы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Заказ #00{i}</p>
                          <p className="text-sm text-muted-foreground">₽{(2500 + i * 500).toLocaleString()}</p>
                        </div>
                        <Badge variant="outline">Новый</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Популярные товары
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["Фотокнига Premium", "Рамка для фото", "Фотосувенир"].map((product, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{product}</p>
                          <p className="text-sm text-muted-foreground">{15 - i * 2} продаж</p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case "categories":
        return <CategoryManager />;
      case "uploads":
        return <UploadsManager />;
      case "products":
        return <ProductsManager />;
      case "customers":
        return <CustomersManager />;
      case "orders":
        return <OrdersManager />;
      case "reviews":
        return <ReviewsManager />;
      case "banners":
        return <BannersManager />;
      case "special-offers":
        return <SpecialOffersManager />;
      case "analytics":
        return <AnalyticsDashboard />;
      case "blog":
        return <BlogManager />;
      case "currencies":
        return <CurrencySettings />;
      case "finances":
        return <FinancesManager />;
      case "ar-projects":
        window.location.href = "/admin/ar";
        return null;
      case "comments":
        return <CommentsManager />;
      case "constructor":
        return <ConstructorApp />;
      case "settings":
        return <SettingsManager />;
      default:
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">{t("sectionInDevelopment")}</h1>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground py-8">{t("sectionComingSoon")}</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg border-r border-gray-200 min-h-screen">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => navigate("/")}
              className="w-full text-left hover:opacity-80 transition-opacity duration-200 group cursor-pointer"
              title="Go to home page - Click to return to homepage"
            >
              <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">PhotoBooksGallery</h2>
              <p className="text-sm text-gray-500 mt-1">{t("crmPanel")}</p>
            </button>
          </div>
          <nav className="p-4 space-y-2">
            {getNavigationItems(t).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                  activeSection === item.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", activeSection === item.id ? "text-blue-600" : item.color)} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200 mt-auto">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {(user as any)?.firstName?.[0] || "A"}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{(user as any)?.firstName || "Admin"}</p>
                <p className="text-xs text-gray-500">{t("administrator")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">{renderContent()}</div>
      </div>
    </div>
  );
}

// (Single default export is the function declaration above; redundant export removed)
