/**
 * AREditorDesktop - Полноэкранный AR редактор
 * 
 * Исправленная версия:
 * 1. Реальные пропорции фото (горизонтальное/вертикальное) - определяем из загруженного изображения
 * 2. Слайдер прозрачности видео
 * 3. Рабочее перетаскивание видео
 * 4. QR код в интерфейсе
 * 5. Видимые края видео за пределами фото
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Save, 
  RefreshCcw, 
  Image as ImageIcon, 
  Check,
  Play,
  Pause,
  ExternalLink,
  Move,
  RotateCcw,
  Camera,
  Circle,
  Square,
  RectangleHorizontal,
  Sparkles,
  X,
  QrCode
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
  config?: any;
}

interface AREditorDesktopProps {
  project: ARProject;
  onSave?: () => void;
  onRecompile?: () => void;
}

type MaskShape = 'none' | 'circle' | 'oval' | 'square' | 'rect' | 'custom';

const MASK_OPTIONS: { value: MaskShape; label: string }[] = [
  { value: 'none', label: 'Без маски' },
  { value: 'circle', label: 'Круг' },
  { value: 'oval', label: 'Овал' },
  { value: 'square', label: 'Квадрат' },
  { value: 'rect', label: 'Прямоугольник' },
  { value: 'custom', label: 'Своя маска' },
];

export default function AREditorDesktop({ project, onSave, onRecompile }: AREditorDesktopProps) {
  const queryClient = useQueryClient();
  
  // Actual dimensions from loaded media (fallback to API values)
  const [photoDimensions, setPhotoDimensions] = useState({ w: project.photoWidth || 0, h: project.photoHeight || 0 });
  const [videoDimensions, setVideoDimensions] = useState({ w: project.videoWidth || 0, h: project.videoHeight || 0 });
  
  // Video offset state (normalized: -1 to 1)
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  
  // Video opacity
  const [videoOpacity, setVideoOpacity] = useState(0.85);
  
  // Settings
  const [maskShape, setMaskShape] = useState<MaskShape>('none');
  const [customMaskUrl, setCustomMaskUrl] = useState<string>('');
  const [autoPlay, setAutoPlay] = useState(true);
  const [loop, setLoop] = useState(true);
  
  // Preview state
  const [isPlaying, setIsPlaying] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [showARPreview, setShowARPreview] = useState(true);
  
  // Video zoom (1.0 = 100%, 1.5 = 150%)
  const [videoZoom, setVideoZoom] = useState(1.0);
  
  // Container dimensions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Custom mask upload
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  
  // Load config on mount
  useEffect(() => {
    if (project?.config) {
      const cfg = project.config;
      if (cfg.shapeType) setMaskShape(cfg.shapeType);
      if (cfg.maskUrl) setCustomMaskUrl(cfg.maskUrl);
      if (cfg.autoPlay !== undefined) setAutoPlay(cfg.autoPlay);
      if (cfg.loop !== undefined) setLoop(cfg.loop);
      if (cfg.offsetX !== undefined) setOffsetX(cfg.offsetX);
      if (cfg.offsetY !== undefined) setOffsetY(cfg.offsetY);
      // Persisted zoom field is `zoom` in backend config
      if (cfg.zoom !== undefined) setVideoZoom(cfg.zoom);
    }
  }, [project]);

  // Load photo dimensions from actual image
  useEffect(() => {
    if (project.photoUrl) {
      const img = new Image();
      img.onload = () => {
        setPhotoDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        console.log('[AREditor] Photo dimensions:', img.naturalWidth, 'x', img.naturalHeight);
      };
      img.src = project.photoUrl;
    }
  }, [project.photoUrl]);

  // Load video dimensions from actual video
  useEffect(() => {
    if (project.videoUrl) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setVideoDimensions({ w: video.videoWidth, h: video.videoHeight });
        console.log('[AREditor] Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      };
      video.src = project.videoUrl;
    }
  }, [project.videoUrl]);

  // Measure container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate aspect ratios
  const photoW = photoDimensions.w || 1000;
  const photoH = photoDimensions.h || 1000;
  const videoW = videoDimensions.w || 1000;
  const videoH = videoDimensions.h || 1000;
  const photoAR = photoW / photoH;
  const videoAR = videoW / videoH;
  
  // Determine if video overflows
  const videoWider = videoAR > photoAR;
  const videoTaller = videoAR < photoAR;

  // Calculate preview size to fit container while maintaining photo's aspect ratio
  const getPreviewSize = () => {
    if (!containerSize.width || !containerSize.height) {
      return { width: 400, height: 400 / photoAR };
    }
    
    const maxW = containerSize.width - 48;
    const maxH = containerSize.height - 48;
    
    let w, h;
    if (photoAR > maxW / maxH) {
      w = Math.min(maxW, 800); // Max width 800px
      h = w / photoAR;
    } else {
      h = Math.min(maxH, 600); // Max height 600px
      w = h * photoAR;
    }
    
    return { width: Math.round(w), height: Math.round(h) };
  };
  
  const previewSize = getPreviewSize();

  // Calculate video size (cover mode - fill photo completely, may overflow)
  // Apply zoom factor
  const getVideoSize = () => {
    let baseW, baseH;
    if (videoWider) {
      // Video is wider than photo - match height, overflow width
      baseH = previewSize.height;
      baseW = baseH * videoAR;
    } else if (videoTaller) {
      // Video is taller than photo - match width, overflow height
      baseW = previewSize.width;
      baseH = baseW / videoAR;
    } else {
      baseW = previewSize.width;
      baseH = previewSize.height;
    }
    // Apply zoom
    return { width: baseW * videoZoom, height: baseH * videoZoom };
  };
  
  const videoSize = getVideoSize();

  // Calculate max offset
  // Video edges must NEVER go inside photo bounds
  // So max offset = (videoSize - photoSize) / 2 / photoSize (normalized)
  const getMaxOffset = () => {
    const overflowX = Math.max(0, (videoSize.width - previewSize.width) / 2);
    const overflowY = Math.max(0, (videoSize.height - previewSize.height) / 2);
    return { 
      x: previewSize.width > 0 ? overflowX / previewSize.width : 0, 
      y: previewSize.height > 0 ? overflowY / previewSize.height : 0 
    };
  };
  
  const maxOffset = getMaxOffset();
  const canDragX = maxOffset.x > 0.01;
  const canDragY = maxOffset.y > 0.01;

  // Calculate video position
  // Base centering: center the video in the photo container
  // videoSize already includes zoom, so no need to divide
  const baseCenterX = (previewSize.width - videoSize.width) / 2;
  const baseCenterY = (previewSize.height - videoSize.height) / 2;
  // ВАЖНО: знак МИНУС чтобы offsetX > 0 двигал видео ВЛЕВО (показывая правую часть)
  const videoLeft = baseCenterX - offsetX * previewSize.width;
  const videoTop = baseCenterY - offsetY * previewSize.height;

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canDragX && !canDragY) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX,
      offsetY
    };
  }, [canDragX, canDragY, offsetX, offsetY]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - dragStartRef.current.x) / previewSize.width;
      const deltaY = (e.clientY - dragStartRef.current.y) / previewSize.height;
      
      // Recalculate maxOffset for current zoom level
      const currentMaxOffset = getMaxOffset();
      
      let newOffsetX = dragStartRef.current.offsetX + deltaX;
      let newOffsetY = dragStartRef.current.offsetY + deltaY;
      
      // Clamp to current bounds
      newOffsetX = Math.max(-currentMaxOffset.x, Math.min(currentMaxOffset.x, newOffsetX));
      newOffsetY = Math.max(-currentMaxOffset.y, Math.min(currentMaxOffset.y, newOffsetY));
      
      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, previewSize, maxOffset]);

  // Play/pause video
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Reset offset
  const resetOffset = () => {
    setOffsetX(0);
    setOffsetY(0);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        autoPlay,
        loop,
        fitMode: 'cover',
        // Align backend viewer offset direction with UI preview
        offsetX: -offsetX,
        offsetY: -offsetY,
        zoom: videoZoom,
        videoPosition: { x: 0, y: 0, z: 0 },
        videoRotation: { x: 0, y: 0, z: 0 },
      };
      
      body.shapeType = maskShape;
      if (maskShape === 'none') {
        body.removeMask = true;
      }
      
      const res = await apiRequest('PATCH', `/api/ar/${project.id}/config`, body);
      return res.json();
    },
    onSuccess: async () => {
      // После сохранения конфига ОБЯЗАТЕЛЬНО перекомпилировать проект
      try {
        await apiRequest('POST', `/api/ar/${project.id}/recompile`);
        console.log('[AR Editor] ✓ Project recompiled after config save');
      } catch (err) {
        console.error('[AR Editor] Recompile error:', err);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', project.id] });
      onSave?.();
    },
  });

  // Upload custom mask mutation
  const uploadMaskMutation = useMutation({
    mutationFn: async () => {
      if (!maskFile) throw new Error('No file');
      const fd = new FormData();
      fd.append('mask', maskFile);
      const res = await fetch(`/api/ar/${project.id}/mask`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', project.id] });
      setMaskFile(null);
      setMaskPreview(null);
    },
  });

  // Delete mask mutation
  const deleteMaskMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/ar/${project.id}/mask`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ar/status', project.id] });
      setMaskShape('none');
      setMaskFile(null);
      setMaskPreview(null);
      // Reset transforms to default after mask removal
      setVideoZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    },
  });

  const viewerUrl = `/objects/ar-storage/${project.id}/index.html`;

  // Маска поверх предпросмотра (визуально показывает область видимости)
  const maskOverlay: { overlayStyle: React.CSSProperties; outlineStyle: React.CSSProperties } | null = useMemo(() => {
    if (maskShape === 'none') return null;
    const overlayBase: React.CSSProperties = {
      backgroundColor: 'rgba(0,0,0,0.45)',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
    };
    const outlineBase: React.CSSProperties = {
      position: 'absolute',
      inset: '6%',
      border: '2px solid rgba(34,211,238,0.7)',
      pointerEvents: 'none',
    };
    if (maskShape === 'circle') {
      const maskImage = 'radial-gradient(circle at center, transparent 44%, black 46%)';
      return {
        overlayStyle: { ...overlayBase, WebkitMaskImage: maskImage, maskImage },
        outlineStyle: { ...outlineBase, borderRadius: '9999px' },
      };
    }
    if (maskShape === 'oval') {
      const maskImage = 'radial-gradient(ellipse at center, transparent 42%, black 44%)';
      return {
        overlayStyle: { ...overlayBase, WebkitMaskImage: maskImage, maskImage },
        outlineStyle: { ...outlineBase, borderRadius: '50% / 38%' },
      };
    }
    if (maskShape === 'square') {
      const maskImage = 'radial-gradient(closest-side at center, transparent 48%, black 50%)';
      return {
        overlayStyle: { ...overlayBase, WebkitMaskImage: maskImage, maskImage },
        outlineStyle: { ...outlineBase, borderRadius: '6px' },
      };
    }
    if (maskShape === 'rect') {
      const maskImage = 'radial-gradient(closest-side at center, transparent 40%, black 42%)';
      return {
        overlayStyle: { ...overlayBase, WebkitMaskImage: maskImage, maskImage },
        outlineStyle: { ...outlineBase, borderRadius: '4px' },
      };
    }
    if (maskShape === 'custom') {
      const src = maskPreview || project.maskUrl;
      if (!src) return null;
      const maskImage = `url(${src})`;
      return {
        overlayStyle: { ...overlayBase, WebkitMaskImage: maskImage, maskImage },
        outlineStyle: { ...outlineBase, borderRadius: '4px' },
      };
    }
    return null;
  }, [maskShape, maskPreview, project.maskUrl]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <span className="font-semibold">AR Редактор</span>
          <span className="text-sm text-gray-400">#{project.id.slice(0, 8)}</span>
          <span className={`px-2 py-0.5 rounded text-xs ${
            project.status === 'ready' ? 'bg-green-600' : 
            project.status === 'processing' ? 'bg-yellow-600' : 
            project.status === 'error' ? 'bg-red-600' : 'bg-gray-600'
          }`}>
            {project.status}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {project.status === 'ready' && (
            <a 
              href={viewerUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1 text-sm text-gray-300 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" /> Открыть AR
            </a>
          )}
          
          {project.qrCodeUrl && (
            <Button variant="ghost" size="sm" onClick={() => setShowQR(!showQR)}>
              <QrCode className="h-4 w-4 mr-1" />
              QR
            </Button>
          )}
          
          <Button 
            size="sm" 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><Save className="h-4 w-4 mr-1" /> Сохранить</>
            )}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left panel - Preview */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-6 relative"
        >
            {/* Photo container - centered */}
            <div 
              className="relative bg-black shadow-2xl overflow-hidden"
              style={{ 
                width: previewSize.width, 
                height: previewSize.height,
                cursor: (canDragX || canDragY) ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
              onMouseDown={handleMouseDown}
            >
              {/* Photo layer */}
              {project.photoUrl && (
                <img 
                  src={project.photoUrl} 
                  alt="Photo marker"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
              )}
              
              {/* Video layer - positioned, can be dragged */}
              {project.videoUrl && (
                <video
                  ref={videoRef}
                  src={project.videoUrl}
                  className="absolute pointer-events-none"
                  style={{
                    left: videoLeft,
                    top: videoTop,
                    width: videoSize.width,
                    height: videoSize.height,
                    opacity: videoOpacity,
                    objectFit: 'cover',
                  }}
                  autoPlay={autoPlay}
                  loop={loop}
                  muted
                  playsInline
                />
              )}

              {/* Маска поверх видео для наглядного позиционирования */}
              {maskOverlay && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0" style={maskOverlay.overlayStyle} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div style={maskOverlay.outlineStyle} />
                  </div>
                </div>
              )}
              
              {/* Photo boundary */}
              <div className="absolute inset-0 border-2 border-dashed border-purple-500/70 pointer-events-none" />
              
              {/* Center crosshair for dragging */}
              {(canDragX || canDragY) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`p-2 rounded-full ${isDragging ? 'bg-purple-500/50' : 'bg-black/30'}`}>
                    <Move className={`h-6 w-6 ${isDragging ? 'text-white' : 'text-white/50'}`} />
                  </div>
                </div>
              )}
              
              {/* Offset indicator */}
              {(offsetX !== 0 || offsetY !== 0) && (
                <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
                  {videoWider && `X: ${(offsetX * 100).toFixed(0)}%`}
                  {videoTaller && `Y: ${(offsetY * 100).toFixed(0)}%`}
                </div>
              )}
            </div>
          
          {/* Info panel */}
          <div className="absolute top-6 left-6 bg-black/70 p-3 rounded text-xs space-y-1">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-400" />
              <span>Фото: {photoW}×{photoH}</span>
              <span className="text-gray-500">
                ({photoAR > 1 ? 'горизонт.' : photoAR < 1 ? 'вертикал.' : 'квадрат'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-400" />
              <span>Видео: {videoW}×{videoH}</span>
            </div>
            {(canDragX || canDragY) && (
              <div className="text-yellow-400 mt-1">
                ⚠ Видео {videoWider ? 'шире' : 'выше'} фото
              </div>
            )}
          </div>
          
          {/* QR Code popup */}
          {showQR && project.qrCodeUrl && (
            <div className="absolute top-6 right-6 bg-white p-4 rounded-lg shadow-xl z-20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-black text-sm font-medium">QR код для AR</span>
                <button onClick={() => setShowQR(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <img src={project.qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>
          )}
          
          {/* AR Live Preview - small window in corner */}
          {showARPreview && project.status === 'ready' && (
            <div className="absolute bottom-6 right-6 bg-black rounded-lg shadow-xl overflow-hidden z-10" style={{ width: 280, height: 200 }}>
              <div className="flex justify-between items-center bg-gray-800 px-2 py-1">
                <span className="text-xs text-gray-300 flex items-center gap-1">
                  <Camera className="h-3 w-3" /> AR Preview
                </span>
                <div className="flex gap-1">
                  <a 
                    href={`/objects/ar-storage/${project.id}/index.html`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-400 hover:text-white p-1"
                    title="Открыть в новом окне"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button 
                    onClick={() => setShowARPreview(false)} 
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <iframe
                src={`/objects/ar-storage/${project.id}/index.html`}
                className="w-full border-0"
                style={{ height: 'calc(100% - 24px)' }}
                allow="camera; microphone; xr-spatial-tracking"
              />
            </div>
          )}
          
          {/* Show AR Preview button if hidden */}
          {!showARPreview && project.status === 'ready' && (
            <button
              onClick={() => setShowARPreview(true)}
              className="absolute bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 z-10"
            >
              <Camera className="h-4 w-4" />
              AR Preview
            </button>
          )}
        </div>
      </main>
      
      {/* Bottom toolbar */}
      <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center px-4 gap-4 flex-shrink-0">
        {/* Play/pause */}
        <Button variant="ghost" size="sm" onClick={togglePlay}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        
        {/* Reset offset */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={resetOffset} 
          disabled={offsetX === 0 && offsetY === 0}
          title="Сбросить позицию видео"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-gray-600" />
        
        {/* Opacity slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Прозрачн.:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={videoOpacity * 100}
            onChange={(e) => setVideoOpacity(Number(e.target.value) / 100)}
            className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs w-8">{Math.round(videoOpacity * 100)}%</span>
        </div>
        
        <div className="w-px h-6 bg-gray-600" />
        
        {/* Zoom slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Zoom:</span>
          <input
            type="range"
            min="100"
            max="200"
            value={videoZoom * 100}
            onChange={(e) => setVideoZoom(Number(e.target.value) / 100)}
            className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs w-10">{Math.round(videoZoom * 100)}%</span>
        </div>
        
        <div className="w-px h-6 bg-gray-600" />
        
        {/* Mask selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Маска:</span>
          <select 
            value={maskShape}
            onChange={(e) => setMaskShape(e.target.value as MaskShape)}
            className="bg-gray-700 border-gray-600 rounded px-2 py-1 text-sm"
          >
            {MASK_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <div className="w-px h-6 bg-gray-600" />
        
        {/* Playback options */}
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input 
            type="checkbox" 
            checked={autoPlay} 
            onChange={(e) => setAutoPlay(e.target.checked)}
            className="rounded bg-gray-700 border-gray-600"
          />
          Авто
        </label>
        
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input 
            type="checkbox" 
            checked={loop} 
            onChange={(e) => setLoop(e.target.checked)}
            className="rounded bg-gray-700 border-gray-600"
          />
          Цикл
        </label>
        
        <div className="flex-1" />
        
        {/* Drag hint */}
        {(canDragX || canDragY) && (
          <span className="text-xs text-gray-500">
            {canDragX && canDragY ? '↔↕ Перетащите' : canDragX ? '← → Перетащите' : '↑ ↓ Перетащите'}
          </span>
        )}
        
        {/* Recompile button */}
        {onRecompile && (
          <Button variant="outline" size="sm" onClick={onRecompile}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Перекомпилировать
          </Button>
        )}
        
        {/* Save button */}
        <Button 
          size="sm" 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          Сохранить
        </Button>
      </div>
      
      {/* Custom mask upload panel */}
      {maskShape === 'custom' && (
        <div className="h-auto bg-gray-800 border-t border-gray-700 p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="text-sm font-medium text-gray-300">Загрузите свою маску (PNG/WebP с прозрачностью)</div>
            
            <div className="flex items-start gap-4">
              {/* File input */}
              <div className="flex-1">
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
                  className="text-sm text-gray-400"
                />
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  disabled={!maskFile || uploadMaskMutation.isPending} 
                  onClick={() => uploadMaskMutation.mutate()}
                >
                  {uploadMaskMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    '📤'
                  )} Загрузить
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  disabled={deleteMaskMutation.isPending || (!project.maskUrl && !maskPreview)} 
                  onClick={() => deleteMaskMutation.mutate()}
                >
                  {deleteMaskMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    '🗑'
                  )} Удалить
                </Button>
              </div>
            </div>
            
            {/* Preview */}
            <div className="flex gap-4">
              {maskPreview && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Превью загруженной:</div>
                  <div className="w-32 h-32 border border-gray-600 rounded overflow-hidden" style={{
                    backgroundImage: 'repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%)',
                    backgroundSize: '16px 16px'
                  }}>
                    <img src={maskPreview} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
              {project.maskUrl && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Текущая в проекте:</div>
                  <div className="w-32 h-32 border border-gray-600 rounded overflow-hidden" style={{
                    backgroundImage: 'repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%)',
                    backgroundSize: '16px 16px'
                  }}>
                    <img src={project.maskUrl} alt="Current mask" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Status toasts */}
      {saveMutation.isSuccess && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-pulse">
          ✓ Сохранено
        </div>
      )}
      
      {saveMutation.isError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50">
          Ошибка: {(saveMutation.error as any)?.message}
        </div>
      )}
    </div>
  );
}
