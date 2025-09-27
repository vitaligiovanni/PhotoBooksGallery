import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Save, Trash2, Edit, Calculator } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export function CostEditForm() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<any>(null);

  const { data: costs = [] } = useQuery<any[]>({ 
    queryKey: ["/api/admin/costs"] 
  });

  const costForm = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Название обязательно"),
      description: z.string().optional(),
      amount: z.number().min(0.01, "Сумма должна быть больше 0"),
      category: z.string().min(1, "Категория обязательна"),
      type: z.enum(['fixed', 'variable']).default('fixed'),
      frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
      isActive: z.boolean().default(true),
    })),
    defaultValues: {
      name: "",
      description: "",
      amount: 0,
      category: "",
      type: "fixed",
      frequency: "monthly",
      isActive: true,
    }
  });

  const createCostMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/costs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/costs"] });
      setIsCreateDialogOpen(false);
      costForm.reset();
      toast({
        title: "Успех",
        description: "Расход создан",
      });
    }
  });

  const updateCostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/admin/costs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/costs"] });
      setIsCreateDialogOpen(false);
      setEditingCost(null);
      costForm.reset();
      toast({
        title: "Успех",
        description: "Расход обновлен",
      });
    }
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/costs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/costs"] });
      toast({
        title: "Успех",
        description: "Расход удален",
      });
    }
  });

  const toggleCostStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/costs/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/costs"] });
      toast({
        title: "Успех",
        description: "Статус расхода изменен",
      });
    }
  });

  const handleSubmit = async (data: any) => {
    if (editingCost) {
      updateCostMutation.mutate({ id: editingCost.id, data });
    } else {
      createCostMutation.mutate(data);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const formatFrequency = (frequency: string) => {
    const frequencies = {
      once: 'Однократно',
      daily: 'Ежедневно',
      weekly: 'Еженедельно',
      monthly: 'Ежемесячно',
      yearly: 'Ежегодно'
    };
    return frequencies[frequency as keyof typeof frequencies] || frequency;
  };

  const calculateAnnualCost = (cost: any) => {
    const multipliers = {
      once: 1,
      daily: 365,
      weekly: 52,
      monthly: 12,
      yearly: 1
    };
    return cost.amount * (multipliers[cost.frequency as keyof typeof multipliers] || 1);
  };

  const totalAnnualCost = costs.reduce((total, cost) => {
    if (cost.isActive) {
      return total + calculateAnnualCost(cost);
    }
    return total;
  }, 0);

  const categories = Array.from(new Set(costs.map(cost => cost.category)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Управление расходами</h1>
          <p className="text-muted-foreground mt-2">Учет постоянных и переменных расходов бизнеса</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новый расход
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего расходов</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAnnualCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              годовые расходы
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные расходы</CardTitle>
            <Calculator className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costs.filter(c => c.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              активных статей
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Категории</CardTitle>
            <Calculator className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.length}
            </div>
            <p className="text-xs text-muted-foreground">
              различных категорий
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Costs Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Список расходов ({costs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {costs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Расходы не найдены</p>
              <p className="text-sm">Добавьте первую статью расходов</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Частота</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Годовые</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map((cost) => (
                    <TableRow key={cost.id} className={!cost.isActive ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cost.name}</p>
                          {cost.description && (
                            <p className="text-sm text-muted-foreground">
                              {cost.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{cost.category}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {cost.type === 'fixed' ? 'Постоянный' : 'Переменный'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatFrequency(cost.frequency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(cost.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {formatCurrency(calculateAnnualCost(cost))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          cost.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cost.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCost(cost);
                              costForm.reset(cost);
                              setIsCreateDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCostStatusMutation.mutate({ 
                              id: cost.id, 
                              isActive: !cost.isActive 
                            })}
                            disabled={toggleCostStatusMutation.isPending}
                          >
                            {cost.isActive ? 'Деакт.' : 'Акт.'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCostMutation.mutate(cost.id)}
                            disabled={deleteCostMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Cost Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingCost(null);
          costForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCost ? 'Редактирование расхода' : 'Создание нового расхода'}
            </DialogTitle>
            <DialogDescription>
              {editingCost ? 'Внесите изменения в статью расходов' : 'Заполните информацию о новом расходе'}
            </DialogDescription>
          </DialogHeader>
          <Form {...costForm}>
            <form onSubmit={costForm.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={costForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Например: Аренда офиса" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={costForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Дополнительная информация о расходе" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={costForm.control}
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
                control={costForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Например: Аренда, Зарплаты, Маркетинг" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={costForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тип расхода</FormLabel>
                      <select
                        {...field}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="fixed">Постоянный</option>
                        <option value="variable">Переменный</option>
                      </select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={costForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Частота</FormLabel>
                      <select
                        {...field}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="once">Однократно</option>
                        <option value="daily">Ежедневно</option>
                        <option value="weekly">Еженедельно</option>
                        <option value="monthly">Ежемесячно</option>
                        <option value="yearly">Ежегодно</option>
                      </select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={costForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4"
                      />
                    </FormControl>
                    <FormLabel className="text-sm">
                      Активная статья расходов
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingCost(null);
                    costForm.reset();
                  }}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={createCostMutation.isPending || updateCostMutation.isPending}
                >
                  {editingCost 
                    ? (updateCostMutation.isPending ? 'Обновление...' : 'Обновить расход')
                    : (createCostMutation.isPending ? 'Создание...' : 'Создать расход')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
