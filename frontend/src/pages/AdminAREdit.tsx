import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCcw, Save, Image as ImageIcon, Wand2, Video as VideoIcon, Eye, Upload, Play, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Maximize2, Target, Layers, Trash2 } from 'lucide-react';
import CalibrationSandbox from '@/components/ar/CalibrationSandbox';
import { useLocation } from 'wouter';
import ARProjectItemsList from '@/components/ar/ARProjectItemsList';

interface ARStatusResponse {
  message: string;
  data: ARProject;
}
interface ARProject {
  id: string;
  status: 'pending'|'processing'|'ready'|'error'|'archived';
  
  // Asset URLs
  photoUrl?: string;
  videoUrl?: string;
  maskUrl?: string | null;
  viewerHtmlUrl?: string;
  viewUrl?: string;
  qrCodeUrl?: string;
  
  // Dimensions & aspect ratios
  photoWidth?: number | null;
  photoHeight?: number | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  videoDurationMs?: number | null;
  photoAspectRatio?: string | null;
  videoAspectRatio?: string | null;
  
  // Mask info
  maskWidth?: number | null;
  maskHeight?: number | null;
  
  // Scaling & fit
  fitMode?: string;
  scaleWidth?: string | null;
  scaleHeight?: string | null;
  
  // Calibration
  isCalibrated?: boolean;
  calibratedPosX?: string | null;
  calibratedPosY?: string | null;
  calibratedPosZ?: string | null;
  
  // Quality metrics
  markerQuality?: string | null;
  keyPointsCount?: number | null;
  compilationTimeMs?: number | null;
  
  // Config
  config?: {
    videoPosition?: { x: number; y: number; z: number };
    videoRotation?: { x: number; y: number; z: number };
    videoScale?: { width: number; height: number };
    fitMode?: 'contain'|'cover'|'stretch';
    autoPlay?: boolean;
    loop?: boolean;
  } | null;
  
