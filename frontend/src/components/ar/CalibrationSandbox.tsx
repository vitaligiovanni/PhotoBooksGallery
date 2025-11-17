import React, { useRef, useState, useCallback } from 'react';

export interface CalibrationSandboxProps {
  photoAspectRatio: number; // height/width
  videoScale: { width: number; height: number } | null;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  onChange: (update: { videoScale?: { width: number; height: number }; position?: { x: number; y: number; z: number }; rotationZ?: number }) => void;
  markerImageUrl?: string | null;
}

/**
 * 2D Sandbox for calibrating AR video overlay relative to marker plane.
 * Plane width normalized to 1.0; height = photoAspectRatio (H/W).
 * Center (0,0) is plane center. Positive X moves right, positive Y moves up (matching A-Frame coords).
 */
export const CalibrationSandbox: React.FC<CalibrationSandboxProps> = ({ photoAspectRatio, videoScale, position, rotation, onChange, markerImageUrl }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<null | string>(null); // 'br' etc
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);

  const planeW = 1; // normalized
  const planeH = photoAspectRatio || 0.75; // fallback
  const scale = videoScale || { width: 0.8, height: 0.6 * (planeH / 0.75) }; // initial guess

  // Convert normalized units to pixels for rendering
  const pxW = 420; // sandbox width px
  const pxH = pxW * planeH / planeW;

  function normToPxX(x: number) { return (x + planeW/2) / planeW * pxW; }
  function normToPxY(y: number) { return ( (planeH/2 - y) / planeH ) * pxH; } // invert Y for CSS top

  // Video top-left in normalized units
  const vidLeftNorm = position.x - scale.width/2;
  const vidTopNorm = position.y + scale.height/2; // because Y positive up; top is +height/2

  const vidStyle: React.CSSProperties = {
    position: 'absolute',
    left: normToPxX(vidLeftNorm),
    top: normToPxY(vidTopNorm),
    width: (scale.width / planeW) * pxW,
    height: (scale.height / planeH) * pxH,
    border: '2px solid #2563eb',
    background: 'rgba(37,99,235,0.10)',
    backdropFilter: 'blur(2px)',
    transformOrigin: 'center',
    rotate: `${rotation.z}deg`,
    cursor: dragging ? 'grabbing' : 'grab',
    transition: dragging || resizing ? 'none' : 'box-shadow .15s',
    boxShadow: dragging || resizing ? '0 0 0 2px #1d4ed8, 0 0 0 4px rgba(29,78,216,0.3)' : '0 0 0 1px rgba(0,0,0,0.15)'
  };

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
      // convert pixel delta to normalized
      const normDx = dx / pxW * planeW;
      const normDy = -dy / pxH * planeH; // invert
      const newPos = {
        x: position.x + normDx,
        y: position.y + normDy,
        z: position.z
      };
      // boundary clamp (keep center within plane bounds +/- half scale)
      const halfW = scale.width/2;
      const halfH = scale.height/2;
      newPos.x = Math.min(planeW/2 - halfW, Math.max(-planeW/2 + halfW, newPos.x));
      newPos.y = Math.min(planeH/2 - halfH, Math.max(-planeH/2 + halfH, newPos.y));
      onChange({ position: newPos });
    } else if (resizing) {
      // Only bottom-right handle for simplicity
      const normDx = dx / pxW * planeW;
      const normDy = dy / pxH * planeH; // dy positive downward -> reduce height upward? We'll increase height downward.
      let newWidth = scale.width + normDx;
      let newHeight = scale.height + normDy;
      newWidth = Math.max(0.05, Math.min(planeW, newWidth));
      newHeight = Math.max(0.05, Math.min(planeH, newHeight));
      onChange({ videoScale: { width: newWidth, height: newHeight } });
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

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground flex justify-between items-center">
        <span>Плоскость маркера: 1.00 × {planeH.toFixed(3)}</span>
        <span>Видео: {(videoScale?.width || scale.width).toFixed(3)} × {(videoScale?.height || scale.height).toFixed(3)}</span>
      </div>
      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="relative border rounded bg-[repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6_10px,#fff_10px,#fff_20px)]"
        style={{ width: pxW, height: pxH, userSelect: 'none', touchAction: 'none' }}
      >
        {/* Marker image background (semi-transparent) */}
        {markerImageUrl && (
          <img
            src={markerImageUrl}
            alt="marker"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.35, pointerEvents: 'none' }}
          />
        )}
        {/* Center crosshair */}
        <div style={{ position: 'absolute', left: pxW/2 - 1, top: 0, width: 2, height: pxH, background: 'rgba(0,0,0,0.08)' }} />
        <div style={{ position: 'absolute', top: pxH/2 - 1, left: 0, height: 2, width: pxW, background: 'rgba(0,0,0,0.08)' }} />
        {/* Video box */}
        <div
          style={vidStyle}
          onPointerDown={onPointerDown}
        >
          {/* Resize handle (bottom-right) */}
          <div
            onPointerDown={(e) => startResize(e,'br')}
            style={{ position: 'absolute', right: -6, bottom: -6, width: 14, height: 14, background: '#1d4ed8', borderRadius: 4, cursor: 'nwse-resize', boxShadow: '0 0 0 2px #fff' }}
            title="Resize"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs">Поворот Z°</label>
        <input type="range" min={-180} max={180} step={1} value={rotation.z} onChange={rotateChange} className="flex-1" />
        <input type="number" className="w-16 text-xs border rounded px-1 py-0.5" value={rotation.z} onChange={e=>rotateChange({ target: { value: e.target.value } } as any)} />
      </div>
      <div className="text-[10px] text-muted-foreground">Перетаскивайте прямоугольник для изменения позиции. Потяните за нижний правый угол для изменения масштаба. Поворот по оси Z через слайдер. Значения нормализованы относительно ширины маркера (1.0).</div>
    </div>
  );
};

export default CalibrationSandbox;
