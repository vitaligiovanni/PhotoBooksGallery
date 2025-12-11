/**
 * SimpleAREditor - Упрощённый AR редактор
 * 
 * Принципы:
 * 1. Видео ВСЕГДА подстраивается под фото (cover по высоте)
 * 2. Пропорции видео сохраняются (без деформации)
 * 3. Live preview показывает наложение
 * 4. Маски выбираются из dropdown
 * 5. Расширенные настройки скрыты по умолчанию
 */

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Save, 
  RefreshCcw, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Settings2,
  Play,
  ExternalLink
} from 'lucide-react';

interface ARProject {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'error' | 'archived';
  photoUrl?: string;
  videoUrl?: string;
  maskUrl?: string | null;
  viewerHtmlUrl?: string;
  viewUrl?: string;
  qrCodeUrl?: string;
  photoWidth?: number | null;
  photoHeight?: number | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  photoAspectRatio?: string | null;
  videoAspectRatio?: string | null;
  maskWidth?: number | null;
  maskHeight?: number | null;
  fitMode?: string;
  config?: any;
}

interface SimpleAREditorProps {
  project: ARProject;
  onRecompile?: () => void;
}

type MaskShape = 'none' | 'circle' | 'oval' | 'square' | 'rect' | 'custom';

const MASK_OPTIONS: { value: MaskShape; label: string; icon: string }[] = [
  { value: 'none', label: 'Без маски', icon: '▢' },
  { value: 'circle', label: 'Круг', icon: '⭕' },
  { value: 'oval', label: 'Овал', icon: '🥚' },
  { value: 'square', label: 'Квадрат', icon: '⬜' },
  { value: 'rect', label: 'Прямоугольник', icon: '▭' },
  { value: 'custom', label: 'Своя маска', icon: '🎭' },
];

