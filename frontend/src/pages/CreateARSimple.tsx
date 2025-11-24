import { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, XCircle, QrCode, Eye, X, ImageIcon, VideoIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getARTranslation, formatARPrice } from '@shared/ar-translations';

interface ARProject {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  progressPhase?: string;
  viewUrl?: string;
  externalViewUrl?: string;
  qrCodeUrl?: string;
  productId?: string | null;
  arPrice?: string;
  errorMessage?: string;
}

interface Product {
  id: string;
  name: { ru: string; hy?: string; en?: string };
  image: string;
  price: number;
}

export default function CreateARSimple() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  // Use active i18n language; fallback to 'ru'
  const lang: 'hy' | 'ru' | 'en' = (i18n.language === 'hy' || i18n.language === 'ru' || i18n.language === 'en') ? i18n.language as any : 'ru';
  const t = (key: string) => getARTranslation(lang, `ar.${key}`);
  
  // Get productId from URL query (?product=xxx)
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedProductId = urlParams.get('product');
  
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [arProjectId, setArProjectId] = useState<string | null>(null);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch products with photos (for product selection)
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products/with-photos'],
    queryFn: async () => {
      const res = await fetch('/api/products', { credentials: 'include' });
      if (!res.ok) return [];
      const json = await res.json();
      // Filter only products with images
      return (json.data || []).filter((p: any) => p.image);
    },
  });

  // Get preselected product details
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === preselectedProductId);
  }, [products, preselectedProductId]);

  // Polling for AR status
  const { data: arStatus } = useQuery<ARProject>({
    queryKey: ['/api/ar/status', arProjectId],
    queryFn: async () => {
      const response = await fetch(`/api/ar/status/${arProjectId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to get AR status');
      const result = await response.json();
      return result.data;
    },
    enabled: !!arProjectId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'pending' || status === 'processing') return 2000;
      return false;
    },
  });

  // File handlers
  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert(t('errorPhotoSize'));
      return;
    }
    
    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, [lang]);

  const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 100 * 1024 * 1024) {
      alert(t('errorVideoSize'));
      return;
    }
    
    setVideo(file);
    const reader = new FileReader();
    reader.onloadend = () => setVideoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, [lang]);

  // Create AR mutation
  const createARMutation = useMutation({
    mutationFn: async () => {
      if (!photo || !video) throw new Error('Files required');
      
      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('video', video);
      if (preselectedProductId) {
        formData.append('productId', preselectedProductId);
      }

      const response = await fetch('/api/ar/create-with-product', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create AR');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setArProjectId(data.data.arId);
      queryClient.invalidateQueries({ queryKey: ['/api/ar/my-projects'] });
    },
  });

  const handleReset = () => {
    setPhoto(null);
    setVideo(null);
    setPhotoPreview(null);
    setVideoPreview(null);
    setArProjectId(null);
    createARMutation.reset();
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

  // Render status
  if (arStatus?.status === 'processing' || arStatus?.status === 'pending') {
    const info = getProgressInfo(arStatus.progressPhase);
    return (
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
                    {t('processing')}
                  </h3>
                  <p className="text-muted-foreground">{t('almostReady')}</p>
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
    );
  }

  if (arStatus?.status === 'ready') {
    const externalViewUrl = arStatus.externalViewUrl || arStatus.viewUrl;
    
    return (
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
                  <h3 className="font-bold text-3xl">{t('successTitle')}</h3>
                  <p className="text-muted-foreground text-lg">{t('successDescription')}</p>
                </div>

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
                    {t('scanQR')}
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
                    {t('copyLink')}
                  </Button>
                </div>

                {/* Product upsell */}
                {selectedProduct && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="w-full max-w-md mt-6"
                  >
                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <img src={selectedProduct.image} alt={selectedProduct.name[lang] || selectedProduct.name.ru} className="w-20 h-20 object-cover rounded-lg" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{selectedProduct.name[lang] || selectedProduct.name.ru}</h4>
                            <p className="text-sm text-muted-foreground">{t('arPriceLabel')}: {formatARPrice(lang, parseFloat(arStatus.arPrice || '500'))}</p>
                          </div>
                        </div>
                        <Button
                          className="w-full mt-4"
                          size="lg"
                          onClick={() => {
                            // Add to cart logic here
                            navigate(`/products/${selectedProduct.id}`);
                          }}
                        >
                          {t('addToCart')}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                <Button onClick={handleReset} variant="ghost" className="mt-4">
                  {lang === 'ru' ? 'Создать новый AR' : lang === 'en' ? 'Create New AR' : 'Ստեղծել նոր AR'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (arStatus?.status === 'error') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-2 border-red-500">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center space-y-6">
              <XCircle className="h-20 w-20 text-red-500" />
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-2xl">{t('errorTitle')}</h3>
                <p className="text-muted-foreground">{arStatus.errorMessage || t('errorCompilation')}</p>
              </div>
              <Button onClick={handleReset}>{lang === 'ru' ? 'Попробовать снова' : lang === 'en' ? 'Try Again' : 'Փորձել կրկին'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main creation form
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {t('createTitle')}
            </CardTitle>
            <CardDescription className="text-base">{t('createDescription')}</CardDescription>
            
            {/* Product badge if preselected */}
            {selectedProduct && (
              <div className="flex items-center gap-3 mt-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <img src={selectedProduct.image} alt="" className="w-12 h-12 object-cover rounded" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{lang === 'ru' ? 'Для продукта' : lang === 'en' ? 'For product' : 'Ապրանքի համար'}:</p>
                  <p className="font-semibold">{selectedProduct.name[lang] || selectedProduct.name.ru}</p>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Photo upload */}
            <div className="space-y-3">
              <label className="block text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                {t('uploadPhoto')}
              </label>
              <p className="text-sm text-muted-foreground">{t('photoRequirements')}</p>
              
              <AnimatePresence mode="wait">
                {!photoPreview ? (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => photoInputRef.current?.click()}
                    className="relative h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 border-muted-foreground/30"
                  >
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Upload className="h-12 w-12 mb-3 text-muted-foreground" />
                    <p className="text-lg font-medium">{t('dragDropPhoto')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('orClickToSelect')}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative group"
                  >
                    <img src={photoPreview} alt="Photo preview" className="w-full max-h-64 object-contain rounded-xl border-2 border-green-500" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoPreview(null);
                        if (photoInputRef.current) photoInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Video upload */}
            <div className="space-y-3">
              <label className="block text-lg font-semibold flex items-center gap-2">
                <VideoIcon className="h-5 w-5 text-primary" />
                {t('uploadVideo')}
              </label>
              <p className="text-sm text-muted-foreground">{t('videoRequirements')}</p>
              
              <AnimatePresence mode="wait">
                {!videoPreview ? (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => videoInputRef.current?.click()}
                    className="relative h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 border-muted-foreground/30"
                  >
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoChange}
                      className="hidden"
                    />
                    <Upload className="h-12 w-12 mb-3 text-muted-foreground" />
                    <p className="text-lg font-medium">{t('dragDropVideo')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('orClickToSelect')}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative group"
                  >
                    <video src={videoPreview} controls className="w-full max-h-64 rounded-xl border-2 border-green-500" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setVideo(null);
                        setVideoPreview(null);
                        if (videoInputRef.current) videoInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit button */}
            <Button
              onClick={() => createARMutation.mutate()}
              disabled={!photo || !video || createARMutation.isPending}
              size="lg"
              className="w-full text-lg h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {createARMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('uploading')}
                </>
              ) : (
                <>
                  ✨ {lang === 'ru' ? 'Создать волшебство' : lang === 'en' ? 'Create Magic' : 'Ստեղծել հրաշք'}
                </>
              )}
            </Button>

            {createARMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>{createARMutation.error?.message || t('errorUpload')}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
