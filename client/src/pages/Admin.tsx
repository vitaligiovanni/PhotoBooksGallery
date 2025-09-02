import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema, insertCategorySchema } from "@shared/schema";
import { Plus, Edit, Trash2, Users, Package, ShoppingCart, DollarSign } from "lucide-react";
import { useEffect } from "react";
import type { Product, Category, Order, User } from "@shared/schema";
import type { LocalizedText } from "@/types";

export default function Admin() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== 'admin')) {
      toast({
        title: "Access Denied",
        description: "Admin access required. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Queries
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  // Product form
  const productForm = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: { ru: '', hy: '', en: '' },
      description: { ru: '', hy: '', en: '' },
      price: '',
      imageUrl: '',
      categoryId: '',
      options: {},
      isActive: true as boolean,
      sortOrder: 0,
    },
  });

  // Category form
  const categoryForm = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: { ru: '', hy: '', en: '' },
      description: { ru: '', hy: '', en: '' },
      slug: '',
      imageUrl: '',
      sortOrder: 0,
    },
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsProductDialogOpen(false);
      productForm.reset();
      toast({ title: "Товар создан", description: "Товар успешно добавлен в каталог" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать товар", variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => 
      await apiRequest('PUT', `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      productForm.reset();
      toast({ title: "Товар обновлен", description: "Изменения сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить товар", variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest('DELETE', `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Товар удален", description: "Товар удален из каталога" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить товар", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => await apiRequest('POST', '/api/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
      toast({ title: "Категория создана", description: "Категория успешно добавлена" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать категорию", variant: "destructive" });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => 
      await apiRequest('PUT', `/api/orders/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Статус обновлен", description: "Статус заказа изменен" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    },
  });

  // Event handlers
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    productForm.reset({
      name: product.name as LocalizedText,
      description: product.description as LocalizedText,
      price: product.price,
      imageUrl: product.imageUrl || '',
      categoryId: product.categoryId || '',
      options: product.options || {},
      isActive: product.isActive ?? true,
      sortOrder: product.sortOrder || 0,
    });
    setIsProductDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name as LocalizedText,
      description: category.description as LocalizedText,
      slug: category.slug,
      imageUrl: category.imageUrl || '',
      sortOrder: category.sortOrder || 0,
    });
    setIsCategoryDialogOpen(true);
  };

  const onProductSubmit = (data: any) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const onCategorySubmit = (data: any) => {
    if (editingCategory) {
      // Update category logic would go here
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Stats calculations
  const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0) || 0;
  const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-4" data-testid="text-admin-title">
            {t('adminPanel')}
          </h1>
          <p className="text-muted-foreground text-lg">
            Управление товарами, заказами и пользователями
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Всего товаров</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-total-products">
                    {products?.length || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Заказов в обработке</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-pending-orders">
                    {pendingOrders}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Общий доход</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-total-revenue">
                    ₽{totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Категорий</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-total-categories">
                    {categories?.length || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products" data-testid="tab-products">{t('manageProducts')}</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">{t('manageOrders')}</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">Категории</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Управление товарами</h2>
              <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingProduct(null);
                      productForm.reset();
                    }}
                    data-testid="button-add-product"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить товар
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...productForm}>
                    <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={productForm.control}
                          name="name.ru"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название (RU)</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-product-name-ru" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="name.hy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название (HY)</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-product-name-hy" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="name.en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название (EN)</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-product-name-en" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={productForm.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Цена</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-product-price" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Категория</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-product-category">
                                    <SelectValue placeholder="Выберите категорию" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories?.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {(category.name as LocalizedText)?.ru || category.slug}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={productForm.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL изображения</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-product-image" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={productForm.control}
                        name="description.ru"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Описание (RU)</FormLabel>
                            <FormControl>
                              <Textarea {...field} data-testid="input-product-description-ru" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsProductDialogOpen(false)}
                          data-testid="button-cancel-product"
                        >
                          Отмена
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createProductMutation.isPending || updateProductMutation.isPending}
                          data-testid="button-save-product"
                        >
                          {editingProduct ? 'Обновить' : 'Создать'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      products?.map((product) => (
                        <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                          <TableCell className="font-medium">
                            {(product.name as LocalizedText)?.ru || 'Untitled'}
                          </TableCell>
                          <TableCell>
                            {categories?.find(c => c.id === product.categoryId)?.slug || 'N/A'}
                          </TableCell>
                          <TableCell>₽{Number(product.price).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={product.isActive ? "default" : "secondary"}>
                              {product.isActive ? 'Активен' : 'Неактивен'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditProduct(product)}
                                data-testid={`button-edit-product-${product.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => deleteProductMutation.mutate(product.id)}
                                data-testid={`button-delete-product-${product.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <h2 className="text-2xl font-semibold">Управление заказами</h2>
            
            <Card>
              <CardContent className="p-0">
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
                    {ordersLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      orders?.map((order) => (
                        <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                          <TableCell className="font-mono text-sm">
                            {order.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>₽{Number(order.totalAmount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Select 
                              value={order.status || 'pending'} 
                              onValueChange={(status) => updateOrderMutation.mutate({ id: order.id, status })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Ожидает</SelectItem>
                                <SelectItem value="processing">В обработке</SelectItem>
                                <SelectItem value="shipped">Отправлен</SelectItem>
                                <SelectItem value="delivered">Доставлен</SelectItem>
                                <SelectItem value="cancelled">Отменен</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {new Date(order.createdAt!).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" data-testid={`button-view-order-${order.id}`}>
                              Подробнее
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Управление категориями</h2>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingCategory(null);
                      categoryForm.reset();
                    }}
                    data-testid="button-add-category"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить категорию
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...categoryForm}>
                    <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={categoryForm.control}
                          name="name.ru"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название (RU)</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-category-name-ru" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="name.hy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название (HY)</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-category-name-hy" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={categoryForm.control}
                          name="name.en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название (EN)</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-category-name-en" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={categoryForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-category-slug" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCategoryDialogOpen(false)}
                          data-testid="button-cancel-category"
                        >
                          Отмена
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createCategoryMutation.isPending}
                          data-testid="button-save-category"
                        >
                          {editingCategory ? 'Обновить' : 'Создать'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Порядок</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriesLoading ? (
                      [...Array(4)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      categories?.map((category) => (
                        <TableRow key={category.id} data-testid={`category-row-${category.id}`}>
                          <TableCell className="font-medium">
                            {(category.name as LocalizedText)?.ru || category.slug}
                          </TableCell>
                          <TableCell>{category.slug}</TableCell>
                          <TableCell>{category.sortOrder}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditCategory(category)}
                                data-testid={`button-edit-category-${category.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                data-testid={`button-delete-category-${category.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