export default function SimpleAREditor({ project, onRecompile }: SimpleAREditorProps) {
  const queryClient = useQueryClient();
  
  // Basic settings
  const [maskShape, setMaskShape] = useState<MaskShape>('none');
  const [autoPlay, setAutoPlay] = useState(true);
  const [loop, setLoop] = useState(true);
  const [customMaskFile, setCustomMaskFile] = useState<File | null>(null);
  const [customMaskPreview, setCustomMaskPreview] = useState<string | null>(null);
  
  // Advanced settings (collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(0);
  const [rotZ, setRotZ] = useState(0);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(true);
  const [previewOpacity, setPreviewOpacity] = useState(0.7);
  
  // Video ref for preview
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Load existing config
  useEffect(() => {
    if (project?.config) {
      const cfg = project.config;
      if (cfg.shapeType) setMaskShape(cfg.shapeType);
      if (cfg.autoPlay !== undefined) setAutoPlay(cfg.autoPlay);
      if (cfg.loop !== undefined) setLoop(cfg.loop);
      if (cfg.videoPosition) {
        setPosX(cfg.videoPosition.x || 0);
        setPosY(cfg.videoPosition.y || 0);
        setPosZ(cfg.videoPosition.z || 0);
      }
      if (cfg.videoRotation?.z !== undefined) setRotZ(cfg.videoRotation.z);
    }
    // Determine mask from existing maskUrl
    if (project?.maskUrl && !project.config?.shapeType) {
      setMaskShape('custom');
    }
  }, [project]);

  // Calculate dimensions for preview
  const photoAR = project.photoWidth && project.photoHeight 
    ? project.photoWidth / project.photoHeight 
    : 1;
  const videoAR = project.videoWidth && project.videoHeight
    ? project.videoWidth / project.videoHeight
    : 1;

  // Save config mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        autoPlay,
        loop,
        videoPosition: { x: posX, y: posY, z: posZ },
        videoRotation: { x: 0, y: 0, z: rotZ },
      };
      
      // Only set shapeType if it's an auto-generated mask
      if (maskShape !== 'none' && maskShape !== 'custom') {
        body.shapeType = maskShape;
      }
      
      const res = await fetch(`/api/ar/${project.id}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', project.id] });
    },
  });

  // Upload custom mask mutation
  const uploadMaskMutation = useMutation({
    mutationFn: async () => {
      if (!customMaskFile) throw new Error('No mask file selected');
      
      const formData = new FormData();
      formData.append('mask', customMaskFile);
      
      const res = await fetch(`/api/ar/${project.id}/mask`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', project.id] });
      setCustomMaskFile(null);
      setCustomMaskPreview(null);
    },
  });

  // Remove mask mutation
  const removeMaskMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ar/${project.id}/mask`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', project.id] });
      setMaskShape('none');
    },
  });

  const handleMaskFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomMaskFile(file);
      setCustomMaskPreview(URL.createObjectURL(file));
      setMaskShape('custom');
    }
  };

  const isLoading = saveMutation.isPending || uploadMaskMutation.isPending || removeMaskMutation.isPending;
  const viewerUrl = `/objects/ar-storage/${project.id}/index.html`;
  const qrUrl = `/objects/ar-storage/${project.id}/qr-code.png`;

  return (
    <div className="space-y-6">
      {/* Header with quick links */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AR Редактор</h2>
          <span className="text-sm text-muted-foreground">#{project.id.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          {project.status === 'ready' && (
            <>
              <a 
                href={viewerUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Play className="h-4 w-4" /> Просмотр AR
              </a>
              <a 
                href={qrUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> QR код
              </a>
            </>
          )}
        </div>
      </div>

      {/* Live Preview Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" /> Превью наложения
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ 
              aspectRatio: photoAR,
              maxHeight: '400px'
            }}>
              {/* Photo layer (background) */}
              {project.photoUrl && (
                <img 
                  src={project.photoUrl} 
                  alt="Фото-маркер" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              
              {/* Video layer (overlay) */}
              {project.videoUrl && (
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ 
                    opacity: previewOpacity,
                    transform: `translate(${posX * 100}%, ${-posY * 100}%) rotate(${rotZ}deg)`,
                  }}
                >
                  <video
                    ref={videoRef}
                    src={project.videoUrl}
                    className="h-full object-cover"
                    style={{
                      // Видео занимает всю высоту, ширина пропорциональна
                      // Края обрезаются если видео шире
                      width: videoAR > photoAR ? `${(videoAR / photoAR) * 100}%` : '100%',
                      maxWidth: 'none'
                    }}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                </div>
              )}
              
              {/* Mask overlay (if applicable) */}
              {maskShape !== 'none' && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    maskImage: maskShape === 'circle' 
                      ? 'radial-gradient(circle, black 50%, transparent 50%)' 
                      : maskShape === 'oval'
                      ? 'radial-gradient(ellipse 50% 40%, black 100%, transparent 100%)'
                      : undefined,
                    WebkitMaskImage: maskShape === 'circle' 
                      ? 'radial-gradient(circle, black 50%, transparent 50%)' 
                      : maskShape === 'oval'
                      ? 'radial-gradient(ellipse 50% 40%, black 100%, transparent 100%)'
                      : undefined,
                  }}
                />
              )}
              
              {/* Info overlay */}
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                Фото: {project.photoWidth}×{project.photoHeight} | 
                Видео: {project.videoWidth}×{project.videoHeight}
              </div>
            </div>
            
            {/* Preview controls */}
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2 text-sm">
                <span>Прозрачность:</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={previewOpacity}
                  onChange={(e) => setPreviewOpacity(parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="text-muted-foreground">{Math.round(previewOpacity * 100)}%</span>
              </label>
            </div>
            
            {/* Explanation */}
            <Alert className="mt-3">
              <AlertDescription className="text-xs">
                <strong>Автоматическая подстройка:</strong> Видео масштабируется по высоте фото. 
                Если видео шире — края обрезаются (режим cover). Пропорции сохраняются.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Mask Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Маска для видео
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mask dropdown */}
          <div>
            <label className="text-sm font-medium block mb-2">Форма маски:</label>
            <select 
              value={maskShape}
              onChange={(e) => setMaskShape(e.target.value as MaskShape)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {MASK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Custom mask upload */}
          {maskShape === 'custom' && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <label className="text-sm font-medium block">Загрузить свою маску (PNG с прозрачностью):</label>
              <input 
                type="file" 
                accept="image/png,image/webp"
                onChange={handleMaskFileChange}
                className="text-sm"
              />
              
              {/* Preview uploaded mask */}
              {(customMaskPreview || project.maskUrl) && (
                <div className="flex items-start gap-4 mt-2">
                  <div 
                    className="relative rounded border overflow-hidden w-24 h-24"
                    style={{
                      backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)',
                      backgroundSize: '10px 10px'
                    }}
                  >
                    <img 
                      src={customMaskPreview || project.maskUrl || ''} 
                      alt="Маска" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {project.maskWidth && project.maskHeight && (
                      <div>{project.maskWidth}×{project.maskHeight}px</div>
                    )}
                  </div>
                </div>
              )}
              
              {customMaskFile && (
                <Button 
                  size="sm" 
                  onClick={() => uploadMaskMutation.mutate()}
                  disabled={uploadMaskMutation.isPending}
                >
                  {uploadMaskMutation.isPending ? (
                    <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Загрузка...</>
                  ) : (
                    <><Check className="h-3 w-3 mr-1" /> Применить маску</>
                  )}
                </Button>
              )}
            </div>
          )}
          
          {/* Current mask info */}
          {project.maskUrl && maskShape !== 'none' && (
            <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
              <span className="text-sm text-green-700">✓ Маска применена</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => removeMaskMutation.mutate()}
                disabled={removeMaskMutation.isPending}
                className="text-red-500 hover:text-red-700"
              >
                Удалить маску
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <VideoIcon className="h-4 w-4" /> Настройки воспроизведения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoPlay} 
                onChange={(e) => setAutoPlay(e.target.checked)}
                className="rounded"
              />
              Автовоспроизведение
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={loop} 
                onChange={(e) => setLoop(e.target.checked)}
                className="rounded"
              />
              Зацикливание
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings (Collapsed) */}
      <Card>
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Расширенные настройки
            </CardTitle>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-xs">
                Используйте эти настройки только если автоматическая подстройка не работает корректно.
              </AlertDescription>
            </Alert>
            
            {/* Position */}
            <div>
              <label className="text-sm font-medium block mb-2">Позиция видео (X, Y, Z):</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">X</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={posX}
                    onChange={(e) => setPosX(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Y</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={posY}
                    onChange={(e) => setPosY(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Z</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={posZ}
                    onChange={(e) => setPosZ(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Rotation */}
            <div>
              <label className="text-sm font-medium block mb-2">Поворот (градусы):</label>
              <input 
                type="number" 
                step="1"
                value={rotZ}
                onChange={(e) => setRotZ(parseFloat(e.target.value) || 0)}
                className="w-32 border rounded px-2 py-1 text-sm"
              />
            </div>
            
            {/* Reset button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setPosX(0);
                setPosY(0);
                setPosZ(0);
                setRotZ(0);
              }}
            >
              <RefreshCcw className="h-3 w-3 mr-1" /> Сбросить к авто
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={isLoading}
          className="flex-1"
        >
          {saveMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Сохранение...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Сохранить настройки</>
          )}
        </Button>
        
        {onRecompile && (
          <Button 
            variant="outline"
            onClick={onRecompile}
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4 mr-2" /> Перекомпилировать
          </Button>
        )}
      </div>

      {/* Status messages */}
      {saveMutation.isSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">
            ✓ Настройки сохранены успешно
          </AlertDescription>
        </Alert>
      )}
      
      {(saveMutation.isError || uploadMaskMutation.isError || removeMaskMutation.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {(saveMutation.error as any)?.message || 
             (uploadMaskMutation.error as any)?.message || 
             (removeMaskMutation.error as any)?.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