  // Error & timestamps
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminAREditPage() {
  const [isMatch, params] = useRoute('/admin/ar/:id/edit');
  const arId = (params as any)?.id || null;
  const queryClient = useQueryClient();
  const viewerUrl = arId ? `/objects/ar-storage/${arId}/index.html` : null;
  const qrUrl = arId ? `/objects/ar-storage/${arId}/qr-code.png` : null;

  const { data: project, isLoading, error, refetch } = useQuery<ARProject | null>({
    queryKey: ['/api/ar/status', arId],
    enabled: !!arId,
    queryFn: async () => {
      const res = await fetch(`/api/ar/status/${arId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const json: ARStatusResponse = await res.json();
      return json.data;
    }
  });

  // Fetch items to determine if this is a multi-target project
  // IMPORTANT: queryKey must match ARProjectItemsList.tsx format for proper invalidation
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ['/api/ar', arId, 'items'],
    enabled: !!arId,
    queryFn: async () => {
      const res = await fetch(`/api/ar/${arId}/items`, { credentials: 'include' });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    }
  });

  const isMultiTarget = items.length > 0;

  // Local editable state
  const [pos, setPos] = useState({ x: 0, y: 0, z: 0 });
  const [rot, setRot] = useState({ x: 0, y: 0, z: 0 });
  // scale state REMOVED - backend calculates planeScale from photoAspectRatio automatically
  const [fitMode, setFitMode] = useState<'contain'|'cover'|'stretch'>('cover');
  const [autoPlay, setAutoPlay] = useState(true);
  const [loop, setLoop] = useState(true);
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [shapeType, setShapeType] = useState<'circle' | 'oval' | 'square' | 'rect' | 'custom' | null>(null);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [aspectLocked, setAspectLocked] = useState<boolean>(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loc, navigate] = useLocation();
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (project?.config) {
      const cfg = project.config as any;
      if (cfg.videoPosition) setPos(cfg.videoPosition);
      if (cfg.videoRotation) setRot(cfg.videoRotation);
      // videoScale removed - no longer needed
      if (cfg.fitMode) setFitMode(cfg.fitMode);
      if (cfg.autoPlay !== undefined) setAutoPlay(cfg.autoPlay);
      if (cfg.loop !== undefined) setLoop(cfg.loop);
      if (cfg.zoom !== undefined) setZoom(cfg.zoom);
      if (cfg.offsetX !== undefined) setOffsetX(cfg.offsetX);
      if (cfg.offsetY !== undefined) setOffsetY(cfg.offsetY);
      if (cfg.aspectLocked !== undefined) setAspectLocked(cfg.aspectLocked);
    }
  }, [project]);

  const [cropRegion, setCropRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const patchMutation = useMutation({
    mutationFn: async () => {
      if (!arId) throw new Error('No id');
      const body = {
        videoPosition: pos,
        videoRotation: rot,
        // videoScale removed - backend calculates from photoAspectRatio
        cropRegion: cropRegion || undefined,
        fitMode,
        autoPlay,
        loop,
        zoom,
        offsetX,
        offsetY,
        aspectLocked,
        shapeType: shapeType && shapeType !== 'custom' ? shapeType : undefined // Send auto-generated shape
      };
      const res = await fetch(`/api/ar/${arId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', arId] });
      setTimeout(() => setIframeKey(k => k + 1), 1000); // reload viewer iframe (увеличено до 1s для crop обработки)
    }
  });

  // Live preview: post calibration updates to iframe
  useEffect(() => {
    if (!iframeRef?.contentWindow) return;
    const payload = {
      type: 'ar-calibration',
      payload: {
        position: pos,
        rotation: rot
        // scale removed - viewer uses photoAspectRatio from backend
      }
    };
    try {
      iframeRef.contentWindow.postMessage(payload, '*');
    } catch {}
  }, [pos, rot, iframeRef]); // Removed scale from dependencies

  const uploadMaskMutation = useMutation({
    mutationFn: async () => {
      if (!arId || !maskFile) throw new Error('No file');
      const fd = new FormData();
      fd.append('mask', maskFile);
      const res = await fetch(`/api/ar/${arId}/mask`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', arId] });
      setMaskFile(null);
      setTimeout(() => setIframeKey(k => k + 1), 500);
    }
  });

  const convertMaskMutation = useMutation({
    mutationFn: async () => {
      if (!arId) throw new Error('No id');
      const res = await fetch(`/api/ar/${arId}/convert-mask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ threshold: 240 })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', arId] });
      setTimeout(() => setIframeKey(k => k + 1), 500);
    }
  });

  const deleteMaskMutation = useMutation({
    mutationFn: async () => {
      if (!arId) throw new Error('No id');
      const res = await fetch(`/api/ar/${arId}/mask`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', arId] });
      setShapeType(null); // Reset shape selection
      setMaskFile(null); // Clear local file
      setMaskPreview(null); // Clear preview
      setTimeout(() => setIframeKey(k => k + 1), 500);
    }
  });

  if (!arId) {
    return <div className="p-6 text-sm text-muted-foreground">Нет ID проекта в пути (/admin/ar/:id/edit)</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>AR Редактор проекта</CardTitle>
          <CardDescription>
            Тонкая настройка наложения видео и маски для проекта {arId}
          </CardDescription>
          <div className="mt-3 flex items-center gap-2">
            {viewerUrl && (
              <a href={viewerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded bg-primary px-3 py-1 text-white text-sm">
                Открыть AR Viewer
              </a>
            )}
            {qrUrl && (
              <a href={qrUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded border px-3 py-1 text-sm">
                Открыть QR
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {isLoading && <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Загрузка проекта...</div>}
          {error && <Alert variant="destructive"><AlertDescription>{(error as any).message}</AlertDescription></Alert>}
          
          {/* Multi-item section (новая функция: несколько живых фото) */}
          {project && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Управление живыми фото (Multi-target)</h3>
                </div>
                <ARProjectItemsList projectId={arId} />
              </div>
              <Separator className="my-8" />
            </>
          )}

          {/* Legacy single-photo editor (показывается ВСЕГДА) */}
          {project && (
            <>
              {/* Asset Triad Panel */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Активы проекта (Legacy single-photo)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Photo Marker */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Фото-маркер
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {project.photoUrl ? (
                        <div className="space-y-2">
                          <img src={project.photoUrl} alt="AR Photo Marker" className="w-full rounded border" />
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Размер: {project.photoWidth}×{project.photoHeight}px</div>
                            <div>Соотношение: {project.photoAspectRatio || '—'}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Фото не загружено</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Video */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <VideoIcon className="h-4 w-4" /> Видео ({fitMode})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {project.videoUrl ? (
                        <div className="space-y-2">
                          <video src={project.videoUrl} controls className="w-full rounded border" />
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Размер: {project.videoWidth}×{project.videoHeight}px</div>
                            <div>Соотношение: {project.videoAspectRatio || '—'}</div>
                            {project.videoDurationMs && <div>Длина: {(project.videoDurationMs / 1000).toFixed(1)}s</div>}
                            <div>FitMode: <span className="font-mono">{fitMode}</span></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Видео не загружено</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Mask */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" /> Маска/Рамка
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {project.maskUrl ? (
                        <div className="space-y-2">
                          {/* Checkerboard background for transparency preview */}
                          <div className="relative rounded border overflow-hidden" style={{
                            backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 10px 10px'
                          }}>
                            <img src={project.maskUrl} alt="Mask" className="w-full" />
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Размер: {project.maskWidth}×{project.maskHeight}px</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          <div className="mb-2">Маска не загружена</div>
                          <div className="text-xs opacity-70">Загрузите PNG/WebP с прозрачностью</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid md:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2"><Wand2 className="h-4 w-4" /> Позиция</h3>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(['x','y','z'] as const).map(axis => (
                        <Input key={axis} type="number" step="0.01" value={pos[axis]} onChange={e => setPos(p => ({ ...p, [axis]: parseFloat(e.target.value) }))} placeholder={axis.toUpperCase()} />
                      ))}
                    </div>
                    {/* Nudge Controls */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Target className="h-3 w-3" /> Точная настройка
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="flex flex-col items-center gap-1">
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setPos(p => ({ ...p, y: p.y + 0.01 }))}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setPos(p => ({ ...p, x: p.x - 0.01 }))}>
                              <ArrowLeft className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setPos({ x: 0, y: 0, z: 0 })}>
                              <Maximize2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setPos(p => ({ ...p, x: p.x + 0.01 }))}>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setPos(p => ({ ...p, y: p.y - 0.01 }))}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setPos(p => ({ ...p, z: p.z + 0.01 }))}>
                            Z+ <ArrowUp className="h-3 w-3 ml-1" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => setPos(p => ({ ...p, z: p.z - 0.01 }))}>
                            Z– <ArrowDown className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2"><Wand2 className="h-4 w-4" /> Ротация</h3>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {(['x','y','z'] as const).map(axis => (
                        <Input key={axis} type="number" step="1" value={rot[axis]} onChange={e => setRot(r => ({ ...r, [axis]: parseFloat(e.target.value) }))} placeholder={axis.toUpperCase()} />
                      ))}
                    </div>
                  </div>
                  {/* Scale section REMOVED - backend automatically calculates from photoAspectRatio */}
                  <div>
                    <h3 className="font-semibold">Fit Mode</h3>
                    <select className="w-full border rounded px-2 py-1 text-sm" value={fitMode} onChange={e => setFitMode(e.target.value as any)}>
                      <option value="contain">contain</option>
                      <option value="cover">cover</option>
                      <option value="stretch">stretch</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={autoPlay} onChange={e => setAutoPlay(e.target.checked)} /> autoplay
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} /> loop
                    </label>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3"><ImageIcon className="h-4 w-4" /> Маска для видео</h3>
                    
                    {/* Shape Type Selector */}
                    <div className="space-y-3 mb-4">
                      <div className="text-sm font-medium text-muted-foreground">Выберите форму маски:</div>
                      <div className="grid grid-cols-5 gap-2">
                        <Button
                          size="sm"
                          variant={shapeType === 'circle' ? 'default' : 'outline'}
                          className="h-16 flex flex-col items-center justify-center gap-1"
                          onClick={() => {
                            setShapeType('circle');
                            setMaskFile(null);
                            setMaskPreview(null);
                          }}
                        >
                          <span className="text-2xl">⭕</span>
                          <span className="text-xs">Круг</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={shapeType === 'oval' ? 'default' : 'outline'}
                          className="h-16 flex flex-col items-center justify-center gap-1"
                          onClick={() => {
                            setShapeType('oval');
                            setMaskFile(null);
                            setMaskPreview(null);
                          }}
                        >
                          <span className="text-2xl">🥚</span>
                          <span className="text-xs">Овал</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={shapeType === 'square' ? 'default' : 'outline'}
                          className="h-16 flex flex-col items-center justify-center gap-1"
                          onClick={() => {
                            setShapeType('square');
                            setMaskFile(null);
                            setMaskPreview(null);
                          }}
                        >
                          <span className="text-2xl">◻️</span>
                          <span className="text-xs">Квадрат</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={shapeType === 'rect' ? 'default' : 'outline'}
                          className="h-16 flex flex-col items-center justify-center gap-1"
                          onClick={() => {
                            setShapeType('rect');
                            setMaskFile(null);
                            setMaskPreview(null);
                          }}
                        >
                          <span className="text-2xl">▭</span>
                          <span className="text-xs">Прямоуг.</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={shapeType === 'custom' ? 'default' : 'outline'}
                          className="h-16 flex flex-col items-center justify-center gap-1"
                          onClick={() => setShapeType('custom')}
                        >
                          <span className="text-2xl">🎭</span>
                          <span className="text-xs">Своя</span>
                        </Button>
                      </div>
                      
                      {shapeType && shapeType !== 'custom' && (
                        <Alert>
                          <AlertDescription className="text-xs">
                            Маска "{shapeType}" будет сгенерирована автоматически при компиляции
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    
                    {/* Current Mask Preview */}
                    {project.maskUrl && (
                      <div className="mb-3">
                        <div className="relative rounded border overflow-hidden max-w-xs" style={{
                          backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)',
                          backgroundSize: '20px 20px'
                        }}>
                          <img src={project.maskUrl} alt="mask" className="w-full" />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Текущая маска в проекте</div>
                      </div>
                    )}
                    
                    {/* Custom Mask Upload (only show if custom selected) */}
                    {shapeType === 'custom' && (
                      <div className="space-y-2 mt-3 p-3 border rounded-lg bg-muted/50">
                        <div className="text-sm font-medium">Загрузите свою маску (PNG/WebP с прозрачностью)</div>
                        <input 
                          type="file" 
                          accept="image/png,image/webp" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setMaskFile(file);
                              setMaskPreview(URL.createObjectURL(file));
                            }
                          }} 
                        />
                        {maskPreview && (
                          <div className="mt-2">
                            <div className="relative rounded border overflow-hidden max-w-[200px]" style={{
                              backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)',
                              backgroundSize: '20px 20px'
                            }}>
                              <img src={maskPreview} alt="Preview" className="w-full" />
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Превью загруженной маски</div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button disabled={!maskFile || uploadMaskMutation.isPending} onClick={() => uploadMaskMutation.mutate()} size="sm" variant="secondary">
                            {uploadMaskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Загрузить маску
                          </Button>
                          {maskFile && <Button size="sm" variant="ghost" onClick={() => {
                            setMaskFile(null);
                            setMaskPreview(null);
                          }}>Отменить</Button>}
                          <Button 
                            disabled={deleteMaskMutation.isPending} 
                            onClick={() => deleteMaskMutation.mutate()} 
                            size="sm" 
                            variant="destructive"
                          >
                            {deleteMaskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />} Удалить маску
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Separator />
                  {/* Legacy single-photo save. For multi-target projects we force per-item config editing */}
                  {!isMultiTarget ? (
                    <Button disabled={patchMutation.isPending} onClick={() => patchMutation.mutate()}>
                      {patchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Сохранить и регенерировать
                    </Button>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Это мульти‑проект (несколько живых фото). Сохранение настроек выполняется отдельно для каждого фото в разделе «Живые фото» ниже. Кнопка общего сохранения отключена.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button variant="outline" className="ml-2" onClick={() => refetch()} disabled={isLoading}><RefreshCcw className="h-4 w-4 mr-2" /> Обновить данные</Button>
                </div>

                {/* Preview */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4" /> Просмотр</h3>
                  {project.viewerHtmlUrl ? (
                    <iframe
                      key={iframeKey}
                      className="w-full aspect-video border rounded"
                      src={`${project.viewerHtmlUrl}?v=${iframeKey}`}
                      ref={setIframeRef}
                      onLoad={(e) => {
                        try {
                          const iframe = e.currentTarget as HTMLIFrameElement;
                          const doc = iframe.contentDocument || iframe.contentWindow?.document;
                          if (doc) {
                            const vid = doc.getElementById('ar-video') as HTMLVideoElement | null;
                            if (vid) {
                              try { vid.autoplay = false; vid.removeAttribute('autoplay'); } catch {}
                              try { vid.muted = true; } catch {}
                              try { vid.pause(); } catch {}
                              try { vid.currentTime = 0; } catch {}
                            }
                          }
                        } catch {}
                        setIframeLoaded(true);
                      }}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">Viewer ещё не готов.</div>
                  )}
                  {/* Calibration sandbox */}
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Калибровочный sandbox</h4>
                    <CalibrationSandbox
                      photoAspectRatio={(project.photoWidth && project.photoHeight) ? (project.photoHeight / project.photoWidth) : 4/3}
                      videoAspectRatio={(project.videoWidth && project.videoHeight) ? (project.videoWidth / project.videoHeight) : 16/9}
                      videoScale={null}
                      position={pos}
                      rotation={rot}
                      markerImageUrl={project.photoUrl || undefined}
                      videoUrl={project.videoUrl || undefined}
                      onChange={(u: any) => {
                        // videoScale removed - not needed anymore
                        if (u.cropRegion) setCropRegion(u.cropRegion);
                        if (u.position) setPos(u.position);
                        if (typeof u.rotationZ === 'number') setRot(r => ({ ...r, z: u.rotationZ! }));
                        if (typeof u.zoom === 'number') setZoom(u.zoom);
                        if (typeof u.offsetX === 'number') setOffsetX(u.offsetX);
                        if (typeof u.offsetY === 'number') setOffsetY(u.offsetY);
                        if (typeof u.aspectLocked === 'boolean') setAspectLocked(u.aspectLocked);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2 border rounded">
                      <div className="font-semibold">Фото AR</div>
                      <div>Aspect: {project.photoAspectRatio || '—'}</div>
                      <div>FitMode: {fitMode}</div>
                    </div>
                    <div className="p-2 border rounded">
                      <div className="font-semibold">Видео</div>
                      <div>Aspect: {project.videoAspectRatio || '—'}</div>
                      <div>Scale: {project.scaleWidth}×{project.scaleHeight}</div>
                    </div>
                  </div>
                </div>
              </div>
              {(patchMutation.isError || uploadMaskMutation.isError || convertMaskMutation.isError) && (
                <Alert variant="destructive"><AlertDescription>
                  {(patchMutation.error as any)?.message || (uploadMaskMutation.error as any)?.message || (convertMaskMutation.error as any)?.message}
                </AlertDescription></Alert>
              )}
              {(patchMutation.isSuccess || uploadMaskMutation.isSuccess || convertMaskMutation.isSuccess) && (
                <Alert><AlertDescription>
                  {convertMaskMutation.isSuccess ? 'Маска конвертирована успешно' : 'Изменения применены.'}
                </AlertDescription></Alert>
              )}
            </>
          )}
        </CardContent>
        {/* Danger zone */}
        {project && (
          <div className="px-6 pb-6">
            <Separator className="my-6" />
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Опасная зона: удаление проекта безвозвратно удалит файлы и запись.</div>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!confirm('Удалить проект безвозвратно?')) return;
                  try {
                    const res = await fetch(`/api/ar/${project.id}`, { method: 'DELETE', credentials: 'include' });
                    if (!res.ok) throw new Error(await res.text());
                    navigate('/admin/ar');
                  } catch (e:any) {
                    alert(e.message || 'Не удалось удалить проект');
                  }
                }}
              >Удалить проект</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
