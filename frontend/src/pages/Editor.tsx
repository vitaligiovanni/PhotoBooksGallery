import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PhotoEditor } from "@/components/PhotoEditor";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SizeSelectionModal } from "@/components/SizeSelectionModal";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, CheckCircle } from "lucide-react";

export default function Editor() {
  const { t } = useTranslation();
  const [showSizeSelection, setShowSizeSelection] = useState(false);
  const [selectedPhotobookConfig, setSelectedPhotobookConfig] = useState<any>(null);

  const handleAuthSuccess = () => {
    // После успешной авторизации показываем модальное окно выбора размера
    setShowSizeSelection(true);
  };

  const handleSizeSelection = (config: any) => {
    setSelectedPhotobookConfig(config);
    setShowSizeSelection(false);
  };

  const EditorContent = () => (
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

        {/* Статус выбора конфигурации */}
        {selectedPhotobookConfig && (
          <div className="mb-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Конфигурация фотокниги выбрана: {selectedPhotobookConfig.format} {selectedPhotobookConfig.size.label} 
                ({selectedPhotobookConfig.spreads} разворотов)
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!selectedPhotobookConfig && (
          <div className="mb-6">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Для начала работы выберите размер и ориентацию фотокниги
              </AlertDescription>
            </Alert>
          </div>
        )}

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
              <h3 className="font-semibold text-foreground mb-2">Выберите размер</h3>
              <p className="text-muted-foreground text-sm">
                Выберите формат и размер для вашей фотокниги
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                2
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
                3
              </div>
              <h3 className="font-semibold text-foreground mb-2">{t('autoLayout')}</h3>
              <p className="text-muted-foreground text-sm">
                Наш алгоритм создаст красивую раскладку автоматически
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

      {/* Модальные окна */}
      <SizeSelectionModal
        isOpen={showSizeSelection}
        onClose={() => setShowSizeSelection(false)}
        onSelect={handleSizeSelection}
      />
    </div>
  );

  return (
    <ProtectedRoute requireAuth={true} onAuthSuccess={handleAuthSuccess}>
      <EditorContent />
    </ProtectedRoute>
  );
}
