import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  DollarSign,
  Eye,
  TrendingUp,
  Activity,
  Star
} from "lucide-react";
import type { Product, Category, Order, User } from "@shared/schema";

// Sidebar navigation items
const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
  { id: 'products', label: 'Товары', icon: Package, color: 'text-green-600' },
  { id: 'orders', label: 'Заказы', icon: ShoppingCart, color: 'text-orange-600' },
  { id: 'customers', label: 'Клиенты', icon: Users, color: 'text-purple-600' },
  { id: 'blog', label: 'Блог', icon: FileText, color: 'text-pink-600' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3, color: 'text-indigo-600' },
  { id: 'settings', label: 'Настройки', icon: Settings, color: 'text-gray-600' },
];

// Dashboard stats component
function DashboardStats() {
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: orders } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const stats = [
    {
      title: "Всего товаров",
      value: products?.length || 0,
      icon: Package,
      color: "bg-blue-500",
      change: "+12%"
    },
    {
      title: "Заказы сегодня", 
      value: orders?.filter(o => {
        const today = new Date();
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === today.toDateString();
      }).length || 0,
      icon: ShoppingCart,
      color: "bg-green-500",
      change: "+8%"
    },
    {
      title: "Категории",
      value: categories?.length || 0,
      icon: Star,
      color: "bg-purple-500",
      change: "+23%"
    },
    {
      title: "Доход за месяц",
      value: `₽${orders?.reduce((sum, order) => sum + Number(order.totalAmount), 0).toLocaleString() || 0}`,
      icon: DollarSign,
      color: "bg-orange-500",
      change: "+18%"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-green-600 bg-green-50">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stat.change}
                  </Badge>
                </div>
              </div>
              <div className={`${stat.color} p-3 rounded-full text-white`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== 'admin')) {
      toast({
        title: "Доступ запрещен",
        description: "Требуются права администратора. Перенаправление на вход...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading || !isAuthenticated || (user as any)?.role !== 'admin') {
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
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-2">Добро пожаловать в панель управления ФотоКрафт</p>
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
                    {[1, 2, 3].map(i => (
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
      case 'products':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Управление товарами</h1>
                <p className="text-muted-foreground mt-2">Добавляйте и редактируйте товары в каталоге</p>
              </div>
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
                <Package className="h-4 w-4 mr-2" />
                Добавить товар
              </Button>
            </div>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground py-8">Модуль управления товарами будет здесь</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'blog':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Блог</h1>
                <p className="text-muted-foreground mt-2">Создавайте и управляйте статьями блога</p>
              </div>
              <Button className="bg-gradient-to-r from-green-500 to-green-600">
                <FileText className="h-4 w-4 mr-2" />
                Новая статья
              </Button>
            </div>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground py-8">Система блога будет здесь</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">Раздел в разработке</h1>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground py-8">Этот раздел скоро будет доступен</p>
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
            <h2 className="text-xl font-bold text-gray-800">ФотоКрафт</h2>
            <p className="text-sm text-gray-500 mt-1">CRM Панель</p>
          </div>
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => (
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
                {(user as any)?.firstName?.[0] || 'A'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{(user as any)?.firstName || 'Admin'}</p>
                <p className="text-xs text-gray-500">Администратор</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}