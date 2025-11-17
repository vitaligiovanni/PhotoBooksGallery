import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  Package, 
  User, 
  Phone, 
  MapPin, 
  CreditCard,
  Banknote,
  Sparkles,
  CheckCircle,
  ShoppingBag
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface SimpleOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderSuccess: () => void;
}

export function SimpleOrderModal({ isOpen, onClose, cartItems, onOrderSuccess }: SimpleOrderModalProps) {
  const { toast } = useToast();
  const { formatPrice, currentCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Calculate total
  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[SimpleOrderModal] Form submit started', {
      customerName,
      customerPhone,
      shippingAddress,
      paymentMethod,
      cartItemsCount: cartItems.length
    });
    
    if (!customerName || !customerPhone || !shippingAddress || !paymentMethod) {
      console.error('[SimpleOrderModal] Validation failed', {
        hasName: !!customerName,
        hasPhone: !!customerPhone,
        hasAddress: !!shippingAddress,
        hasPayment: !!paymentMethod
      });
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create order for ready-made products (no user registration needed)
      const orderData = {
        cartItems,
        customerName,
        customerPhone,
        shippingAddress,
        paymentMethod,
        notes,
        currencyId: currentCurrency?.id || 'd0e0212a-ed05-46ff-80bc-f3ba41e125a9', // Default AMD currency UUID
        isReadyMadeOrder: true, // Flag to indicate this is a simple order
        totalAmount
      };

      console.log('[SimpleOrderModal] Sending order data:', orderData);

      const response = await fetch('/api/orders/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      console.log('[SimpleOrderModal] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SimpleOrderModal] Server error:', errorData);
        throw new Error(errorData.error || 'Ошибка создания заказа');
      }

      const result = await response.json();
      
      console.log('[SimpleOrderModal] Order created successfully:', result);
      
      // Show success modal
      setShowSuccess(true);
      
      // Clear form
      setCustomerName('');
      setCustomerPhone('');
      setShippingAddress('');
      setPaymentMethod('');
      setNotes('');
      
      toast({
        title: "Заказ создан!",
        description: `Ваш заказ #${result.order.id.slice(-8)} успешно создан`,
      });
      
      // Call success callback after a delay
      setTimeout(() => {
        onOrderSuccess();
        setShowSuccess(false);
        onClose();
      }, 3000);

    } catch (error) {
      console.error('[SimpleOrderModal] Error creating order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать заказ';
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Заказ успешно создан!
            </h3>
            <p className="text-gray-600 mb-4">
              Ваш заказ принят в обработку. Мы свяжемся с вами в ближайшее время для подтверждения.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Сумма заказа:</strong> {formatPrice(totalAmount)}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Быстрый заказ
            <Sparkles className="w-5 h-5 text-amber-500" />
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Оформление заказа готового товара без регистрации
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Ваш заказ
            </h3>
            <div className="space-y-2">
              {cartItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-600">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between items-center">
                <p className="font-bold">Общая сумма:</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatPrice(totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5" />
              Контактная информация
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Имя и фамилия *
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Введите ваше имя"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="customerPhone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Телефон *
                </Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+374 XX XXX XXX"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="shippingAddress" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Адрес доставки *
              </Label>
              <Textarea
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Укажите полный адрес доставки"
                rows={3}
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Способ оплаты
            </h3>
            
            <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
              <SelectTrigger>
                <SelectValue placeholder="Выберите способ оплаты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Наличными при получении
                  </div>
                </SelectItem>
                <SelectItem value="card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Картой при получении
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes">Дополнительные пожелания</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Укажите дополнительные пожелания к заказу"
              rows={2}
            />
          </div>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-800 mb-1">
                    Готовый товар
                  </h4>
                  <p className="text-sm text-blue-700">
                    Этот товар готов к отправке! Мы свяжемся с вами для подтверждения заказа 
                    и уточнения деталей доставки. Регистрация аккаунта не требуется.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отменить
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Создание заказа...' : 'Оформить заказ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SimpleOrderModal;