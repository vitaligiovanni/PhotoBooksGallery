import { useState } from 'react';
// import { useTranslation } from 'react-i18next'; // Unused - commented out
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/queryClient";
import { SimpleOrderModal } from "@/components/SimpleOrderModal";
import { Minus, Plus, X, ShoppingCart, CreditCard, Package, Sparkles } from "lucide-react";

const orderSchema = z.object({
  customerName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  customerEmail: z.string().email("Некорректный email"),
  customerPhone: z.string().min(8, "Номер телефона должен содержать минимум 8 цифр"),
  shippingAddress: z.string().min(5, "Адрес должен содержать минимум 5 символов"),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function Cart() {
  // const { t } = useTranslation(); // Commented out unused import
  const { toast } = useToast();
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const { currentCurrency, baseCurrency } = useCurrency();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isSimpleOrderModalOpen, setIsSimpleOrderModalOpen] = useState(false);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      shippingAddress: "",
    },
  });

  // Check cart composition
  const hasOnlyReadyMadeItems = cartItems.length > 0 && cartItems.every(item => item.isReadyMade === true);
  // const hasOnlyCustomItems = cartItems.length > 0 && cartItems.every(item => item.isReadyMade === false); // Commented out unused variable
  const hasMixedItems = cartItems.length > 0 && cartItems.some(item => item.isReadyMade === true) && cartItems.some(item => item.isReadyMade === false);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: OrderFormData) => {
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const orderPayload = {
        ...orderData,
        totalAmount: total.toString(),
        currencyId: currentCurrency?.id || baseCurrency?.id || 'd0e0212a-ed05-46ff-80bc-f3ba41e125a9',
        shippingAddress: orderData.shippingAddress,
        customerPhone: orderData.customerPhone,
        cartItems: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      };

      const response = await apiRequest('POST', '/api/orders', orderPayload);

      return response;
    },
    onSuccess: () => {
      toast({
        title: "Заказ успешно создан!",
        description: "Мы свяжемся с вами в ближайшее время.",
      });
      clearCart();
      form.reset();
    },
    onError: (error) => {
      console.error('Order creation error:', error);
      toast({
        title: "Ошибка при создании заказа",
        description: "Попробуйте еще раз или обратитесь в поддержку.",
        variant: "destructive",
      });
    },
  });

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = total >= 3000 ? 0 : 500;
  const finalTotal = total + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Корзина пуста</h1>
            <p className="text-gray-600 mb-8">Добавьте товары в корзину, чтобы оформить заказ</p>
            <Button asChild>
              <a href="/">Продолжить покупки</a>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleCheckoutClick = () => {
    // Если пользователь авторизован - перенаправляем в личный кабинет
    if (isAuthenticated) {
      toast({
        title: "Переход в личный кабинет",
        description: "Оформление заказа доступно в вашем профиле",
      });
      setLocation('/profile');
      return;
    }
    
    // Если не авторизован и есть только готовые товары - показываем форму быстрого заказа
    if (hasOnlyReadyMadeItems) {
      setIsSimpleOrderModalOpen(true);
    } else {
      // Для кастомных товаров или смешанной корзины требуем регистрацию
      toast({
        title: "Требуется регистрация",
        description: "Для заказа индивидуальных товаров необходимо зарегистрироваться",
        variant: "default",
      });
      setLocation('/login');
    }
  };

  const onSubmit = (data: OrderFormData) => {
    createOrderMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Главная</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Корзина</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Товары в корзине ({cartItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <img
                        src={item.imageUrl || '/placeholder.png'}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                      <p className="text-sm text-gray-600">₽{item.price.toLocaleString()}</p>
                      {item.isReadyMade && (
                        <div className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full w-fit mt-1">
                          <Package className="w-3 h-3" />
                          Готовый товар
                        </div>
                      )}
                      {item.isReadyMade === false && (
                        <div className="flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full w-fit mt-1">
                          <Sparkles className="w-3 h-3" />
                          Индивидуальный заказ
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-sm font-medium">
                      ₽{(item.price * item.quantity).toLocaleString()}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Итого
                  {hasOnlyReadyMadeItems && (
                    <div className="flex items-center gap-1 text-sm text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      <Package className="w-3 h-3" />
                      Готовые товары
                    </div>
                  )}
                  {hasMixedItems && (
                    <div className="flex items-center gap-1 text-sm text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Смешанный заказ
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Товары:</span>
                  <span>₽{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Доставка:</span>
                  <span>{shipping === 0 ? "Бесплатно" : `₽${shipping.toLocaleString()}`}</span>
                </div>
                
                {total >= 3000 && (
                  <p className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    🎉 Бесплатная доставка при заказе от ₽3,000
                  </p>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Итого:</span>
                  <span className="text-primary">
                    ₽{finalTotal.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {hasOnlyReadyMadeItems ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <Package className="h-5 w-5" />
                    Быстрое оформление
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Все товары в корзине готовы к отправке. Воспользуйтесь быстрым оформлением заказа!
                  </p>
                  <Button 
                    onClick={handleCheckoutClick}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Быстрое оформление - ₽{finalTotal.toLocaleString()}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Оформление заказа
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Имя и фамилия</FormLabel>
                            <FormControl>
                              <Input placeholder="Введите ваше имя" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="your@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Телефон</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+7 (999) 123-45-67" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="shippingAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Адрес доставки</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Введите полный адрес доставки" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={createOrderMutation.isPending}
                      >
                        {createOrderMutation.isPending ? "Оформление..." : `Оформить заказ - ₽${finalTotal.toLocaleString()}`}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />

      <SimpleOrderModal 
        isOpen={isSimpleOrderModalOpen}
        onClose={() => setIsSimpleOrderModalOpen(false)}
        cartItems={cartItems}
        onOrderSuccess={() => {
          clearCart();
          setIsSimpleOrderModalOpen(false);
        }}
      />
    </div>
  );
}