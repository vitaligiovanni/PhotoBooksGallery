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
import { Users, Eye, BarChart3 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Order, Currency } from "@shared/schema";

export function CustomersManager() {
  const { toast } = useToast();
  // const { t } = useTranslation(); // Unused - commented out
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);

  const { data: customers = [], isLoading } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/admin/orders"] });
  const { data: currencies = [] } = useQuery<Currency[]>({ queryKey: ["/api/currencies"] });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PUT", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Успех",
        description: "Роль пользователя обновлена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить роль пользователя",
        variant: "destructive",
      });
    }
  });

  // Filter customers based on search and role
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || customer.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatPrice = (amount: string | number, currencyId?: string | null) => {
    const currency = currencies.find(c => c.id === currencyId);
    const symbol = currency?.symbol || '₽';
    return `${Number(amount).toLocaleString('ru-RU')} ${symbol}`;
  };

  // Получить статистику клиента
  const getCustomerStats = (customerId: string) => {
    const customerOrders = orders.filter(order => order.userId === customerId);
    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const completedOrders = customerOrders.filter(order => (order.status || "pending") === "delivered").length;
    const pendingOrders = customerOrders.filter(order => (order.status || "pending") === "pending").length;
    const lastOrderDate = customerOrders.length > 0 
      ? Math.max(...customerOrders.map(o => new Date(o.createdAt || '').getTime()))
      : null;
    
    return { 
      totalOrders, 
      totalSpent, 
      completedOrders, 
      pendingOrders, 
      lastOrderDate: lastOrderDate ? new Date(lastOrderDate) : null,
      orders: customerOrders.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    };
  };

  const handleCustomerClick = (customer: User) => {
    setSelectedCustomer(customer);
    setIsCustomerDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Управление клиентами</h1>
        <p className="text-muted-foreground mt-2">
          Просмотр и управление зарегистрированными пользователями системы
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Фильтры и поиск
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по имени или email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="input-customer-search"
              />
            </div>
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
            >
              <SelectTrigger className="w-48" data-testid="select-role-filter">
                <SelectValue placeholder="Фильтр по роли" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                <SelectItem value="user">Обычные пользователи</SelectItem>
                <SelectItem value="admin">Администраторы</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Список клиентов ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p>Загрузка клиентов...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Пользователи не найдены</p>
              <p className="text-sm">
                {searchTerm || selectedRole !== "all" ? "Попробуйте изменить фильтры поиска" : "Пока нет зарегистрированных пользователей"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Заказы</TableHead>
                    <TableHead>Потрачено</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Регистрация</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const stats = getCustomerStats(customer.id);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {customer.profileImageUrl ? (
                              <img
                                src={customer.profileImageUrl}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {customer.firstName?.[0] || customer.email?.[0]?.toUpperCase() || 'U'}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {customer.firstName && customer.lastName
                                  ? `${customer.firstName} ${customer.lastName}`
                                  : customer.firstName || customer.lastName || 'Без имени'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ID: {customer.id.slice(-8)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {customer.email || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {stats.totalOrders} заказов
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stats.completedOrders} выполнено • {stats.pendingOrders} в ожидании
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium text-green-600">
                              {formatPrice(stats.totalSpent)}
                            </div>
                            {stats.lastOrderDate && (
                              <div className="text-xs text-muted-foreground">
                                Последний: {formatDate(stats.lastOrderDate)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={customer.role || "user"}
                            onValueChange={(newRole) => handleRoleChange(customer.id, newRole)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-role-${customer.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  Пользователь
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  Администратор
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {formatDate(customer.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={customer.role === 'admin' ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {customer.role === 'admin' ? 'Админ' : 'Клиент'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCustomerClick(customer)}
                              data-testid={`button-customer-details-${customer.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Детали
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Статистика пользователей
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {customers.filter(c => c.role === 'user').length}
              </div>
              <div className="text-sm text-muted-foreground">Обычных пользователей</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {customers.filter(c => c.role === 'admin').length}
              </div>
              <div className="text-sm text-muted-foreground">Администраторов</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {customers.length}
              </div>
              <div className="text-sm text-muted-foreground">Всего пользователей</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">
                {formatPrice(
                  customers.reduce((total, customer) => 
                    total + getCustomerStats(customer.id).totalSpent, 0
                  )
                )}
              </div>
              <div className="text-sm text-muted-foreground">Общий доход от клиентов</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={isCustomerDetailsOpen} onOpenChange={setIsCustomerDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Детали клиента: {selectedCustomer?.firstName} {selectedCustomer?.lastName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (() => {
            const customerStats = getCustomerStats(selectedCustomer.id);
            return (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Информация о клиенте</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {selectedCustomer.profileImageUrl ? (
                          <img
                            src={selectedCustomer.profileImageUrl}
                            alt="Avatar"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-lg font-medium">
                            {selectedCustomer.firstName?.[0] || selectedCustomer.email?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-lg">
                            {selectedCustomer.firstName && selectedCustomer.lastName
                              ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                              : selectedCustomer.firstName || selectedCustomer.lastName || 'Без имени'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ID: {selectedCustomer.id}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Email</label>
                        <p className="font-medium">{selectedCustomer.email || '—'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Роль</label>
                        <p className="font-medium">
                          {selectedCustomer.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Дата регистрации</label>
                        <p className="font-medium">{formatDate(selectedCustomer.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Статистика заказов</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {customerStats.totalOrders}
                        </div>
                        <div className="text-sm text-muted-foreground">Всего заказов</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPrice(customerStats.totalSpent)}
                        </div>
                        <div className="text-sm text-muted-foreground">Общая сумма</div>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-600">
                          {customerStats.completedOrders}
                        </div>
                        <div className="text-sm text-muted-foreground">Выполнено</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {customerStats.pendingOrders}
                        </div>
                        <div className="text-sm text-muted-foreground">В ожидании</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order History */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">История заказов</h3>
                  {customerStats.orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mx-auto mb-4">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <p>У клиента пока нет заказов</p>
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID заказа</TableHead>
                            <TableHead>Дата</TableHead>
                            <TableHead>Сумма</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead>Товары</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerStats.orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>
                                <div className="font-mono text-sm text-blue-600">
                                  #{order.id.slice(-8)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {formatDate(order.createdAt)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-green-600">
                                  {formatPrice(order.totalAmount, order.currencyId)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const status = order.status || "pending";
                                  let badgeClass = "bg-gray-100 text-gray-800";
                                  let statusText = status;
                                  
                                  switch (status) {
                                    case 'pending':
                                      badgeClass = "bg-yellow-100 text-yellow-800";
                                      statusText = "pending";
                                      break;
                                    case 'processing':
                                      badgeClass = "bg-blue-100 text-blue-800";
                                      statusText = "processing";
                                      break;
                                    case 'shipped':
                                      badgeClass = "bg-purple-100 text-purple-800";
                                      statusText = "shipped";
                                      break;
                                    case 'delivered':
                                      badgeClass = "bg-green-100 text-green-800";
                                      statusText = "delivered";
                                      break;
                                    case 'cancelled':
                                      badgeClass = "bg-red-100 text-red-800";
                                      statusText = "cancelled";
                                      break;
                                  }
                                  
                                  return <Badge className={badgeClass}>{statusText}</Badge>;
                                })()}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {Array.isArray(order.items) 
                                    ? `${order.items.length} товаров`
                                    : 'Товары недоступны'
                                  }
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Customer Analytics */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Аналитика клиента</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Средний чек</div>
                      <div className="text-lg font-bold">
                        {customerStats.totalOrders > 0 
                          ? formatPrice(customerStats.totalSpent / customerStats.totalOrders)
                          : formatPrice(0)
                        }
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Конверсия</div>
                      <div className="text-lg font-bold">
                        {customerStats.totalOrders > 0 
                          ? `${Math.round((customerStats.completedOrders / customerStats.totalOrders) * 100)}%`
                          : '0%'
                        }
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Последний заказ</div>
                      <div className="text-lg font-bold">
                        {customerStats.lastOrderDate 
                          ? formatDate(customerStats.lastOrderDate)
                          : 'Нет заказов'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
