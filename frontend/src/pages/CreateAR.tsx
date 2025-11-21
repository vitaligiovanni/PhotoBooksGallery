import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, XCircle, QrCode, Eye, VideoIcon, ImageIcon } from 'lucide-react';

interface ARProject {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  progressPhase?: string; // NEW: current compilation phase
  viewUrl?: string;
  externalViewUrl?: string; // absolute URL from backend (tunnel / production)
  qrCodeUrl?: string;
  markerQuality?: number;
  keyPointsCount?: number;
  compilationTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
}

export default function CreateARPage() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [arProjectId, setArProjectId] = useState<string | null>(null);
  const [squareMarkerMode, setSquareMarkerMode] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Polling для статуса AR проекта
  const { data: arStatus } = useQuery<ARProject>({
    queryKey: ['/api/ar/status', arProjectId],
    queryFn: async () => {
      const response = await fetch(`/api/ar/status/${arProjectId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to get AR status');
      const result = await response.json();
      return result.data;
    },
    enabled: !!arProjectId && arProjectId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Опрашивать каждые 2 секунды пока статус pending или processing
      if (status === 'pending' || status === 'processing') {
        return 2000;
      }
      return false; // Остановить опрос если ready или error
    },
  });

  // Мутация для создания AR проекта
  const createARMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/ar/create-automatic', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create AR project');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setArProjectId(data.data.arId);
      queryClient.invalidateQueries({ queryKey: ['/api/ar/my-projects'] });
    },
  });

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Размер фото не должен превышать 10 МБ');
        return;
      }
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert('Размер видео не должен превышать 100 МБ');
        return;
      }
      setVideo(file);
      const reader = new FileReader();
      reader.onloadend = () => setVideoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleCreate = async () => {
    if (!photo || !video) {
      alert('Пожалуйста, загрузите фото и видео');
      return;
    }

    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('video', video);
    
    // Если включен режим квадратной печати → принудительно cover + auto-crop
    if (squareMarkerMode) {
      formData.append('fitMode', 'cover');
      formData.append('forceSquare', 'true');
    }

    createARMutation.mutate(formData);
  };

  const handleReset = () => {
    setPhoto(null);
    setVideo(null);
    setPhotoPreview(null);
    setVideoPreview(null);
    setArProjectId(null);
    createARMutation.reset();
  };

  // Map progressPhase to percentage and message
  const getProgressInfo = (phase?: string) => {
    const phases: Record<string, { percent: number; message: string }> = {
      'media-prepared': { percent: 15, message: '✅ Видео обработано' },
      'marker-compiling': { percent: 20, message: '🔄 Компилируем AR маркер...' },
      'marker-compiled': { percent: 70, message: '✅ Маркер скомпилирован (55 сек)' },
      'viewer-generated': { percent: 85, message: '✅ AR Viewer создан' },
      'qr-generated': { percent: 95, message: '✅ QR-код сгенерирован' },
    };
    return phases[phase || ''] || { percent: 5, message: '🔄 Загрузка файлов...' };
  };

  const renderStatus = () => {
    if (!arStatus) return null;

    switch (arStatus.status) {
      case 'pending':
      case 'processing':
        const progressInfo = getProgressInfo(arStatus.progressPhase);
        return (
          <Card className="mt-6 border-blue-500">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-xl">Создаём AR-эффект...</h3>
                  <p className="text-base text-muted-foreground font-medium">
                    {progressInfo.message}
                  </p>
                </div>
                <div className="w-full max-w-md space-y-2">
                  <Progress value={progressInfo.percent} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progressInfo.percent}%</span>
                    <span>
                      {arStatus.progressPhase === 'marker-compiling' 
                        ? '⏱️ ~50-60 секунд' 
                        : 'Обычно занимает 50-60 секунд'}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg max-w-md">
                  <p className="text-xs text-center text-muted-foreground">
                    💡 <strong>Совет:</strong> Компиляция AR маркера требует времени для анализа ключевых точек на фотографии. Пожалуйста, подождите...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'ready':
        // Определяем корректную внешнюю ссылку (от бэкенда или адаптация)
        const currentOrigin = window.location.origin;
        const rawViewUrl = arStatus.viewUrl || '';
        const absoluteBackendUrl = arStatus.externalViewUrl || (rawViewUrl.startsWith('http') ? rawViewUrl : null);
        let externalViewUrl: string | null = null;
        if (absoluteBackendUrl) {
          // Если бэкенд уже дал абсолютный URL (например tunnel), используем его напрямую
          externalViewUrl = absoluteBackendUrl;
        } else if (rawViewUrl) {
          // Собираем из текущего origin + относительного пути
          let pathPart = rawViewUrl;
          if (pathPart.includes('/ar/view/')) {
            pathPart = '/ar/view/' + pathPart.split('/ar/view/')[1];
          }
          externalViewUrl = `${currentOrigin}${pathPart}`;
        }
        // Если абсолютный URL содержит tunnel (loca.lt) и origin локальный, показываем обе ссылки
        const isTunnel = (externalViewUrl || '').includes('loca.lt') || (externalViewUrl || '').includes('trycloudflare.com');
        const localDebugUrl = rawViewUrl.startsWith('http') && !isTunnel ? rawViewUrl : `${currentOrigin}/ar/view/${arStatus.id}`;
        
        return (
          <Card className="mt-6 border-green-500">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-6">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-2xl">AR-эффект готов!</h3>
                  <p className="text-muted-foreground">
                    Наведите камеру телефона на фотографию и увидите видео!
                  </p>
                </div>

                {arStatus.markerQuality && (
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">Качество маркера</div>
                      <div className="text-muted-foreground">
                        {(parseFloat(arStatus.markerQuality as any) * 100).toFixed(0)}%
                      </div>
                    </div>
                    {arStatus.keyPointsCount && (
                      <div className="text-center">
                        <div className="font-semibold">Ключевых точек</div>
                        <div className="text-muted-foreground">{arStatus.keyPointsCount}</div>
                      </div>
                    )}
                  </div>
                )}

                {arStatus.qrCodeUrl && (
                  <div className="flex flex-col items-center space-y-3">
                    <img
                      src={arStatus.qrCodeUrl}
                      alt="QR Code"
                      className="w-64 h-64 border rounded-lg"
                    />
                    <p className="text-sm text-center text-muted-foreground">
                      Отсканируйте QR-код на телефоне чтобы открыть AR viewer
                    </p>
                    
                    {/* Внешняя ссылка для тестирования с телефона - ГЛАВНАЯ */}
                    {externalViewUrl && (
                      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl w-full max-w-2xl border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                        <div className="text-center space-y-4">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-3xl">📱</span>
                            <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                              Ссылка для тестирования с телефона
                            </p>
                          </div>
                          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700 break-all">
                            <a 
                              href={externalViewUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-base font-mono text-blue-600 dark:text-blue-400 underline hover:text-blue-800 font-semibold"
                            >
                              {externalViewUrl}
                            </a>
                          </div>
                          {isTunnel && (
                            <div className="mt-2 text-xs text-left space-y-1 text-gray-600 dark:text-gray-300">
                              <p>🔁 Tunnel активен. Если видите 503, перезапустите tunnel.</p>
                              <p>💻 Локальная отладочная ссылка: <span className="font-mono break-all">{localDebugUrl}</span></p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              ✅ Откройте эту ссылку на телефоне
                            </p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              ✅ Разрешите доступ к камере
                            </p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              ✅ Наведите камеру на фотографию → видео появится!
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(externalViewUrl);
                              alert('Ссылка скопирована в буфер обмена!');
                            }}
                            variant="default"
                            size="lg"
                            className="w-full"
                          >
                            📋 Скопировать ссылку
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  {externalViewUrl && (
                    <Button
                      onClick={() => window.open(externalViewUrl, '_blank')}
                      variant="default"
                      size="lg"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Открыть AR viewer
                    </Button>
                  )}
                  <Button onClick={handleReset} variant="outline" size="lg">
                    Создать новый AR
                  </Button>
                </div>

                <Alert>
                  <QrCode className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Как использовать:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Откройте ссылку или отсканируйте QR-код на телефоне</li>
                      <li>Разрешите доступ к камере</li>
                      <li>Наведите камеру на фотографию</li>
                      <li>Видео появится поверх фотографии!</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        );

      case 'error':
        return (
          <Card className="mt-6 border-red-500">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <XCircle className="h-16 w-16 text-red-500" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-xl">Ошибка создания AR</h3>
                  <p className="text-sm text-muted-foreground">
                    {arStatus.errorMessage || 'Произошла неизвестная ошибка'}
                  </p>
                </div>
                <Button onClick={handleReset} variant="outline">
                  Попробовать снова
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Создать AR-эффект</CardTitle>
          <CardDescription>
            Загрузите фотографию и видео. Мы создадим AR-эффект, который будет всплывать при
            наведении камеры на фотографию!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!arProjectId && (
            <>
              {/* Square Marker Mode Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
                <input
                  type="checkbox"
                  id="squareMarkerMode"
                  checked={squareMarkerMode}
                  onChange={(e) => setSquareMarkerMode(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="squareMarkerMode" className="flex-1 cursor-pointer">
                  <div className="text-sm font-medium">Квадратная печать (для выпускных альбомов)</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Автоматически обрежет видео в квадрат при наложении на квадратное фото. Используйте для печатных фотографий, обрезанных в квадрат.
                  </div>
                </label>
              </div>

              {/* Upload Photo */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  <ImageIcon className="inline mr-2 h-4 w-4" />
                  Фотография (маркер)
                </label>
                <p className="text-xs text-muted-foreground">
                  Выберите фото с хорошими деталями (не однотонное). Макс 10 МБ.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Photo preview"
                    className="mt-3 max-w-sm rounded-lg border"
                  />
                )}
              </div>

              {/* Upload Video */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  <VideoIcon className="inline mr-2 h-4 w-4" />
                  Видео для AR
                </label>
                <p className="text-xs text-muted-foreground">
                  Видео, которое будет появляться поверх фотографии. Макс 100 МБ, до 30 секунд.
                </p>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime"
                  onChange={handleVideoChange}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {videoPreview && (
                  <video
                    src={videoPreview}
                    controls
                    className="mt-3 max-w-sm rounded-lg border"
                  />
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleCreate}
                disabled={!photo || !video || createARMutation.isPending}
                size="lg"
                className="w-full"
              >
                {createARMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Загружаем файлы...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Создать AR-эффект
                  </>
                )}
              </Button>

              {createARMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {createARMutation.error?.message || 'Ошибка при создании AR проекта'}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Status Display */}
          {renderStatus()}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-xl">Как работает AR?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>1. Фотография = маркер.</strong> Наша технология анализирует ключевые точки на
            фотографии и создаёт цифровой маркер.
          </p>
          <p>
            <strong>2. Без QR-кода на фотографии.</strong> QR-код нужен только для открытия AR
            viewer на телефоне. Сама фотография остаётся обычной, без меток!
          </p>
          <p>
            <strong>3. Видео всплывает при наведении.</strong> Когда камера распознаёт фотографию,
            видео автоматически появляется поверх неё.
          </p>
          <p>
            <strong>4. Работает на любом телефоне.</strong> Нужен только браузер с камерой (Safari,
            Chrome). Не требуется установка приложений!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
