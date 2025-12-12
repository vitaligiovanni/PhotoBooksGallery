import React, { useRef, useState, useCallback } from 'react';

export interface CalibrationSandboxProps {
  photoAspectRatio: number; // height/width фото
  videoScale: { width: number; height: number } | null; // DEPRECATED: используется только для обратной совместимости
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  zoom?: number; // Текущий зум (0.5-2.0)
  offsetX?: number; // Сдвиг по X (-0.5 до +0.5)
  offsetY?: number; // Сдвиг по Y (-0.5 до +0.5)
  onChange: (update: { 
    videoScale?: { width: number; height: number }; 
    cropRegion?: { x: number; y: number; width: number; height: number };
    position?: { x: number; y: number; z: number }; 
    rotationZ?: number;
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
  }) => void;
  markerImageUrl?: string | null;
  videoAspectRatio?: number; // width/height оригинального видео (для crop области)
  videoUrl?: string | null; // URL видео для preview
}

/**
 * 2D Sandbox для калибровки AR наложения видео.
 * НОВАЯ ЛОГИКА: Синяя рамка = область обрезки видео (cropRegion), плоскость всегда = размер фото.
 * Плоскость: width=1.0, height=photoAspectRatio (H/W).
 * Центр (0,0) = центр плоскости. +X вправо, +Y вверх (координаты A-Frame).
 */
