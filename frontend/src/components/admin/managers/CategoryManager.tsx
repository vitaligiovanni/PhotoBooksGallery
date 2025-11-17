import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Edit, Trash2, ChevronRight, ChevronDown, TreePine, ShieldAlert, Upload, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import SubcategoryForm from './SubcategoryFormSimple';
import { useTranslation } from 'react-i18next';

// shadcn/ui components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Form validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateSlug } from '@/lib/slug';

// API functions
const fetchCategories = async () => {
  const response = await fetch('/api/categories?hierarchy=true');
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
};

const fetchProducts = async () => {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
};

const createCategory = async (categoryData: any) => {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(categoryData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create category');
  }
  return response.json();
};

const updateCategory = async ({ id, ...data }: any) => {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update category');
  }
  return response.json();
};

const deleteCategory = async (id: string) => {
  const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    let error: any = {};
    try { error = await response.json(); } catch {}
    throw new Error(error.message || 'Failed to delete category');
  }
  // Новый backend возвращает JSON с результатом deep delete
  return response.json().catch(()=>({}));
};

// Validation schemas
const categoryFormSchema = z.object({
  translations: z.object({
    ru: z.object({
      name: z.string().min(2, 'Русское название обязательно'),
      slug: z.string().min(1, 'Русский slug обязателен'),
      description: z.string().optional(),
    }),
    hy: z.object({
      name: z.string().optional(),
      slug: z.string().optional(), 
      description: z.string().optional(),
    }).optional(),
    en: z.object({
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
    }).optional(),
  }),
  parentId: z.union([z.string(), z.null()]).optional(),
  productIds: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  bannerImage: z.string().optional(),
  order: z.number().min(1, 'Порядок отображения должен быть положительным числом').optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

// Slug helper imported from '@/lib/slug'

// Category Tree Item Component
interface CategoryTreeItemProps {
  category: any;
  level: number;
  onEdit: (category: any) => void;
  onDelete: (category: any) => void;
  onForceDelete: (category: any) => void;
}

const CategoryTreeItem: React.FC<CategoryTreeItemProps> = ({
  category,
  level,
  onEdit,
  onDelete,
  onForceDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // i18n hook removed here as not used directly; reintroduce if localized strings added
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2" style={{ marginLeft: level * 20 }}>
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0 w-6 h-6"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          )}
          <div>
            <h4 className="font-medium">
              {category.name?.ru || category.translations?.ru?.name || 'Без названия'}
            </h4>
            <p className="text-sm text-gray-600">
              /{category.slug || category.translations?.ru?.slug}
            </p>
            {hasChildren && (
              <Badge variant="secondary" className="text-xs">
                {category.children.length} подкатегорий
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category)}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onForceDelete(category)}
            className="text-red-700 hover:text-red-900"
            title="Принудительно удалить"
          >
            ⚠
          </Button>
        </div>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="mt-4 space-y-2">
          {category.children.map((child: any) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onForceDelete={onForceDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Category Form Component
interface CategoryFormProps {
  category?: any;
  parentCategories: any[];
  products: any[];
  onSubmit: (data: CategoryFormData) => void;
  isLoading?: boolean;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  parentCategories,
  products,
  onSubmit,
  isLoading = false,
}) => {
  // i18n hook removed – form labels are static Russian strings
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      translations: {
        ru: {
          name: category?.name?.ru || category?.translations?.ru?.name || '',
          slug: category?.slug || category?.translations?.ru?.slug || '',
          description: category?.description?.ru || category?.translations?.ru?.description || '',
        },
        hy: {
          name: category?.name?.hy || category?.translations?.hy?.name || '',
          slug: category?.translations?.hy?.slug || '',
          description: category?.description?.hy || category?.translations?.hy?.description || '',
        },
        en: {
          name: category?.name?.en || category?.translations?.en?.name || '',
          slug: category?.translations?.en?.slug || '',
          description: category?.description?.en || category?.translations?.en?.description || '',
        },
      },
      parentId: category?.parentId || 'ROOT',
      productIds: [],
      imageUrl: category?.imageUrl || '',
      bannerImage: category?.bannerImage || '',
      order: category?.order || 1,
    },
  });

  // Auto-generate slugs when name changes
  const watchedRuName = form.watch('translations.ru.name');
  const watchedHyName = form.watch('translations.hy.name');
  const watchedEnName = form.watch('translations.en.name');

  React.useEffect(() => {
    if (watchedRuName && !form.getValues('translations.ru.slug')) {
      form.setValue('translations.ru.slug', generateSlug(watchedRuName));
    }
  }, [watchedRuName, form]);

  React.useEffect(() => {
    if (watchedHyName) {
      form.setValue('translations.hy.slug', generateSlug(watchedHyName));
    } else if (watchedRuName) {
      form.setValue('translations.hy.slug', generateSlug(watchedRuName) + '-hy');
    }
  }, [watchedHyName, watchedRuName, form]);

  React.useEffect(() => {
    if (watchedEnName) {
      form.setValue('translations.en.slug', generateSlug(watchedEnName));
    } else if (watchedRuName) {
      form.setValue('translations.en.slug', generateSlug(watchedRuName) + '-en');
    }
  }, [watchedEnName, watchedRuName, form]);

  // Initialize previews when editing
  React.useEffect(() => {
    if (category) {
      setImagePreview(category.imageUrl || '');
      setBannerPreview(category.bannerImage || '');
    }
  }, [category]);

  // File upload handlers
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Uploading image to /api/local-upload...');
      const response = await fetch('/api/local-upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Upload response data:', data);
        
        form.setValue('imageUrl', data.url);
        setImagePreview(data.url);
        setUploadingImage(false);
        toast({ title: 'Изображение загружено успешно!', variant: 'default' });
      } else {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        setUploadingImage(false);
        toast({ title: 'Ошибка загрузки изображения', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadingImage(false);
      toast({ title: 'Ошибка загрузки изображения', variant: 'destructive' });
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!file) return;
    
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Uploading banner to /api/local-upload...');
      const response = await fetch('/api/local-upload', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Upload response data:', data);
        
        form.setValue('bannerImage', data.url);
        setBannerPreview(data.url);
        setUploadingBanner(false);
        toast({ title: 'Баннер загружен успешно!', variant: 'default' });
      } else {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        setUploadingBanner(false);
        toast({ title: 'Ошибка загрузки баннера', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadingBanner(false);
      toast({ title: 'Ошибка загрузки баннера', variant: 'destructive' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Russian Language Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <span>🇷🇺</span>
            <span>Русский (обязательно)</span>
          </h3>
          
          <FormField
            control={form.control}
            name="translations.ru.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Название на русском *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Введите название категории" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="translations.ru.slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL Slug (русский) *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="url-slug" />
                </FormControl>
                <FormDescription>
                  Автоматически генерируется из названия
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="translations.ru.description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Описание на русском</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Описание категории" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Armenian Language Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <span>🇦🇲</span>
            <span>Հայերեն (опционально)</span>
          </h3>
          
          <FormField
            control={form.control}
            name="translations.hy.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Название на армянском</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Մուտքագրեք կատեգորիայի անունը" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="translations.hy.slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL Slug (армянский)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="url-slug-hy" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="translations.hy.description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Описание на армянском</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Կատեգորիայի նկարագրություն" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* English Language Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center space-x-2">
            <span>🇺🇸</span>
            <span>English (optional)</span>
          </h3>
          
          <FormField
            control={form.control}
            name="translations.en.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name in English</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter category name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="translations.en.slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL Slug (English)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="url-slug-en" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="translations.en.description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description in English</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Category description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Parent Category Selection */}
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Родительская категория</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === 'ROOT' ? null : value)} 
                defaultValue={field.value || 'ROOT'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите родительскую категорию (опционально)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ROOT">Корневая категория</SelectItem>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name?.ru || cat.translations?.ru?.name || 'Без названия'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Оставьте пустым для создания корневой категории
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Order Field */}
        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Порядок отображения</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                  placeholder="1"
                />
              </FormControl>
              <FormDescription>
                Чем больше число, тем выше категория в списке (0 = авто-порядок)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload */}
        <div className="space-y-6">
          <FormLabel className="text-lg font-semibold">Изображения категории</FormLabel>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Image */}
            <div className="space-y-4">
              <FormLabel className="text-base font-medium">📋 Основное изображение</FormLabel>
              
              {/* Image Preview Area */}
              <div className="flex flex-col items-center space-y-4">
                {imagePreview || form.watch('imageUrl') ? (
                  <div className="relative group">
                    <img 
                      src={imagePreview || form.watch('imageUrl')} 
                      alt="Preview" 
                      className="w-48 h-48 object-cover rounded-lg border-2 border-dashed border-gray-300 shadow-md"
                      onError={() => {
                        console.error('Image failed to load:', form.watch('imageUrl'));
                        setImagePreview('');
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        form.setValue('imageUrl', '');
                        setImagePreview('');
                        toast({ title: 'Изображение удалено', variant: 'default' });
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    <div className="text-center text-gray-500">
                      <ImageIcon className="mx-auto h-12 w-12 mb-2" />
                      <p className="text-sm">Изображение не загружено</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* File Upload Button */}
              <div className="text-center">
                <input
                  type="file"
                  accept="image/*"
                  id="category-image-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleImageUpload(file);
                    }
                  }}
                />
                <label 
                  htmlFor="category-image-upload"
                  className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 mr-2" />
                  )}
                  {uploadingImage ? 'Загрузка...' : 'Загрузить изображение'}
                </label>
              </div>

              {/* OR URL */}
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-4">или укажите URL</div>
                
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="https://example.com/image.jpg"
                          className="text-center"
                        />
                      </FormControl>
                      <FormDescription>
                        Вставьте прямую ссылку на изображение из интернета
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Banner Image */}
            <div className="space-y-4">
              <FormLabel className="text-base font-medium">🎨 Баннер страницы</FormLabel>
              
              {/* Banner Preview Area */}
              <div className="flex flex-col items-center space-y-4">
                {bannerPreview || form.watch('bannerImage') ? (
                  <div className="relative group">
                    <img 
                      src={bannerPreview || form.watch('bannerImage')} 
                      alt="Banner Preview" 
                      className="w-64 h-32 object-cover rounded-lg border-2 border-dashed border-gray-300 shadow-md"
                      onError={() => {
                        console.error('Banner failed to load:', form.watch('bannerImage'));
                        setBannerPreview('');
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        form.setValue('bannerImage', '');
                        setBannerPreview('');
                        toast({ title: 'Баннер удален', variant: 'default' });
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="w-64 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    <div className="text-center text-gray-500">
                      <ImageIcon className="mx-auto h-8 w-8 mb-2" />
                      <p className="text-sm">Баннер не загружен</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Banner File Upload Button */}
              <div className="text-center">
                <input
                  type="file"
                  accept="image/*"
                  id="category-banner-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleBannerUpload(file);
                    }
                  }}
                />
                <label 
                  htmlFor="category-banner-upload"
                  className="inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg cursor-pointer transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingBanner ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 mr-2" />
                  )}
                  {uploadingBanner ? 'Загрузка...' : 'Загрузить баннер'}
                </label>
              </div>

              {/* OR Banner URL */}
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-4">или укажите URL</div>
                
                <FormField
                  control={form.control}
                  name="bannerImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="https://example.com/banner.jpg"
                          className="text-center"
                        />
                      </FormControl>
                      <FormDescription>
                        Вставьте прямую ссылку на баннер из интернета
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Assignment */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Товары</h3>
          <FormField
            control={form.control}
            name="productIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Назначить товары в категорию</FormLabel>
                <FormDescription>
                  Выберите товары, которые должны быть в этой категории
                </FormDescription>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                  {products.map((product) => (
                    <label key={product.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value?.includes(product.id) || false}
                        onChange={(e) => {
                          const currentIds = field.value || [];
                          if (e.target.checked) {
                            field.onChange([...currentIds, product.id]);
                          } else {
                            field.onChange(currentIds.filter((id) => id !== product.id));
                          }
                        }}
                      />
                      <span className="text-sm">
                        {product.name?.ru || 'Без названия'} 
                        {product.price && (
                          <span className="text-gray-500 ml-2">
                            ({product.price} {product.currency?.symbol || '₽'})
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="submit" disabled={isLoading || uploadingImage || uploadingBanner}>
            {isLoading ? 'Сохранение...' : category ? 'Обновить категорию' : 'Создать категорию'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

// Main CategoryManager Component
export const CategoryManager: React.FC = () => {
  /**
   * Developer Test Plan (force delete + subcategory):
   * 1. Create root category A, root category B, and subcategory A1 under A. Add a couple products to A and A1.
   * 2. Force delete subcategory A1 -> expect: products from A1 lifted (subcategoryId null) remain with categoryId=A; toast shows reassigned count.
   * 3. Force delete root category A choosing targetCategoryId=B -> expect: products reassigned to B, subcategories logic applied (if any remain) and A removed.
   * 4. Force delete root category B with no target -> expect: placeholder 'uncategorized' created and products moved there.
   * 5. Attempt selecting the same category as target -> button disabled + validation message.
   * 6. Rapid open/close dialog -> no runtime errors (null guards ok).
   */
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  // Separate state for editing a subcategory to avoid using CategoryForm for subcategory edits
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);
  const [forceDeleteCategory, setForceDeleteCategory] = useState<any>(null);
  const [forceTargetCategoryId, setForceTargetCategoryId] = useState<string | 'UNCATEGORIZED' | ''>('');
  const [forceStats, setForceStats] = useState<{ products?: number; loading: boolean }>({ loading: false });
  const [isForceDeleting, setIsForceDeleting] = useState(false);

  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', 'hierarchy'],
    queryFn: fetchCategories,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      const y = window.scrollY;
      await queryClient.invalidateQueries({ queryKey: ['categories','hierarchy'] });
      queryClient.refetchQueries({ queryKey: ['categories','hierarchy'] });
      requestAnimationFrame(()=>window.scrollTo({ top: y }));
      setIsCreateDialogOpen(false);
      toast({ title: 'Категория успешно создана!', variant: 'default' });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Ошибка при создании категории', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: async () => {
      const y = window.scrollY;
      await queryClient.invalidateQueries({ queryKey: ['categories','hierarchy'] });
      queryClient.refetchQueries({ queryKey: ['categories','hierarchy'] });
      requestAnimationFrame(()=>window.scrollTo({ top: y }));
      setEditingCategory(null);
      toast({ title: 'Категория успешно обновлена!', variant: 'default' });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Ошибка при обновлении категории', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async (data: any) => {
      const y = window.scrollY;
      await queryClient.invalidateQueries({ queryKey: ['categories','hierarchy'] });
      queryClient.refetchQueries({ queryKey: ['categories','hierarchy'] });
      requestAnimationFrame(()=>window.scrollTo({ top: y }));
      setDeletingCategory(null);
      const removed = data?.deletedCategoryIds?.length;
      toast({ title: removed ? `Удалено категорий: ${removed}` : 'Категория удалена', variant: 'default' });
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Ошибка при удалении категории', variant: 'destructive' });
    },
  });

  // Event handlers
  const handleCreate = (data: CategoryFormData) => {
    const processedData = {
      ...data,
      parentId: data.parentId === 'ROOT' ? null : data.parentId
    };
    createMutation.mutate(processedData);
  };

  const handleEdit = (category: any) => {
    // If node has parentId it's a subcategory – open dedicated subcategory dialog
    if (category?.parentId) {
      console.log('[CategoryManager] Editing subcategory', category.id, category.slug);
      setEditingSubcategory(category);
    } else {
      console.log('[CategoryManager] Editing root category', category.id, category.slug);
      setEditingCategory(category);
    }
  };

  const handleUpdate = (data: CategoryFormData) => {
    if (editingCategory) {
      const processedData = {
        ...data,
        parentId: data.parentId === 'ROOT' ? null : data.parentId
      };
      updateMutation.mutate({ id: editingCategory.id, ...processedData });
    }
  };

  const handleDelete = (category: any) => {
    setDeletingCategory(category);
  };

  const confirmDelete = () => {
    if (deletingCategory) {
      deleteMutation.mutate(deletingCategory.id);
    }
  };

  const openForceDelete = (category: any) => {
    setForceDeleteCategory(category);
    setForceTargetCategoryId('');
    setForceStats({ loading: true });
    // Fetch approximate product count via backend products endpoint for better accuracy
    fetch(`/api/products?categoryId=${category.id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(list => {
        setForceStats({ loading: false, products: Array.isArray(list) ? list.length : 0 });
      })
      .catch(() => setForceStats({ loading: false, products: undefined }));
  };

  const [forceMode, setForceMode] = useState<'uncategorized'|'reassign'|'purge'>('uncategorized');

  const forceDeleteRequest = async () => {
    if (!forceDeleteCategory) return;
    setIsForceDeleting(true);
    try {
      const params = new URLSearchParams();
      params.set('mode', forceMode);
      if (forceMode === 'reassign' && forceTargetCategoryId && forceTargetCategoryId !== 'UNCATEGORIZED') {
        params.set('targetCategoryId', forceTargetCategoryId);
      }
      const res = await fetch(`/api/categories/${forceDeleteCategory.id}/force?${params.toString()}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Force delete failed');
      const data = await res.json().catch(()=>null);
      const reassigned = data?.reassignedProducts;
      const purged = data?.purgedProducts;
      const lifted = data?.liftedProducts;
      toast({ 
        title: `Удалено: ${data?.deletedCategoryIds?.length || 0}.` +
        (purged ? ` Товаров удалено: ${purged}.` : '') +
        (reassigned ? ` Перенесено товаров: ${reassigned}.` : '') +
        (lifted ? ` Поднято товаров: ${lifted}.` : ''),
        variant: 'default'
      });
  setForceDeleteCategory(null);
  const y = window.scrollY;
  await queryClient.invalidateQueries({ queryKey: ['categories','hierarchy'] });
  queryClient.refetchQueries({ queryKey: ['categories','hierarchy'] });
  requestAnimationFrame(()=>window.scrollTo({ top: y }));
    } catch (e: any) {
      toast({ title: e.message || 'Force delete error', variant: 'destructive' });
    } finally {
      setIsForceDeleting(false);
    }
  };

  // Get flat list of categories for parent selection (exclude current category when editing)
  const parentCategoryOptions = categories
    .filter((cat: any) => !editingCategory || cat.id !== editingCategory.id)
    .reduce((acc: any[], cat: any) => {
      acc.push(cat);
      if (cat.children) {
        acc.push(...cat.children);
      }
      return acc;
    }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Управление категориями</h1>
          <p className="text-gray-600">
            Создавайте и управляйте иерархией категорий товаров
          </p>
        </div>
        
        <div className="flex gap-2">
          <SubcategoryForm 
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['categories'] });
              queryClient.invalidateQueries({ queryKey: ['categoriesHierarchy'] });
            }}
            trigger={
              <Button variant="outline" className="gap-2">
                <TreePine className="w-4 h-4" />
                Создать подкатегорию
              </Button>
            }
          />
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FolderPlus className="w-4 h-4 mr-2" />
                Создать категорию
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создание новой категории</DialogTitle>
              <DialogDescription>
                Заполните информацию для новой категории. Русское название обязательно.
              </DialogDescription>
            </DialogHeader>
            
            <CategoryForm
              parentCategories={parentCategoryOptions}
              products={products}
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Categories Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>{t('categoryHierarchy') || 'Структура категорий'}</span>
            <Badge variant="outline">
              {categories.length} {t('categories')}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('categoryManager')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <FolderPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Нет категорий</h3>
              <p className="mt-1 text-sm text-gray-500">
                Начните с создания первой категории товаров.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category: any) => (
                <CategoryTreeItem
                  key={category.id}
                  category={category}
                  level={0}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onForceDelete={openForceDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {/* Edit root category dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => { if (!open) setEditingCategory(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактирование категории</DialogTitle>
            <DialogDescription>
              Обновите информацию о категории
            </DialogDescription>
          </DialogHeader>
          {editingCategory && !editingCategory.parentId && (
            <CategoryForm
              category={editingCategory}
              parentCategories={parentCategoryOptions}
              products={products}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit subcategory dialog uses dedicated SubcategoryFormSimple for proper fields */}
      {editingSubcategory && (
        <SubcategoryForm 
          trigger={null}
          isOpen={!!editingSubcategory}
          setIsOpen={(open) => { if (!open) setEditingSubcategory(null); }}
          editingSubcategory={editingSubcategory}
          onClose={() => setEditingSubcategory(null)}
          onSuccess={() => {
            setEditingSubcategory(null);
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['categoriesHierarchy'] });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить категорию "
              {deletingCategory?.name?.ru || deletingCategory?.translations?.ru?.name}
              "? Это действие нельзя отменить.
            </AlertDialogDescription>
            {deletingCategory?.children?.length > 0 && (
              <div className="mt-3 text-xs rounded border border-yellow-200 bg-yellow-50 p-2">
                <span className="font-semibold">Внимание:</span> У этой категории есть подкатегории. Они также будут удалены.
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Delete Dialog */}
      <AlertDialog open={!!forceDeleteCategory} onOpenChange={() => !isForceDeleting && setForceDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {forceDeleteCategory?.parentId ? t('forceDeleteSubcategoryTitle') : t('forceDeleteCategoryTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t('forceDeleteDesc')}
            </AlertDialogDescription>
            <div className="mt-3 space-y-3 text-sm">
              <div className="p-2 bg-neutral-50 rounded border text-xs">
                {t('productsAffected')}: {forceStats.loading ? t('calculating') : (forceStats.products ?? '—')}
              </div>
              <div className="space-y-3 border rounded p-3 bg-white">
                <div className="text-xs font-semibold flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Режим удаления</div>
                <fieldset className="flex flex-col gap-2 text-xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" name="force-mode" value="uncategorized" checked={forceMode==='uncategorized'} onChange={()=>setForceMode('uncategorized')} disabled={isForceDeleting} />
                    <span className="leading-snug">Перенести товары в "Без категории" (subcategoryId очищается)</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" name="force-mode" value="reassign" checked={forceMode==='reassign'} onChange={()=>setForceMode('reassign')} disabled={isForceDeleting} />
                    <span className="leading-snug">Перенести товары в другую корневую категорию</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer text-red-600">
                    <input type="radio" name="force-mode" value="purge" checked={forceMode==='purge'} onChange={()=>setForceMode('purge')} disabled={isForceDeleting} />
                    <span className="leading-snug">Полностью удалить товары этой ветки (необратимо)</span>
                  </label>
                </fieldset>
                {forceMode === 'reassign' && !forceDeleteCategory?.parentId && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">Целевая категория</label>
                    <select
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={forceTargetCategoryId}
                      onChange={(e) => setForceTargetCategoryId(e.target.value as any)}
                      disabled={isForceDeleting}
                    >
                      <option value="">Выберите...</option>
                      {categories
                        .filter((c:any)=> !c.parentId && c.id !== forceDeleteCategory?.id)
                        .map((c:any)=>(
                          <option key={c.id} value={c.id}>{c.name?.ru || c.translations?.ru?.name}</option>
                        ))}
                    </select>
                    {forceDeleteCategory && forceTargetCategoryId === forceDeleteCategory.id && (
                      <div className="text-red-600 text-xs">Нельзя выбрать ту же категорию</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isForceDeleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={forceDeleteRequest}
              disabled={isForceDeleting || (forceMode==='reassign' && !forceTargetCategoryId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {isForceDeleting ? t('deletionInProgress') : forceMode==='purge' ? 'Удалить ветку и товары' : 'Удалить ветку'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Global overlay indicator for loading/mutations */}
      {(categoriesLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || isForceDeleting) && (
        <div className="fixed inset-0 pointer-events-none flex justify-center top-4 z-[200]">
          <div className="px-3 py-1.5 rounded-full bg-black/70 text-white text-xs shadow-lg animate-fade-in">
            {isForceDeleting ? 'Принудительное удаление…' : 'Обновление…'}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;