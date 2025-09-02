import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  DollarSign,
  Eye,
  TrendingUp,
  Activity,
  Star,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Category, Order, User } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

// Navigation items
const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
  { id: 'products', label: 'Товары', icon: Package, color: 'text-green-600' },
  { id: 'orders', label: 'Заказы', icon: ShoppingCart, color: 'text-orange-600' },
  { id: 'customers', label: 'Клиенты', icon: Users, color: 'text-purple-600' },
  { id: 'blog', label: 'Блог', icon: FileText, color: 'text-pink-600' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3, color: 'text-indigo-600' },
  { id: 'settings', label: 'Настройки', icon: Settings, color: 'text-gray-600' },
];

// Products Manager Component
function ProductsManager() {
  const { toast } = useToast();
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const productForm = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: { ru: "", hy: "", en: "" },
      description: { ru: "", hy: "", en: "" },
      price: "0",
      categoryId: "",
      imageUrl: "",
      images: [],
      isActive: true,
      sortOrder: 0
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsProductDialogOpen(false);
      setLocalPreviews([]);
      setUploadedImages([]);
      productForm.reset();
      toast({
        title: "Успех",
        description: "Товар успешно создан",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать товар",
        variant: "destructive",
      });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      setLocalPreviews([]);
      setUploadedImages([]);
      productForm.reset();
      toast({
        title: "Успех",
        description: "Товар успешно обновлен",
      });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Успех",
        description: "Товар успешно удален",
      });
    }
  });

  const handleSubmit = (data: any) => {
    // Convert Google Cloud Storage URLs to object paths for database storage
    const convertedImages = uploadedImages.map(url => {
      if (url.startsWith('https://storage.googleapis.com/')) {
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/');
          if (pathParts.length >= 3) {
            return `/objects/${pathParts.slice(2).join('/')}`;
          }
        } catch (error) {
          console.error("Error converting URL for storage:", error);
        }
      }
      return url;
    });

    // Merge uploaded images with form data
    const submitData = {
      ...data,
      images: convertedImages.length > 0 ? convertedImages : (data.images || [])
    };
    
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: submitData });
    } else {
      createProductMutation.mutate(submitData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setLocalPreviews([]);
    setUploadedImages(product.images || []);
    
    productForm.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl,
      images: product.images || [],
      isActive: product.isActive,
      sortOrder: product.sortOrder
    });
    setIsProductDialogOpen(true);
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleFilesAdded = (previews: string[]) => {
    // Add local previews immediately when files are selected
    setLocalPreviews(prev => [...prev, ...previews]);
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const newImageUrls = result.successful.map(file => {
      const uploadURL = file.uploadURL as string;
      console.log('Upload URL:', uploadURL); // Debug log
      
      // Use Google Cloud Storage URL for preview (remove query params for GET access)
      try {
        const urlObj = new URL(uploadURL);
        // Remove query parameters to get basic object URL that might be publicly accessible
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
        console.log('Base URL for preview:', baseUrl);
        return baseUrl;
      } catch (error) {
        console.error('Error processing URL:', error);
        return uploadURL;
      }
    });
    
    // Replace local previews with uploaded URLs
    setLocalPreviews([]);
    setUploadedImages(prev => [...prev, ...newImageUrls]);
    
    toast({
      title: "Успех",
      description: `Загружено ${newImageUrls.length} изображений`,
    });
  };

  const removeImage = (index: number) => {
    const totalPreviews = localPreviews.length;
    if (index < totalPreviews) {
      // Remove from local previews
      setLocalPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // Remove from uploaded images
      const uploadedIndex = index - totalPreviews;
      setUploadedImages(prev => prev.filter((_, i) => i !== uploadedIndex));
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот товар?")) {
      deleteProductMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Управление товарами</h1>
          <p className="text-muted-foreground mt-2">Добавляйте и редактируйте товары в каталоге</p>
        </div>
        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-blue-600"
              onClick={() => {
                setEditingProduct(null);
                setUploadedImages([]);
                setLocalPreviews([]);
                productForm.reset({
                  name: { ru: "", hy: "", en: "" },
                  description: { ru: "", hy: "", en: "" },
                  price: "0",
                  categoryId: "",
                  imageUrl: "",
                  images: [],
                  isActive: true,
                  sortOrder: 0
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить товар
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Редактировать товар" : "Добавить товар"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct 
                  ? "Внесите изменения в информацию о товаре" 
                  : "Заполните информацию для нового товара"}
              </DialogDescription>
            </DialogHeader>
            <Form {...productForm}>
              <form onSubmit={productForm.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={productForm.control}
                    name="name.ru"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название (RU)</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={productForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Цена</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите категорию" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {(category.name as any)?.ru || category.id}
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
                      <FormLabel>URL основного изображения</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Галерея изображений (6-10 фото)</FormLabel>
                    <ObjectUploader
                      maxNumberOfFiles={10}
                      maxFileSize={5242880} // 5MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      onFilesAdded={handleFilesAdded}
                      buttonClassName="bg-blue-500 hover:bg-blue-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Загрузить изображения
                    </ObjectUploader>
                  </div>

                  {/* Image Preview Grid */}
                  {(localPreviews.length > 0 || uploadedImages.length > 0) && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      {/* Local previews (shown immediately after file selection) */}
                      {localPreviews.map((preview, index) => (
                        <div key={`preview-${index}`} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded border border-blue-300"
                          />
                          <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                            Локальный
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {/* Uploaded images */}
                      {uploadedImages.map((imageUrl, index) => (
                        <div key={`uploaded-${index}`} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-24 object-cover rounded border border-green-300"
                            onError={(e) => {
                              console.error('Failed to load image:', imageUrl);
                              // Show placeholder on error
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden absolute inset-0 bg-gray-200 rounded border border-green-300 flex items-center justify-center text-sm text-gray-500">
                            Изображение загружено
                            <br />
                            (не удается отобразить)
                          </div>
                          <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                            Загружено
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(localPreviews.length + index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(localPreviews.length + uploadedImages.length) < 6 && (
                    <p className="text-sm text-amber-600">
                      Рекомендуется загрузить минимум 6 изображений для лучшего представления товара
                    </p>
                  )}
                </div>

                <FormField
                  control={productForm.control}
                  name="description.ru"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание (RU)</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
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
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {editingProduct ? "Обновить" : "Создать"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Изображение</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Товары не найдены
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {(product.images && product.images.length > 0) ? (
                        <img 
                          src={product.images[0]} 
                          alt={(product.name as any)?.ru || "Product"} 
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={(product.name as any)?.ru || "Product"} 
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{(product.name as any)?.ru}</p>
                        <p className="text-sm text-muted-foreground">{product.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {categories.find(c => c.id === product.categoryId)?.name?.ru || "—"}
                    </TableCell>
                    <TableCell>₽{Number(product.price).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Активен" : "Неактивен"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
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
    </div>
  );
}

// Dashboard stats component
function DashboardStats() {
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: orders } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const stats = [
    {
      title: "Всего товаров",
      value: products?.length || 0,
      icon: Package,
      color: "bg-blue-500",
      change: "+12%"
    },
    {
      title: "Заказы сегодня", 
      value: orders?.filter(o => {
        const today = new Date();
        const orderDate = new Date(o.createdAt);
        return orderDate.toDateString() === today.toDateString();
      }).length || 0,
      icon: ShoppingCart,
      color: "bg-green-500",
      change: "+8%"
    },
    {
      title: "Категории",
      value: categories?.length || 0,
      icon: Star,
      color: "bg-purple-500",
      change: "+23%"
    },
    {
      title: "Доход за месяц",
      value: `₽${orders?.reduce((sum, order) => sum + Number(order.totalAmount), 0).toLocaleString() || 0}`,
      icon: DollarSign,
      color: "bg-orange-500",
      change: "+18%"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-green-600 bg-green-50">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stat.change}
                  </Badge>
                </div>
              </div>
              <div className={`${stat.color} p-3 rounded-full text-white`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== 'admin')) {
      toast({
        title: "Доступ запрещен",
        description: "Требуются права администратора. Перенаправление на вход...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading || !isAuthenticated || (user as any)?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Загрузка админ панели...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-2">Добро пожаловать в панель управления ФотоКрафт</p>
            </div>
            <DashboardStats />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Последние заказы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Заказ #00{i}</p>
                          <p className="text-sm text-muted-foreground">₽{(2500 + i * 500).toLocaleString()}</p>
                        </div>
                        <Badge variant="outline">Новый</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Популярные товары
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["Фотокнига Premium", "Рамка для фото", "Фотосувенир"].map((product, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{product}</p>
                          <p className="text-sm text-muted-foreground">{15 - i * 2} продаж</p>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'products':
        return <ProductsManager />;
      case 'blog':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Блог</h1>
                <p className="text-muted-foreground mt-2">Создавайте и управляйте статьями блога</p>
              </div>
              <Button className="bg-gradient-to-r from-green-500 to-green-600">
                <FileText className="h-4 w-4 mr-2" />
                Новая статья
              </Button>
            </div>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground py-8">Система блога будет здесь</p>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">Раздел в разработке</h1>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground py-8">Этот раздел скоро будет доступен</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg border-r border-gray-200 min-h-screen">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">ФотоКрафт</h2>
            <p className="text-sm text-gray-500 mt-1">CRM Панель</p>
          </div>
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                  activeSection === item.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", activeSection === item.id ? "text-blue-600" : item.color)} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200 mt-auto">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {(user as any)?.firstName?.[0] || 'A'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{(user as any)?.firstName || 'Admin'}</p>
                <p className="text-xs text-gray-500">Администратор</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}