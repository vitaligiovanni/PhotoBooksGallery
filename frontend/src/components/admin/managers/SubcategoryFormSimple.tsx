import React, { useState, useEffect, useRef } from 'react';
import { ensureAuthToken } from '@/lib/ensureAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { generateSlug as generateSharedSlug } from '@/lib/slug';
import { 
  FolderPlus, 
  CheckCircle2, 
  Loader2, 
  Languages,
  Hash,
  Package,
  Upload,
  X 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  imageUrl: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true; // empty allowed
        // Allow absolute http/https
        if (/^https?:\/\//i.test(val)) return true;
        // Allow our local object storage relative path
        if (val.startsWith('/objects/local-upload/')) return true;
        return false;
      },
      'Допустим абсолютный URL (http/https) или путь /objects/local-upload/...'
    )
    .optional(),
  
  // New dual image fields
  coverImage: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true; // empty allowed
        if (/^https?:\/\//i.test(val)) return true;
        if (val.startsWith('/objects/local-upload/')) return true;
        return false;
      },
      'Допустим абсолютный URL (http/https) или путь /objects/local-upload/...'
    )
    .optional(),
    
  bannerImage: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true; // empty allowed
        if (/^https?:\/\//i.test(val)) return true;
        if (val.startsWith('/objects/local-upload/')) return true;
        return false;
      },
      'Допустим абсолютный URL (http/https) или путь /objects/local-upload/...'
    )
    .optional()
    .or(z.literal('')),
    
  // New order field for category positioning
  order: z.number().min(1, 'Порядок должен быть положительным числом').optional(),
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
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token available');
  
  const response = await fetch('/api/categories/subcategory', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create subcategory');
  }
  return response.json();
};

interface SubcategoryFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  editingSubcategory?: any;
  onClose?: () => void;
}

