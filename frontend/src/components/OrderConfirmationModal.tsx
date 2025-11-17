import React, { useState } from 'react';
// import { useTranslation } from 'react-i18next'; // Unused - commented out
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Banknote, 
  MapPin, 
  Phone, 
  Package,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { CartItem } from '@/types';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalAmount: number;
  onConfirmOrder: (orderData: OrderConfirmationData) => void;
  isCreating: boolean;
}

export interface OrderConfirmationData {
  shippingAddress: string;
  customerPhone: string;
  paymentMethod: 'cash' | 'card' | 'paypal' | 'idram';
  saveAddress?: boolean;
}

const paymentMethods = [
  {
    id: 'cash',
    name: 'Оплата курьеру',
    nameEn: 'Cash on Delivery',
    nameHy: 'Վճարում բերման ժամանակ',
    description: 'Оплатите наличными при получении заказа',
    icon: Banknote,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'card',
    name: 'Банковская карта',
    nameEn: 'Bank Card',
    nameHy: 'Բանկային քարտ',
    description: 'Visa, MasterCard, Арцах Card',
    icon: CreditCard,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    nameEn: 'PayPal',
    nameHy: 'PayPal',
    description: 'Безопасная оплата через PayPal',
    icon: Wallet,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  },
  {
    id: 'idram',
    name: 'IDram',
    nameEn: 'IDram',
    nameHy: 'IDram',
    description: 'Популярная армянская платежная система',
    icon: CreditCard,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
];

export function OrderConfirmationModal({
  isOpen,
  onClose,
  cartItems,
  totalAmount,
  onConfirmOrder,
  isCreating
}: OrderConfirmationModalProps) {
  // const { t } = useTranslation(); // Unused - commented out
  const { formatPrice } = useCurrency();

  const [formData, setFormData] = useState<OrderConfirmationData>({
    shippingAddress: '',
    customerPhone: '',
    paymentMethod: 'cash',
    saveAddress: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.shippingAddress.trim()) {
      alert('Пожалуйста, укажите адрес доставки');
      return;
    }
    
    if (!formData.customerPhone.trim()) {
      alert('Пожалуйста, укажите номер телефона');
      return;
    }

    onConfirmOrder(formData);
  };

  const selectedPaymentMethod = paymentMethods.find(method => method.id === formData.paymentMethod);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Подтверждение заказа
          </DialogTitle>
          <DialogDescription>
            Проверьте данные заказа и выберите способ оплаты
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Состав заказа */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Состав заказа
              </h3>
              <div className="space-y-3">
                {cartItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg border"
                      />
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.options && (
                          <div className="text-xs text-gray-600 space-x-2">
                            {item.options.format && <span>Формат: {item.options.format}</span>}
                            {item.options.size && <span>• {item.options.size}</span>}
                            {item.options.pages && <span>• {item.options.pages} стр.</span>}
                          </div>
                        )}
                        <Badge variant="secondary" className="text-xs mt-1">
                          {item.quantity} шт.
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
                
                <Separator className="my-3" />
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Итого к оплате:</span>
                  <span className="text-primary">{formatPrice(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Адрес доставки */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Адрес доставки
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="Укажите полный адрес доставки"
              value={formData.shippingAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, shippingAddress: e.target.value }))}
              className="w-full"
              required
            />
            <p className="text-xs text-gray-600">
              Например: г. Ереван, ул. Абовяна 10, кв. 25
            </p>
          </div>

          {/* Телефон */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Номер телефона
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+374 XX XXX XXX"
              value={formData.customerPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
              className="w-full"
              required
            />
          </div>

          {/* Способ оплаты */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Способ оплаты
            </Label>
            <RadioGroup
              value={formData.paymentMethod}
              onValueChange={(value: 'cash' | 'card' | 'paypal' | 'idram') => 
                setFormData(prev => ({ ...prev, paymentMethod: value }))
              }
              className="space-y-3"
            >
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div key={method.id} className="flex items-center space-x-3">
                    <RadioGroupItem value={method.id} id={method.id} />
                    <Label 
                      htmlFor={method.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer flex-1 transition-colors ${
                        formData.paymentMethod === method.id 
                          ? `${method.bgColor} border-current` 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${method.color}`} />
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Информационное сообщение */}
          {selectedPaymentMethod && (
            <Card className={`border ${selectedPaymentMethod.bgColor.replace('bg-', 'border-').replace('-50', '-200')}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`h-5 w-5 mt-0.5 ${selectedPaymentMethod.color}`} />
                  <div className="space-y-2">
                    <p className="font-medium">
                      {formData.paymentMethod === 'cash' 
                        ? 'Оплата при получении' 
                        : 'Онлайн оплата'
                      }
                    </p>
                    <p className="text-sm text-gray-700">
                      {formData.paymentMethod === 'cash' 
                        ? 'Наш курьер свяжется с вами в течение 1 часа для подтверждения заказа и согласования времени доставки. Оплата производится наличными при получении.'
                        : 'После нажатия "Оформить заказ" вы будете перенаправлены на безопасную страницу оплаты. Наш менеджер свяжется с вами после подтверждения оплаты.'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Кнопки */}
          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
              Отмена
            </Button>
            <Button type="submit" disabled={isCreating} className="min-w-[120px]">
              {isCreating ? 'Оформляем...' : 'Оформить заказ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}