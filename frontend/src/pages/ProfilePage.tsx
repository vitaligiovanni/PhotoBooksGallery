import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Package, 
  BookOpen, 
  Calculator, 
  Settings, 
  TrendingUp,

  DollarSign,
  Eye,
  Edit,
  Download,
  Plus,
  Heart,
  Award,
  Clock,
  CheckCircle,
  ShoppingCart,
  CreditCard,
  Star,
  Camera
} from 'lucide-react';
import { PhotobookCalculator } from '@/components/PhotobookCalculator';
import { ProfileSettings } from '@/components/ProfileSettings';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';
import { OrderConfirmationModal, OrderConfirmationData } from '@/components/OrderConfirmationModal';
import { OrderSuccessModal } from '@/components/OrderSuccessModal';
import { NewOrderModal } from '@/components/NewOrderModal';
// import { Order } from '@/types'; // Unused - commented out



interface Project {
  id: string;
  title: string;
  format: string;
  size: string;
  pages: number;
  progress: number;
  lastModified: string;
  thumbnail?: string;
  estimatedCost: number;
}

interface UserStats {
  totalOrders: number;
  totalSpent: number;
  completedProjects: number;
  favoriteProducts: number;
  memberSince: string;
}

/*
// Commented out to remove unused variable warning
const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    status: 'processing',
    total: 2500,
    createdAt: '2024-09-15T10:30:00Z',
    items: [
      { name: 'Семейная фотокнига "Лето 2024"', quantity: 1, price: 2500 }
    ]
  },
  {
    id: 'ORD-002',
    status: 'processing',
    total: 3200,
    createdAt: '2024-09-20T14:15:00Z',
    items: [
      { name: 'Детская фотокнига "Первый год"', quantity: 2, price: 1600 }
    ]
  }
];
*/

const mockProjects: Project[] = [
  {
    id: 'PROJ-001',
    title: 'Свадебная фотокнига',
    format: 'album',
    size: 'A3',
    pages: 50,
    progress: 75,
    lastModified: '2024-09-25T16:20:00Z',
    thumbnail: '/api/placeholder/150/100',
    estimatedCost: 4500
  },
  {
    id: 'PROJ-002',
    title: 'Путешествие в Италию',
    format: 'book',
    size: 'A4',
    pages: 30,
    progress: 45,
    lastModified: '2024-09-22T11:10:00Z',
    estimatedCost: 2200
  }
];

const mockStats: UserStats = {
  totalOrders: 12,
  totalSpent: 28500,
  completedProjects: 8,
  favoriteProducts: 5,
  memberSince: '2023-03-15T00:00:00Z'
};

function formatDate(dateValue: Date | string | null) {
  if (!dateValue) return 'Неизвестно';
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  if (isNaN(date.getTime())) return 'Неизвестно';
  
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}



function getStatusColor(status: string | null) {
  if (!status) return 'bg-gray-100 text-gray-800';
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'processing': return 'bg-blue-100 text-blue-800';
    case 'shipped': return 'bg-purple-100 text-purple-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getStatusText(status: string | null, t: any) {
  if (!status) return t('statusUnknown') || 'Unknown';
  switch (status) {
    case 'pending': return t('statusPending');
    case 'processing': return t('statusProcessing');
    case 'shipped': return t('statusShipped');
    case 'delivered': return t('statusDelivered');
    case 'cancelled': return t('statusCancelled');
    default: return status;
  }
}

function getStatusIcon(status: string | null) {
  if (!status) return null;
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4" />;
    case 'processing': return <Settings className="h-4 w-4" />;
    case 'shipped': return <CheckCircle className="h-4 w-4" />;
    case 'delivered': return <CheckCircle className="h-4 w-4" />;
    case 'cancelled': return <Clock className="h-4 w-4" />;
    default: return null;
  }
}