export const CalibrationSandbox: React.FC<CalibrationSandboxProps> = ({ 
  photoAspectRatio, 
  videoScale, 
  position, 
  rotation, 
  zoom: initialZoom = 1.0,
  offsetX: initialOffsetX = 0,
  offsetY: initialOffsetY = 0,
  onChange, 
  markerImageUrl,
  videoAspectRatio = 16/9,
  videoUrl 
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<null | string>(null); // 'br' etc
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);

  const planeW = 1; // normalized
  const planeH = photoAspectRatio || 0.75; // fallback
  
  // Crop region: область видео для отображения (нормализованные координаты 0-1)
  // ПО УМОЛЧАНИЮ: ВЕСЬ квадрат на всю площадь фотографии!
  const [cropRegion, setCropRegion] = useState({ x: 0, y: 0, width: 1, height: 1 });
  
  // Zoom and Offset state - инициализируем из пропсов!
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [offsetX, setOffsetX] = useState<number>(initialOffsetX);
  const [offsetY, setOffsetY] = useState<number>(initialOffsetY);
  const [aspectLocked, setAspectLocked] = useState<boolean>(true);
  
  // Синхронизация zoom/offset из пропсов при изменении
  React.useEffect(() => {
    if (initialZoom !== undefined) setZoom(initialZoom);
  }, [initialZoom]);
  
  React.useEffect(() => {
    if (initialOffsetX !== undefined) setOffsetX(initialOffsetX);
  }, [initialOffsetX]);
  
  React.useEffect(() => {
    if (initialOffsetY !== undefined) setOffsetY(initialOffsetY);
  }, [initialOffsetY]);
  
  // Convert normalized units to pixels for rendering
  const pxW = 420; // sandbox width px
  const pxH = pxW * planeH / planeW;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    setLastPointer({ x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging && !resizing) return;
    if (!lastPointer) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    setLastPointer({ x: e.clientX, y: e.clientY });

    if (dragging) {
      // Двигаем crop region в нормализованных координатах (0-1 относительно видео)
      const cropDx = dx / pxW;
      const cropDy = dy / pxH;
      
      let newCropRegion = {
        x: cropRegion.x + cropDx,
        y: cropRegion.y + cropDy,
        width: cropRegion.width,
        height: cropRegion.height
      };
      
      // Ограничиваем границами видео (0-1)
      newCropRegion.x = Math.max(0, Math.min(1 - newCropRegion.width, newCropRegion.x));
      newCropRegion.y = Math.max(0, Math.min(1 - newCropRegion.height, newCropRegion.y));
      
      setCropRegion(newCropRegion);
      onChange({ cropRegion: newCropRegion });
      
    } else if (resizing) {
      // Изменяем размер crop region СВОБОДНО (без блокировки пропорций)
      const cropDw = dx / pxW;
      const cropDh = dy / pxH;
      
      let newWidth = cropRegion.width + cropDw;
      let newHeight = cropRegion.height + cropDh;
      
      // Ограничиваем размер границами (0-1)
      if (cropRegion.x + newWidth > 1) newWidth = 1 - cropRegion.x;
      if (cropRegion.y + newHeight > 1) newHeight = 1 - cropRegion.y;
      
      newWidth = Math.max(0.1, Math.min(1, newWidth));
      newHeight = Math.max(0.1, Math.min(1, newHeight));
      
      const newCropRegion = {
        x: cropRegion.x,
        y: cropRegion.y,
        width: newWidth,
        height: newHeight
      };
      
      setCropRegion(newCropRegion);
      onChange({ cropRegion: newCropRegion });
    }
  };

  const onPointerUp = () => {
    setDragging(false);
    setResizing(null);
    setLastPointer(null);
  };

  const startResize = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    setResizing(handle);
    setLastPointer({ x: e.clientX, y: e.clientY });
  };

  const rotateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const zDeg = parseFloat(e.target.value) || 0;
    onChange({ rotationZ: zDeg });
  };

  // Конвертируем cropRegion в пиксели для отрисовки
  const cropX = cropRegion.x * pxW;
  const cropY = cropRegion.y * pxH;
  const cropW = cropRegion.width * pxW;
  const cropH = cropRegion.height * pxH;

  const cropBoxStyle: React.CSSProperties = {
    position: 'absolute',
    left: cropX,
    top: cropY,
    width: cropW,
    height: cropH,
    border: '3px solid #2563eb',
    background: 'rgba(37,99,235,0.10)',
    backdropFilter: 'blur(2px)',
    cursor: dragging ? 'grabbing' : 'grab',
    transition: dragging || resizing ? 'none' : 'all .15s',
    boxShadow: dragging || resizing ? '0 0 0 2px #1d4ed8, 0 0 0 6px rgba(29,78,216,0.3)' : '0 0 0 1px rgba(0,0,0,0.15)'
  };

  // NEW: Handlers for zoom/offset
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    onChange({ zoom: newZoom } as any);
  };

  const handleOffsetXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOffsetX = parseFloat(e.target.value);
    setOffsetX(newOffsetX);
    onChange({ offsetX: newOffsetX } as any);
  };

  const handleOffsetYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOffsetY = parseFloat(e.target.value);
    setOffsetY(newOffsetY);
    onChange({ offsetY: newOffsetY } as any);
  };

  const handleAspectLockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAspectLocked = e.target.checked;
    setAspectLocked(newAspectLocked);
    onChange({ aspectLocked: newAspectLocked } as any);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground flex justify-between items-center">
        <span>Фото (маркер): 1.00 × {planeH.toFixed(3)}</span>
        <span>Crop область: {(cropRegion.width * 100).toFixed(0)}% × {(cropRegion.height * 100).toFixed(0)}%</span>
      </div>
      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="relative border-2 border-gray-300 rounded bg-gray-100"
        style={{ width: pxW, height: pxH, userSelect: 'none', touchAction: 'none', overflow: 'hidden' }}
      >
        {/* Marker image background (полная яркость) */}
        {markerImageUrl && (
          <img
            src={markerImageUrl}
            alt="marker"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1, pointerEvents: 'none' }}
          />
        )}
        
        {/* Overlay: затемнение ВНЕ crop области (с вырезом) */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'rgba(0,0,0,0.6)', 
          clipPath: `polygon(
            0% 0%, 0% 100%, ${cropX}px 100%, ${cropX}px ${cropY}px, 
            ${cropX + cropW}px ${cropY}px, ${cropX + cropW}px ${cropY + cropH}px, 
            ${cropX}px ${cropY + cropH}px, ${cropX}px 100%, 100% 100%, 100% 0%
          )`,
          pointerEvents: 'none' 
        }} />
        
        {/* Crop box (синяя рамка - область обрезки видео) */}
        <div
          style={cropBoxStyle}
          onPointerDown={onPointerDown}
        >
          {/* Video preview внутри crop box */}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.7,
                pointerEvents: 'none'
              }}
            />
          )}
          
          {/* Resize handle (bottom-right) */}
          <div
            onPointerDown={(e) => startResize(e,'br')}
            style={{ 
              position: 'absolute', 
              right: -8, 
              bottom: -8, 
              width: 16, 
              height: 16, 
              background: '#1d4ed8', 
              borderRadius: '50%', 
              cursor: 'nwse-resize', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 0 3px #fff',
              border: '2px solid #fff'
            }}
            title="Изменить размер (сохраняя пропорции фото)"
          />
          
          {/* Crop info overlay */}
          <div style={{ 
            position: 'absolute', 
            top: 4, 
            left: 4, 
            background: 'rgba(0,0,0,0.7)', 
            color: '#fff', 
            padding: '2px 6px', 
            fontSize: '10px', 
            borderRadius: 3,
            pointerEvents: 'none'
          }}>
            {(cropRegion.width * 100).toFixed(0)}% × {(cropRegion.height * 100).toFixed(0)}%
          </div>
        </div>
        
        {/* Center crosshair */}
        <div style={{ position: 'absolute', left: pxW/2 - 1, top: 0, width: 2, height: pxH, background: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: pxH/2 - 1, left: 0, height: 2, width: pxW, background: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs">Поворот Z°</label>
        <input type="range" min={-180} max={180} step={1} value={rotation.z} onChange={rotateChange} className="flex-1" />
        <input type="number" className="w-16 text-xs border rounded px-1 py-0.5" value={rotation.z} onChange={e=>rotateChange({ target: { value: e.target.value } } as any)} />
      </div>
      
      {/* Кнопка сброса кропа на всю площадь */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => {
            setCropRegion({ x: 0, y: 0, width: 1, height: 1 });
            onChange({ cropRegion: { x: 0, y: 0, width: 1, height: 1 } });
          }}
          className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          🔄 Сбросить кроп (вся площадь фото)
        </button>
        {(cropRegion.x !== 0 || cropRegion.y !== 0 || cropRegion.width !== 1 || cropRegion.height !== 1) && (
          <span className="text-xs text-orange-600 font-medium">Обрезка активна</span>
        )}
      </div>
      
      {/* NEW: Zoom and Offset Controls */}
      <div className="space-y-3 pt-2 border-t">
        <div className="text-xs font-medium text-foreground">Тонкая настройка (поверх автообрезки)</div>
        
        {/* Zoom Slider */}
        <div className="flex items-center gap-2">
          <label className="text-xs min-w-[60px]">Зум</label>
          <input 
            type="range" 
            min={0.5} 
            max={2.0} 
            step={0.05} 
            value={zoom} 
            onChange={handleZoomChange} 
            className="flex-1" 
          />
          <span className="text-xs w-12 text-right">{zoom.toFixed(2)}×</span>
        </div>
        
        {/* X Offset Slider */}
        <div className="flex items-center gap-2">
          <label className="text-xs min-w-[60px]">Сдвиг X</label>
          <input 
            type="range" 
            min={-0.5} 
            max={0.5} 
            step={0.01} 
            value={offsetX} 
            onChange={handleOffsetXChange} 
            className="flex-1" 
          />
          <span className="text-xs w-12 text-right">{offsetX.toFixed(2)}</span>
        </div>
        
        {/* Y Offset Slider */}
        <div className="flex items-center gap-2">
          <label className="text-xs min-w-[60px]">Сдвиг Y</label>
          <input 
            type="range" 
            min={-0.5} 
            max={0.5} 
            step={0.01} 
            value={offsetY} 
            onChange={handleOffsetYChange} 
            className="flex-1" 
          />
          <span className="text-xs w-12 text-right">{offsetY.toFixed(2)}</span>
        </div>
        
        {/* Aspect Lock Checkbox */}
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="aspectLocked" 
            checked={aspectLocked} 
            onChange={handleAspectLockChange} 
            className="h-4 w-4 rounded border-gray-300" 
          />
          <label htmlFor="aspectLocked" className="text-xs cursor-pointer">
            Сохранять пропорции видео (рекомендуется)
          </label>
        </div>
      </div>
      
      <div className="text-[10px] text-muted-foreground space-y-1">
        <div><strong>Синяя рамка</strong> = область видео, которая будет показана в AR</div>
        <div>• <strong>Перетаскивайте рамку</strong> для выбора нужной части видео (например, лицо по центру)</div>
        <div>• <strong>Тяните за синий кружок</strong> для изменения размера (свободно - квадрат, прямоугольник, любая форма)</div>
        <div>• <strong>Затемнённая область</strong> будет обрезана (не появится в AR)</div>
        <div>• <strong>Светлая область</strong> внутри рамки = финальное видео (видео примет эту форму)</div>
      </div>
    </div>
  );
};

export default CalibrationSandbox;
