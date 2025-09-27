import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ShoppingCart, DollarSign, Package, MessageSquare, Eye, TrendingUp, TrendingDown } from "lucide-react";

export function DashboardStats() {
  const { data: stats } = useQuery<any>({ 
    queryKey: ["/api/admin/dashboard/stats"] 
  });

  const { data: recentOrders = [] } = useQuery<any[]>({ 
    queryKey: ["/api/admin/dashboard/recent-orders"] 
  });

  const { data: popularProducts = [] } = useQuery<any[]>({ 
    queryKey: ["/api/admin/dashboard/popular-products"] 
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getTrendIndicator = (current: number, previous: number) => {
    if (current > previous) {
      return {
        icon: <TrendingUp className="h-4 w-4 text-green-600" />,
        text: `+${(((current - previous) / previous) * 100).toFixed(1)}%`,
        color: 'text-green-600'
      };
    } else if (current < previous) {
      return {
        icon: <TrendingDown className="h-4 w-4 text-red-600" />,
        text: `-${(((previous - current) / previous) * 100).toFixed(1)}%`,
        color: 'text-red-600'
      };
    } else {
      return {
        icon: null,
        text: '0%',
        color: 'text-gray-600'
      };
    }
  };

  // Safely render localized fields that can be objects like { ru, en, hy }
  const getLocalizedText = (field: unknown, lang: string = 'ru'): string => {
    if (typeof field === 'string') return field;
    if (field && typeof field === 'object') {
      const obj = field as Record<string, unknown>;
      const val = obj[lang] ?? obj['ru'] ?? obj['en'] ?? obj['hy'];
      return typeof val === 'string' ? val : '';
    }
    return '';
  };

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const revenueTrend = getTrendIndicator(stats.currentRevenue || 0, stats.previousRevenue || 0);
  const ordersTrend = getTrendIndicator(stats.currentOrders || 0, stats.previousOrders || 0);
  const usersTrend = getTrendIndicator(stats.currentUsers || 0, stats.previousUsers || 0);
  const viewsTrend = getTrendIndicator(stats.currentViews || 0, stats.previousViews || 0);

  return (
    <div className="space-y-6">
      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {revenueTrend.icon}
              <span className={`ml-1 ${revenueTrend.color}`}>
                {revenueTrend.text} с прошлого периода
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {ordersTrend.icon}
              <span className={`ml-1 ${ordersTrend.color}`}>
                {ordersTrend.text} с прошлого периода
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пользователи</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {usersTrend.icon}
              <span className={`ml-1 ${usersTrend.color}`}>
                {usersTrend.text} с прошлого периода
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Просмотры</CardTitle>
            <Eye className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.totalViews || 0).toLocaleString('ru-RU')}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {viewsTrend.icon}
              <span className={`ml-1 ${viewsTrend.color}`}>
                {viewsTrend.text} с прошлого периода
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Товары</CardTitle>
            <Package className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              всего товаров в каталоге
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Отзывы</CardTitle>
            <MessageSquare className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalReviews || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              всего отзывов
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Конверсия</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.conversionRate ? `${stats.conversionRate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              из просмотров в заказы
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ср. чек</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.averageOrderValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              средний чек заказа
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders and Popular Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Последние заказы
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">Нет recent заказов</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Заказ #{order.id.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(order.totalAmount)} • {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <Badge variant={
                      order.status === 'delivered' ? 'default' :
                      order.status === 'processing' ? 'secondary' :
                      order.status === 'pending' ? 'outline' : 'destructive'
                    }>
                      {order.status === 'delivered' ? 'delivered' :
                       order.status === 'processing' ? 'processing' :
                       order.status === 'pending' ? 'pending' : 'cancelled'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Products */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Популярные товары
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popularProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">Нет данных о популярных товарах</p>
              </div>
            ) : (
              <div className="space-y-3">
                {popularProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs font-medium">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{getLocalizedText(product.name)}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.salesCount || 0} продаж
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatCurrency(product.price || 0)}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.viewsCount || 0} просмотров
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.pendingOrders || 0}
            </div>
            <p className="text-sm text-muted-foreground">Ожидают обработки</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.lowStockProducts || 0}
            </div>
            <p className="text-sm text-muted-foreground">Мало на складе</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingReviews || 0}
            </div>
            <p className="text-sm text-muted-foreground">На модерации</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.newCustomers || 0}
            </div>
            <p className="text-sm text-muted-foreground">Новых клиентов</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
