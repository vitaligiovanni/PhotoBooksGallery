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
  Trash2,
  Tag
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProductSchema, insertBlogPostSchema, insertBlogCategorySchema, insertCategorySchema, PHOTOBOOK_SIZES, PHOTOBOOK_FORMAT_LABELS, calculateAdditionalSpreadPrice, formatPhotobookSize } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Category, Order, User, PhotobookFormat, BlogPost, BlogCategory } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { CurrencySettings } from "./CurrencySettings";
import type { UploadResult } from "@uppy/core";

// Navigation items
const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
  { id: 'categories', label: 'Категории', icon: Tag, color: 'text-teal-600' },
  { id: 'products', label: 'Товары', icon: Package, color: 'text-green-600' },
  { id: 'orders', label: 'Заказы', icon: ShoppingCart, color: 'text-orange-600' },
  { id: 'customers', label: 'Клиенты', icon: Users, color: 'text-purple-600' },
  { id: 'reviews', label: 'Отзывы', icon: Star, color: 'text-yellow-600' },
  { id: 'blog', label: 'Блог', icon: FileText, color: 'text-pink-600' },
  { id: 'currencies', label: 'Валюты', icon: DollarSign, color: 'text-emerald-600' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3, color: 'text-indigo-600' },
  { id: 'settings', label: 'Настройки', icon: Settings, color: 'text-gray-600' },
];

