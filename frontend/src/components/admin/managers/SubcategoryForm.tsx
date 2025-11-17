import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import slugify from 'slugify';
import { 
  FolderPlus, 
  Lightbulb, 
  CheckCircle2, 
  Languages,
  Hash,
  Package,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

// Validation schema for subcategory creation
const subcategorySchema = z.object({
  // Required Russian fields
  ru_name: z.string().min(1, 'Русское название обязательно'),
  ru_slug: z.string().min(1, 'Русский slug обязателен'),
  ru_description: z.string().optional(),
  
  // Optional Armenian fields  
  hy_name: z.string().optional(),
  hy_slug: z.string().optional(),
  hy_description: z.string().optional(),
  
  // Optional English fields
  en_name: z.string().optional(),
  en_slug: z.string().optional(),
  en_description: z.string().optional(),
  
  // Parent category (required)
  parent_id: z.string().min(1, 'Родительская категория обязательна'),
  
  // Products to assign
  product_ids: z.array(z.string()).default([]),
  
  // Optional fields
  imageUrl: z.string().url().optional().or(z.literal('')),
}).refine((data) => {
  // Custom validation: if hy_name provided, hy_slug should be auto-generated or provided
  if (data.hy_name && !data.hy_slug) {
    return false;
  }
  // Same for English
  if (data.en_name && !data.en_slug) {
    return false;
  }
  return true;
}, {
  message: 'Slug должен быть заполнен если указано название'
});

type SubcategoryFormData = z.infer<typeof subcategorySchema>;

// API functions
const fetchRootCategories = async () => {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Failed to fetch categories');
  const categories = await response.json();
  // Return only root categories (no parent_id)
  return categories.filter((cat: any) => !cat.parent_id && !cat.parentId);
};

const fetchProducts = async () => {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
};

const createSubcategory = async (data: any) => {
  const response = await fetch('/api/categories/subcategory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create subcategory');
  }
  return response.json();
};

// AI name suggestion function (mock for now)
const generateNameSuggestions = async (parentCategoryName: string, keywords: string) => {
  // Mock AI suggestions - in real implementation, call your AI API
  const suggestions = [
    `${keywords} ${parentCategoryName}`,
    `Премиум ${keywords}`,
    `${keywords} коллекция`,
    `Эксклюзивные ${keywords}`,
    `${keywords} серия`
  ];
  return suggestions.slice(0, 3);
};

