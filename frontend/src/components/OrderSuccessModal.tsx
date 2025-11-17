import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle2, 
  Clock, 
  Phone, 
  Mail, 
  CreditCard,
  Banknote,
  ArrowRight,
  Package,
  Calendar
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    orderId: string;
    totalAmount: number;
    paymentMethod: 'cash' | 'card' | 'paypal' | 'idram';
    customerEmail?: string;
  };
  onViewOrders: () => void;
  onGoHome: () => void;
}

export function OrderSuccessModal({
  isOpen,
  onClose,
  orderData,
  onViewOrders,
  onGoHome
}: OrderSuccessModalProps) {
  const { formatPrice } = useCurrency();

  const isCashPayment = orderData.paymentMethod === 'cash';

  const paymentMethodNames = {
    cash: 'Оплата курьеру',
    card: 'Банковская карта',
    paypal: 'PayPal',
    idram: 'IDram'
  };

  const handleViewOrders = () => {
    onClose();
    onViewOrders();
  };

  const handleGoHome = () => {
    onClose();
    onGoHome();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-green-800">
            🎉 Заказ успешно оформлен!
          </DialogTitle>
          <DialogDescription>
            Ваш заказ #{orderData.orderId} принят в обработку
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Основная информация о заказе */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Номер заказа</p>
                <p className="text-2xl font-bold text-green-800">#{orderData.orderId}</p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                  <Package className="w-4 h-4" />
                  <span>Сумма: {formatPrice(orderData.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                  {orderData.paymentMethod === 'cash' ? (
                    <Banknote className="w-4 h-4" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>{paymentMethodNames[orderData.paymentMethod]}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Что происходит дальше */}
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Что происходит дальше?
                </h3>
                
                {isCashPayment ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Подтверждение заказа</p>
                        <p className="text-sm text-gray-600">
                          Наш менеджер свяжется с вами в течение 1 часа для подтверждения деталей
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Изготовление</p>
                        <p className="text-sm text-gray-600">
                          Ориентировочное время изготовления: 3-5 рабочих дней
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Доставка и оплата</p>
                        <p className="text-sm text-gray-600">
                          Курьер доставит заказ по указанному адресу. Оплата наличными при получении.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">1</span>
                      </div>
                      <div>
                        <p className="font-medium">Переход к оплате</p>
                        <p className="text-sm text-gray-600">
                          Сейчас вы будете перенаправлены на безопасную страницу оплаты
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">2</span>
                      </div>
                      <div>
                        <p className="font-medium">Подтверждение и изготовление</p>
                        <p className="text-sm text-gray-600">
                          После успешной оплаты мы приступим к изготовлению заказа (3-5 дней)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-blue-600">3</span>
                      </div>
                      <div>
                        <p className="font-medium">Доставка</p>
                        <p className="text-sm text-gray-600">
                          Наш курьер доставит готовый заказ по указанному адресу
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Контакты и уведомления */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Свяжемся с вами по указанному номеру телефона</span>
                </div>
                
                {orderData.customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-600" />
                    <span className="text-sm">Детали заказа отправлены на {orderData.customerEmail}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">Статус заказа доступен в личном кабинете</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-3 sm:justify-center">
          <Button 
            variant="outline" 
            onClick={handleGoHome}
            className="flex items-center gap-2"
          >
            На главную
          </Button>
          <Button 
            onClick={handleViewOrders}
            className="flex items-center gap-2"
          >
            Мои заказы
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}