// Categories Manager Component
function CategoriesManager() {
  const { toast } = useToast();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const categoryForm = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: { ru: "", hy: "", en: "" },
      slug: "",
      description: { ru: "", hy: "", en: "" },
      imageUrl: "",
      sortOrder: 0
    }
  });

  // Предзаполнение формы при редактировании
  useEffect(() => {
    if (editingCategory) {
      categoryForm.reset({
        name: editingCategory.name || { ru: "", hy: "", en: "" },
        slug: editingCategory.slug || "",
        description: editingCategory.description || { ru: "", hy: "", en: "" },
        imageUrl: editingCategory.imageUrl || "",
        sortOrder: editingCategory.sortOrder || 0
      });
    } else {
      categoryForm.reset({
        name: { ru: "", hy: "", en: "" },
        slug: "",
        description: { ru: "", hy: "", en: "" },
        imageUrl: "",
        sortOrder: 0
      });
    }
  }, [editingCategory, categoryForm]);

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCategory) {
        return await apiRequest("PUT", `/api/categories/${editingCategory.id}`, data);
      } else {
        return await apiRequest("POST", "/api/categories", data);
      }
    },
    onSuccess: () => {
      const wasEditing = !!editingCategory;
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: "Успех",
        description: wasEditing ? "Категория успешно обновлена" : "Категория успешно создана",
      });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Успех",
        description: "Категория удалена",
      });
    }
  });

  const handleCategorySubmit = async (data: any) => {
    console.log("Submitting category data:", data);
    
    let imageUrl = data.imageUrl || "";
    
    // Если это Google Storage URL, сохраним его как есть пока
    if (imageUrl.startsWith('https://storage.googleapis.com/')) {
      console.log("Saving Google Storage URL directly:", imageUrl);
    }
    
    const categoryData = {
      ...data,
      imageUrl: imageUrl
    };
    
    console.log("Final category data:", categoryData);
    createCategoryMutation.mutate(categoryData);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту категорию? Все товары в ней останутся без категории.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Категории товаров</h1>
          <p className="text-muted-foreground mt-2">Управляйте категориями фотопродуктов</p>
        </div>
        <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
          setIsCategoryDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-teal-500 to-teal-600"
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryDialogOpen(true);
              }}
              data-testid="button-add-category"
            >
              <Plus className="h-4 w-4 mr-2" />
              Новая категория
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Редактировать категорию" : "Добавить категорию"}</DialogTitle>
              <DialogDescription>
                {editingCategory ? "Внесите изменения в категорию" : "Создайте новую категорию для фотопродуктов"}
              </DialogDescription>
            </DialogHeader>
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={categoryForm.control}
                    name="name.ru"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название (RU)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Фотокниги" data-testid="input-name-ru" />
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
                          <Input {...field} placeholder="Լուսանկարային գրքեր" data-testid="input-name-hy" />
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
                          <Input {...field} placeholder="Photobooks" data-testid="input-name-en" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={categoryForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL (slug)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="photobooks" data-testid="input-slug" />
                        </FormControl>
                        <FormDescription>Будет использоваться в адресе страницы</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={categoryForm.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Порядок сортировки</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="0"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-sort-order"
                          />
                        </FormControl>
                        <FormDescription>Меньшие числа отображаются раньше</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={categoryForm.control}
                    name="description.ru"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание (RU)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Красивые фотокниги для ваших воспоминаний" data-testid="textarea-description-ru" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={categoryForm.control}
                    name="description.hy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание (HY)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Գեղեցիկ լուսանկարային գրքեր ձեր հիշողությունների համար" data-testid="textarea-description-hy" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={categoryForm.control}
                    name="description.en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание (EN)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Beautiful photobooks for your memories" data-testid="textarea-description-en" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={categoryForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Изображение категории</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {field.value && (
                            <div className="flex items-center gap-2 p-2 border rounded">
                              <img 
                                src={field.value} 
                                alt="Preview" 
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => {
                                  console.log('Preview image load error for:', field.value);
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <span className="text-sm text-muted-foreground flex-1">
                                Изображение загружено
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => field.onChange("")}
                                data-testid="button-remove-image"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={5242880} // 5MB
                            onGetUploadParameters={async () => {
                              try {
                                const response = await fetch("/api/objects/upload", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                });
                                
                                if (!response.ok) {
                                  throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                
                                const data = await response.json();
                                return {
                                  method: "PUT" as const,
                                  url: data.uploadURL,
                                };
                              } catch (error) {
                                console.error("Error getting upload URL:", error);
                                throw error;
                              }
                            }}
                            onComplete={(result) => {
                              console.log("Full upload result:", result);
                              if (result.successful && result.successful.length > 0) {
                                const uploadedFile = result.successful[0];
                                console.log("Uploaded file details:", uploadedFile);
                                
                                // Просто сохраняем URL загрузки как есть
                                const uploadURL = uploadedFile.uploadURL;
                                console.log("Setting uploadURL:", uploadURL);
                                
                                if (uploadURL) {
                                  field.onChange(uploadURL);
                                }
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Загрузить изображение
                            </div>
                          </ObjectUploader>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2">
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
                    {createCategoryMutation.isPending 
                      ? "Сохранение..." 
                      : editingCategory ? "Обновить" : "Создать"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-teal-600" />
            Список категорий ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Пока нет категорий</p>
              <p className="text-sm">Создайте первую категорию для ваших фотопродуктов</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Изображение</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Порядок</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories
                    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                    .map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          {category.imageUrl ? (
                            <img 
                              src={category.imageUrl} 
                              alt={(category.name as any)?.ru || 'Категория'} 
                              className="w-12 h-12 object-cover rounded-lg border"
                              onError={(e) => {
                                console.log('Image load error for:', category.imageUrl);
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg border flex items-center justify-center">
                              <Tag className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{(category.name as any)?.ru || 'Без названия'}</p>
                            <p className="text-xs text-muted-foreground">
                              EN: {(category.name as any)?.en || 'N/A'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{category.slug}</code>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm text-muted-foreground truncate">
                              {(category.description as any)?.ru || 'Без описания'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{category.sortOrder || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                              data-testid={`button-edit-category-${category.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-category-${category.id}`}
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
    </div>
  );
}

// Blog Manager Component
function BlogManager() {
  const { toast } = useToast();
  const [isBlogPostDialogOpen, setIsBlogPostDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'categories'>('posts');

  const { data: blogPosts = [] } = useQuery<BlogPost[]>({ queryKey: ["/api/blog-posts"] });
  const { data: blogCategories = [] } = useQuery<BlogCategory[]>({ queryKey: ["/api/blog-categories"] });

  const blogPostForm = useForm({
    resolver: zodResolver(insertBlogPostSchema),
    defaultValues: {
      title: { ru: "", hy: "", en: "" },
      slug: "",
      excerpt: { ru: "", hy: "", en: "" },
      content: { ru: "", hy: "", en: "" },
      featuredImage: "",
      categoryId: "none",
      status: "published" as const,
      publishedAt: null,
      seoTitle: { ru: "", hy: "", en: "" },
      seoDescription: { ru: "", hy: "", en: "" },
      tags: []
    }
  });

  const categoryForm = useForm({
    resolver: zodResolver(insertBlogCategorySchema),
    defaultValues: {
      name: { ru: "", hy: "", en: "" },
      slug: "",
      description: { ru: "", hy: "", en: "" },
      color: "#6366f1",
      sortOrder: 0
    }
  });

  // Предзаполнение формы при редактировании
  useEffect(() => {
    if (editingPost) {
      blogPostForm.reset({
        title: editingPost.title || { ru: "", hy: "", en: "" },
        slug: editingPost.slug || "",
        excerpt: editingPost.excerpt || { ru: "", hy: "", en: "" },
        content: editingPost.content || { ru: "", hy: "", en: "" },
        featuredImage: editingPost.featuredImage || "",
        categoryId: editingPost.categoryId || "none",
        status: editingPost.status,
        publishedAt: editingPost.publishedAt,
        seoTitle: editingPost.seoTitle || { ru: "", hy: "", en: "" },
        seoDescription: editingPost.seoDescription || { ru: "", hy: "", en: "" },
        tags: editingPost.tags || []
      });
    } else {
      blogPostForm.reset({
        title: { ru: "", hy: "", en: "" },
        slug: "",
        excerpt: { ru: "", hy: "", en: "" },
        content: { ru: "", hy: "", en: "" },
        featuredImage: "",
        categoryId: "none",
        status: "published" as const,
        publishedAt: null,
        seoTitle: { ru: "", hy: "", en: "" },
        seoDescription: { ru: "", hy: "", en: "" },
        tags: []
      });
    }
  }, [editingPost, blogPostForm]);

  const createBlogPostMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingPost) {
        return await apiRequest("PUT", `/api/blog-posts/${editingPost.id}`, data);
      } else {
        return await apiRequest("POST", "/api/blog-posts", data);
      }
    },
    onSuccess: () => {
      const wasEditing = !!editingPost;
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      setIsBlogPostDialogOpen(false);
      setEditingPost(null);
      blogPostForm.reset();
      toast({
        title: "Успех",
        description: wasEditing ? "Статья блога успешно обновлена" : "Статья блога успешно создана",
      });
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/blog-categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog-categories"] });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
      toast({
        title: "Успех",
        description: "Категория блога успешно создана",
      });
    }
  });

  const deleteBlogPostMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/blog-posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      toast({
        title: "Успех",
        description: "Статья блога удалена",
      });
    }
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Не установлено";
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const handleBlogPostSubmit = async (data: any) => {
    if (editingPost) {
      // Update logic would go here
    } else {
      const postData = {
        ...data,
        // Если featuredImage это URL загрузки, нормализуем его
        featuredImage: data.featuredImage || ""
      };
      
      createBlogPostMutation.mutate(postData);
    }
  };

  const handleCategorySubmit = (data: any) => {
    if (editingCategory) {
      // Update logic would go here
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleDeletePost = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту статью?")) {
      deleteBlogPostMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Блог</h1>
          <p className="text-muted-foreground mt-2">Создавайте и управляйте статьями блога</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Новая категория
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить категорию</DialogTitle>
                <DialogDescription>
                  Создайте новую категорию для блога
                </DialogDescription>
              </DialogHeader>
              <Form {...categoryForm}>
                <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={categoryForm.control}
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
                      control={categoryForm.control}
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
                      control={categoryForm.control}
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
                  <FormField
                    control={categoryForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug (URL)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="category-slug" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="submit">Создать</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isBlogPostDialogOpen} onOpenChange={(open) => {
            setIsBlogPostDialogOpen(open);
            if (!open) {
              setEditingPost(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-green-500 to-green-600"
                onClick={() => {
                  setEditingPost(null);
                  setIsBlogPostDialogOpen(true);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Новая статья
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? "Редактировать статью" : "Добавить статью блога"}</DialogTitle>
                <DialogDescription>
                  {editingPost ? "Внесите изменения в статью блога" : "Заполните информацию для новой статьи блога"}
                </DialogDescription>
              </DialogHeader>
              <Form {...blogPostForm}>
                <form onSubmit={blogPostForm.handleSubmit(handleBlogPostSubmit)} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={blogPostForm.control}
                      name="title.ru"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Заголовок (RU)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={blogPostForm.control}
                      name="title.hy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Заголовок (HY)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={blogPostForm.control}
                      name="title.en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Заголовок (EN)</FormLabel>
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
                      control={blogPostForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug (URL)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="article-slug" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={blogPostForm.control}
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
                              <SelectItem value="none">Без категории</SelectItem>
                              {blogCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {(category.name as any)?.ru || 'Без названия'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={blogPostForm.control}
                      name="content.ru"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Содержание (RU)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={8} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={blogPostForm.control}
                      name="content.hy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Содержание (HY)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={8} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={blogPostForm.control}
                      name="content.en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Содержание (EN)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={8} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={blogPostForm.control}
                    name="featuredImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Изображение статьи</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {field.value && (
                              <div className="flex items-center gap-2 p-2 border rounded">
                                <img 
                                  src={field.value} 
                                  alt="Preview" 
                                  className="w-16 h-16 object-cover rounded"
                                />
                                <span className="text-sm text-muted-foreground flex-1">
                                  Изображение загружено
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => field.onChange("")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880} // 5MB
                              onGetUploadParameters={async () => {
                                try {
                                  console.log("Requesting upload URL...");
                                  const response = await fetch("/api/objects/upload", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                  });
                                  
                                  if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                  }
                                  
                                  const data = await response.json();
                                  console.log("Upload URL response:", data);
                                  return {
                                    method: "PUT" as const,
                                    url: data.uploadURL,
                                  };
                                } catch (error) {
                                  console.error("Error getting upload URL:", error);
                                  throw error;
                                }
                              }}
                              onComplete={(result) => {
                                console.log("Upload result:", result);
                                if (result.successful && result.successful.length > 0) {
                                  const uploadedFile = result.successful[0];
                                  console.log("Uploaded file:", uploadedFile);
                                  // Пробуем разные способы получить URL
                                  const uploadURL = uploadedFile.uploadURL || uploadedFile.response?.uploadURL || uploadedFile.meta?.uploadURL;
                                  console.log("Upload URL:", uploadURL);
                                  if (uploadURL) {
                                    field.onChange(uploadURL);
                                  }
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Загрузить изображение
                              </div>
                            </ObjectUploader>
                            
                            {/* Превью загруженного изображения */}
                            {field.value && (
                              <div className="mt-4 space-y-2">
                                <div className="text-sm text-muted-foreground">
                                  Загружено изображение:
                                </div>
                                <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                                  <img 
                                    src={field.value.startsWith('https://storage.googleapis.com/') 
                                      ? (() => {
                                          // Преобразуем Google Storage URL в локальный путь
                                          const url = new URL(field.value);
                                          const pathParts = url.pathname.split('/');
                                          // Находим .private/uploads и берем UUID после этого
                                          const privateIndex = pathParts.indexOf('.private');
                                          if (privateIndex >= 0 && pathParts[privateIndex + 1] === 'uploads') {
                                            const uuid = pathParts[privateIndex + 2];
                                            return `/objects/uploads/${uuid}`;
                                          }
                                          return field.value;
                                        })()
                                      : field.value
                                    }
                                    alt="Preview" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.log("Image load error:", e);
                                      // Показываем placeholder при ошибке
                                      e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMS41IDEyLjVIMjAuNVYxOS41SDExLjVWMTIuNVoiIGZpbGw9IiNEMUQ1REIiLz4KPC9zdmc+";
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => field.onChange("")}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={blogPostForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Статус</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Черновик</SelectItem>
                            <SelectItem value="published">Опубликовано</SelectItem>
                            <SelectItem value="scheduled">Запланировано</SelectItem>
                            <SelectItem value="archived">Архив</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsBlogPostDialogOpen(false);
                      setEditingPost(null);
                    }}>
                      Отмена
                    </Button>
                    <Button type="submit">{editingPost ? "Обновить статью" : "Создать статью"}</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex space-x-1 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={activeTab === 'posts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('posts')}
        >
          Статьи ({blogPosts.length})
        </Button>
        <Button
          variant={activeTab === 'categories' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('categories')}
        >
          Категории ({blogCategories.length})
        </Button>
      </div>
      
      {activeTab === 'posts' && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Статьи блога</CardTitle>
          </CardHeader>
          <CardContent>
            {blogPosts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Пока нет статей. Создайте первую статью!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blogPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {(post.title as any)?.ru || 'Без заголовка'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(post.excerpt as any)?.ru || 'Без описания'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Статус: {post.status}</span>
                        <span>Просмотры: {post.viewCount}</span>
                        <span>Создано: {formatDate(post.createdAt)}</span>
                        {post.publishedAt && (
                          <span>Опубликовано: {formatDate(post.publishedAt)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingPost(post);
                          setIsBlogPostDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {activeTab === 'categories' && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Категории блога</CardTitle>
          </CardHeader>
          <CardContent>
            {blogCategories.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Пока нет категорий. Создайте первую категорию!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {blogCategories.map((category) => (
                  <div key={category.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color || '#6366f1' }}
                      />
                      <h3 className="font-semibold">
                        {(category.name as any)?.ru || 'Без названия'}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {(category.description as any)?.ru || 'Без описания'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Slug: {category.slug}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Settings Manager Component
function SettingsManager() {
  const { toast } = useToast();
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('3000');

  // Load current setting
  const { data: settings = [] } = useQuery<any[]>({ 
    queryKey: ["/api/settings"] 
  });

  // Find free shipping threshold setting
  const shippingThreshold = settings.find(s => s.key === 'free_shipping_threshold');

  // Initialize form with current value
  useEffect(() => {
    if (shippingThreshold) {
      setFreeShippingThreshold(shippingThreshold.value);
    }
  }, [shippingThreshold]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      return await apiRequest("PUT", `/api/settings/${key}`, { value, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Успех",
        description: "Настройка обновлена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить настройку",
        variant: "destructive",
      });
    }
  });

  const handleSaveShippingThreshold = () => {
    updateSettingMutation.mutate({
      key: 'free_shipping_threshold',
      value: freeShippingThreshold,
      description: 'Минимальная сумма заказа для бесплатной доставки (в рублях)'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Настройки</h1>
        <p className="text-muted-foreground mt-2">Управление системными настройками</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки доставки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="shipping-threshold" className="text-sm font-medium">
              Лимит бесплатной доставки (₽)
            </label>
            <div className="flex gap-3">
              <input
                id="shipping-threshold"
                type="number"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3000"
              />
              <Button 
                onClick={handleSaveShippingThreshold}
                disabled={updateSettingMutation.isPending}
                data-testid="button-save-shipping-threshold"
              >
                {updateSettingMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Заказы на сумму от указанной отправляются бесплатно. Текущее значение: ₽{shippingThreshold?.value || '3000'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Reviews Manager Component  
function ReviewsManager() {
  const { toast } = useToast();
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);

  const { data: reviews = [] } = useQuery({ 
    queryKey: ["/api/admin/reviews", statusFilter === 'all' ? undefined : statusFilter] 
  });

  const reviewForm = useForm({
    resolver: zodResolver(z.object({
      authorName: z.string().min(1, "Имя автора обязательно"),
      authorEmail: z.string().email("Некорректный email").optional().or(z.literal("")),
      rating: z.number().min(1).max(5),
      comment: z.string().min(10, "Комментарий должен содержать минимум 10 символов"),
      gender: z.string().min(1, "Пол обязательно указать"),
      profilePhoto: z.string().optional(),
      sortOrder: z.number().default(0)
    })),
    defaultValues: {
      authorName: "",
      authorEmail: "",
      rating: 5,
      comment: "",
      gender: "male",
      profilePhoto: "",
      sortOrder: 0
    }
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PUT", `/api/admin/reviews/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({
        title: "Успех",
        description: "Отзыв одобрен",
      });
    }
  });

  const rejectReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PUT", `/api/admin/reviews/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({
        title: "Успех",
        description: "Отзыв отклонен",
      });
    }
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({
        title: "Успех",
        description: "Отзыв удален",
      });
    }
  });

  const createPromoReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      setIsPromoDialogOpen(false);
      reviewForm.reset();
      setProfilePreview(null); // Reset photo preview
      toast({
        title: "Успех",
        description: "Промо-отзыв создан",
      });
    }
  });

  const handlePromoSubmit = async (data: any) => {
    createPromoReviewMutation.mutate(data);
  };

  const handlePhotoUpload = async (file: File) => {
    console.log('[ADMIN] Starting photo upload process', { fileName: file.name, fileSize: file.size, fileType: file.type });
    setUploadingPhoto(true);
    try {
      // Get upload URL
      console.log('[ADMIN] Step 1: Getting upload URL...');
      const uploadResponseRaw = await apiRequest("POST", "/api/objects/upload");
      const uploadResponse = await uploadResponseRaw.json();
      console.log('[ADMIN] Upload URL response:', uploadResponse);
      const uploadURL = uploadResponse.uploadURL;
      
      if (!uploadURL) {
        console.error('[ADMIN] uploadURL is undefined in response:', uploadResponse);
        throw new Error('Upload URL not received from server');
      }

      // Upload the file
      console.log('[ADMIN] Step 2: Uploading file to:', uploadURL);
      const uploadResult = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      console.log('[ADMIN] Upload result:', { status: uploadResult.status, statusText: uploadResult.statusText, ok: uploadResult.ok });

      if (uploadResult.ok) {
        // Normalize the uploaded file path
        console.log('[ADMIN] Step 3: Normalizing path...');
        const rawPath = uploadURL.split('?')[0];
        console.log('[ADMIN] Raw path for normalization:', rawPath);
        
        const normalizeResponseRaw = await apiRequest("POST", "/api/objects/normalize", {
          rawPath: rawPath
        });
        const normalizeResponse = await normalizeResponseRaw.json();
        
        console.log('[ADMIN] Normalize response:', normalizeResponse);
        
        // Set profile photo in form with normalized path
        reviewForm.setValue('profilePhoto', normalizeResponse.normalizedPath);
        setProfilePreview(URL.createObjectURL(file));
        console.log('[ADMIN] Photo upload completed successfully!');
        toast({
          title: "Фото загружено!",
          description: "Фотография успешно загружена.",
        });
      } else {
        const errorText = await uploadResult.text();
        console.error('[ADMIN] Upload failed with details:', { status: uploadResult.status, statusText: uploadResult.statusText, errorText });
        throw new Error(`Upload failed with status: ${uploadResult.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('[ADMIN] Photo upload error:', error);
      console.error('[ADMIN] Error details:', { message: error.message, stack: error.stack });
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить фотографию: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handlePhotoUpload(file);
      }
    };
    input.click();
  };

  const getDefaultAvatar = (gender: string, name: string) => {
    const initial = name?.charAt(0)?.toUpperCase() || '?';
    const bgColor = gender === 'female' ? 'bg-pink-100' : gender === 'male' ? 'bg-blue-100' : 'bg-gray-100';
    const textColor = gender === 'female' ? 'text-pink-600' : gender === 'male' ? 'text-blue-600' : 'text-gray-600';
    
    return (
      <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center ${textColor} font-semibold text-lg`}>
        {initial}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Одобрен</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Отклонен</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">На модерации</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Отзывы</h1>
          <p className="text-muted-foreground mt-2">Управление отзывами и модерация</p>
        </div>
        <Button onClick={() => setIsPromoDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать промо-отзыв
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Управление отзывами
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все отзывы</SelectItem>
                <SelectItem value="pending">На модерации</SelectItem>
                <SelectItem value="approved">Одобренные</SelectItem>
                <SelectItem value="rejected">Отклоненные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Отзывов нет</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <Card key={review.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{review.authorName}</h4>
                          {review.isPromoted && (
                            <Badge variant="outline" className="text-xs">
                              Промо
                            </Badge>
                          )}
                        </div>
                        {review.authorEmail && (
                          <p className="text-sm text-muted-foreground">{review.authorEmail}</p>
                        )}
                        {renderStars(review.rating)}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(review.status)}
                        <div className="flex gap-1">
                          {review.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => approveReviewMutation.mutate(review.id)}
                              >
                                Одобрить
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => rejectReviewMutation.mutate(review.id)}
                              >
                                Отклонить
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => deleteReviewMutation.mutate(review.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm">{review.comment}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Создан: {new Date(review.createdAt).toLocaleDateString()}</span>
                      {review.sortOrder !== 0 && (
                        <span>Приоритет: {review.sortOrder}</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Создать промо-отзыв</DialogTitle>
            <DialogDescription>
              Создайте отзыв от имени администрации. Такой отзыв будет сразу одобрен.
            </DialogDescription>
          </DialogHeader>
          <Form {...reviewForm}>
            <form onSubmit={reviewForm.handleSubmit(handlePromoSubmit)} className="space-y-4">
              <FormField
                control={reviewForm.control}
                name="authorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя автора</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите имя автора отзыва" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={reviewForm.control}
                name="authorEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email автора (необязательно)</FormLabel>
                    <FormControl>
                      <Input placeholder="author@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={reviewForm.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Пол</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите пол" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Мужской</SelectItem>
                            <SelectItem value="female">Женский</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Фото профиля (необязательно)</FormLabel>
                  <div className="flex items-center gap-3">
                    {profilePreview || reviewForm.watch('profilePhoto') ? (
                      <div className="flex items-center gap-2">
                        <img 
                          src={profilePreview || reviewForm.watch('profilePhoto')} 
                          alt="Profile preview"
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfilePreview(null);
                            reviewForm.setValue('profilePhoto', '');
                          }}
                        >
                          Удалить
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {getDefaultAvatar(reviewForm.watch('gender') || 'male', reviewForm.watch('authorName') || '')}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePhotoSelect}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? "Загружается..." : "Загрузить фото"}
                        </Button>
                      </div>
                    )}
                  </div>
                </FormItem>
              </div>

              <FormField
                control={reviewForm.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Рейтинг</FormLabel>
                    <FormControl>
                      <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(Number(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <SelectItem key={rating} value={rating.toString()}>
                              <div className="flex items-center gap-2">
                                <span>{rating}</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3 w-3 ${
                                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={reviewForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Текст отзыва</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Напишите содержательный отзыв..."
                        className="min-h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={reviewForm.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Приоритет показа (чем выше, тем раньше отображается)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => {
                  setIsPromoDialogOpen(false);
                  setProfilePreview(null);
                  reviewForm.reset();
                }}>
                  Отмена
                </Button>
                <Button type="submit" disabled={createPromoReviewMutation.isPending}>
                  Создать отзыв
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Products Manager Component
function ProductsManager() {
  const { toast } = useToast();
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<PhotobookFormat | "none">("none");

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const productForm = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: { ru: "", hy: "", en: "" },
      description: { ru: "", hy: "", en: "" },
      price: "0",
      originalPrice: "",
      discountPercentage: 0,
      inStock: true,
      stockQuantity: 0,
      isOnSale: false,
      categoryId: "",
      imageUrl: "",
      images: [],
      photobookFormat: "",
      photobookSize: "",
      minSpreads: 10,
      additionalSpreadPrice: "0",
      paperType: "",
      coverMaterial: "",
      bindingType: "",
      productionTime: 7,
      shippingTime: 3,
      weight: "",
      allowCustomization: true,
      minCustomPrice: "",
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
      setSelectedFormat("");
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
      setSelectedFormat("");
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
    // uploadedImages already contains correct object paths, no need for conversion
    console.log('Submitting images:', uploadedImages); // Debug log
    
    // Convert "none" to null for photobook fields
    const cleanedData = {
      ...data,
      photobookFormat: data.photobookFormat === "none" ? null : data.photobookFormat,
      photobookSize: data.photobookSize === "none" ? null : data.photobookSize,
    };
    
    // Merge uploaded images with form data
    const submitData = {
      ...cleanedData,
      images: uploadedImages.length > 0 ? uploadedImages : (cleanedData.images || [])
    };
    
    console.log('Submit data:', submitData); // Debug log
    
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: submitData });
    } else {
      createProductMutation.mutate(submitData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Set existing images as previews so they are displayed
    setLocalPreviews(product.images || []);
    setUploadedImages(product.images || []);
    setSelectedFormat((product.photobookFormat as PhotobookFormat | "none") || "none");
    
    productForm.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl,
      images: product.images || [],
      photobookFormat: product.photobookFormat || "none",
      photobookSize: product.photobookSize || "none",
      minSpreads: product.minSpreads || 10,
      additionalSpreadPrice: product.additionalSpreadPrice || "0",
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
      
      // Convert to object path for database storage
      try {
        const urlObj = new URL(uploadURL);
        const pathParts = urlObj.pathname.split('/');
        if (pathParts.length >= 3) {
          const objectPath = `/objects/${pathParts.slice(2).join('/')}`;
          console.log('Object path for storage:', objectPath);
          return objectPath;
        }
      } catch (error) {
        console.error('Error processing URL:', error);
      }
      
      return uploadURL;
    });
    
    // Keep local previews for display, but store object paths for database
    setUploadedImages(prev => [...prev, ...newImageUrls]);
    
    toast({
      title: "Успех",
      description: `Загружено ${newImageUrls.length} изображений`,
    });
  };

  const removeImage = (index: number) => {
    // Remove local preview
    setLocalPreviews(prev => prev.filter((_, i) => i !== index));
    
    // Also remove corresponding uploaded image if it exists
    if (index < uploadedImages.length) {
      setUploadedImages(prev => prev.filter((_, i) => i !== index));
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
                setSelectedFormat("none");
                productForm.reset({
                  name: { ru: "", hy: "", en: "" },
                  description: { ru: "", hy: "", en: "" },
                  price: "0",
                  categoryId: "",
                  imageUrl: "",
                  images: [],
                  photobookFormat: "none",
                  photobookSize: "none",
                  minSpreads: 10,
                  additionalSpreadPrice: "0",
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
                        <FormLabel>Цена (за минимальное количество разворотов)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              // Auto-calculate additional spread price
                              const basePrice = parseFloat(e.target.value) || 0;
                              const additionalPrice = calculateAdditionalSpreadPrice(basePrice);
                              productForm.setValue("additionalSpreadPrice", additionalPrice.toString());
                            }}
                          />
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

                {/* Pricing and Availability Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Цены и наличие</h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={productForm.control}
                      name="originalPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Первоначальная цена (для скидки)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="discountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Процент скидки (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="stockQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Количество в наличии</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={productForm.control}
                      name="inStock"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Товар в наличии</FormLabel>
                            <FormDescription>
                              Отображается ли товар как доступный для заказа
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="isOnSale"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Товар по акции</FormLabel>
                            <FormDescription>
                              Отображается красный badge со скидкой
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Materials and Quality Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Материалы и качество</h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={productForm.control}
                      name="paperType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Тип бумаги</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите тип бумаги" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="matte">Матовая</SelectItem>
                              <SelectItem value="glossy">Глянцевая</SelectItem>
                              <SelectItem value="satin">Сатиновая</SelectItem>
                              <SelectItem value="premium">Премиум</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="coverMaterial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Материал обложки</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите материал" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hardcover">Твердая обложка</SelectItem>
                              <SelectItem value="softcover">Мягкая обложка</SelectItem>
                              <SelectItem value="leatherette">Кожзам</SelectItem>
                              <SelectItem value="fabric">Ткань</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="bindingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Тип переплета</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите переплет" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="spiral">Спираль</SelectItem>
                              <SelectItem value="perfect">Клеевой</SelectItem>
                              <SelectItem value="saddle-stitch">Скрепка</SelectItem>
                              <SelectItem value="ring">Кольца</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Production and Delivery Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Производство и доставка</h3>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <FormField
                      control={productForm.control}
                      name="productionTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Время изготовления (дни)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="shippingTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Время доставки (дни)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Вес (кг)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={productForm.control}
                      name="minCustomPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Мин. цена за кастом</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={productForm.control}
                    name="allowCustomization"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Разрешить кастомизацию</FormLabel>
                          <FormDescription>
                            Можно ли делать индивидуальные заказы этого товара
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Photobook Configuration Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Параметры фотокниги</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={productForm.control}
                      name="photobookFormat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Формат фотокниги</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedFormat(value as PhotobookFormat | "none");
                              // Reset size when format changes
                              productForm.setValue("photobookSize", "none");
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите формат" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Не фотокнига</SelectItem>
                              {Object.entries(PHOTOBOOK_FORMAT_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={productForm.control}
                      name="photobookSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Размер</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите размер" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedFormat && selectedFormat !== "none" && PHOTOBOOK_SIZES[selectedFormat]?.map((size) => (
                                <SelectItem key={formatPhotobookSize(size)} value={formatPhotobookSize(size)}>
                                  {size.label}
                                </SelectItem>
                              ))}
                              {(!selectedFormat || selectedFormat === "none") && (
                                <SelectItem value="disabled" disabled>
                                  Сначала выберите формат
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {selectedFormat && selectedFormat !== "none" && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={productForm.control}
                        name="minSpreads"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Минимальное количество разворотов</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="50" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseInt(e.target.value) || 10);
                                  // Auto-calculate additional spread price
                                  const basePrice = parseFloat(productForm.getValues("price")) || 0;
                                  const additionalPrice = calculateAdditionalSpreadPrice(basePrice);
                                  productForm.setValue("additionalSpreadPrice", additionalPrice.toString());
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={productForm.control}
                        name="additionalSpreadPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Цена за доп. разворот (автоматически: 10%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} readOnly className="bg-gray-50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
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
                  {localPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      {/* Show local previews with status indicator */}
                      {localPreviews.map((preview, index) => {
                        const isUploaded = index < uploadedImages.length;
                        return (
                          <div key={`preview-${index}`} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className={`w-full h-24 object-cover rounded border ${
                                isUploaded ? 'border-green-300' : 'border-blue-300'
                              }`}
                            />
                            <div className={`absolute top-1 left-1 text-white text-xs px-1 rounded ${
                              isUploaded ? 'bg-green-500' : 'bg-blue-500'
                            }`}>
                              {isUploaded ? 'Загружено' : 'Локальный'}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {localPreviews.length < 6 && (
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
      case 'categories':
        return <CategoriesManager />;
      case 'products':
        return <ProductsManager />;
      case 'reviews':
        return <ReviewsManager />;
      case 'blog':
        return <BlogManager />;
      case 'currencies':
        return <CurrencySettings />;
      case 'settings':
        return <SettingsManager />;
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