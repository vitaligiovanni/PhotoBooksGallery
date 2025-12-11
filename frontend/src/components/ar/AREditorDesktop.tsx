/**
 * AREditorDesktop - Полноэкранный AR редактор в стиле Photoshop
 * 
 * Особенности:
 * 1. Всё на одном экране без скролла (100vh)
 * 2. Реальные пропорции фото в превью (горизонтальное/вертикальное)
 * 3. Видимые полупрозрачные края видео за пределами фото
 * 4. Drag-перемещение видео мышкой
 * 5. Маленькое превью камеры в уголке с правильными пропорциями
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Save, 
  RefreshCcw, 
  Image as ImageIcon, 
  Eye,
  EyeOff,
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
  X
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

type MaskShape = 'none' | 'circle' | 'oval' | 'square' | 'rect';

const MASK_OPTIONS: { value: MaskShape; label: string }[] = [
  { value: 'none', label: 'Без маски' },
  { value: 'circle', label: 'Круг' },
  { value: 'oval', label: 'Овал' },
  { value: 'square', label: 'Квадрат' },
  { value: 'rect', label: 'Прямоугольник' },
];

export default function AREditorDesktop({ project, onSave, onRecompile }: AREditorDesktopProps) {
  const queryClient = useQueryClient();
  
  // Video offset state (normalized: -1 to 1)
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  
  // Settings
  const [maskShape, setMaskShape] = useState<MaskShape>('none');
  const [autoPlay, setAutoPlay] = useState(true);
  const [loop, setLoop] = useState(true);
  
  // Preview state
  const [isPlaying, setIsPlaying] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  
  // Container dimensions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  
  // Calculate dimensions
  const photoW = project.photoWidth || 1000;
  const photoH = project.photoHeight || 1000;
  const videoW = project.videoWidth || 1000;
  const videoH = project.videoHeight || 1000;
  const photoAR = photoW / photoH;
  const videoAR = videoW / videoH;
  
  // Determine if video overflows
  const videoWider = videoAR > photoAR;
  const videoTaller = videoAR < photoAR;
  
  // Load config on mount
  useEffect(() => {
    if (project?.config) {
      const cfg = project.config;
      if (cfg.shapeType) setMaskShape(cfg.shapeType);
      if (cfg.autoPlay !== undefined) setAutoPlay(cfg.autoPlay);
      if (cfg.loop !== undefined) setLoop(cfg.loop);
      if (cfg.offsetX !== undefined) setOffsetX(cfg.offsetX);
      if (cfg.offsetY !== undefined) setOffsetY(cfg.offsetY);
    }
  }, [project]);

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

  // Calculate preview size to fit container while maintaining aspect ratio
  const getPreviewSize = () => {
    if (!containerSize.width || !containerSize.height) {
      return { width: 400, height: 300 };
    }
    
    const maxW = containerSize.width - 48; // padding
    const maxH = containerSize.height - 48;
    
    let w, h;
    if (photoAR > maxW / maxH) {
      // Photo is wider than container - fit by width
      w = maxW;
      h = maxW / photoAR;
    } else {
      // Photo is taller - fit by height
      h = maxH;
      w = maxH * photoAR;
    }
    
    return { width: Math.round(w), height: Math.round(h) };
  };
  
  const previewSize = getPreviewSize();

  // Calculate video size relative to photo preview
  const getVideoSize = () => {
    // Video should "cover" photo - fill completely, may overflow
    if (videoWider) {
      // Video is wider - match height, overflow width
      const h = previewSize.height;
      const w = h * videoAR;
      return { width: w, height: h };
    } else if (videoTaller) {
      // Video is taller - match width, overflow height
      const w = previewSize.width;
      const h = w / videoAR;
      return { width: w, height: h };
    } else {
      // Same aspect ratio
      return previewSize;
    }
  };
  
  const videoSize = getVideoSize();

  // Max offset based on overflow
  const getMaxOffset = () => {
    if (videoWider) {
      const overflow = (videoSize.width - previewSize.width) / 2;
      return { x: overflow / previewSize.width, y: 0 };
    } else if (videoTaller) {
      const overflow = (videoSize.height - previewSize.height) / 2;
      return { x: 0, y: overflow / previewSize.height };
    }
    return { x: 0, y: 0 };
  };
  
  const maxOffset = getMaxOffset();

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      alert('Не удалось получить доступ к камере');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraRef.current?.srcObject) {
      const stream = cameraRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      cameraRef.current.srcObject = null;
    }
    setShowCamera(false);
  }, []);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!(videoWider || videoTaller)) return; // No overflow, can't drag
    
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartOffset({ x: offsetX, y: offsetY });
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate delta in preview coordinates
      const deltaX = (e.clientX - dragStartPos.x) / previewSize.width;
      const deltaY = (e.clientY - dragStartPos.y) / previewSize.height;
      
      // Apply delta to starting offset
      let newOffsetX = dragStartOffset.x + deltaX;
      let newOffsetY = dragStartOffset.y + deltaY;
      
      // Clamp to max offset
      newOffsetX = Math.max(-maxOffset.x, Math.min(maxOffset.x, newOffsetX));
      newOffsetY = Math.max(-maxOffset.y, Math.min(maxOffset.y, newOffsetY));
      
      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartPos, dragStartOffset, previewSize, maxOffset]);

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
        offsetX,
        offsetY,
        videoPosition: { x: 0, y: 0, z: 0 },
        videoRotation: { x: 0, y: 0, z: 0 },
      };
      
      if (maskShape !== 'none') {
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
      onSave?.();
    },
  });

  const viewerUrl = `/objects/ar-storage/${project.id}/index.html`;
  
  // Calculate video position (centered, then offset)
  const videoLeft = (previewSize.width - videoSize.width) / 2 + offsetX * previewSize.width;
  const videoTop = (previewSize.height - videoSize.height) / 2 + offsetY * previewSize.height;

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
          
          <Button 
            variant="ghost"
            size="sm"
            onClick={showCamera ? stopCamera : startCamera}
          >
            <Camera className="h-4 w-4 mr-1" />
            {showCamera ? 'Выкл камеру' : 'Вкл камеру'}
          </Button>
          
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
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Preview container */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-6 relative"
        >
          {/* Photo preview with real aspect ratio */}
          <div 
            className="relative bg-black shadow-2xl"
            style={{ 
              width: previewSize.width, 
              height: previewSize.height,
              cursor: (videoWider || videoTaller) ? 'move' : 'default',
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
            
            {/* Video layer - positioned absolutely, can overflow */}
            {project.videoUrl && (
              <div 
                className="absolute pointer-events-none"
                style={{
                  left: videoLeft,
                  top: videoTop,
                  width: videoSize.width,
                  height: videoSize.height,
                }}
              >
                <video
                  ref={videoRef}
                  src={project.videoUrl}
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.85 }}
                  autoPlay={autoPlay}
                  loop={loop}
                  muted
                  playsInline
                />
                
                {/* Semi-transparent overlay on parts outside photo */}
                {/* Left overflow */}
                {videoLeft < 0 && (
                  <div 
                    className="absolute top-0 bottom-0 bg-black/50"
                    style={{ left: 0, width: -videoLeft }}
                  />
                )}
                {/* Right overflow */}
                {videoLeft + videoSize.width > previewSize.width && (
                  <div 
                    className="absolute top-0 bottom-0 bg-black/50"
                    style={{ 
                      right: 0, 
                      width: (videoLeft + videoSize.width) - previewSize.width 
                    }}
                  />
                )}
                {/* Top overflow */}
                {videoTop < 0 && (
                  <div 
                    className="absolute left-0 right-0 bg-black/50"
                    style={{ top: 0, height: -videoTop }}
                  />
                )}
                {/* Bottom overflow */}
                {videoTop + videoSize.height > previewSize.height && (
                  <div 
                    className="absolute left-0 right-0 bg-black/50"
                    style={{ 
                      bottom: 0, 
                      height: (videoTop + videoSize.height) - previewSize.height 
                    }}
                  />
                )}
              </div>
            )}
            
            {/* Photo boundary - dashed line */}
            <div className="absolute inset-0 border-2 border-dashed border-purple-500/70 pointer-events-none" />
            
            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Move className={`h-8 w-8 ${isDragging ? 'text-purple-400' : 'text-white/30'}`} />
            </div>
            
            {/* Offset indicator */}
            {(offsetX !== 0 || offsetY !== 0) && (
              <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
                {videoWider && `X: ${(offsetX * 100).toFixed(0)}%`}
                {videoTaller && `Y: ${(offsetY * 100).toFixed(0)}%`}
              </div>
            )}
            
            {/* Drag instruction */}
            {(videoWider || videoTaller) && !isDragging && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded text-xs whitespace-nowrap">
                {videoWider ? '← Перетащите видео влево/вправо →' : '↑ Перетащите видео вверх/вниз ↓'}
              </div>
            )}
          </div>
          
          {/* Info overlay */}
          <div className="absolute top-6 left-6 bg-black/70 p-3 rounded text-xs space-y-1">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-400" />
              <span>Фото: {photoW}×{photoH}</span>
              <span className="text-gray-500">({photoAR > 1 ? 'горизонт.' : 'вертикал.'})</span>
            </div>
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-400" />
              <span>Видео: {videoW}×{videoH}</span>
            </div>
            {(videoWider || videoTaller) && (
              <div className="text-yellow-400">
                ⚠ Видео {videoWider ? 'шире' : 'выше'} фото — можно сдвигать
              </div>
            )}
          </div>
          
          {/* Camera preview - small, in corner, with real proportions */}
          {showCamera && (
            <div className="absolute bottom-6 right-6 bg-black rounded-lg shadow-xl overflow-hidden">
              <div className="relative">
                <video 
                  ref={cameraRef}
                  className="w-64 h-auto"
                  autoPlay
                  playsInline
                  muted
                  style={{ maxHeight: 180 }}
                />
                <button
                  onClick={stopCamera}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-1 hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-center py-1">
                  Наведите на фото-маркер
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom toolbar */}
        <div className="h-14 bg-gray-800 border-t border-gray-700 flex items-center px-4 gap-4 flex-shrink-0">
          {/* Play/pause */}
          <Button variant="ghost" size="sm" onClick={togglePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          {/* Reset */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetOffset} 
            disabled={offsetX === 0 && offsetY === 0}
          >
            <RotateCcw className="h-4 w-4 mr-1" /> Сброс
          </Button>
          
          <div className="w-px h-6 bg-gray-600" />
          
          {/* Mask selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Маска:</span>
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
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoPlay} 
              onChange={(e) => setAutoPlay(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            Автовоспроизведение
          </label>
          
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={loop} 
              onChange={(e) => setLoop(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            Зацикливание
          </label>
          
          <div className="flex-1" />
          
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
            Сохранить и компилировать
          </Button>
        </div>
      </main>
      
      {/* Status toast */}
      {saveMutation.isSuccess && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
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
