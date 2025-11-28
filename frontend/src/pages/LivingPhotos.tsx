import { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Camera, Video, Upload, Eye, X, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getARTranslation } from '@shared/ar-translations';

interface ARProject {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  progressPhase?: string;
  viewUrl?: string;
  externalViewUrl?: string;
  qrCodeUrl?: string;
  expiresAt?: string;
  errorMessage?: string;
}

export default function LivingPhotos() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'ru' || i18n.language === 'hy' || i18n.language === 'en') ? i18n.language as 'ru'|'hy'|'en' : 'ru';
  const tAR = (key: string) => getARTranslation(lang, `ar.${key}`);

  const [projectName, setProjectName] = useState<string>('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [demoProjectId, setDemoProjectId] = useState<string | null>(null);
  
  const photosInputRef = useRef<HTMLInputElement>(null);
  const videosInputRef = useRef<HTMLInputElement>(null);

  // Polling for demo AR status
  const { data: arStatus } = useQuery<ARProject>({
    queryKey: ['/api/ar/status', demoProjectId],
    queryFn: async () => {
      const response = await fetch(`/api/ar/status/${demoProjectId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to get AR status');
      const result = await response.json();
      return result.data;
    },
    enabled: !!demoProjectId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'pending' || status === 'processing') return 2000;
      return false;
    },
  });

  // File handlers
  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Проверка размера каждого файла
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}: ${tAR('errorPhotoSize')}`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    // Максимум 10 фотографий
    if (validFiles.length > 10) {
      alert('Максимум 10 фотографий для AR-маркеров');
      return;
    }
    
    setPhotos(validFiles);
    
    // Создать превью для всех фотографий
    const previews: string[] = [];
    validFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews[index] = reader.result as string;
        if (previews.filter(Boolean).length === validFiles.length) {
          setPhotoPreviews([...previews]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [lang]);

  const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Проверка размера каждого файла
    const validFiles = files.filter(file => {
      if (file.size > 100 * 1024 * 1024) {
        alert(`${file.name}: ${tAR('errorVideoSize')}`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    // Максимум 10 видео
    if (validFiles.length > 10) {
      alert('Максимум 10 видео');
      return;
    }
    
    setVideos(validFiles);
    
    // Создать превью для всех видео
    const previews: string[] = [];
    validFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews[index] = reader.result as string;
        if (previews.filter(Boolean).length === validFiles.length) {
          setVideoPreviews([...previews]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [lang]);

  // Create demo AR mutation
  const createDemoMutation = useMutation({
    mutationFn: async () => {
      if (photos.length === 0 || videos.length === 0) {
        throw new Error('Files required');
      }
      
      if (photos.length !== videos.length) {
        throw new Error(`Нужно ${photos.length} видео (по одному для каждой фотографии)`);
      }
      
      const formData = new FormData();
      if (projectName && projectName.trim()) {
        formData.append('projectName', projectName.trim());
      }
      
      // Добавить все фотографии
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });
      
      // Добавить все видео
      videos.forEach((video) => {
        formData.append('videos', video);
      });

      const response = await fetch('/api/ar/create-demo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create demo AR');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // AR service теперь возвращает массив projectIds
      const projectIds = data.data.projectIds || [data.data.arId];
      console.log(`✅ Created ${projectIds.length} AR project(s):`, projectIds);
      
      // Показать первый проект (можно расширить для показа всех)
      setDemoProjectId(projectIds[0]);
      
      // Опционально: сохранить все ID в state для множественного отображения
      // setAllProjectIds(projectIds);
    },
  });

  const handleReset = () => {
    setProjectName('');
    setPhotos([]);
    setVideos([]);
    setPhotoPreviews([]);
    setVideoPreviews([]);
    setDemoProjectId(null);
    createDemoMutation.reset();
  };

  // Progress mapping
  const getProgressInfo = (phase?: string) => {
    const phases: Record<string, { percent: number; icon: string }> = {
      'media-prepared': { percent: 15, icon: '📤' },
      'marker-compiling': { percent: 40, icon: '⚙️' },
      'marker-compiled': { percent: 70, icon: '🔨' },
      'viewer-generated': { percent: 85, icon: '✨' },
      'qr-generated': { percent: 95, icon: '🎉' },
    };
    return phases[phase || ''] || { percent: 5, icon: '📤' };
  };

  // Calculate time remaining
  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;
    if (diff <= 0) return 'Истекло';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч ${minutes}мин`;
  };

  // Render processing status
  if (arStatus?.status === 'processing' || arStatus?.status === 'pending') {
    const info = getProgressInfo(arStatus.progressPhase);
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-8">
                <div className="flex flex-col items-center space-y-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-6xl"
                  >
                    {info.icon}
                  </motion.div>
                  <div className="text-center space-y-2">
                    <h3 className="font-bold text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {tAR('processing')}
                    </h3>
                    <p className="text-muted-foreground">{tAR('almostReady')}</p>
                  </div>
                  <div className="w-full max-w-md space-y-3">
                    <Progress value={info.percent} className="h-3" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{info.percent}%</span>
                      <span>~60 {lang === 'ru' ? 'сек' : lang === 'en' ? 'sec' : 'վրկ'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  // Render success with timer
  if (arStatus?.status === 'ready') {
    const externalViewUrl = arStatus.externalViewUrl || arStatus.viewUrl;
    const timeRemaining = getTimeRemaining(arStatus.expiresAt);
    
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-2 border-green-500">
              <CardContent className="pt-8">
                <div className="flex flex-col items-center space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="text-7xl"
                  >
                    🎉
                  </motion.div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="font-bold text-3xl">{tAR('successTitle')}</h3>
                    <p className="text-muted-foreground text-lg">{tAR('successDescription')}</p>
                  </div>

                  {/* Timer warning */}
                  {timeRemaining && (
                    <Alert className="max-w-md border-orange-300 bg-orange-50">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <strong>Демо-версия!</strong> Ссылка действует ещё <strong>{timeRemaining}</strong>.
                        После истечения срока нужно будет оформить заказ.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* QR Code */}
                  {arStatus.qrCodeUrl && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white p-6 rounded-2xl shadow-xl"
                    >
                      <img src={arStatus.qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                    </motion.div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    <Button onClick={() => window.open(externalViewUrl, '_blank')} size="lg" className="flex-1">
                      <Eye className="mr-2 h-5 w-5" />
                      {tAR('scanQR')}
                    </Button>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(externalViewUrl || '');
                        alert(lang === 'ru' ? 'Ссылка скопирована!' : lang === 'en' ? 'Link copied!' : 'Հղումը պատճենված է!');
                      }}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      {tAR('copyLink')}
                    </Button>
                  </div>

                  {/* Order CTA */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="w-full max-w-md mt-6"
                  >
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
                      <CardContent className="pt-6">
                        <h4 className="font-semibold text-lg mb-2">Понравилось? Закажите постоянную версию!</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Выберите фотокнигу и добавьте живое фото при оформлении заказа — ссылка будет работать всегда.
                        </p>
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => window.location.href = '/catalog'}
                        >
                          Перейти в каталог
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <Button onClick={handleReset} variant="ghost" className="mt-4">
                    {lang === 'ru' ? 'Создать новое демо' : lang === 'en' ? 'Create New Demo' : 'Ստեղծել նոր դեմո'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  // Render error
  if (arStatus?.status === 'error') {
    return (
      <div className="min-h-screen page-bg">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-red-500">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center space-y-6">
                <XCircle className="h-20 w-20 text-red-500" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-2xl">{tAR('errorTitle')}</h3>
                  <p className="text-muted-foreground">{arStatus.errorMessage || tAR('errorCompilation')}</p>
                </div>
                <Button onClick={handleReset}>{lang === 'ru' ? 'Попробовать снова' : lang === 'en' ? 'Try Again' : 'Փորձել կրկին'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Main landing page
  return (
    <div className="min-h-screen page-bg">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-purple-100 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-purple-500 text-white px-4 py-1 text-sm">
              <Sparkles className="h-4 w-4 mr-2 inline" />
              Инновационная технология
            </Badge>
            <h1 className="font-serif text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              Живые Фото
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Оживите ваши фотографии! При наведении камеры телефона на фото автоматически воспроизводится видео в дополненной реальности.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-12">Как это работает?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-xl mb-2">1. Загрузите фото</h3>
              <p className="text-muted-foreground">Выберите любую фотографию с хорошей детализацией (не однотонную)</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center">
                <Video className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="font-semibold text-xl mb-2">2. Добавьте видео</h3>
              <p className="text-muted-foreground">Загрузите видео до 30 секунд, которое будет воспроизводиться поверх фото</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-xl mb-2">3. Оживите!</h3>
              <p className="text-muted-foreground">Наведите камеру на фото — видео автоматически появится в AR</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Demo Creation Form */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Попробуйте бесплатно!
                </CardTitle>
                <CardDescription className="text-base">
                  Создайте демо-версию живого фото. Ссылка будет действовать 24 часа — идеально для теста!
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Project name - ОБЯЗАТЕЛЬНОЕ ПОЛЕ */}
                <div className="space-y-2">
                  <label className="block text-lg font-semibold flex items-center gap-2">
                    <span className="text-red-500">*</span>
                    Название проекта
                  </label>
                  <input
                    value={projectName}
                    onChange={(e)=>setProjectName(e.target.value)}
                    placeholder="Например: Свадебный альбом Анны"
                    required
                    minLength={3}
                    maxLength={100}
                    className="w-full border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  {projectName.trim().length > 0 && projectName.trim().length < 3 && (
                    <p className="text-xs text-red-500">Минимум 3 символа</p>
                  )}
                  <p className="text-xs text-muted-foreground">Это имя поможет вам и администратору идентифицировать проект в CRM.</p>
                </div>
                {/* Photos upload (multiple) */}
                <div className="space-y-3">
                  <label className="block text-lg font-semibold flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    {tAR('uploadPhoto')} {photos.length > 0 && `(${photos.length}/10)`}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {tAR('photoRequirements')}
                    <br />
                    <span className="text-purple-600 font-medium">Можно загрузить до 10 фотографий для мультимаркерного AR!</span>
                  </p>
                  
                  <AnimatePresence mode="wait">
                    {photoPreviews.length === 0 ? (
                      <motion.div
                        key="dropzone"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => photosInputRef.current?.click()}
                        className="relative h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 border-muted-foreground/30"
                      >
                        <input
                          ref={photosInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                        <Upload className="h-12 w-12 mb-3 text-muted-foreground" />
                        <p className="text-lg font-medium">{tAR('dragDropPhoto')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{tAR('orClickToSelect')}</p>
                        <p className="text-xs text-purple-600 mt-2 font-medium">Выберите несколько фото (до 10)</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {photoPreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img 
                                src={preview} 
                                alt={`Photo ${index + 1}`} 
                                className="w-full h-32 object-cover rounded-lg border-2 border-green-500" 
                              />
                              <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                #{index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setPhotos([]);
                            setPhotoPreviews([]);
                            if (photosInputRef.current) photosInputRef.current.value = '';
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Удалить все фото
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Videos upload (multiple - one per photo) */}
                <div className="space-y-3">
                  <label className="block text-lg font-semibold flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    {tAR('uploadVideo')} {videos.length > 0 && `(${videos.length}/${photos.length})`}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {tAR('videoRequirements')}
                    {photos.length > 0 && (
                      <>
                        <br />
                        <span className="text-pink-600 font-medium">
                          Загрузите {photos.length} видео (по одному для каждой фотографии)
                        </span>
                      </>
                    )}
                  </p>
                  
                  <AnimatePresence mode="wait">
                    {videoPreviews.length === 0 ? (
                      <motion.div
                        key="dropzone"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => videosInputRef.current?.click()}
                        className="relative h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 border-muted-foreground/30"
                      >
                        <input
                          ref={videosInputRef}
                          type="file"
                          accept="video/*"
                          multiple
                          onChange={handleVideoChange}
                          className="hidden"
                        />
                        <Upload className="h-12 w-12 mb-3 text-muted-foreground" />
                        <p className="text-lg font-medium">{tAR('dragDropVideo')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{tAR('orClickToSelect')}</p>
                        {photos.length > 0 && (
                          <p className="text-xs text-pink-600 mt-2 font-medium">
                            Выберите {photos.length} видео (столько же, сколько фото)
                          </p>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="space-y-3"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {videoPreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <video 
                                src={preview} 
                                className="w-full h-32 object-cover rounded-lg border-2 border-pink-500" 
                              />
                              <div className="absolute top-1 right-1 bg-pink-500 text-white text-xs px-2 py-1 rounded">
                                Video #{index + 1}
                              </div>
                              <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                → Photo #{index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setVideos([]);
                            setVideoPreviews([]);
                            if (videosInputRef.current) videosInputRef.current.value = '';
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Удалить все видео
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Photo-Video Mapping Preview */}
                {photos.length > 0 && videos.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-700"
                  >
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      Связки фото → видео
                    </h4>
                    <div className="grid gap-2">
                      {Array.from({ length: Math.max(photos.length, videos.length) }).map((_, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className={`px-3 py-1 rounded ${index < photos.length ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            Photo #{index + 1}
                          </div>
                          <span className="text-2xl">→</span>
                          <div className={`px-3 py-1 rounded ${index < videos.length ? 'bg-pink-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            Video #{index + 1}
                          </div>
                          {index < photos.length && index < videos.length && (
                            <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                          )}
                          {(index >= photos.length || index >= videos.length) && (
                            <XCircle className="h-5 w-5 text-red-500 ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Submit button */}
                <Button
                  onClick={() => createDemoMutation.mutate()}
                  disabled={projectName.trim().length < 3 || photos.length === 0 || videos.length === 0 || photos.length !== videos.length || createDemoMutation.isPending}
                  size="lg"
                  className="w-full text-lg h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {createDemoMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {tAR('uploading')}
                    </>
                  ) : projectName.trim().length < 3 ? (
                    <>
                      ⚠️ Укажите название проекта (мин. 3 символа)
                    </>
                  ) : photos.length !== videos.length ? (
                    <>
                      ⚠️ Нужно {photos.length} видео (сейчас: {videos.length})
                    </>
                  ) : (
                    <>
                      ✨ {lang === 'ru' ? `Создать AR с ${photos.length} сцен${photos.length > 1 ? 'ами' : 'ой'} (24 часа)` : lang === 'en' ? `Create AR with ${photos.length} scene${photos.length > 1 ? 's' : ''} (24h)` : `Ստեղծել AR ${photos.length} տեսարաններով (24ժ)`}
                    </>
                  )}
                </Button>

                {createDemoMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>{createDemoMutation.error?.message || tAR('errorUpload')}</AlertDescription>
                  </Alert>
                )}

                {/* Info box */}
                <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950">
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    💡 <strong>Важно:</strong> Демо-ссылка действует 24 часа. Для постоянной версии выберите фотокнигу в каталоге и добавьте опцию "AR-эффект" при оформлении.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-12">Почему живые фото?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: '📱', title: 'Без приложений', desc: 'Работает в браузере телефона — ничего устанавливать не нужно' },
              { icon: '🎬', title: 'Эмоции оживают', desc: 'Поверх фото автоматически проигрывается ваше видео' },
              { icon: '🔒', title: 'Фото остаётся чистым', desc: 'Никаких QR-кодов на самой фотографии!' },
              { icon: '💝', title: 'Идеально для подарков', desc: 'Свадьбы, юбилеи, детские альбомы — незабываемые эмоции' },
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl mb-3">{benefit.icon}</div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
