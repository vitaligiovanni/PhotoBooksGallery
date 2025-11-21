/**
 * High-Frequency Pattern Border Enhancer (MindAR 2025 Best Practice)
 * ---------------------------------------------------------------
 * Задача: Максимально увеличить число feature points (2000–3000+) даже на однотонных портретах.
 * Реализация:
 *  - Добавляет вокруг изображения контрастную шахматную (checker) рамку.
 *  - Толщина рамки: случайно в диапазоне 12%–15% от максимальной стороны исходного фото с каждой стороны.
 *  - Размер клетки узора: случайно 24–32 px (высокочастотный паттерн).
 *  - Случайный фазовый сдвиг (offsetX/offsetY), чтобы одинаковые изображения не конфликтовали между собой.
 *  - Тонкая белая внутренняя обводка (2–3 px) для визуального отделения контента от тёмной части рамки.
 *  - Только библиотека `canvas` (никаких sharp / OpenCV / Python).
 *  - Сохранение: JPEG 95% качества (`enhanced-photo.jpg`).
 *  - Feature flag: AR_ENABLE_BORDER_ENHANCER (по умолчанию ВКЛ, если явно не установлено false/0).
 * Надёжность:
 *  - Проверка существования файла, поддержка PNG/JPEG.
 *  - Логирование площади рамки и процента от итогового изображения.
 */

import path from 'path';
import fs from 'fs/promises';
import { createCanvas, loadImage, Image, CanvasRenderingContext2D } from 'canvas';

export interface PatternEnhancementResult {
  success: boolean;
  enhancedPhotoPath?: string;
  processingTimeMs: number;
  borderPixels?: number;
  borderPercent?: number;
  error?: string;
  parameters?: {
    borderThicknessPx: number;
    cellSizePx: number;
    phaseOffsetX: number;
    phaseOffsetY: number;
  };
}

/**
 * Core pattern drawing: fills the border region with a checker pattern.
 */
function drawCheckerBorder(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  innerX: number,
  innerY: number,
  innerWidth: number,
  innerHeight: number,
  cellSize: number,
  phaseOffsetX: number,
  phaseOffsetY: number
) {
  // We draw pattern over entire canvas, then original image covers interior.
  for (let y = 0; y < canvasHeight; y += cellSize) {
    for (let x = 0; x < canvasWidth; x += cellSize) {
      const colIndex = Math.floor((x + phaseOffsetX) / cellSize);
      const rowIndex = Math.floor((y + phaseOffsetY) / cellSize);
      const isDark = (colIndex + rowIndex) % 2 === 0;

      // Skip interior area (leave it for original image)
      const outsideInterior =
        x + cellSize <= innerX ||
        y + cellSize <= innerY ||
        x >= innerX + innerWidth ||
        y >= innerY + innerHeight;

      if (!outsideInterior) continue;

      ctx.fillStyle = isDark ? '#000000' : '#FFFFFF';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

/**
 * Adds a white inner stroke (2–3 px) just inside the image boundary.
 */
function drawInnerStroke(
  ctx: CanvasRenderingContext2D,
  innerX: number,
  innerY: number,
  innerWidth: number,
  innerHeight: number
) {
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3; // can be tuned (2–3 px requested)
  ctx.strokeRect(innerX + 1.5, innerY + 1.5, innerWidth - 3, innerHeight - 3); // slight inset to avoid alias
  ctx.restore();
}

/**
 * Performs pattern enhancement.
 */
export async function enhanceMarkerPhotoSimple(
  photoPath: string,
  outputDir: string
): Promise<{ photoPath: string; enhanced: boolean }> {
  const startTime = Date.now();
  const flagRaw = (process.env.AR_ENABLE_BORDER_ENHANCER || '').trim().toLowerCase();
  const ENABLE = flagRaw === '' || flagRaw === 'true' || flagRaw === '1' || flagRaw === 'yes'; // default ON

  if (!ENABLE) {
    console.log('[Pattern Border] Feature disabled via AR_ENABLE_BORDER_ENHANCER');
    return { photoPath, enhanced: false };
  }

  // Check file existence
  const exists = await fs
    .access(photoPath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    console.warn('[Pattern Border] Original photo missing, skipping enhancement:', photoPath);
    return { photoPath, enhanced: false };
  }

  try {
    const img = (await loadImage(photoPath)) as Image;
    const origW = img.width;
    const origH = img.height;
    const maxSide = Math.max(origW, origH);

    // Random thickness between 12% and 15% of max side
    const borderThickness = Math.round(maxSide * (0.12 + Math.random() * 0.03));
    // Pattern cell size random 24–32 px
    const cellSize = 24 + Math.floor(Math.random() * 9); // 24..32
    // Random phase offsets
    const phaseOffsetX = Math.floor(Math.random() * cellSize);
    const phaseOffsetY = Math.floor(Math.random() * cellSize);

    const canvasW = origW + borderThickness * 2;
    const canvasH = origH + borderThickness * 2;

    const canvas = createCanvas(canvasW, canvasH);
    const ctx = canvas.getContext('2d');

    // Fill background neutral first (white) – ensures PNG transparency handled
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw checker pattern only in border region
    drawCheckerBorder(
      ctx,
      canvasW,
      canvasH,
      borderThickness,
      borderThickness,
      origW,
      origH,
      cellSize,
      phaseOffsetX,
      phaseOffsetY
    );

    // Draw original image centered
    ctx.drawImage(img, borderThickness, borderThickness, origW, origH);

    // Draw inner stroke
    drawInnerStroke(ctx, borderThickness, borderThickness, origW, origH);

    const enhancedPhotoPath = path.join(outputDir, 'enhanced-photo.jpg');
    const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
    await fs.writeFile(enhancedPhotoPath, jpegBuffer);

    const totalArea = canvasW * canvasH;
    const origArea = origW * origH;
    const borderPixels = totalArea - origArea;
    const borderPercent = (borderPixels / totalArea) * 100;

    console.log('[Pattern Border] ✅ Enhanced photo saved:', enhancedPhotoPath);
    console.log(
      `[Pattern Border] Border thickness: ${borderThickness}px (each side), cell: ${cellSize}px, phase: (${phaseOffsetX}, ${phaseOffsetY})`
    );
    console.log(
      `[Pattern Border] Border pixels: ${borderPixels} (${borderPercent.toFixed(2)}% of final image area)`
    );
    console.log('[Pattern Border] Original size:', `${origW}x${origH}`, 'Final size:', `${canvasW}x${canvasH}`);
    console.log('[Pattern Border] Processing time:', Date.now() - startTime, 'ms');

    return { photoPath: enhancedPhotoPath, enhanced: true };
  } catch (err: any) {
    console.error('[Pattern Border] ❌ Enhancement error:', err.message);
    return { photoPath, enhanced: false };
  }
}

// (Legacy export kept for compatibility if older code imports addBorderToPhoto)
export const addBorderToPhoto = async (
  originalPhotoPath: string,
  outputDir: string
): Promise<PatternEnhancementResult> => {
  const started = Date.now();
  try {
    const result = await enhanceMarkerPhotoSimple(originalPhotoPath, outputDir);
    return {
      success: result.enhanced,
      enhancedPhotoPath: result.photoPath,
      processingTimeMs: Date.now() - started
    };
  } catch (e: any) {
    return {
      success: false,
      processingTimeMs: Date.now() - started,
      error: e.message
    };
  }
};
