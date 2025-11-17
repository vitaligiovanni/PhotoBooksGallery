import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import type { Banner } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Edit, Trash2, Eye, EyeOff, Target, BarChart3, Check, ChevronsUpDown, X as IconX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export function BannersManager() {
  const { toast } = useToast();
  const [isBannerDialogOpen, setIsBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const { data: banners = [] } = useQuery<Banner[]>({ queryKey: ["/api/banners"] });

  const bannerForm = useForm({
    defaultValues: {
      name: "",
      type: "header" as "header" | "fullscreen" | "sidebar" | "inline" | "popup",
      title: { ru: "", hy: "", en: "" },
      content: { ru: "", hy: "", en: "" },
      imageUrl: "",
      buttonText: { ru: "", hy: "", en: "" },
      buttonLink: "",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      position: "top",
      priority: 0,
      isActive: false,
      status: "draft" as "draft" | "active" | "paused" | "expired",
      startDate: "",
      endDate: "",
      targetPages: [] as string[],
      targetUsers: "all",
      maxImpressions: null as number | null,
      maxClicks: null as number | null,
    }
  });

  // Предзаполнение формы при редактировании
  useEffect(() => {
    if (editingBanner) {
      bannerForm.reset({
        name: editingBanner.name || "",
        type: editingBanner.type || "header",
        title: editingBanner.title || { ru: "", hy: "", en: "" },
        content: editingBanner.content || { ru: "", hy: "", en: "" },
        imageUrl: editingBanner.imageUrl || "",
        buttonText: editingBanner.buttonText || { ru: "", hy: "", en: "" },
        buttonLink: editingBanner.buttonLink || "",
        backgroundColor: editingBanner.backgroundColor || "#ffffff",
        textColor: editingBanner.textColor || "#000000",
        position: editingBanner.position || "top",
        priority: editingBanner.priority || 0,
        isActive: editingBanner.isActive ?? false,
        status: editingBanner.status || "draft",
        startDate: editingBanner.startDate ? new Date(editingBanner.startDate).toISOString().slice(0, 16) : "",
        endDate: editingBanner.endDate ? new Date(editingBanner.endDate).toISOString().slice(0, 16) : "",
        targetPages: editingBanner.targetPages || [],
        targetUsers: editingBanner.targetUsers || "all",
        maxImpressions: editingBanner.maxImpressions ?? null,
        maxClicks: editingBanner.maxClicks ?? null,
      });
    } else {
      bannerForm.reset({
        name: "",
        type: "header",
        title: { ru: "", hy: "", en: "" },
        content: { ru: "", hy: "", en: "" },
        imageUrl: "",
        buttonText: { ru: "", hy: "", en: "" },
        buttonLink: "",
        backgroundColor: "#ffffff",
        textColor: "#000000",
        position: "top",
        priority: 0,
        isActive: false,
        status: "draft",
        startDate: "",
        endDate: "",
        targetPages: [],
        targetUsers: "all",
        maxImpressions: null,
        maxClicks: null,
      });
    }
  }, [editingBanner, bannerForm]);

  const createBannerMutation = useMutation({
    mutationFn: async (data: any) => {
      // Преобразуем даты
      const processedData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        targetPages: data.targetPages || [],
      };

      // Если админ включил переключатель — делаем статус ACTIVE, чтобы баннер сразу показывался
      if (processedData.isActive && processedData.status !== 'active') {
        (processedData as any).status = 'active';
      }

      if (editingBanner) {
        return await apiRequest("PUT", `/api/banners/${editingBanner.id}`, processedData);
      } else {
        return await apiRequest("POST", "/api/banners", processedData);
      }
    },
    onSuccess: () => {
      const wasEditing = !!editingBanner;
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      setIsBannerDialogOpen(false);
      setEditingBanner(null);
      bannerForm.reset();
      toast({
        title: "Успех",
        description: wasEditing ? "Баннер успешно обновлен" : "Баннер успешно создан",
      });
    },
    onError: (error) => {
      console.error("Banner mutation error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить баннер",
        variant: "destructive",
      });
    }
  });

  const toggleBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/banners/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({
        title: "Успех",
        description: "Статус баннера изменен",
      });
    }
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({
        title: "Успех",
        description: "Баннер удален",
      });
    }
  });

  const handleBannerSubmit = async (data: any) => {
    console.log("Submitting banner data:", data);
    createBannerMutation.mutate(data);
  };

  const handleDeleteBanner = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот баннер?")) {
      deleteBannerMutation.mutate(id);
    }
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setIsBannerDialogOpen(true);
  };

  const handleToggleBanner = (id: string) => {
    toggleBannerMutation.mutate(id);
  };

  const getStatusBadge = (banner: Banner) => {
    if (!banner.isActive) return <Badge variant="secondary">Неактивен</Badge>;
    if (banner.status === 'active') return <Badge variant="default">Активен</Badge>;
    if (banner.status === 'draft') return <Badge variant="outline">Черновик</Badge>;
    return <Badge variant="destructive">Приостановлен</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const types = {
      header: 'Верхний',
      fullscreen: 'Полноэкранный',
      sidebar: 'Боковой',
      inline: 'Встроенный',
      popup: 'Попап'
    };
    return types[type as keyof typeof types] || type;
  };

  const getLocalizedText = (field: any, lang: string = 'ru') => {
    if (typeof field === 'string') return field;
    if (field && typeof field === 'object') return field[lang] || field.ru || '';
    return '';
  };

  // Предустановленный список популярных страниц приложения для таргетинга
  const PAGE_OPTIONS: { value: string; label: string }[] = [
    { value: '/', label: 'Главная (/)'},
    { value: '/catalog', label: 'Каталог (/catalog)'},
    { value: '/cart', label: 'Корзина (/cart)'},
    { value: '/editor', label: 'Редактор (/editor)'},
    { value: '/blog', label: 'Блог (/blog)'},
    { value: '/about', label: 'О нас (/about)'},
  ];

  const togglePageInSelection = (current: unknown, page: string): string[] => {
    const list = Array.isArray(current) ? [...current] as string[] : [];
    const idx = list.indexOf(page);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(page);
    }
    return list;
  };

  // Доступные страницы/маршруты приложения для таргетинга
  const AVAILABLE_PAGES: { value: string; label: string }[] = [
    { value: "/", label: "Главная (/)" },
    { value: "/catalog", label: "Каталог (/catalog)" },
    { value: "/product/:id", label: "Карточка товара (/product/:id)" },
    { value: "/cart", label: "Корзина (/cart)" },
    { value: "/editor", label: "Редактор (/editor)" },
    { value: "/blog", label: "Блог (/blog)" },
    { value: "/about", label: "О нас (/about)" },
    { value: "/page/:slug", label: "Страницы конструктора (/page/:slug)" },
  ];

  const selectedPages = bannerForm.watch("targetPages") as string[];
  const isPageSelected = (p: string) => (selectedPages || []).includes(p);
  const togglePage = (p: string) => {
    const current = new Set<string>(selectedPages || []);
    if (current.has(p)) current.delete(p); else current.add(p);
    bannerForm.setValue("targetPages", Array.from(current));
  };
  const clearPages = () => bannerForm.setValue("targetPages", []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Управление баннерами</h1>
          <p className="text-muted-foreground mt-2">Создавайте и управляйте маркетинговыми баннерами</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await apiRequest('POST', '/api/banners/seed/test-home');
                queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
                toast({ title: 'Создан тестовый баннер', description: 'Проверьте главную страницу /' });
              } catch (e) {
                toast({ title: 'Не удалось создать тестовый баннер', variant: 'destructive' });
              }
            }}
          >
            Создать тестовый баннер
          </Button>
        <Dialog open={isBannerDialogOpen} onOpenChange={(open) => {
          setIsBannerDialogOpen(open);
          if (!open) {
            setEditingBanner(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600"
              onClick={() => {
                setEditingBanner(null);
                setIsBannerDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Новый баннер
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBanner ? "Редактировать баннер" : "Создать баннер"}</DialogTitle>
              <DialogDescription>
                {editingBanner ? "Внесите изменения в баннер" : "Создайте новый маркетинговый баннер"}
              </DialogDescription>
            </DialogHeader>
            <Form {...bannerForm}>
              <form onSubmit={bannerForm.handleSubmit(handleBannerSubmit)} className="space-y-6">
                {/* Основная информация */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={bannerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название баннера</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Летняя скидка 30%" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bannerForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип баннера</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите тип" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="header">Верхний баннер</SelectItem>
                            <SelectItem value="fullscreen">Полноэкранный</SelectItem>
                            <SelectItem value="sidebar">Боковой баннер</SelectItem>
                            <SelectItem value="inline">Встроенный баннер</SelectItem>
                            <SelectItem value="popup">Попап</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Многоязычный контент */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Контент баннера</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={bannerForm.control}
                      name="title.ru"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Заголовок (RU)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Скидка 30%" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bannerForm.control}
                      name="title.hy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Заголовок (HY)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="30% զեղչ" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bannerForm.control}
                      name="title.en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Заголовок (EN)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="30% Discount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={bannerForm.control}
                      name="content.ru"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание (RU)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="На все фотокниги" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bannerForm.control}
                      name="content.hy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание (HY)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="Բոլոր լուսանկարային գրքերի վրա" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bannerForm.control}
                      name="content.en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание (EN)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="On all photobooks" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={bannerForm.control}
                      name="buttonText.ru"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текст кнопки (RU)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Купить" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bannerForm.control}
                      name="buttonText.hy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текст кнопки (HY)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Գնել" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bannerForm.control}
                      name="buttonText.en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текст кнопки (EN)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Buy" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Настройки отображения */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={bannerForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Включён (игнорирует даты)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3 p-2 border rounded-md">
                            <Switch
                              checked={!!field.value}
                              onCheckedChange={(val) => field.onChange(val)}
                            />
                            <span className="text-sm text-muted-foreground">
                              Если включено — баннер участвует в показах при статусе «Активен»
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bannerForm.control}
                    name="buttonLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ссылка кнопки</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="/products" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bannerForm.control}
                    name="targetPages"
                    render={() => (
                      <FormItem>
                        <FormLabel>Где показывать баннер</FormLabel>
                        <FormDescription>
                          Выберите страницы для показа. Если ничего не выбрано — показывать везде.
                        </FormDescription>
                        <div className="space-y-2">
                          {/* Выбранные страницы как бейджи */}
                          {(selectedPages && selectedPages.length > 0) ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedPages.map((p) => (
                                <Badge key={p} variant="secondary" className="flex items-center gap-1">
                                  {p}
                                  <button type="button" onClick={() => togglePage(p)} className="ml-1 opacity-70 hover:opacity-100">
                                    <IconX className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                              <Button type="button" variant="ghost" size="sm" onClick={clearPages}>
                                Очистить
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">Все страницы</div>
                          )}

                          {/* Мультиселект выпадающий список */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" className="w-full justify-between">
                                Выбрать страницы
                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[320px]" align="start">
                              <Command>
                                <CommandInput placeholder="Найти страницу..." />
                                <CommandList>
                                  <CommandEmpty>Ничего не найдено</CommandEmpty>
                                  <CommandGroup heading="Маршруты">
                                    {AVAILABLE_PAGES.map((p) => (
                                      <CommandItem
                                        key={p.value}
                                        value={p.value}
                                        onSelect={() => togglePage(p.value)}
                                      >
                                        <Check className={`mr-2 h-4 w-4 ${isPageSelected(p.value) ? 'opacity-100' : 'opacity-0'}`} />
                                        <span className="truncate">{p.label}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bannerForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Приоритет</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="0"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Выше приоритет - раньше показывается</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Дизайн */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={bannerForm.control}
                    name="backgroundColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Цвет фона</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} type="color" className="w-16 h-10" />
                            <Input {...field} placeholder="#ffffff" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bannerForm.control}
                    name="textColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Цвет текста</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} type="color" className="w-16 h-10" />
                            <Input {...field} placeholder="#000000" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Изображение */}
                <FormField
                  control={bannerForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Изображение баннера</FormLabel>
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
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={5242880} // 5MB
                            onGetUploadParameters={async () => {
                              const fileId = `banner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                              const uploadURL = `/api/local-upload/${fileId}`;
                              return {
                                method: "PUT" as const,
                                url: uploadURL,
                              };
                            }}
                            onComplete={(result: { successful: Array<{ uploadURL: string }> }) => {
                              if (result.successful && result.successful.length > 0) {
                                const uploadedFile = result.successful[0];
                                if (uploadedFile.uploadURL) {
                                  field.onChange(uploadedFile.uploadURL);
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

                {/* Настройки показа */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={bannerForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата начала</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bannerForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Дата окончания</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Где показывать баннер */}
                <FormField
                  control={bannerForm.control}
                  name="targetPages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Где показывать баннер</FormLabel>
                      <FormDescription>
                        Отметьте целевые страницы. Пустой список означает показ на всех страницах.
                      </FormDescription>
                      <div className="mt-2 grid grid-cols-2 gap-2 p-3 border rounded-md">
                        {PAGE_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={Array.isArray(field.value) ? field.value.includes(opt.value) : false}
                              onChange={() => field.onChange(togglePageInSelection(field.value, opt.value))}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => field.onChange(PAGE_OPTIONS.map(p => p.value))}
                        >
                          Выбрать все
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => field.onChange([])}
                        >
                          Очистить
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Выбрано: {Array.isArray(field.value) ? field.value.length : 0}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={bannerForm.control}
                    name="maxImpressions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Макс. показов</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            type="number"
                            placeholder="Не ограничено"
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bannerForm.control}
                    name="maxClicks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Макс. кликов</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            type="number"
                            placeholder="Не ограничено"
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBannerDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={createBannerMutation.isPending}
                  >
                    {createBannerMutation.isPending
                      ? "Сохранение..."
                      : editingBanner ? "Обновить" : "Создать"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Banners Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Список баннеров ({banners.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Пока нет баннеров</p>
              <p className="text-sm">Создайте первый маркетинговый баннер</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Показы/Клики</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>Приоритет</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners
                    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                    .map((banner) => (
                      <TableRow key={banner.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {banner.imageUrl && (
                              <img
                                src={banner.imageUrl}
                                alt={banner.name}
                                className="w-8 h-8 object-cover rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <p className="font-medium">{banner.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getLocalizedText(banner.title)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(banner.type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(banner)}
                            <Switch
                              checked={banner.isActive ?? false}
                              onCheckedChange={() => handleToggleBanner(banner.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {banner.currentImpressions || 0}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <BarChart3 className="h-3 w-3" />
                              {banner.currentClicks || 0}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {banner.currentImpressions ?
                              ((banner.currentClicks || 0) / banner.currentImpressions * 100).toFixed(1) + '%' :
                              '0%'
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{banner.priority || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditBanner(banner)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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