interface SubcategoryFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const SubcategoryForm: React.FC<SubcategoryFormProps> = ({ 
  trigger, 
  onSuccess 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm<SubcategoryFormData>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: {
      ru_name: '',
      ru_slug: '',
      ru_description: '',
      hy_name: '',
      hy_slug: '',
      hy_description: '',
      en_name: '',
      en_slug: '',
      en_description: '',
      parent_id: '',
      product_ids: [],
      imageUrl: '',
    },
  });

  // Queries
  const { data: rootCategories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['rootCategories'],
    queryFn: fetchRootCategories,
    enabled: isOpen,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: isOpen,
  });

  // Mutation for creating subcategory
  const createMutation = useMutation({
    mutationFn: createSubcategory,
    onSuccess: (data) => {
      toast.success('Подкатегория успешно создана!');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categoriesHierarchy'] });
      form.reset();
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка при создании подкатегории');
    },
  });

  // Auto-generate slug from name
  const generateSlug = (text: string) => {
    return slugify(text, {
      lower: true,
      strict: true,
      locale: 'ru'
    });
  };

  // Watch name changes to auto-generate slugs
  const ruName = form.watch('ru_name');
  const hyName = form.watch('hy_name');
  const enName = form.watch('en_name');
  const selectedParentId = form.watch('parent_id');

  useEffect(() => {
    if (ruName && !form.getValues('ru_slug')) {
      form.setValue('ru_slug', generateSlug(ruName));
    }
  }, [ruName]);

  useEffect(() => {
    if (hyName && !form.getValues('hy_slug')) {
      form.setValue('hy_slug', generateSlug(hyName));
    }
  }, [hyName]);

  useEffect(() => {
    if (enName && !form.getValues('en_slug')) {
      form.setValue('en_slug', generateSlug(enName));
    }
  }, [enName]);

  // Generate AI suggestions
  const handleGenerateSuggestions = async () => {
    const parentCategory = rootCategories.find((cat: any) => cat.id === selectedParentId);
    if (!parentCategory || !ruName) {
      toast.error('Выберите родительскую категорию и введите ключевые слова');
      return;
    }

    setLoadingSuggestions(true);
    try {
      const suggestions = await generateNameSuggestions(
        parentCategory.name?.ru || parentCategory.translations?.ru?.name || '',
        ruName
      );
      setNameSuggestions(suggestions);
    } catch (error) {
      toast.error('Ошибка при генерации предложений');
    }
    setLoadingSuggestions(false);
  };

  const applySuggestion = (suggestion: string) => {
    form.setValue('ru_name', suggestion);
    setNameSuggestions([]);
  };

  const onSubmit = (data: SubcategoryFormData) => {
    // Transform data to API format
    const apiData = {
      translations: {
        ru: {
          name: data.ru_name,
          slug: data.ru_slug,
          description: data.ru_description || '',
        },
        hy: data.hy_name ? {
          name: data.hy_name,
          slug: data.hy_slug || generateSlug(data.hy_name),
          description: data.hy_description || '',
        } : { name: '', slug: '', description: '' },
        en: data.en_name ? {
          name: data.en_name,
          slug: data.en_slug || generateSlug(data.en_name),
          description: data.en_description || '',
        } : { name: '', slug: '', description: '' },
      },
      parent_id: data.parent_id,
      product_ids: data.product_ids,
      imageUrl: data.imageUrl || undefined,
    };

    createMutation.mutate(apiData);
  };

  const defaultTrigger = (
    <Button className="gap-2">
      <FolderPlus className="h-4 w-4" />
      Создать подкатегорию
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Создание подкатегории
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Parent Category Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Родительская категория</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="parent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Выберите родительскую категорию *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите корневую категорию..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingCategories ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            rootCategories.map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name?.ru || category.translations?.ru?.name || 'Без названия'}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Подкатегория будет создана под выбранной корневой категорией
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Multilingual Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Многоязычные поля
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Russian Fields */}
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name="ru_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название (русский) *</FormLabel>
                              <FormControl>
                                <Input placeholder="Название подкатегории на русском" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-8 gap-1"
                        onClick={handleGenerateSuggestions}
                        disabled={loadingSuggestions || !selectedParentId}
                      >
                        {loadingSuggestions ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Lightbulb className="h-4 w-4" />
                        )}
                        AI предложения
                      </Button>
                    </div>

                    {nameSuggestions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">AI предложения:</p>
                        <div className="flex flex-wrap gap-2">
                          {nameSuggestions.map((suggestion, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                              onClick={() => applySuggestion(suggestion)}
                            >
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="ru_slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            URL Slug (русский) *
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="url-slug-na-russkom" {...field} />
                          </FormControl>
                          <FormDescription>
                            Автоматически генерируется из названия. Пример: /ru/fotoknigi/svadebnye
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ru_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание (русский)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Описание подкатегории на русском языке"
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  {/* End Russian fields section */}
                  </div>

                  {/* Armenian Tab */}
                  {/* Armenian Fields */}
                  <div className="space-y-4 mt-8 border-t pt-4">
                    <FormField
                      control={form.control}
                      name="hy_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название (армянский)</FormLabel>
                          <FormControl>
                            <Input placeholder="Անվանում հայերեն" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hy_slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Slug (армянский)</FormLabel>
                          <FormControl>
                            <Input placeholder="url-slug-hayeren" {...field} />
                          </FormControl>
                          <FormDescription>
                            Автогенерация из названия. Пример: /hy/fotogirq/harsaniq
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hy_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание (армянский)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Նկարագրություն հայերեն"
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  {/* End Armenian fields section */}
                  </div>

                  {/* English Tab */}
                  {/* English Fields */}
                  <div className="space-y-4 mt-8 border-t pt-4">
                    <FormField
                      control={form.control}
                      name="en_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title (English)</FormLabel>
                          <FormControl>
                            <Input placeholder="Subcategory name in English" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="en_slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Slug (English)</FormLabel>
                          <FormControl>
                            <Input placeholder="url-slug-english" {...field} />
                          </FormControl>
                          <FormDescription>
                            Auto-generated from title. Example: /en/photobooks/wedding
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="en_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (English)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Subcategory description in English"
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  {/* End English fields section */}
                  </div>
                </div>{/* end multilingual wrapper */}
              </CardContent>
            </Card>

            {/* Product Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Привязка товаров
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="product_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Выберите товары для привязки</FormLabel>
                      <FormDescription className="mb-4">
                        Выбранные товары будут отображаться в этой подкатегории
                      </FormDescription>
                      {loadingProducts ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-4">
                          {products.map((product: any) => (
                            <div key={product.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={product.id}
                                checked={field.value?.includes(product.id)}
                                onCheckedChange={(checked) => {
                                  const updatedIds = checked
                                    ? [...(field.value || []), product.id]
                                    : field.value?.filter((id: string) => id !== product.id) || [];
                                  field.onChange(updatedIds);
                                }}
                              />
                              <label
                                htmlFor={product.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {product.name?.ru || product.translations?.ru?.name || 'Без названия'}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Optional Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Дополнительные настройки</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL изображения категории</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/image.jpg" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Опционально: URL изображения для подкатегории
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Создать подкатегорию
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SubcategoryForm;