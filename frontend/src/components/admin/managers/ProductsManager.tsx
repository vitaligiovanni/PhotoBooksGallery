import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductFormSchema, PHOTOBOOK_SIZES, PHOTOBOOK_FORMAT_LABELS, calculateAdditionalSpreadPrice, formatPhotobookSize, InsertProductForm } from "@shared/public";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Category, PhotobookFormat } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export function ProductsManager() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
  const [localVideoPreviews, setLocalVideoPreviews] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<PhotobookFormat | "none">("none");
  const [hashtagInputs, setHashtagInputs] = useState({ ru: "", hy: "", en: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterName, setFilterName] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [filterLang, setFilterLang] = useState("");
  // Bulk move dialog state
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkMoveCategory, setBulkMoveCategory] = useState("");
  const [bulkMoveSubcategory, setBulkMoveSubcategory] = useState("");
  // Bulk hashtags dialog
  const [bulkTagsOpen, setBulkTagsOpen] = useState(false);
  const [bulkTags, setBulkTags] = useState({ ru: "", hy: "", en: "" });
  // Bulk status dialog
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<{ isActive?: boolean; inStock?: boolean; isOnSale?: boolean; discountPercentage?: number }>({});

  // Use admin endpoint to get ALL products including inactive ones
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery<Product[]>({ 
    queryKey: ["/api/products/admin"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/products/admin");
      return response.json();
    }
  });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: currencies = [] } = useQuery<any[]>({ queryKey: ["/api/currencies"] });
  const { data: baseCurrency } = useQuery<any>({ queryKey: ["/api/currencies/base"] });

  // Find Armenian Dram currency
  const armenianDram = currencies?.find(c => c.code === 'AMD');
  const defaultCurrencyId = armenianDram?.id || baseCurrency?.id || '';

  // Function to process hashtags from string input
  const processHashtags = (hashtagString: string): string[] => {
    if (!hashtagString.trim()) return [];
    
    return hashtagString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .filter(tag => /^[a-zA-Zа-яё\u0531-\u0587\u0561-\u0587\d\-_]+$/u.test(tag)) // Armenian and Russian letters, numbers, dashes, underscores
      .map(tag => `#${tag}`);
  };

  // Function to convert hashtag array to input string
  const hashtagsToString = (hashtags: string[]): string => {
    return hashtags.map(tag => tag.startsWith('#') ? tag.substring(1) : tag).join(', ');
  };

  const productForm = useForm<InsertProductForm>({
    resolver: zodResolver(insertProductFormSchema),
    defaultValues: {
      name: { ru: "", hy: "", en: "" },
      description: { ru: "", hy: "", en: "" },
      hashtags: { ru: [], hy: [], en: [] },
      price: "0",
      currencyId: defaultCurrencyId || "",
      originalPrice: "",
      discountPercentage: 0,
      inStock: true,
      stockQuantity: 0,
      isOnSale: false,
      categoryId: "",
  subcategoryId: "", // will be derived when submitting if user actually picked a subcategory (child)
      imageUrl: "",
      images: [],
      videoUrl: "",
      videos: [],
      photobookFormat: "none",
      photobookSize: "none",
      minSpreads: 10,
      additionalSpreadPrice: "0",
      specialPages: [] as ('graduation-albums' | 'premium-gifts' | 'one-day-books')[],
      additionalSpreadCurrencyId: defaultCurrencyId || "",
      paperType: "",
      coverMaterial: "",
      bindingType: "",
      productionTime: 7,
      shippingTime: 3,
      weight: "0",
      allowCustomization: true,
      isReadyMade: false,
      minCustomPrice: "0",
      minCustomPriceCurrencyId: defaultCurrencyId || "",
      isActive: true,
      sortOrder: 0,
      costPrice: "0",
      costCurrencyId: defaultCurrencyId || "",
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      // Invalidate both admin and public product caches to sync catalog
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin"] });
      setIsProductDialogOpen(false);
      setLocalPreviews([]);
      setUploadedImages([]);
      setLocalVideoPreviews([]);
      setUploadedVideos([]);
      setSelectedFormat("none");
      setHashtagInputs({ ru: "", hy: "", en: "" });
      productForm.reset({
        name: { ru: "", hy: "", en: "" },
        description: { ru: "", hy: "", en: "" },
        hashtags: { ru: [], hy: [], en: [] },
        price: "0",
        currencyId: defaultCurrencyId || "",
        originalPrice: "",
        discountPercentage: 0,
        inStock: true,
        stockQuantity: 0,
        isOnSale: false,
        categoryId: "",
        imageUrl: "",
        images: [],
        videoUrl: "",
        videos: [],
        photobookFormat: "none",
        photobookSize: "none",
        minSpreads: 10,
        additionalSpreadPrice: "0",
        specialPages: [],
        additionalSpreadCurrencyId: defaultCurrencyId || "",
        paperType: "",
        coverMaterial: "",
        bindingType: "",
        productionTime: 7,
        shippingTime: 3,
        weight: "0",
        allowCustomization: true,
        isReadyMade: false,
        minCustomPrice: "0",
        minCustomPriceCurrencyId: defaultCurrencyId || "",
        isActive: true,
        sortOrder: 0,
        costPrice: "0",
        costCurrencyId: defaultCurrencyId || "",
      });
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
      // Invalidate both admin and public product caches to sync catalog
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin"] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      setLocalPreviews([]);
      setUploadedImages([]);
      setLocalVideoPreviews([]);
      setUploadedVideos([]);
      setSelectedFormat("none");
      setHashtagInputs({ ru: "", hy: "", en: "" });
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
      // Invalidate both admin and public product caches to sync catalog
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin"] });
      toast({
        title: "Успех",
        description: "Товар успешно удален",
      });
    }
  });

  // Bulk move mutation
  const bulkMoveMutation = useMutation({
    mutationFn: async () => {
      // Clean payload - remove empty strings to avoid validation errors
      const moveAction: any = {};
      if (bulkMoveCategory && bulkMoveCategory.trim()) {
        moveAction.categoryId = bulkMoveCategory;
      }
      if (bulkMoveSubcategory && bulkMoveSubcategory.trim() && bulkMoveSubcategory !== 'none') {
        moveAction.subcategoryId = bulkMoveSubcategory;
      }

      const response = await apiRequest("PATCH", "/api/products/bulk", {
        productIds: Array.from(selectedIds),
        action: {
          move: moveAction
        }
      });
      return await response.json();
    },
    onSuccess: (res: any) => {
      // Invalidate both admin and public product caches to sync catalog
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin"] });
      toast({
        title: "Успех",
        description: `Перемещено товаров: ${res?.updatedCount ?? selectedIds.size}`
      });
      setBulkMoveOpen(false);
      clearSelection();
      setBulkMoveCategory("");
      setBulkMoveSubcategory("");
    },
    onError: (error: any) => {
      console.error('Bulk move error:', error);
      let errorMessage = "Не удалось переместить товары";
      
      // Try to extract detailed error message
      if (error?.message) {
        try {
          // apiRequest throws "status: responseText" format
          const parts = error.message.split(': ');
          if (parts.length >= 2) {
            const responseText = parts.slice(1).join(': ');
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorMessage;
              if (errorData.issues) {
                errorMessage += `: ${errorData.issues.map((i: any) => i.message).join(', ')}`;
              }
            } catch {
              errorMessage = responseText || errorMessage;
            }
          }
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const bulkHashtagsMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { productIds: Array.from(selectedIds), action: {} };
      const ru = processHashtags(bulkTags.ru);
      const hy = processHashtags(bulkTags.hy);
      const en = processHashtags(bulkTags.en);
      const append: any = {};
      if (ru.length) append.ru = ru;
      if (hy.length) append.hy = hy;
      if (en.length) append.en = en;
      if (Object.keys(append).length === 0) throw new Error("EMPTY");
      payload.action.appendHashtags = append;
      const response = await apiRequest("PATCH", "/api/products/bulk", payload);
      return await response.json();
    },
    onSuccess: (res: any) => {
      // Invalidate both admin and public product caches to sync catalog
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin"] });
      toast({ title: "Успех", description: `Добавлены хэштеги к ${res?.updatedCount ?? selectedIds.size} товарам` });
      setBulkTagsOpen(false);
      setBulkTags({ ru: "", hy: "", en: "" });
      clearSelection();
    },
    onError: (error: any) => {
      console.error('Bulk hashtags error:', error);
      let errorMessage = "Не удалось добавить хэштеги";
      
      if (error?.message && error.message !== "EMPTY") {
        try {
          const parts = error.message.split(': ');
          if (parts.length >= 2) {
            const responseText = parts.slice(1).join(': ');
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorMessage;
            } catch {
              errorMessage = responseText || errorMessage;
            }
          }
        } catch {
          errorMessage = error.message;
        }
      } else if (error?.message === "EMPTY") {
        errorMessage = "Введите хотя бы один хэштег";
      }
      
      toast({ title: "Ошибка", description: errorMessage, variant: "destructive" });
    }
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async () => {
      const { isActive, inStock, isOnSale, discountPercentage } = bulkStatus;
      const hasStatus = (isActive !== undefined) || (inStock !== undefined);
      const hasSale = (isOnSale !== undefined);
      if (!hasStatus && !hasSale) throw new Error("EMPTY");
      const action: any = {};
      if (hasStatus) action.setStatus = { isActive, inStock };
      if (hasSale) action.setSale = { isOnSale, discountPercentage: (isOnSale ? (discountPercentage ?? 0) : undefined) };
      const response = await apiRequest("PATCH", "/api/products/bulk", { productIds: Array.from(selectedIds), action });
      return await response.json();
    },
    onSuccess: (res: any) => {
      // Invalidate both admin and public product caches to sync catalog
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin"] });
      toast({ title: "Успех", description: `Обновлён статус у ${res?.updatedCount ?? selectedIds.size} товаров` });
      setBulkStatusOpen(false);
      setBulkStatus({});
      clearSelection();
    },
    onError: (error: any) => {
      console.error('Bulk status error:', error);
      let errorMessage = "Не удалось обновить статусы";
      
      if (error?.message && error.message !== "EMPTY") {
        try {
          const parts = error.message.split(': ');
          if (parts.length >= 2) {
            const responseText = parts.slice(1).join(': ');
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorMessage;
            } catch {
              errorMessage = responseText || errorMessage;
            }
          }
        } catch {
          errorMessage = error.message;
        }
      } else if (error?.message === "EMPTY") {
        errorMessage = "Выберите хотя бы один параметр для изменения";
      }
      
      toast({ title: "Ошибка", description: errorMessage, variant: "destructive" });
    }
  });

  const handleSubmit = (data: any) => {
    console.log('Form submission started with data:', data);
    
    // Более детальная валидация обязательных полей
    if (!data.categoryId || data.categoryId === "" || data.categoryId === "no-categories") {
      toast({
        title: "Ошибка валидации",
        description: "Пожалуйста, выберите категорию для товара. Если категории не загружаются, обновите страницу.",
        variant: "destructive",
      });
      return;
    }

    // Проверка наличия названия товара
    if (!data.name?.ru && !data.name?.en && !data.name?.hy) {
      toast({
        title: "Ошибка валидации",
        description: "Заполните название товара хотя бы на одном языке",
        variant: "destructive",
      });
      return;
    }

    // Проверка цены
    if (!data.price || parseFloat(data.price) <= 0) {
      toast({
        title: "Ошибка валидации", 
        description: "Укажите корректную цену товара",
        variant: "destructive",
      });
      return;
    }

    // Определение: выбранная позиция может быть корневой категорией или подкатегорией.
    // В списке мы кладём id выбранного элемента в categoryId. Если этот элемент имеет parentId, то это подкатегория.
    const selectedNode = categories?.find(c => c.id === data.categoryId);
    let finalCategoryId = data.categoryId;
    let finalSubcategoryId: string | undefined = undefined;
    if (selectedNode && selectedNode.parentId) {
      finalCategoryId = selectedNode.parentId;
      finalSubcategoryId = selectedNode.id;
    }

    // Авто-синхронизация наличия с количеством: если quantity>0 -> inStock true, иначе false.
    const quantityNum = typeof data.stockQuantity === 'number' ? data.stockQuantity : parseInt(String(data.stockQuantity||0),10);
    const derivedInStock = quantityNum > 0;
    if (data.inStock !== derivedInStock) {
      data.inStock = derivedInStock;
    }

    // Установка валюты по умолчанию
    if (!data.currencyId || data.currencyId === "") {
      data.currencyId = defaultCurrencyId;
      console.log('Using default currency:', defaultCurrencyId);
    }

    console.log('Submitting images:', uploadedImages);
    console.log('Submitting videos:', uploadedVideos);
    
    // Process hashtags from string inputs to arrays
    const processedHashtags = {
      ru: processHashtags(hashtagInputs.ru),
      hy: processHashtags(hashtagInputs.hy),
      en: processHashtags(hashtagInputs.en)
    };
    
    // Очистка данных фотокниги
    const cleanedData = {
      ...data,
      categoryId: finalCategoryId,
      ...(finalSubcategoryId ? { subcategoryId: finalSubcategoryId } : { subcategoryId: undefined }),
      photobookFormat: data.photobookFormat === "none" ? null : data.photobookFormat,
      photobookSize: data.photobookSize === "none" ? null : data.photobookSize,
      // Очистка пустых строк для числовых полей
      originalPrice: data.originalPrice === "" ? null : data.originalPrice,
      weight: data.weight === "" ? null : data.weight,
      minCustomPrice: data.minCustomPrice === "" ? null : data.minCustomPrice,
    };
    
    // Объединение загруженных файлов с данными формы
    const submitData = {
      ...cleanedData,
      hashtags: processedHashtags,
      images: uploadedImages.length > 0 ? uploadedImages : (cleanedData.images || []),
      videos: uploadedVideos.length > 0 ? uploadedVideos : (cleanedData.videos || [])
    };
    
    console.log('Final submit data:', JSON.stringify(submitData, null, 2));
    
    if (editingProduct) {
      console.log('Updating product:', editingProduct.id);
      updateProductMutation.mutate({ id: editingProduct.id, data: submitData });
    } else {
      console.log('Creating new product');
      createProductMutation.mutate(submitData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Set existing images as previews so they are displayed
    setLocalPreviews(product.images || []);
    setUploadedImages(product.images || []);
    setLocalVideoPreviews(product.videos || []);
    setUploadedVideos(product.videos || []);
    setSelectedFormat((product.photobookFormat as PhotobookFormat | "none") || "none");
    
    // Convert hashtags arrays to string inputs
    const existingHashtags = product.hashtags as { ru?: string[], hy?: string[], en?: string[] } || {};
    setHashtagInputs({
      ru: hashtagsToString(existingHashtags.ru || []),
      hy: hashtagsToString(existingHashtags.hy || []),
      en: hashtagsToString(existingHashtags.en || [])
    });
    
    productForm.reset({
      name: product.name as { ru: string; hy: string; en: string } || { ru: "", hy: "", en: "" },
      description: product.description as { ru: string; hy: string; en: string } || { ru: "", hy: "", en: "" },
      hashtags: product.hashtags as { ru: string[]; hy: string[]; en: string[] } || { ru: [], hy: [], en: [] },
      price: product.price || "0",
      currencyId: product.currencyId || defaultCurrencyId || "",
      originalPrice: product.originalPrice || "",
      discountPercentage: product.discountPercentage || 0,
      inStock: product.inStock ?? true,
      stockQuantity: product.stockQuantity || 0,
      isOnSale: product.isOnSale || false,
      // Показать в селекте подкатегорию если она есть, иначе корневую категорию
      categoryId: (product.subcategoryId ? product.subcategoryId : product.categoryId) || "",
      subcategoryId: product.subcategoryId || "",
      imageUrl: product.imageUrl || "",
      images: [],
      videoUrl: product.videoUrl || "",
      videos: [],
      photobookFormat: product.photobookFormat || "none",
      photobookSize: product.photobookSize || "none",
      minSpreads: product.minSpreads || 10,
      additionalSpreadPrice: product.additionalSpreadPrice || "0",
      specialPages: (product.specialPages as Array<'graduation-albums' | 'premium-gifts' | 'one-day-books'>) || [],
      additionalSpreadCurrencyId: product.additionalSpreadCurrencyId || defaultCurrencyId || "",
      paperType: product.paperType || "",
      coverMaterial: product.coverMaterial || "",
      bindingType: product.bindingType || "",
      productionTime: product.productionTime || 7,
      shippingTime: product.shippingTime || 3,
      weight: product.weight || "0",
      allowCustomization: product.allowCustomization ?? true,
      isReadyMade: product.isReadyMade ?? false,
      minCustomPrice: product.minCustomPrice || "0",
      minCustomPriceCurrencyId: product.minCustomPriceCurrencyId || defaultCurrencyId || "",
      isActive: product.isActive ?? true,
      sortOrder: product.sortOrder || 0,
      costPrice: product.costPrice || "0",
      costCurrencyId: product.costCurrencyId || defaultCurrencyId || "",
    });
    setIsProductDialogOpen(true);
  };

  const handleGetUploadParameters = async () => {
    try {
      // Генерируем уникальный ID для файла
      const fileId = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const uploadURL = `/api/local-upload/${fileId}`;
      console.log("Generated upload URL:", uploadURL);
      return {
        method: "PUT" as const,
        url: uploadURL,
      };
    } catch (error) {
      console.error("Error generating upload URL:", error);
      throw error;
    }
  };

  const handleFilesAdded = (previews: string[], isVideo: boolean = false) => {
    // Add local previews immediately when files are selected
    if (isVideo) {
      setLocalVideoPreviews(prev => [...prev, ...previews]);
    } else {
      setLocalPreviews(prev => [...prev, ...previews]);
    }
  };

  const handleUploadComplete = (result: { successful: Array<{ uploadURL: string }> }, isVideo: boolean = false) => {
    const newUrls = result.successful.map(file => {
      const uploadURL = file.uploadURL;
      console.log('Upload URL:', uploadURL);
      
      // Convert to object path for database storage
      try {
        const urlObj = new URL(uploadURL, window.location.origin);
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
    if (isVideo) {
      setUploadedVideos(prev => [...prev, ...newUrls]);
      toast({
        title: "Успех",
        description: `Загружено ${newUrls.length} видео`,
      });
    } else {
      setUploadedImages(prev => [...prev, ...newUrls]);
      toast({
        title: "Успех",
        description: `Загружено ${newUrls.length} изображений`,
      });
    }
  };

  const removeImage = (index: number, isVideo: boolean = false) => {
    if (isVideo) {
      // Remove local video preview
      setLocalVideoPreviews(prev => prev.filter((_, i) => i !== index));
      
      // Also remove corresponding uploaded video if it exists
      if (index < uploadedVideos.length) {
        setUploadedVideos(prev => prev.filter((_, i) => i !== index));
      }
    } else {
      // Remove local preview
      setLocalPreviews(prev => prev.filter((_, i) => i !== index));
      
      // Also remove corresponding uploaded image if it exists
      if (index < uploadedImages.length) {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот товар?")) {
      deleteProductMutation.mutate(id);
    }
  };

  const subcategories = (categories || []).filter(c => c.parentId);
  const rootCategories = (categories || []).filter(c => !c.parentId);

  const filteredProducts = (products || []).filter(p => {
    if (filterName) {
      const lowered = filterName.toLowerCase();
      const names: string[] = [];
      const nameVal: any = (p as any).name;
      if (nameVal && typeof nameVal === 'object') {
        for (const v of Object.values(nameVal)) if (typeof v === 'string') names.push(v.toLowerCase());
      } else if (typeof nameVal === 'string') {
        names.push((nameVal as string).toLowerCase());
      }
      if (!names.some(n => n.includes(lowered))) return false;
    }
    if (filterCategory) {
      if (p.categoryId !== filterCategory) return false;
    }
    if (filterSubcategory) {
      if (p.subcategoryId !== filterSubcategory) return false;
    }
    if (filterLang) {
      if (!(p.name && typeof p.name === 'object' && (p.name as any)[filterLang] && (p.name as any)[filterLang].trim().length > 0)) return false;
    }
    return true;
  });

  const allVisibleSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));
  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredProducts.forEach(p => next.delete(p.id));
      } else {
        filteredProducts.forEach(p => next.add(p.id));
      }
      return next;
    });
  };
  const toggleSingle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const handleConfirmBulkMove = () => {
    if (!bulkMoveCategory) {
      toast({
        title: "Категория не выбрана",
        description: "Пожалуйста, выберите целевую категорию",
        variant: "destructive"
      });
      return;
    }
    bulkMoveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Bulk selection toolbar (appears when selection not empty) */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-30 bg-white border rounded-md p-3 flex flex-wrap items-center gap-4 shadow-sm">
          <span className="text-sm font-medium">Выбрано: {selectedIds.size}</span>
          <Button variant="outline" size="sm" onClick={clearSelection}>Сбросить</Button>
          <Button variant="default" size="sm" onClick={() => setBulkMoveOpen(true)} disabled={selectedIds.size === 0}>Переместить</Button>
          <Button variant="outline" size="sm" onClick={() => setBulkTagsOpen(true)}>Хэштеги</Button>
          <Button variant="outline" size="sm" onClick={() => setBulkStatusOpen(true)}>Статус / Акция</Button>
        </div>
      )}

      {/* Bulk move dialog */}
      <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Переместить товары</DialogTitle>
            <DialogDescription>
              Выберите новую категорию и (опционально) подкатегорию для {selectedIds.size} выбранных товаров.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Категория</label>
              <Select value={bulkMoveCategory} onValueChange={(v) => { setBulkMoveCategory(v); setBulkMoveSubcategory(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {rootCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{(c.name as any)?.ru || c.slug}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Подкатегория (опционально)</label>
              <Select value={bulkMoveSubcategory} onValueChange={(v) => setBulkMoveSubcategory(v === 'none' ? '' : v)} disabled={!bulkMoveCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={bulkMoveCategory ? 'Выберите подкатегорию' : 'Сначала выберите категорию'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без подкатегории</SelectItem>
                  {subcategories
                    .filter(sc => sc.parentId === bulkMoveCategory)
                    .map(sc => (
                      <SelectItem key={sc.id} value={sc.id}>{(sc.name as any)?.ru || sc.slug}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setBulkMoveOpen(false); }} disabled={bulkMoveMutation.isPending}>Отмена</Button>
              <Button type="button" onClick={handleConfirmBulkMove} disabled={bulkMoveMutation.isPending}>
                {bulkMoveMutation.isPending ? 'Перемещение...' : 'Переместить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk hashtags dialog */}
      <Dialog open={bulkTagsOpen} onOpenChange={setBulkTagsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить хэштеги</DialogTitle>
            <DialogDescription>Новые хэштеги будут добавлены (объединены) к уже существующим у выбранных товаров.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4">
            {(['ru','hy','en'] as const).map(lang => (
              <div key={lang} className="space-y-2">
                <label className="text-xs uppercase tracking-wide font-semibold">{lang.toUpperCase()}</label>
                <Input value={bulkTags[lang]} onChange={e => setBulkTags(prev => ({ ...prev, [lang]: e.target.value }))} placeholder="tag1, tag2" />
                <div className="flex flex-wrap gap-1 min-h-[24px]">
                  {processHashtags(bulkTags[lang]).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px]">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setBulkTagsOpen(false)} disabled={bulkHashtagsMutation.isPending}>Отмена</Button>
            <Button type="button" onClick={() => bulkHashtagsMutation.mutate()} disabled={bulkHashtagsMutation.isPending}>
              {bulkHashtagsMutation.isPending ? 'Сохранение...' : 'Добавить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk status dialog */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Изменить статус</DialogTitle>
            <DialogDescription>Укажите новые значения. Пустые поля не изменят соответствующие атрибуты.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox checked={bulkStatus.isActive === true} onCheckedChange={(v) => setBulkStatus(s => ({ ...s, isActive: v ? true : undefined }))} />
                <span className="text-sm">Активен</span>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={bulkStatus.inStock === true} onCheckedChange={(v) => setBulkStatus(s => ({ ...s, inStock: v ? true : undefined }))} />
                <span className="text-sm">В наличии</span>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={bulkStatus.isOnSale === true} onCheckedChange={(v) => setBulkStatus(s => ({ ...s, isOnSale: v ? true : undefined }))} />
                <span className="text-sm">Акция</span>
              </div>
              {bulkStatus.isOnSale && (
                <div className="flex items-center space-x-2 col-span-2">
                  <Input type="number" min={0} max={90} value={bulkStatus.discountPercentage ?? ''} placeholder="Скидка %" onChange={(e) => setBulkStatus(s => ({ ...s, discountPercentage: e.target.value === '' ? undefined : Math.min(90, Math.max(0, parseInt(e.target.value)||0)) }))} className="w-40" />
                  <span className="text-xs text-muted-foreground">(если пусто — 0)</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => { setBulkStatusOpen(false); }} disabled={bulkStatusMutation.isPending}>Отмена</Button>
              <Button type="button" onClick={() => bulkStatusMutation.mutate()} disabled={bulkStatusMutation.isPending}>
                {bulkStatusMutation.isPending ? 'Применение...' : 'Применить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                setUploadedVideos([]);
                setLocalVideoPreviews([]);
                setSelectedFormat("none");
                setHashtagInputs({ ru: "", hy: "", en: "" });
                productForm.reset({
                  name: { ru: "", hy: "", en: "" },
                  description: { ru: "", hy: "", en: "" },
                  hashtags: { ru: [], hy: [], en: [] },
                  price: "0",
                  currencyId: defaultCurrencyId,
                  categoryId: "",
                  imageUrl: "",
                  images: [],
                  videoUrl: "",
                  videos: [],
                  photobookFormat: "none",
                  photobookSize: "none",
                  minSpreads: 10,
                  additionalSpreadPrice: "0",
                  specialPages: [],
                  isActive: true,
                  sortOrder: 0
                } as any);
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
                            <SelectTrigger aria-label="Выбор категории или подкатегории">
                              <SelectValue placeholder="Выберите категорию" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-80">
                            {(() => {
                              if (!categories || categories.length === 0) {
                                return (
                                  <SelectItem value="no-categories" disabled>
                                    {categories?.length === 0 ? 'Нет доступных категорий' : 'Загрузка категорий...'}
                                  </SelectItem>
                                );
                              }
                              // Разделяем на корневые и дочерние
                              const roots = categories.filter(c => !c.parentId);
                              const byParent = new Map<string, typeof categories>();
                              categories.filter(c => c.parentId).forEach(c => {
                                if (!byParent.has(c.parentId!)) byParent.set(c.parentId!, [] as any);
                                byParent.get(c.parentId!)!.push(c);
                              });
                              const resolveName = (cat: any) => {
                                if (cat.name) {
                                  if (typeof cat.name === 'object' && cat.name !== null) {
                                    return cat.name.ru || cat.name.en || cat.name.hy || cat.slug || cat.id;
                                  }
                                  return cat.name;
                                }
                                return cat.slug || cat.id;
                              };
                              const collator = new Intl.Collator('ru', { sensitivity: 'base' });
                              const items: React.ReactNode[] = [];
                              roots.sort((a,b)=>collator.compare(resolveName(a), resolveName(b))).forEach(root => {
                                const rootName = resolveName(root);
                                items.push(
                                  <SelectItem
                                    key={root.id}
                                    value={root.id}
                                    title={`Категория: ${rootName}`}
                                    className="font-medium text-foreground flex items-center gap-2 py-2"
                                  >
                                    <span role="img" aria-hidden="true" className="opacity-80">📁</span>
                                    <span>{rootName}</span>
                                  </SelectItem>
                                );
                                const children = (byParent.get(root.id) || []).sort((a,b)=>collator.compare(resolveName(a), resolveName(b)));
                                if (children.length) {
                                  children.forEach(sub => {
                                    const subName = resolveName(sub);
                                    items.push(
                                      <SelectItem
                                        key={sub.id}
                                        value={sub.id}
                                        title={`Подкатегория: ${subName} (родитель: ${rootName})`}
                                        className="pl-7 relative text-sm text-muted-foreground flex items-center gap-1 py-1.5"
                                      >
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-px bg-border" aria-hidden="true" />
                                        <span className="opacity-70" aria-hidden="true">↳</span>
                                        <span>{subName}</span>
                                      </SelectItem>
                                    );
                                  });
                                  // разделитель визуальный
                                  items.push(
                                    <div key={root.id+':sep'} className="h-px my-1 bg-border/50 mx-1 last:hidden" aria-hidden="true" />
                                  );
                                }
                              });
                              if (items.length && (items[items.length-1] as any).key?.endsWith(':sep')) items.pop();
                              return items;
                            })()}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Жирным — категории верхнего уровня. Подкатегории отмечены стрелкой ↳ и смещены вправо.
                        </FormDescription>
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
                            <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
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
                              value={field.value ?? 0}
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
                              value={field.value ?? 0}
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
                              checked={field.value ?? true}
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
                              checked={field.value ?? false}
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
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
                              value={field.value ?? ''}
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
                              value={field.value ?? ''}
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
                          <FormLabel>Вез (кг)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
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
                            <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
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
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={productForm.control}
                    name="isReadyMade"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-green-50 border-green-200">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold text-green-800">🎯 Готовый товар</FormLabel>
                          <FormDescription className="text-green-700">
                            Товар готов к отправке (рамки, альбомы). Не требует регистрации клиента для заказа.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-green-600"
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
                            value={field.value ?? undefined}
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
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
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
                                value={field.value ?? ''}
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
                              <Input type="number" step="0.01" {...field} value={field.value ?? ''} readOnly className="bg-gray-50" />
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
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Галерея изображений (6-10 фото)</div>
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

                {/* Video Upload Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Видео товара</h3>
                  
                  <FormField
                    control={productForm.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL основного видео (опционально)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            placeholder="https://example.com/video.mp4" 
                            type="url"
                            onBlur={(e) => {
                              // Валидация URL только при потере фокуса, не при отправке формы
                              const value = e.target.value;
                              if (value && !value.match(/^https?:\/\/.+/)) {
                                // Показать предупреждение, но не блокировать
                                console.warn('Invalid video URL format');
                              }
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Введите ссылку на видео ИЛИ используйте загрузчик файлов ниже. Поле необязательное.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel>Дополнительные видео (до 5 видео)</FormLabel>
                      <ObjectUploader
                        maxNumberOfFiles={5}
                        maxFileSize={10485760} // 10MB
                        accept="video/*"
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={(result) => handleUploadComplete(result, true)}
                        onFilesAdded={(previews) => handleFilesAdded(previews, true)}
                        buttonClassName="bg-purple-500 hover:bg-purple-600"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Загрузить видео
                      </ObjectUploader>
                    </div>

                    {/* Video Preview Grid */}
                    {localVideoPreviews.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        {localVideoPreviews.map((preview, index) => {
                          const isUploaded = index < uploadedVideos.length;
                          return (
                            <div key={`video-preview-${index}`} className="relative group">
                              <video
                                src={preview}
                                className={`w-full h-32 object-cover rounded border ${
                                  isUploaded ? 'border-green-300' : 'border-purple-300'
                                }`}
                                controls
                                muted
                              />
                              <div className={`absolute top-1 left-1 text-white text-xs px-1 rounded ${
                                isUploaded ? 'bg-green-500' : 'bg-purple-500'
                              }`}>
                                {isUploaded ? 'Загружено' : 'Локальный'}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(index, true)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                  <FormField
                    control={productForm.control}
                    name="description.hy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Նկարագրություն (HY)</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={productForm.control}
                    name="description.en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("descriptionEn")}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Hashtags Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Хэштеги для SEO</h3>
                  <p className="text-sm text-muted-foreground">
                    Введите ключевые слова через запятую без символа #. Они будут добавлены в мета-теги для улучшения SEO.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="hashtags-ru" className="text-sm font-medium">
                        Хэштеги (RU)
                      </label>
                      <Input
                        id="hashtags-ru"
                        value={hashtagInputs.ru}
                        onChange={(e) => setHashtagInputs(prev => ({ ...prev, ru: e.target.value }))}
                        placeholder="фотокнига, свадьба, память"
                      />
                      {hashtagInputs.ru && (
                        <div className="flex flex-wrap gap-1">
                          {processHashtags(hashtagInputs.ru).map((tag, index) => (
                            <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="hashtags-hy" className="text-sm font-medium">
                        Hashtags (HY)
                      </label>
                      <Input
                        id="hashtags-hy"
                        value={hashtagInputs.hy}
                        onChange={(e) => setHashtagInputs(prev => ({ ...prev, hy: e.target.value }))}
                        placeholder="ֆոտոգիրք, հարսանիք, հիշողություն"
                      />
                      {hashtagInputs.hy && (
                        <div className="flex flex-wrap gap-1">
                          {processHashtags(hashtagInputs.hy).map((tag, index) => (
                            <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="hashtags-en" className="text-sm font-medium">
                        Hashtags (EN)
                      </label>
                      <Input
                        id="hashtags-en"
                        value={hashtagInputs.en}
                        onChange={(e) => setHashtagInputs(prev => ({ ...prev, en: e.target.value }))}
                        placeholder="photobook, wedding, memory"
                      />
                      {hashtagInputs.en && (
                        <div className="flex flex-wrap gap-1">
                          {processHashtags(hashtagInputs.en).map((tag, index) => (
                            <span key={index} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Special Pages Assignment Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Специальные страницы</h3>
                  <p className="text-sm text-muted-foreground">
                    Выберите страницы, на которых должен отображаться этот товар (в дополнение к основной категории)
                  </p>
                  
                  <FormField
                    control={productForm.control}
                    name="specialPages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Страницы для отображения</FormLabel>
                        <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="graduation-albums"
                              checked={field.value?.includes('graduation-albums') || false}
                              onChange={(e) => {
                                const current = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...current.filter(p => p !== 'graduation-albums'), 'graduation-albums']);
                                } else {
                                  field.onChange(current.filter(p => p !== 'graduation-albums'));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor="graduation-albums" className="text-sm font-medium">
                              Выпускные альбомы
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="premium-gifts"
                              checked={field.value?.includes('premium-gifts') || false}
                              onChange={(e) => {
                                const current = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...current.filter(p => p !== 'premium-gifts'), 'premium-gifts']);
                                } else {
                                  field.onChange(current.filter(p => p !== 'premium-gifts'));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor="premium-gifts" className="text-sm font-medium">
                              Премиум подарки
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="one-day-books"
                              checked={field.value?.includes('one-day-books') || false}
                              onChange={(e) => {
                                const current = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...current.filter(p => p !== 'one-day-books'), 'one-day-books']);
                                } else {
                                  field.onChange(current.filter(p => p !== 'one-day-books'));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor="one-day-books" className="text-sm font-medium">
                              Фотокниги за день
                            </label>
                          </div>
                        </div>
                        <FormDescription>
                          Товар будет отображаться в выбранных специальных разделах в дополнение к основной категории
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={productForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">{t("productActive")}</FormLabel>
                          <FormDescription>
                            {t("productActiveDesc")}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={productForm.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("sortOrder")}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProductDialogOpen(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {editingProduct ? t("saveChanges") : t("createProduct")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Название</label>
            <Input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Поиск по названию" />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Категория</label>
            <Select value={filterCategory} onValueChange={v => { setFilterCategory(v === 'all' ? '' : v); setFilterSubcategory(''); }}>
              <SelectTrigger><SelectValue placeholder="Все" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {rootCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{(c.name as any)?.ru || c.slug}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Подкатегория</label>
            <Select value={filterSubcategory} onValueChange={v => setFilterSubcategory(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Все" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {subcategories
                  .filter(sc => !filterCategory || sc.parentId === filterCategory)
                  .map(sc => (
                    <SelectItem key={sc.id} value={sc.id}>{(sc.name as any)?.ru || sc.slug}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Язык имени</label>
            <Select value={filterLang} onValueChange={v => setFilterLang(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Любой" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любой</SelectItem>
                <SelectItem value="ru">RU</SelectItem>
                <SelectItem value="hy">HY</SelectItem>
                <SelectItem value="en">EN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="ghost" type="button" onClick={() => { setFilterName(''); setFilterCategory(''); setFilterSubcategory(''); setFilterLang(''); }} className="w-full">Сброс</Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("productsList", { count: products.length })}
            {productsLoading && " (загрузка...)"}
            {productsError && " (ошибка загрузки)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Загрузка товаров...</p>
            </div>
          ) : productsError ? (
            <div className="text-center py-12 text-red-500">
              <p>Ошибка загрузки товаров: {productsError.message}</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/products/admin"] })}
                className="mt-2"
              >
                Повторить
              </Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Нет товаров по фильтрам (всего товаров: {products.length})</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAllVisible} aria-label="Выбрать все" />
                  </TableHead>
                  <TableHead>{t("image")}</TableHead>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("price")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => {
                  const category = categories.find(c => c.id === product.categoryId);
                  return (
                    <TableRow key={product.id} data-selected={selectedIds.has(product.id)} className={selectedIds.has(product.id) ? 'bg-blue-50' : ''}>
                      <TableCell className="w-10 align-middle">
                        <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSingle(product.id)} aria-label="Выбрать" />
                      </TableCell>
                      <TableCell>
                        {(product.images && product.images.length > 0) ? (
                          <img
                            src={product.images[0]}
                            alt={typeof product.name === 'object' && product.name !== null 
                              ? (product.name as any).ru || 'Товар'
                              : 'Товар'
                            }
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              // Fallback to imageUrl if first image fails
                              if (product.imageUrl) {
                                (e.target as HTMLImageElement).src = product.imageUrl;
                              } else {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }
                            }}
                          />
                        ) : product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={typeof product.name === 'object' && product.name !== null 
                              ? (product.name as any).ru || 'Товар'
                              : 'Товар'
                            }
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        
                        {/* Fallback placeholder */}
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center hidden">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {typeof product.name === 'object' && product.name !== null 
                          ? (product.name as any).ru || 'Без названия'
                          : t("noName")
                        }
                      </TableCell>
                      <TableCell>
                        {category ? (category.name as any)?.ru || category.id : t("noCategory")}
                      </TableCell>
                      <TableCell>
                        {parseFloat(product.price).toLocaleString('ru-RU')} AMD
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "active" : "inactive"}
                          </Badge>
                          {product.isOnSale && (
                            <Badge variant="destructive" className="text-xs">
                              sale {product.discountPercentage}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {t("edit")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            disabled={deleteProductMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t("delete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
