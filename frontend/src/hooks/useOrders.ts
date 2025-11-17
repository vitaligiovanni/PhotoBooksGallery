import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@shared/schema';
import type { CartItem } from '@/types';

export interface CreateOrderData {
  cartItems: CartItem[];
  shippingAddress: string;
  customerPhone?: string;
  currencyId: string;
  paymentMethod?: string;
}

export interface OrderWithCurrency extends Order {
  currency?: {
    code: string;
    symbol: string;
    name: any;
  };
}

export function useOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Получение списка заказов
  const {
    data: orders = [],
    isLoading,
    error,
    refetch
  } = useQuery<OrderWithCurrency[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/orders', {
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки заказов');
      }
      
      return response.json();
    },
  });

  // Создание заказа
  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderData) => {
      console.log('[useOrders] Sending order data:', data);
      
      // Используем /api/orders/profile вместо /api/orders
      // Этот endpoint работает через сессию/куки (mockAuth), не требует JWT
      const response = await fetch('/api/orders/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      console.log('[useOrders] Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Ошибка создания заказа';
        try {
          const error = await response.json();
          console.log('[useOrders] Error response:', error);
          errorMessage = error.error || errorMessage;
        } catch (parseError) {
          console.log('[useOrders] Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[useOrders] Success response:', result);
      return result;
    },
    onSuccess: () => {
      // Обновляем список заказов
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка создания заказа',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  // Получение деталей заказа
  const getOrderDetails = async (orderId: string): Promise<OrderWithCurrency> => {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`/api/orders/${orderId}`, {
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Ошибка загрузки деталей заказа');
    }
    
    return response.json();
  };

  return {
    // Данные
    orders,
    isLoading,
    error,
    
    // Функции
    createOrder: createOrderMutation.mutateAsync, // Используем mutateAsync для получения промиса
    isCreatingOrder: createOrderMutation.isPending,
    getOrderDetails,
    refetch,
    
    // Computed свойства
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
    completedOrders: orders.filter(order => order.status === 'delivered').length,
    pendingOrders: orders.filter(order => order.status === 'pending').length,
    processingOrders: orders.filter(order => order.status === 'processing').length,
  };
}

export default useOrders;