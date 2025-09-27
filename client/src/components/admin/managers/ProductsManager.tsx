import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { insertProductSchema, PHOTOBOOK_SIZES, PHOTOBOOK_FORMAT_LABELS, calculateAdditionalSpreadPrice, formatPhotobookSize } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Category, PhotobookFormat } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Edit, Trash2, Package } from "lucide-react";

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

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: currencies = [] } = useQuery<any[]>({ queryKey: ["/api/currencies"] });
  const { data: baseCurrency } = useQuery<any>({ queryKey: ["/api/currencies/base"] });

  // Find Armenian Dram currency
  const armenianDram = currencies?.find(c => c.code === 'AMD');
  const defaultCurrencyId = armenianDram?.id || baseCurrency?.id || '';

  const productForm = useForm({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: { ru: "", hy: "", en: "" },
      description: { ru: "", hy: "", en: "" },
      price: "0",
      currencyId: defaultCurrencyId,
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
      photobookFormat: "",
      photobookSize: "",
      minSpreads: 10,
      additionalSpreadPrice: "0",
      additionalSpreadCurrencyId: defaultCurrencyId,
      paperType: "",
      coverMaterial: "",
      bindingType: "",
      productionTime: 7,
      shippingTime: 3,
      weight: "",
      allowCustomization: true,
      minCustomPrice: "",
      minCustomPriceCurrencyId: defaultCurrencyId,
      isActive: true,
      sortOrder: 0,
      costPrice: "0",
      costCurrencyId: defaultCurrencyId,
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
      setLocalVideoPreviews([]);
      setUploadedVideos([]);
      setSelectedFormat("none");
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
      setLocalVideoPreviews([]);
      setUploadedVideos([]);
      setSelectedFormat("none");
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
    // Ensure required fields are set
    if (!data.categoryId || data.categoryId === "") {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите категорию для товара",
        variant: "destructive",
      });
      return;
    }

    if (!data.currencyId || data.currencyId === "") {
      data.currencyId = defaultCurrencyId;
    }

    // uploadedImages already contains correct object paths, no need for conversion
    console.log('Submitting images:', uploadedImages);
    console.log('Submitting videos:', uploadedVideos);
    
    // Convert "none" to null for photobook fields
    const cleanedData = {
      ...data,
      photobookFormat: data.photobookFormat === "none" ? null : data.photobookFormat,
      photobookSize: data.photobookSize === "none" ? null : data.photobookSize,
    };
    
    // Merge uploaded images and videos with form data
    const submitData = {
      ...cleanedData,
      images: uploadedImages.length > 0 ? uploadedImages : (cleanedData.images || []),
      videos: uploadedVideos.length > 0 ? uploadedVideos : (cleanedData.videos || [])
    };
    
    console.log('Submit data:', submitData);
    
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
    setLocalVideoPreviews(product.videos || []);
    setUploadedVideos(product.videos || []);
    setSelectedFormat((product.photobookFormat as PhotobookFormat | "none") || "none");
    
    productForm.reset({
      name: product.name as { ru: string; hy: string; en: string },
      description: product.description as { ru: string; hy: string; en: string },
      price: product.price,
      categoryId: product.categoryId || "",
      imageUrl: product.imageUrl || "",
      images: product.images || [],
      videoUrl: product.videoUrl || "",
      videos: product.videos || [],
      photobookFormat: product.photobookFormat || "none",
      photobookSize: product.photobookSize || "none",
      minSpreads: product.minSpreads || 10,
      additionalSpreadPrice: product.additionalSpreadPrice || "0",
      isActive: product.isActive ?? true,
      sortOrder: product.sortOrder || 0
    } as any);
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
                setUploadedVideos([]);
                setLocalVideoPreviews([]);
                setSelectedFormat("none");
                productForm.reset({
                  name: { ru: "", hy: "", en: "" },
                  description: { ru: "", hy: "", en: "" },
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
                          <FormLabel>Вез (кг)</FormLabel>
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

                {/* Video Upload Section */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Видео товара</h3>
                  
                  <FormField
                    control={productForm.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL основного видео</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/video.mp4" />
                        </FormControl>
                        <FormDescription>
                          Ссылка на основное видео товара (MP4, WebM, etc.)
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
                            checked={field.value}
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

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("productsList", { count: products.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("noProducts")}</p>
              <p className="text-sm">{t("noProductsDesc")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("image")}</TableHead>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("price")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const category = categories.find(c => c.id === product.categoryId);
                  return (
                    <TableRow key={product.id}>
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
