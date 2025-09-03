import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PhotoEditor } from "@/components/PhotoEditor";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

export default function Editor() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <Header />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Главная</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t('editor')}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-4" data-testid="text-editor-title">
            {t('editorTitle')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Создайте уникальную фотокнигу за несколько минут с помощью нашего простого редактора
          </p>
        </div>

        {/* Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                1
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('uploadPhotos')}</h3>
              <p className="text-muted-foreground text-sm">
                Перетащите ваши любимые фото или выберите их из галереи
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                2
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('autoLayout')}</h3>
              <p className="text-muted-foreground text-sm">
                Наш алгоритм создаст красивую раскладку на 10 разворотов
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                3
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('personalize')}</h3>
              <p className="text-muted-foreground text-sm">
                Добавьте текст, измените порядок фото и настройте дизайн
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Photo Editor */}
        <PhotoEditor />

        {/* Tips Section */}
        <div className="mt-16">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-8 text-center">
            Советы для лучшего результата
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Качество фотографий</h3>
                <p className="text-muted-foreground text-sm">
                  Используйте фотографии высокого разрешения (минимум 300 DPI) для лучшего качества печати.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Композиция</h3>
                <p className="text-muted-foreground text-sm">
                  Чередуйте горизонтальные и вертикальные фото для создания динамичного дизайна.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">Количество фото</h3>
                <p className="text-muted-foreground text-sm">
                  Рекомендуем 20-30 фотографий для фотокниги на 10 разворотов для оптимального результата.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
