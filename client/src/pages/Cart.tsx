import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { apiRequest } from "@/lib/queryClient";
import { Minus, Plus, X, ShoppingCart, CreditCard } from "lucide-react";
import type { CartItem } from "@/types";


const orderSchema = z.object({
  customerName: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  customerEmail: z.string().email('Введите корректный email'),
  customerPhone: z.string().min(10, 'Введите корректный номер телефона'),
  shippingAddress: z.string().min(10, 'Введите полный адрес доставки'),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function Cart() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { cartItems, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCart();

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      shippingAddress: '',
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: OrderFormData) => {
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const orderPayload = {
        ...orderData,
        totalAmount: total.toString(),
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          options: item.options,
        })),
      };

      return await apiRequest('POST', '/api/orders', orderPayload);
    },
    onSuccess: () => {
      toast({
        title: "Заказ оформлен",
        description: "Ваш заказ успешно создан. Мы свяжемся с вами в ближайшее время.",
      });
      
      // Clear cart
      clearCart();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось оформить заказ. Попробуйте еще раз.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateQuantity = (id: string, delta: number) => {
    updateQuantity(id, delta);
  };

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);
    toast({
      title: "Товар удален",
      description: "Товар удален из корзины",
    });
  };

  const total = getCartTotal;
  const shipping = total > 3000 ? 0 : 300;
  const finalTotal = total + shipping;

  const onSubmit = (data: OrderFormData) => {
    if (cartItems.length === 0) {
      toast({
        title: "Корзина пуста",
        description: "Добавьте товары в корзину перед оформлением заказа",
        variant: "destructive",
      });
      return;
    }
    createOrderMutation.mutate(data);
  };

  return (
    <div className="min-h-screen page-bg">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Главная</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t('cart')}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-4" data-testid="text-cart-title">
            {t('cart')}
          </h1>
          <p className="text-muted-foreground text-lg">
            Проверьте выбранные товары и оформите заказ
          </p>
        </div>

        {cartItems.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-16">
            <ShoppingCart className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-foreground mb-4" data-testid="text-empty-cart">
              Ваша корзина пуста
            </h2>
            <p className="text-muted-foreground mb-8">
              Добавьте товары из каталога, чтобы оформить заказ
            </p>
            <Button onClick={() => window.location.href = '/catalog'} data-testid="button-continue-shopping">
              Перейти в каталог
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Товары в корзине ({cartItems.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg" data-testid={`cart-item-${item.id}`}>
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-md"
                        data-testid={`img-cart-item-${item.id}`}
                      />
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground" data-testid={`text-cart-item-name-${item.id}`}>
                          {item.name}
                        </h3>
                        {item.options && (
                          <div className="text-sm text-muted-foreground">
                            {Object.entries(item.options).map(([key, value]) => (
                              <span key={key} className="mr-4">{key}: {value}</span>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex flex-col">
                            {item.discountPercentage && item.originalPrice && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground line-through">
                                  ₽{item.originalPrice.toLocaleString()}
                                </span>
                                <span className="text-sm bg-red-500 text-white px-1 py-0.5 rounded text-xs">
                                  -{item.discountPercentage}%
                                </span>
                              </div>
                            )}
                            <span className="font-semibold text-primary text-lg" data-testid={`text-cart-item-price-${item.id}`}>
                              ₽{item.price.toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                disabled={item.quantity <= 1}
                                data-testid={`button-decrease-${item.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              
                              <span className="text-sm w-8 text-center" data-testid={`text-cart-item-quantity-${item.id}`}>
                                {item.quantity}
                              </span>
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                data-testid={`button-increase-${item.id}`}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleRemoveItem(item.id)}
                              data-testid={`button-remove-${item.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary & Checkout */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Итого</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Товары:</span>
                    <span>₽{total.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Доставка:</span>
                    <span className={shipping === 0 ? "text-green-600" : ""}>
                      {shipping === 0 ? "Бесплатно" : `₽${shipping.toLocaleString()}`}
                    </span>
                  </div>
                  
                  {shipping === 0 && (
                    <p className="text-sm text-green-600">
                      🎉 Бесплатная доставка при заказе от ₽3,000
                    </p>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('total')}:</span>
                    <span className="text-primary" data-testid="text-cart-total">
                      ₽{finalTotal.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Checkout Form */}
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
                            <FormLabel>{t('name')}</FormLabel>
                            <FormControl>
                              <Input placeholder="Ваше имя" {...field} data-testid="input-customer-name" />
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
                            <FormLabel>{t('email')}</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="your@email.com" {...field} data-testid="input-customer-email" />
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
                            <FormLabel>{t('phone')}</FormLabel>
                            <FormControl>
                              <Input placeholder="+7 (999) 123-45-67" {...field} data-testid="input-customer-phone" />
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
                            <FormLabel>{t('address')}</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Полный адрес доставки" 
                                className="min-h-[80px]"
                                {...field} 
                                data-testid="input-shipping-address"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={createOrderMutation.isPending}
                        data-testid="button-place-order"
                      >
                        {createOrderMutation.isPending ? "Оформление..." : `${t('checkout')} - ₽${finalTotal.toLocaleString()}`}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
