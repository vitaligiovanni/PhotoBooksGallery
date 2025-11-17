import { useToast } from "@/hooks/use-toast";
// import { useTranslation } from 'react-i18next'; // Unused - commented out
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order, Currency } from "@shared/schema";

export function OrdersManager() {
  const { toast } = useToast();
  // const { t } = useTranslation(); // Unused - commented out
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/admin/orders"] });
  const { data: currencies = [] } = useQuery<Currency[]>({ queryKey: ["/api/currencies"] });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PUT", `/api/admin/orders/${orderId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({
        title: "Успех",
        description: "Статус заказа обновлен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус заказа",
        variant: "destructive",
      });
    }
  });

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || (order.status || "pending") === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrderStatusMutation.mutate({ orderId, status: newStatus });
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (amount: string | number, currencyId?: string | null) => {
    const currency = currencies.find(c => c.id === currencyId);
    const symbol = currency?.symbol || '₽';
    return `${Number(amount).toLocaleString('ru-RU')} ${symbol}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">processing</Badge>;
      case 'shipped':
        return <Badge className="bg-purple-100 text-purple-800">shipped</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800">delivered</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getOrderStats = () => {
    const total = orders.length;
    const pending = orders.filter(o => (o.status || 'pending') === 'pending').length;
    const processing = orders.filter(o => (o.status || 'pending') === 'processing').length;
    const delivered = orders.filter(o => (o.status || 'pending') === 'delivered').length;
    const totalRevenue = orders
      .filter(o => (o.status || 'pending') === 'delivered')
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    return { total, pending, processing, delivered, totalRevenue };
  };

  const stats = getOrderStats();

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Управление заказами</h1>
        <p className="text-muted-foreground mt-2">
          Просмотр и управление заказами клиентов
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Всего заказов</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Ожидают</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.processing}</div>
            <div className="text-sm text-muted-foreground">Обрабатываются</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <div className="text-sm text-muted-foreground">Доставлены</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {formatPrice(stats.totalRevenue)}
            </div>
            <div className="text-sm text-muted-foreground">Общая выручка</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-purple-600" />
            Фильтры и поиск
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по имени клиента, email или ID заказа..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="input-order-search"
              />
            </div>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
            >
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все заказы</SelectItem>
                <SelectItem value="pending">Ожидают</SelectItem>
                <SelectItem value="processing">Обрабатываются</SelectItem>
                <SelectItem value="shipped">Отправлены</SelectItem>
                <SelectItem value="delivered">Доставлены</SelectItem>
                <SelectItem value="cancelled">Отменены</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-purple-600" />
            Список заказов ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p>Загрузка заказов...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Заказы не найдены</p>
              <p className="text-sm">
                {searchTerm || selectedStatus !== "all" ? "Попробуйте изменить фильтры поиска" : "Пока нет заказов"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID заказа</TableHead>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-mono text-sm text-blue-600">
                          #{order.id.slice(-8)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">
                            {order.customerName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.customerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatPrice(order.totalAmount, order.currencyId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status || "pending"}
                          onValueChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                          disabled={updateOrderStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-40" data-testid={`select-order-status-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                Ожидает
                              </div>
                            </SelectItem>
                            <SelectItem value="processing">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                Обрабатывается
                              </div>
                            </SelectItem>
                            <SelectItem value="shipped">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                Отправлен
                              </div>
                            </SelectItem>
                            <SelectItem value="delivered">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Доставлен
                              </div>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                Отменен
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(order.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOrderClick(order)}
                          data-testid={`button-order-details-${order.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              Детали заказа #{selectedOrder?.id.slice(-8)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Информация о клиенте</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Имя</label>
                    <p className="font-medium">{selectedOrder.customerName || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="font-medium">{selectedOrder.customerEmail || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Телефон</label>
                    <p className="font-medium">{selectedOrder.customerPhone || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Статус</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedOrder.status || "pending")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Адрес доставки</h3>
                <p className="text-sm bg-gray-50 p-3 rounded-md">
                  {selectedOrder.shippingAddress || 'Адрес не указан'}
                </p>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Товары в заказе</h3>
                <div className="border rounded-md">
                  {Array.isArray(selectedOrder.items) ? (
                    selectedOrder.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-4 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Количество: {item.quantity} × {formatPrice(item.price, selectedOrder.currencyId)}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatPrice(item.quantity * item.price, selectedOrder.currencyId)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      Информация о товарах недоступна
                    </div>
                  )}
                  <div className="p-4 bg-gray-50 flex justify-between items-center">
                    <p className="font-semibold">Общая сумма:</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatPrice(selectedOrder.totalAmount, selectedOrder.currencyId)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Информация о заказе</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Дата создания</label>
                    <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Последнее обновление</label>
                    <p className="font-medium">{formatDate(selectedOrder.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
