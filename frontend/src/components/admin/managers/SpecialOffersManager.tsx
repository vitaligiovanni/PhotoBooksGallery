import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SpecialOffer } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Edit, Trash2, Eye, EyeOff, TrendingUp, Clock, Target, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CountdownTimer } from "@/components/special-offers/CountdownTimer";

// Гибкая схема для формы редактирования специальных предложений
const specialOfferFormSchema = z.any();

export function SpecialOffersManager() {
  const { toast } = useToast();
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);

  const { data: offers = [] } = useQuery<SpecialOffer[]>({
    queryKey: ["/api/special-offers"]
  });

  const offerForm = useForm({
    defaultValues: {
      name: "",
      type: "flash_sale" as "flash_sale" | "limited_time" | "personalized" | "bundle" | "free_shipping",
      title: { ru: "", hy: "", en: "" },
      description: { ru: "", hy: "", en: "" },
      imageUrl: "",
      discountType: "percentage" as "percentage" | "fixed" | "free_shipping",
      discountValue: 0,
      currencyId: "AMD",
      minOrderAmount: null as number | null,
      minOrderCurrencyId: "AMD",
      buttonText: { ru: "", hy: "", en: "" },
      buttonLink: "",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      priority: 0,
      isActive: false,
      status: "draft" as "draft" | "active" | "paused" | "expired",
      startDate: "",
      endDate: "",
      targetProducts: [] as string[],
      targetCategories: [] as string[],
      targetUsers: "all",
      maxUses: null as number | null,
      currentUses: 0,
    }
  });

  // Предзаполнение формы при редактировании
  useEffect(() => {
    if (editingOffer) {
      offerForm.reset({
        name: editingOffer.name || "",
        type: editingOffer.type,
        title: editingOffer.title || { ru: "", hy: "", en: "" },
        description: editingOffer.description || { ru: "", hy: "", en: "" },
        imageUrl: editingOffer.imageUrl || "",
        discountType: (editingOffer.discountType as "fixed" | "free_shipping" | "percentage") || "percentage",
        discountValue: editingOffer.discountValue != null ? (typeof editingOffer.discountValue === 'number' ? editingOffer.discountValue : parseFloat(editingOffer.discountValue) || 0) : 0,
        currencyId: editingOffer.currencyId || "AMD",
        minOrderAmount: editingOffer.minOrderAmount != null ? (typeof editingOffer.minOrderAmount === 'number' ? editingOffer.minOrderAmount : parseFloat(editingOffer.minOrderAmount) || null) : null,
        minOrderCurrencyId: editingOffer.minOrderCurrencyId || "AMD",
        buttonText: editingOffer.buttonText || { ru: "", hy: "", en: "" },
        buttonLink: editingOffer.buttonLink || "",
        backgroundColor: editingOffer.backgroundColor || "#ffffff",
        textColor: editingOffer.textColor || "#000000",
        priority: editingOffer.priority || 0,
        isActive: editingOffer.isActive || false,
        status: editingOffer.status || "draft",
        startDate: editingOffer.startDate ? new Date(editingOffer.startDate).toISOString().slice(0, 16) : "",
        endDate: editingOffer.endDate ? new Date(editingOffer.endDate).toISOString().slice(0, 16) : "",
        targetProducts: editingOffer.targetProducts || [],
        targetCategories: editingOffer.targetCategories || [],
        targetUsers: editingOffer.targetUsers || "all",
        maxUses: editingOffer.maxUses ?? null,
        currentUses: editingOffer.currentUses || 0,
      });
    } else {
      offerForm.reset({
        name: "",
        type: "flash_sale",
        title: { ru: "", hy: "", en: "" },
        description: { ru: "", hy: "", en: "" },
        imageUrl: "",
        discountType: "percentage",
        discountValue: 0,
        currencyId: "AMD",
        minOrderAmount: null,
        minOrderCurrencyId: "AMD",
        buttonText: { ru: "", hy: "", en: "" },
        buttonLink: "",
        backgroundColor: "#ffffff",
        textColor: "#000000",
        priority: 0,
        isActive: false,
        status: "draft",
        startDate: "",
        endDate: "",
        targetProducts: [],
        targetCategories: [],
        targetUsers: "all",
        maxUses: null,
        currentUses: 0,
      });
    }
  }, [editingOffer, offerForm]);

  const createOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      // Преобразуем даты
      const processedData = {
        ...data,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        targetProducts: data.targetProducts || [],
        targetCategories: data.targetCategories || [],
      };

      if (editingOffer) {
        return await apiRequest("PUT", `/api/special-offers/${editingOffer.id}`, processedData);
      } else {
        return await apiRequest("POST", "/api/special-offers", processedData);
      }
    },
    onSuccess: () => {
      const wasEditing = !!editingOffer;
      queryClient.invalidateQueries({ queryKey: ["/api/special-offers"] });
      setIsOfferDialogOpen(false);
      setEditingOffer(null);
      offerForm.reset();
      toast({
        title: "Успех",
        description: wasEditing ? "Специальное предложение обновлено" : "Специальное предложение создано",
      });
    },
    onError: (error) => {
      console.error("Special offer mutation error:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить специальное предложение",
        variant: "destructive",
      });
    }
  });

  const toggleOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PATCH", `/api/special-offers/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/special-offers"] });
      toast({
        title: "Успех",
        description: "Статус предложения изменен",
      });
    }
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/special-offers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/special-offers"] });
      toast({
        title: "Успех",
        description: "Специальное предложение удалено",
      });
    }
  });

  const handleOfferSubmit = async (data: any) => {
    console.log("Submitting offer data:", data);
    createOfferMutation.mutate(data);
  };

  const handleDeleteOffer = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить это специальное предложение?")) {
      deleteOfferMutation.mutate(id);
    }
  };

  const handleEditOffer = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setIsOfferDialogOpen(true);
  };

  const handleToggleOffer = (id: string) => {
    toggleOfferMutation.mutate(id);
  };

  const getStatusBadge = (offer: SpecialOffer) => {
    if (!offer.isActive) return <Badge variant="secondary">Неактивно</Badge>;
    if (offer.status === 'active') return <Badge variant="default">Активно</Badge>;
    if (offer.status === 'draft') return <Badge variant="outline">Черновик</Badge>;
    return <Badge variant="destructive">Приостановлено</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const types = {
      flash_sale: 'Молниеносная распродажа',
      limited_time: 'Ограниченное время',
      personalized: 'Персонализированная скидка',
      bundle: 'Комплект товаров',
      free_shipping: 'Бесплатная доставка',
      percentage: 'Процентная скидка',
      fixed: 'Фиксированная скидка'
    };
    return types[type as keyof typeof types] || type;
  };

  const getLocalizedText = (field: any, lang: string = 'ru') => {
    if (typeof field === 'string') return field;
    if (field && typeof field === 'object') return field[lang] || field.ru || '';
    return '';
  };

  const isExpired = (offer: SpecialOffer) => {
    if (!offer.endDate) return false;
    return new Date(offer.endDate) < new Date();
  };

  const isUrgent = (offer: SpecialOffer) => {
    if (!offer.endDate) return false;
    const timeLeft = new Date(offer.endDate).getTime() - new Date().getTime();
    return timeLeft < 24 * 60 * 60 * 1000; // Менее 24 часов
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Специальные предложения</h1>
          <p className="text-muted-foreground mt-2">Создавайте и управляйте специальными предложениями с таймерами</p>
        </div>
        <Dialog open={isOfferDialogOpen} onOpenChange={(open) => {
          setIsOfferDialogOpen(open);
          if (!open) {
            setEditingOffer(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-green-500 to-green-600"
              onClick={() => {
                setEditingOffer(null);
                setIsOfferDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Новое предложение
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOffer ? "Редактировать предложение" : "Создать предложение"}</DialogTitle>
              <DialogDescription>
                {editingOffer ? "Внесите изменения в специальное предложение" : "Создайте новое специальное предложение"}
              </DialogDescription>
            </DialogHeader>
            <Form {...offerForm}>
              <form onSubmit={offerForm.handleSubmit(handleOfferSubmit)} className="space-y-6">
                {/* Основная информация */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={offerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название предложения</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Летняя скидка 30%" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={offerForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип предложения</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите тип" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="flash_sale">Молниеносная распродажа</SelectItem>
                            <SelectItem value="limited_time">Ограниченное время</SelectItem>
                            <SelectItem value="personalized">Персонализированная скидка</SelectItem>
                            <SelectItem value="bundle">Комплект товаров</SelectItem>
                            <SelectItem value="free_shipping">Бесплатная доставка</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Скидка */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={offerForm.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тип скидки</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите тип скидки" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Процент</SelectItem>
                            <SelectItem value="fixed">Фиксированная сумма</SelectItem>
                            <SelectItem value="free_shipping">Бесплатная доставка</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={offerForm.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Значение скидки</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="30"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={offerForm.control}
                    name="currencyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Валюта</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите валюту" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="AMD">AMD (֏)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="RUB">RUB (₽)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Многоязычный контент */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Контент предложения</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={offerForm.control}
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
                      control={offerForm.control}
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
                      control={offerForm.control}
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
                      control={offerForm.control}
                      name="description.ru"
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
                      control={offerForm.control}
                      name="description.hy"
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
                      control={offerForm.control}
                      name="description.en"
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
                      control={offerForm.control}
                      name="buttonText.ru"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текст кнопки (RU)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Купить со скидкой" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={offerForm.control}
                      name="buttonText.hy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текст кнопки (HY)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Գնել զեղչով" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={offerForm.control}
                      name="buttonText.en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текст кнопки (EN)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Buy with discount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Настройки */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={offerForm.control}
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
                    control={offerForm.control}
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
                    control={offerForm.control}
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
                    control={offerForm.control}
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
                  control={offerForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Изображение предложения</FormLabel>
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
                              const fileId = `offer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

                {/* Временные настройки */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={offerForm.control}
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
                    control={offerForm.control}
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

                {/* Ограничения использования */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={offerForm.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Макс. использований</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            placeholder="Не ограничено"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={offerForm.control}
                    name="minOrderAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Мин. сумма заказа</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="Не указано"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
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
                    onClick={() => setIsOfferDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOfferMutation.isPending}
                  >
                    {createOfferMutation.isPending
                      ? "Сохранение..."
                      : editingOffer ? "Обновить" : "Создать"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Offers Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Список предложений ({offers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">Пока нет специальных предложений</p>
              <p className="text-sm">Создайте первое предложение с таймером</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Скидка</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Таймер</TableHead>
                    <TableHead>Использований</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers
                    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                    .map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {offer.imageUrl && (
                              <img
                                src={offer.imageUrl}
                                alt={offer.name}
                                className="w-8 h-8 object-cover rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <p className="font-medium">{offer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getLocalizedText(offer.title)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(offer.type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            <span className="font-medium">
                              {offer.discountType === 'percentage'
                                ? `${offer.discountValue}%`
                                : `${offer.discountValue} ${offer.currencyId || 'AMD'}`
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(offer)}
                            <Switch
                              checked={offer.isActive ?? false}
                              onCheckedChange={() => handleToggleOffer(offer.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {offer.endDate && !isExpired(offer) ? (
                            <CountdownTimer
                              endDate={new Date(offer.endDate)}
                              size="sm"
                              urgent={isUrgent(offer)}
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {isExpired(offer) ? 'Завершено' : 'Без таймера'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {offer.currentUses || 0}
                              {offer.maxUses && ` / ${offer.maxUses}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditOffer(offer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteOffer(offer.id)}
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