export function ProfilePage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { cartItems, getCartTotal, getCartCount, clearCart } = useCart();
  const { orders, totalOrders, totalSpent, completedOrders, createOrder, isCreatingOrder } = useOrders();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [successOrderData, setSuccessOrderData] = useState<any>(null);

  // Динамическая статистика на основе реальных заказов и корзины
  const dynamicStats = {
    totalOrders: totalOrders + (cartItems.length > 0 ? 1 : 0), // Реальные заказы + текущая корзина как потенциальный заказ
    totalSpent: totalSpent + getCartTotal, // Реальные траты + сумма корзины
    completedProjects: completedOrders,
    favoriteProducts: mockStats.favoriteProducts,
    memberSince: mockStats.memberSince
  };

  // Функция открытия модалки подтверждения заказа
  const handleCreateOrder = () => {
    if (cartItems.length === 0) {
      toast({
        title: 'Корзина пуста',
        description: 'Добавьте товары в корзину перед оформлением заказа',
        variant: 'destructive',
      });
      return;
    }
    setShowOrderConfirmation(true);
  };

  // Функция подтверждения заказа из модалки
  const handleConfirmOrder = async (orderData: OrderConfirmationData) => {
    try {
      console.log('[ProfilePage] Creating order with data:', orderData);
      console.log('[ProfilePage] Cart items:', cartItems);
      
      // Получаем текущую валюту
      const defaultCurrencyId = 'd0e0212a-ed05-46ff-80bc-f3ba41e125a9'; // AMD по умолчанию
      
      const orderPayload = {
        cartItems,
        shippingAddress: orderData.shippingAddress,
        customerPhone: orderData.customerPhone,
        currencyId: defaultCurrencyId,
        paymentMethod: orderData.paymentMethod,
      };
      
      console.log('[ProfilePage] Final order payload:', orderPayload);
      
      const orderResult = await createOrder(orderPayload);

      // Закрываем модалку подтверждения
      setShowOrderConfirmation(false);
      
      // Готовим данные для success модалки
      setSuccessOrderData({
        orderId: orderResult?.order?.id || `ORDER${Date.now()}`,
        totalAmount: getCartTotal,
        paymentMethod: orderData.paymentMethod,
        customerEmail: user?.email
      });
      
      // Показываем success модалку
      setShowOrderSuccess(true);

      // Очищаем корзину
      clearCart();
    } catch (error) {
      console.error('Error creating order:', error);
      // Ошибка уже обработана в useOrders hook через toast
      setShowOrderConfirmation(false); // Закрываем модалку в случае ошибки
    }
  };

  const handleNewOrderOption = (option: 'calculator' | 'constructor' | 'catalog') => {
    switch (option) {
      case 'calculator':
        setActiveTab('calculator');
        break;
      case 'constructor':
        // TODO: Реализовать переход к конструктору
        window.location.href = '/constructor';
        break;
      case 'catalog':
        // TODO: Реализовать переход к каталогу
        window.location.href = '/catalog';
        break;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-6 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.profileImageUrl || undefined} />
            <AvatarFallback className="text-xl">
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600 text-lg">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-gray-600">
                С нами с {formatDate(mockStats.memberSince)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CurrencySelector />
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('settingsTab')}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('totalOrders')}</p>
                  <p className="text-2xl font-bold">{dynamicStats.totalOrders}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('totalSpent')}</p>
                  <p className="text-2xl font-bold">{formatPrice(dynamicStats.totalSpent)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('completedProjects')}</p>
                  <p className="text-2xl font-bold">{dynamicStats.completedProjects}</p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Избранное</p>
                  <p className="text-2xl font-bold">{mockStats.favoriteProducts}</p>
                </div>
                <Heart className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('overview')}</span>
            <span className="sm:hidden">{t('overview').slice(0, 4)}</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4">
            <Package className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('ordersTab')}</span>
            <span className="sm:hidden">{t('ordersTab').slice(0, 5)}</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('projects')}</span>
            <span className="sm:hidden">{t('projects').slice(0, 4)}</span>
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4">
            <Calculator className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('calculatorTab')}</span>
            <span className="sm:hidden">{t('calculatorTab').slice(0, 4)}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('settingsTab')}</span>
            <span className="sm:hidden">{t('settingsTab').slice(0, 5)}</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Последние заказы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orders.length > 0 ? orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">Заказ #{order.id}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{getStatusText(order.status, t)}</span>
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(parseFloat(order.totalAmount))}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>У вас пока нет заказов</p>
                    <p className="text-sm mt-1">Создайте свою первую фотокнигу!</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {orders.length === 0 ? (
                    <Button 
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      onClick={() => setShowNewOrder(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Создать первый заказ
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setActiveTab('orders')}
                      >
                        Все заказы
                      </Button>
                      <Button 
                        className="flex items-center gap-2"
                        onClick={() => setShowNewOrder(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Новый
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Активные проекты
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockProjects.slice(0, 3).map((project) => (
                  <div key={project.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{project.title}</h4>
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{project.format} • {project.size} • {project.pages} стр.</span>
                        <span>{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          Изменен {formatDate(project.lastModified)}
                        </span>
                        <span className="font-medium">
                          ≈ {formatPrice(project.estimatedCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  Посмотреть все проекты
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Current Cart */}
          {cartItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Корзина ({getCartCount} товаров)
                  </div>
                  <div className="text-lg font-bold">
                    {formatPrice(getCartTotal)}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <div className="text-sm text-gray-600">
                        Количество: {item.quantity}
                        {item.options && (
                          <div className="mt-1 space-y-1">
                            {item.options.format && <span className="block">Формат: {item.options.format}</span>}
                            {item.options.size && <span className="block">Размер: {item.options.size}</span>}
                            {item.options.pages && <span className="block">Страниц: {item.options.pages}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1" 
                    size="lg" 
                    onClick={handleCreateOrder}
                    disabled={cartItems.length === 0}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Оформить заказ
                  </Button>
                  <Button variant="outline" size="lg">
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Статистика активности
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {mockStats.totalOrders}
                  </div>
                  <p className="text-gray-600">Заказов выполнено</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {Math.round(mockStats.totalSpent / mockStats.totalOrders)}₽
                  </div>
                  <p className="text-gray-600">Средний чек</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {mockStats.completedProjects}
                  </div>
                  <p className="text-gray-600">Проектов создано</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Мои заказы</h2>
            <Button 
              className="flex items-center gap-2"
              onClick={() => setShowNewOrder(true)}
            >
              <Plus className="h-4 w-4" />
              Новый заказ
            </Button>
          </div>

          <div className="grid gap-6">
            {orders.length > 0 ? orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Заказ #{order.id}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Заказ #{order.id}</span>
                        <span>•</span>
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold mb-2">
                        {formatPrice(parseFloat(order.totalAmount))}
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{getStatusText(order.status, t)}</span>
                      </Badge>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Состав заказа:</h4>
                      <div className="space-y-2">
                        {Array.isArray(order.items) ? order.items.map((item: any, idx: number) => (
                          <div key={idx} className="text-sm bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between">
                              <span>{item.name}</span>
                              <span>{item.quantity} шт.</span>
                            </div>
                            <div className="text-gray-600">
                              Цена: {formatPrice(item.price)}
                            </div>
                          </div>
                        )) : (
                          <p className="text-gray-500">Нет товаров в заказе</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Статус:</h4>
                      <div className="text-sm bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span>{getStatusText(order.status, t)}</span>
                        </div>
                        <div className="text-gray-600 mt-1">
                          Создан: {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Подробнее
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Скачать макет
                    </Button>
                    {(order.status === 'delivered') && (
                      <Button size="sm" variant="outline">
                        <Star className="h-4 w-4 mr-2" />
                        Оценить
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 mx-auto mb-6 text-gray-300" />
                  <h3 className="text-xl font-semibold mb-2">У вас пока нет заказов</h3>
                  <p className="text-gray-600 mb-6">
                    Создайте свою первую фотокнигу в калькуляторе и оформите заказ!
                  </p>
                  <Button onClick={() => setActiveTab('calculator')}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Перейти к калькулятору
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Мои проекты</h2>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Создать проект
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProjects.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {project.thumbnail ? (
                    <img 
                      src={project.thumbnail} 
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{project.title}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>{project.format} • {project.size} • {project.pages} стр.</div>
                    <div className="flex justify-between">
                      <span>Прогресс:</span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                    <div className="flex justify-between pt-2">
                      <span>Стоимость:</span>
                      <span className="font-medium">{formatPrice(project.estimatedCost)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Изменен {formatDate(project.lastModified)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator">
          <PhotobookCalculator />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <ProfileSettings />
        </TabsContent>
      </Tabs>

      {/* Order Confirmation Modal */}
      <OrderConfirmationModal
        isOpen={showOrderConfirmation}
        onClose={() => setShowOrderConfirmation(false)}
        cartItems={cartItems}
        totalAmount={getCartTotal}
        onConfirmOrder={handleConfirmOrder}
        isCreating={isCreatingOrder}
      />

      {/* Order Success Modal */}
      {successOrderData && (
        <OrderSuccessModal
          isOpen={showOrderSuccess}
          onClose={() => setShowOrderSuccess(false)}
          orderData={successOrderData}
          onViewOrders={() => setActiveTab('orders')}
          onGoHome={() => window.location.href = '/'}
        />
      )}

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        onSelectOption={handleNewOrderOption}
      />
    </div>
  );
}