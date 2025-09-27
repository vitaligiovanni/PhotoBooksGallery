import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Edit, Trash2, Tag } from "lucide-react";

export function CategoriesManager() {
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
    },
    onError: (error: any) => {
      console.error("Category mutation error:", error);
      const message = typeof error?.message === 'string' ? error.message : 'Не удалось сохранить категорию';
      toast({ title: "Ошибка", description: message, variant: "destructive" });
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

  // Simple slugify with fallback for Cyrillic and spaces; ensures non-empty slug
  const slugify = (text: string) => {
    if (!text) return '';
    const from = 'а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я'.split(' ');
    const to   = 'a b v g d e e zh z i y k l m n o p r s t u f h c ch sh sch _ y _ e yu ya'.split(' ');
    let res = text.toLowerCase();
    from.forEach((ch, i) => { res = res.replace(new RegExp(ch, 'g'), to[i]); });
    res = res.replace(/[^a-z0-9\-\s_]+/g, ' ')
             .replace(/[\s_]+/g, '-')
             .replace(/-+/g, '-')
             .replace(/^-|-$/g, '');
    return res;
  };

  const handleCategorySubmit = async (data: any) => {
    console.log("Submitting category data:", data);
    
    let imageUrl = data.imageUrl || "";
    
    // Если это Google Storage URL, сохраним его как есть пока
    if (imageUrl.startsWith('https://storage.googleapis.com/')) {
      console.log("Saving Google Storage URL directly:", imageUrl);
    }
    
    // Ensure slug is present; generate from RU/EN/HY name if empty
    const baseName = (data?.name?.ru || data?.name?.en || data?.name?.hy || '').trim();
    let slug: string = (data.slug || '').trim();
    if (!slug) {
      slug = slugify(baseName);
    }
    if (!slug) {
      slug = `category-${Date.now()}`; // ultimate fallback
    }

    const categoryData = {
      ...data,
      slug,
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
                              // Генерируем уникальный ID для файла
                              const fileId = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                              const uploadURL = `/api/local-upload/${fileId}`;
                              console.log("Generated upload URL:", uploadURL);
                              return {
                                method: "PUT" as const,
                                url: uploadURL,
                              };
                            }}
                            onComplete={(result: { successful: Array<{ uploadURL: string }> }) => {
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
