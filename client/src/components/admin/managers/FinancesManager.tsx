import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Download, Filter, Calendar, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export function FinancesManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('month');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const { data: transactions = [] } = useQuery<any[]>({ 
    queryKey: ["/api/admin/finances"] 
  });

  const { data: stats } = useQuery<any>({ 
    queryKey: ["/api/admin/finances/stats", dateFilter] 
  });

  const transactionForm = useForm({
    resolver: zodResolver(z.object({
      type: z.enum(['income', 'expense']),
      amount: z.number().min(0.01, "Сумма должна быть больше 0"),
      description: z.string().min(1, "Описание обязательно"),
      category: z.string().min(1, "Категория обязательна"),
      date: z.string().min(1, "Дата обязательна"),
      reference: z.string().optional(),
    })),
    defaultValues: {
      type: "income",
      amount: 0,
      description: "",
      category: "",
      date: new Date().toISOString().split('T')[0],
      reference: "",
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/finances", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finances/stats"] });
      setIsCreateDialogOpen(false);
      transactionForm.reset();
      toast({
        title: "Успех",
        description: "Транзакция создана",
      });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/finances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/finances/stats"] });
      toast({
        title: "Успех",
        description: "Транзакция удалена",
      });
    }
  });

  const handleSubmit = async (data: any) => {
    createTransactionMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getTransactionTypeBadge = (type: string) => {
    return type === 'income' 
      ? <Badge className="bg-green-100 text-green-800">income</Badge>
      : <Badge className="bg-red-100 text-red-800">expense</Badge>;
  };

  const exportToCSV = () => {
    const headers = ['Дата', 'Тип', 'Категория', 'Описание', 'Сумма', 'Референс'];
    const csvData = transactions.map(t => [
      formatDate(t.date),
      t.type === 'income' ? 'Доход' : 'Расход',
      t.category,
      t.description,
      t.amount,
      t.reference || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `финансы_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Финансы</h1>
          <p className="text-muted-foreground mt-2">Управление доходами и расходами</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Новая операция
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                за выбранный период
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Общие расходы</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpense || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                за выбранный период
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Чистая прибыль</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (stats.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(stats.netProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                доходы минус расходы
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Операций</CardTitle>
              <Filter className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.transactionCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                всего операций
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Filter */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Период
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant={dateFilter === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('day')}
            >
              Сегодня
            </Button>
            <Button
              variant={dateFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('week')}
            >
              Неделя
            </Button>
            <Button
              variant={dateFilter === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('month')}
            >
              Месяц
            </Button>
            <Button
              variant={dateFilter === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('year')}
            >
              Год
            </Button>
            <Button
              variant={dateFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('all')}
            >
              Все время
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>История операций</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Операции не найдены</p>
              <p className="text-sm">Добавьте первую финансовую операцию</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Референс</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <span className="text-sm">
                          {formatDate(transaction.date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getTransactionTypeBadge(transaction.type)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {transaction.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {transaction.description}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(transaction.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {transaction.reference || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                          disabled={deleteTransactionMutation.isPending}
                        >
                          Удалить
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

      {/* Create Transaction Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Новая финансовая операция</DialogTitle>
            <DialogDescription>
              Добавьте информацию о доходе или расходе
            </DialogDescription>
          </DialogHeader>
          <Form {...transactionForm}>
            <form onSubmit={transactionForm.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={transactionForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип операции *</FormLabel>
                    <select
                      {...field}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="income">Доход</option>
                      <option value="expense">Расход</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transactionForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сумма *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transactionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Описание операции" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transactionForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Например: Продажи, Реклама, Аренда" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transactionForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={transactionForm.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Референс (необязательно)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Номер счета, ссылка и т.д." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createTransactionMutation.isPending}
                >
                  {createTransactionMutation.isPending ? 'Создание...' : 'Создать операцию'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
