import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Save, Mail, Phone, MapPin, Globe, CreditCard } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

export function SettingsManager() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { data: settings = {} } = useQuery<any>({ 
    queryKey: ["/api/settings"] 
  });

  const settingsForm = useForm({
    resolver: zodResolver(z.object({
      // General Settings
      siteName: z.string().min(1, "Название сайта обязательно"),
      siteDescription: z.string().optional(),
      siteUrl: z.string().url("Некорректный URL").optional().or(z.literal("")),
      
      // Contact Information
      contactEmail: z.string().email("Некорректный email").optional().or(z.literal("")),
      contactPhone: z.string().optional(),
      contactAddress: z.string().optional(),
      
      // Business Settings
      businessName: z.string().optional(),
      businessTaxId: z.string().optional(),
      businessRegistration: z.string().optional(),
      
      // Payment Settings
      paymentMethods: z.string().optional(),
      defaultCurrency: z.string().optional(),
      taxRate: z.number().min(0).max(100).optional(),
      
      // Email Settings
      emailFrom: z.string().email("Некорректный email").optional().or(z.literal("")),
      emailReplyTo: z.string().email("Некорректный email").optional().or(z.literal("")),
      emailNotifications: z.boolean().default(true),
      
      // Features
      enableReviews: z.boolean().default(true),
      enableBlog: z.boolean().default(true),
      enableNewsletter: z.boolean().default(false),
      maintenanceMode: z.boolean().default(false),
      
      // Social Media
      facebookUrl: z.string().url("Некорректный URL").optional().or(z.literal("")),
      instagramUrl: z.string().url("Некорректный URL").optional().or(z.literal("")),
      twitterUrl: z.string().url("Некорректный URL").optional().or(z.literal("")),
      youtubeUrl: z.string().url("Некорректный URL").optional().or(z.literal("")),
    })),
    defaultValues: {
      siteName: "",
      siteDescription: "",
      siteUrl: "",
      contactEmail: "",
      contactPhone: "",
      contactAddress: "",
      businessName: "",
      businessTaxId: "",
      businessRegistration: "",
      paymentMethods: "",
      defaultCurrency: "RUB",
      taxRate: 0,
      emailFrom: "",
      emailReplyTo: "",
      emailNotifications: true,
      enableReviews: true,
      enableBlog: true,
      enableNewsletter: false,
      maintenanceMode: false,
      facebookUrl: "",
      instagramUrl: "",
      twitterUrl: "",
      youtubeUrl: "",
    }
  });

  // Reset form with current settings when they load
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      settingsForm.reset(settings);
    }
  }, [settings, settingsForm]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const response = await fetch(`/api/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) throw new Error("Failed to update setting");
      return response.json();
    },
  });

  const handleSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      // Update each setting individually
      const updatePromises = Object.entries(data).map(([key, value]) =>
        updateSettingMutation.mutateAsync({ key, value })
      );

      await Promise.all(updatePromises);

      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Успех",
        description: "Настройки сохранены",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Настройки системы</h1>
        <p className="text-muted-foreground mt-2">
          Управление основными настройками сайта и бизнеса
        </p>
      </div>

      <Form {...settingsForm}>
        <form onSubmit={settingsForm.handleSubmit(handleSubmit)} className="space-y-6">
          {/* General Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Основные настройки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="siteName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название сайта *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Мой фотосайт" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="siteDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание сайта</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Краткое описание вашего сайта"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="siteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL сайта</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://мойсайт.ru" type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Контактная информация
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Контактный email</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="info@example.com" type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Контактный телефон</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+7 (999) 123-45-67" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="contactAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Адрес</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Полный почтовый адрес"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Business Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Бизнес-настройки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название компании</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ООО 'Моя компания'" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="businessTaxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ИНН</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1234567890" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="businessRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ОГРН</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1234567890123" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Налоговая ставка (%)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0"
                        max="100"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="paymentMethods"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Способы оплаты</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Банковская карта, Яндекс.Деньги, Сбербанк Онлайн"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Настройки email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="emailFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email отправителя</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="noreply@example.com" type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="emailReplyTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email для ответов</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="support@example.com" type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Email уведомления
                      </FormLabel>
                      <FormDescription>
                        Отправлять уведомления по email
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
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Функции сайта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="enableReviews"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Отзывы
                      </FormLabel>
                      <FormDescription>
                        Включить систему отзывов
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
                control={settingsForm.control}
                name="enableBlog"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Блог
                      </FormLabel>
                      <FormDescription>
                        Включить систему блога
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
                control={settingsForm.control}
                name="enableNewsletter"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Рассылка
                      </FormLabel>
                      <FormDescription>
                        Включить систему email рассылки
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
                control={settingsForm.control}
                name="maintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Режим обслуживания
                      </FormLabel>
                      <FormDescription>
                        Включить режим технического обслуживания
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
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Социальные сети</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="facebookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://facebook.com/username" type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="instagramUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://instagram.com/username" type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="twitterUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twitter</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://twitter.com/username" type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://youtube.com/username" type="url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg"
              disabled={isSaving}
              className="min-w-32"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