const SubcategoryForm: React.FC<SubcategoryFormProps> = ({ 
  trigger, 
  onSuccess,
  isOpen: externalIsOpen,
  setIsOpen: externalSetIsOpen,
  editingSubcategory,
  onClose
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalSetIsOpen || setInternalIsOpen;
  const [currentLang, setCurrentLang] = useState('ru');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const coverFieldRef = useRef<any>(null);
  const bannerFieldRef = useRef<any>(null);
  // Removed unused state variables that were causing TypeScript errors
  // selectedProducts legacy state removed – rely solely on form product_ids
  // Translation hook removed (was unused) – reintroduce if dynamic i18n strings are needed
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
      coverImage: '',
      bannerImage: '',
      order: undefined, // Default order will be auto-assigned
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

  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Подгружаем существующий токен
      tokenRef.current = localStorage.getItem('token');
      if (!tokenRef.current) {
        const obtained = await ensureAuthToken();
        if (!cancelled && obtained) {
          tokenRef.current = obtained;
          // Тихо обновляем товары если мы в режиме редактирования и уже открыты
          if (editingSubcategory?.id) {
            loadAssignedProducts(editingSubcategory.id);
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, editingSubcategory?.id]);

  // Функция загрузки назначенных товаров
  const loadAssignedProducts = async (subcategoryId: string) => {
    try {
      // Получаем товары назначенные этой подкатегории
      const token = tokenRef.current;
      if (!token) {
        console.warn('[SubcategoryForm] Нет токена — пропускаем загрузку назначенных товаров');
        toast.info('Нет токена авторизации — товары не загружены');
        return;
      }

      const response = await fetch(`/api/products/by-category/${subcategoryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const assignedProducts = await response.json();
        const productIds = assignedProducts.map((product: any) => product.id);
        form.setValue('product_ids', productIds);
      } else if (response.status === 401) {
        toast.error('Сессия истекла — войдите заново');
      }
    } catch (error) {
      console.error('Ошибка загрузки назначенных товаров:', error);
    }
  };

  // Предзаполнение формы при редактировании
  useEffect(() => {
    if (editingSubcategory && isOpen) {
      const { translations, name, description, slug, parentId, imageUrl, coverImage, bannerImage, order } = editingSubcategory;
      
      // Заполняем форму данными из редактируемой подкатегории
      const formData = {
        ru_name: translations?.ru?.name || (typeof name === 'object' ? name.ru : name) || '',
        ru_slug: translations?.ru?.slug || slug || '',
        ru_description: translations?.ru?.description || (typeof description === 'object' ? description.ru : description) || '',
        hy_name: translations?.hy?.name || (typeof name === 'object' ? name.hy : '') || '',
        hy_slug: translations?.hy?.slug || '',
        hy_description: translations?.hy?.description || (typeof description === 'object' ? description.hy : '') || '',
        en_name: translations?.en?.name || (typeof name === 'object' ? name.en : '') || '',
        en_slug: translations?.en?.slug || '',
        en_description: translations?.en?.description || (typeof description === 'object' ? description.en : '') || '',
        parent_id: parentId || '',
        product_ids: [], // Будет загружено отдельным запросом
        imageUrl: imageUrl || '',
        coverImage: coverImage || '',
        bannerImage: bannerImage || '',
        order: order || undefined,
      };
      
      form.reset(formData);
      
      // Обновляем превью для существующих изображений
      setCoverPreview(coverImage || '');
      setBannerPreview(bannerImage || '');
      
      // Загружаем назначенные товары для редактируемой подкатегории
      if (editingSubcategory.id) {
        loadAssignedProducts(editingSubcategory.id);
      }
    } else if (!editingSubcategory && isOpen) {
      // Сброс формы для создания новой подкатегории
      form.reset({
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
        coverImage: '',
        bannerImage: '',
        order: undefined,
      });
      setCoverPreview('');
      setBannerPreview('');
    }
  }, [editingSubcategory, isOpen, form]);

  // Mutation for creating subcategory
  const unifiedCategoriesKey = ['/api/categories'];
  const unifiedHierarchyKey = ['/api/categories/hierarchy'];

  const createMutation = useMutation({
    mutationFn: createSubcategory,
    onSuccess: (newSubcategory: any) => {
      toast.success('Подкатегория успешно создана!');
      // Optimistic append
      queryClient.setQueryData(unifiedCategoriesKey, (old: any) => {
        if (!Array.isArray(old)) return old;
        if (old.find(c => c.id === newSubcategory.id)) return old; // avoid dup
        return [...old, newSubcategory];
      });
      queryClient.invalidateQueries({ queryKey: unifiedCategoriesKey });
      queryClient.invalidateQueries({ queryKey: unifiedHierarchyKey });
      form.reset();
      setCoverPreview('');
      setBannerPreview('');
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка при создании подкатегории');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token available');
      const response = await fetch(`/api/categories/${editingSubcategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update subcategory');
      return response.json();
    },
    onSuccess: (updated: any) => {
      toast.success('Подкатегория успешно обновлена!');
      queryClient.setQueryData(unifiedCategoriesKey, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((c: any) => c.id === updated.id ? { ...c, ...updated } : c);
      });
      queryClient.invalidateQueries({ queryKey: unifiedCategoriesKey });
      queryClient.invalidateQueries({ queryKey: unifiedHierarchyKey });
      // Invalidate catalog path cache to refresh coverImage/bannerImage in catalog pages
      queryClient.invalidateQueries({ queryKey: ['catalog-path'] });
      setCoverPreview('');
      setBannerPreview('');
      setIsOpen(false);
      onClose?.();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка при обновлении подкатегории');
    }
  });

  // Use shared multilingual slug generator
  const generateSlug = (text: string, lang?: string) => generateSharedSlug(text, lang);

  // File upload handlers
  const handleCoverUpload = async (file: File) => {
    if (!file) return;
    
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token');
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5032' : '');
      const uploadUrl = `${apiUrl}/api/local-upload`;
      console.log('Uploading cover to URL:', uploadUrl);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки файла');
      }

      const data = await response.json();
      // Формируем полный URL
      const fullUrl = `${apiUrl}${data.url}`;
      console.log('Setting coverImage to:', fullUrl);
      
      // Ждем небольшую задержку, чтобы файл был доступен
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Проверяем доступность изображения перед установкой preview
      const img = new Image();
      img.onload = () => {
        if (coverFieldRef.current) {
          coverFieldRef.current.onChange(fullUrl);
        } else {
          form.setValue('coverImage', fullUrl);
        }
        setCoverPreview(fullUrl);
        console.log('Form values after setting coverImage:', form.getValues());
        toast.success('Обложка успешно загружена');
      };
      img.onerror = () => {
        // Если изображение еще не доступно, устанавливаем с задержкой
        setTimeout(() => {
          if (coverFieldRef.current) {
            coverFieldRef.current.onChange(fullUrl);
          } else {
            form.setValue('coverImage', fullUrl);
          }
          setCoverPreview(fullUrl);
          console.log('Form values after setting coverImage (delayed):', form.getValues());
          toast.success('Обложка успешно загружена');
        }, 500);
      };
      img.src = fullUrl;
    } catch (error: any) {
      console.error('Cover upload error:', error);
      toast.error(error.message || 'Ошибка загрузки обложки');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!file) return;
    
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token');
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5032' : '');
      const uploadUrl = `${apiUrl}/api/local-upload`;
      console.log('Uploading banner to URL:', uploadUrl);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки файла');
      }

      const data = await response.json();
      // Формируем полный URL
      const fullUrl = `${apiUrl}${data.url}`;
      console.log('Setting bannerImage to:', fullUrl);
      
      // Ждем небольшую задержку, чтобы файл был доступен
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Проверяем доступность изображения перед установкой preview
      const img = new Image();
      img.onload = () => {
        if (bannerFieldRef.current) {
          bannerFieldRef.current.onChange(fullUrl);
        } else {
          form.setValue('bannerImage', fullUrl);
        }
        setBannerPreview(fullUrl);
        console.log('Form values after setting bannerImage:', form.getValues());
        toast.success('Баннер успешно загружен');
      };
      img.onerror = () => {
        // Если изображение еще не доступно, устанавливаем с задержкой
        setTimeout(() => {
          if (bannerFieldRef.current) {
            bannerFieldRef.current.onChange(fullUrl);
          } else {
            form.setValue('bannerImage', fullUrl);
          }
          setBannerPreview(fullUrl);
          console.log('Form values after setting bannerImage (delayed):', form.getValues());
          toast.success('Баннер успешно загружен');
        }, 500);
      };
      img.src = fullUrl;
    } catch (error: any) {
      console.error('Banner upload error:', error);
      toast.error(error.message || 'Ошибка загрузки баннера');
    } finally {
      setUploadingBanner(false);
    }
  };

  // Watch name changes to auto-generate slugs
  const ruName = form.watch('ru_name');
  const hyName = form.watch('hy_name');
  const enName = form.watch('en_name');

  useEffect(() => {
    if (ruName && !form.getValues('ru_slug')) {
      form.setValue('ru_slug', generateSlug(ruName));
    }
  }, [ruName, form]);

  useEffect(() => {
    if (hyName && !form.getValues('hy_slug')) {
      form.setValue('hy_slug', generateSlug(hyName, 'hy'));
    }
  }, [hyName, form]);

  useEffect(() => {
    if (enName && !form.getValues('en_slug')) {
      form.setValue('en_slug', generateSlug(enName, 'en'));
    }
  }, [enName, form]);

  // Стабильное значение времени последней отправки
  const lastSubmitAtRef = useRef(0);
  const onSubmit = (data: SubcategoryFormData) => {
    const now = Date.now();
    if (now - lastSubmitAtRef.current < 600) {
      console.warn('[SubcategoryForm] Ignoring rapid re-submit');
      return;
    }
    lastSubmitAtRef.current = now;
    // Не позволяем сабмит без токена (иначе будет тихая ошибка 401)
    // Если токена нет даже после авто попытки — просто продолжаем (mockAuth на backend пропустит)
    // Берём фактический список выбранных товаров из формы (product_ids контролируется через form)
    const chosen = (form.getValues('product_ids') || []).slice(); // клон чтобы не мутировалось
    console.log('[SubcategoryForm] Submit start', { mode: editingSubcategory ? 'edit' : 'create', chosenCount: chosen.length, ids: chosen });
    console.log('[SubcategoryForm] Form data before submit:', data);

    const apiData = {
      translations: {
        ru: { name: data.ru_name, slug: data.ru_slug, description: data.ru_description || '' },
  hy: data.hy_name ? { name: data.hy_name, slug: data.hy_slug || generateSlug(data.hy_name, 'hy'), description: data.hy_description || '' } : { name: '', slug: '', description: '' },
  en: data.en_name ? { name: data.en_name, slug: data.en_slug || generateSlug(data.en_name, 'en'), description: data.en_description || '' } : { name: '', slug: '', description: '' },
      },
      parent_id: data.parent_id,
      product_ids: chosen,
      imageUrl: data.imageUrl || undefined,
      coverImage: data.coverImage !== undefined ? data.coverImage : undefined,
      bannerImage: data.bannerImage !== undefined ? data.bannerImage : undefined,
      order: data.order || undefined,
    } as const;

    if (!data.ru_name || !data.ru_slug) {
      toast.error('Русские название и slug обязательны');
      return;
    }

    if (createMutation.isPending || updateMutation.isPending) {
      console.warn('[SubcategoryForm] Preventing duplicate submit');
      return;
    }

    if (editingSubcategory) {
      console.log('[SubcategoryForm] Updating subcategory', editingSubcategory.id, apiData);
      updateMutation.mutate(apiData);
    } else {
      console.log('[SubcategoryForm] Creating subcategory', apiData);
      createMutation.mutate(apiData);
    }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="subcategory-form-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            {editingSubcategory ? 'Редактирование подкатегории' : 'Создание подкатегории'}
          </DialogTitle>
          <DialogDescription id="subcategory-form-desc">
            {editingSubcategory ? 'Измените данные и сохраните изменения' : 'Заполните форму чтобы создать новую подкатегорию'}
          </DialogDescription>
        </DialogHeader>
        {/* Fallback hidden description (for any hydration/HMR timing issue) */}
        <p className="sr-only" aria-hidden="false" id="subcategory-form-desc-fallback">
          Форма управления подкатегорией (многоязычные поля, товары, изображение).
        </p>

        {!tokenRef.current && isOpen && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700" role="note">
            (Dev) Авто-логин ещё не сработал или не нужен. Backend в режиме mockAuth, можно продолжать.
          </div>
        )}
        {isOpen && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              // Image upload validation removed
              onSubmit(data);
            })}
            className="space-y-6"
            aria-live="polite"
          >
            
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

                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Порядок отображения</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Чем больше число, тем выше подкатегория в списке. Оставьте пустым для автоназначения.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Language Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Многоязычные поля
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={currentLang === 'ru' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentLang('ru')}
                  >
                    Русский *
                  </Button>
                  <Button
                    type="button"
                    variant={currentLang === 'hy' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentLang('hy')}
                  >
                    Հայերեն
                  </Button>
                  <Button
                    type="button"
                    variant={currentLang === 'en' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentLang('en')}
                  >
                    English
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Russian Fields */}
                {currentLang === 'ru' && (
                  <div className="space-y-4">
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
                  </div>
                )}

                {/* Armenian Fields */}
                {currentLang === 'hy' && (
                  <div className="space-y-4">
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
                  </div>
                )}

                {/* English Fields */}
                {currentLang === 'en' && (
                  <div className="space-y-4">
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
                  </div>
                )}
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

            {/* Images Section */}
            <Card>
              <CardHeader>
                <CardTitle>🖼️ Изображения подкатегории</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cover Image */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">📋 Обложка карточки</label>
                    <FormField
                      control={form.control}
                      name="coverImage"
                      render={({ field }) => {
                        coverFieldRef.current = field;
                        return (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-2">
                              <input
                                type="file"
                                id="cover-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleCoverUpload(file);
                                }}
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={uploadingCover}
                                  onClick={() => document.getElementById('cover-upload')?.click()}
                                  className="gap-2"
                                >
                                  {uploadingCover ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Загрузка...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4" />
                                      Загрузить обложку
                                    </>
                                  )}
                                </Button>
                                {field.value && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange('');
                                      setCoverPreview('');
                                    }}
                                    className="gap-2"
                                  >
                                    <X className="h-4 w-4" />
                                    Удалить
                                  </Button>
                                )}
                              </div>
                              {/* Fallback URL input */}
                              <Input
                                {...field}
                                placeholder="Или введите URL: https://example.com/cover.jpg"
                                className="text-xs"
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            Изображение для карточки в каталоге (рекомендуется 400x300px)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                        );
                      }}
                    />
                    {/* Cover Preview */}
                    {(coverPreview || form.watch('coverImage')) && (
                      <div className="border rounded-lg overflow-hidden bg-gray-50">
                        <div className="aspect-square max-w-48">
                          <img 
                            src={coverPreview || form.watch('coverImage')} 
                            alt="Превью обложки"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                            onLoad={() => console.log('Cover image loaded successfully')}
                          />
                        </div>
                        <div className="p-2 text-xs text-center text-muted-foreground">
                          Превью обложки карточки
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Banner Image */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">🎨 Баннер страницы</label>
                    <FormField
                      control={form.control}
                      name="bannerImage"
                      render={({ field }) => {
                        bannerFieldRef.current = field;
                        return (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-2">
                              <input
                                type="file"
                                id="banner-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleBannerUpload(file);
                                }}
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={uploadingBanner}
                                  onClick={() => document.getElementById('banner-upload')?.click()}
                                  className="gap-2"
                                >
                                  {uploadingBanner ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Загрузка...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4" />
                                      Загрузить баннер
                                    </>
                                  )}
                                </Button>
                                {field.value && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange('');
                                      setBannerPreview('');
                                    }}
                                    className="gap-2"
                                  >
                                    <X className="h-4 w-4" />
                                    Удалить
                                  </Button>
                                )}
                              </div>
                              {/* Fallback URL input */}
                              <Input
                                {...field}
                                placeholder="Или введите URL: https://example.com/banner.jpg"
                                className="text-xs"
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            Изображение для hero-баннера страницы (рекомендуется 1920x600px)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                        );
                      }}
                    />
                    {/* Banner Preview */}
                    {(bannerPreview || form.watch('bannerImage')) && (
                      <div className="border rounded-lg overflow-hidden bg-gray-50">
                        <div className="aspect-video max-w-64">
                          <img 
                            src={bannerPreview || form.watch('bannerImage')} 
                            alt="Превью баннера"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                            onLoad={() => console.log('Banner image loaded successfully')}
                          />
                        </div>
                        <div className="p-2 text-xs text-center text-muted-foreground">
                          Превью hero-баннера
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legacy imageUrl field for compatibility */}
                <div className="mt-6 pt-6 border-t">
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Устаревшее поле изображения (для совместимости)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://example.com/image.jpg"
                            className="text-xs"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Используется как fallback, если не указаны обложка или баннер
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                disabled={createMutation.isPending || updateMutation.isPending || uploadingCover || uploadingBanner}
                className="gap-2"
              >
                {editingSubcategory ? (
                  updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Сохранить изменения
                    </>
                  )
                ) : (
                  createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Создание...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Создать подкатегорию
                    </>
                  )
                )}
              </Button>
            </div>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubcategoryForm;