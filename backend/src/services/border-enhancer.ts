/**
 * Unique Variative Border Enhancer (MindAR 2025 Best Practice v2)
 * ---------------------------------------------------------------
 * Задача: Создать УНИКАЛЬНУЮ рамку для каждого AR проекта → максимум feature points + нет коллизий между маркерами.
 * Реализация:
 *  - Хеш фото → детерминированный seed → псевдослучайная генерация (одна фото = одна уникальная рамка).
 *  - Асимметричные углы (4 разных символа: ●, ▲, ■, ★, ✦, ◆).
 *  - Вариативная сетка (не строгие квадраты, а прямоугольники разных размеров).
 *  - Псевдослучайные смещения элементов (±2-5px).
 *  - Комбинация паттернов (шахматы + круги + линии + точки).
 *  - Текстовый watermark (ID проекта, размер ~8px, по краю).
 *  - Толщина рамки: 12%–15% от максимальной стороны исходного фото.
 *  - Только библиотека `canvas` (никаких sharp / OpenCV / Python).
 *  - Сохранение: JPEG 95% качества (`enhanced-photo.jpg`).
 *  - Feature flag: AR_ENABLE_BORDER_ENHANCER (по умолчанию ВКЛ).
 * Надёжность:
 *  - Проверка существования файла, поддержка PNG/JPEG.
 *  - Логирование параметров уникальной рамки.
 */

import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
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
    seed: string;
    cornerSymbols: string[];
    patternMix: string[];
  };
}

/**
 * Seeded pseudo-random generator (LCG algorithm)
 */
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Generate deterministic hash-based seed from photo file
 */
async function generatePhotoSeed(photoPath: string): Promise<number> {
  try {
    const buffer = await fs.readFile(photoPath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    // Convert first 8 hex chars to integer seed
    return parseInt(hash.substring(0, 8), 16);
  } catch {
    // Fallback to path-based hash if file read fails
    const hash = crypto.createHash('sha256').update(photoPath).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }
}

/**
 * Draw unique variative border with multiple patterns and asymmetric corners
 */
function drawUniqueBorder(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  innerX: number,
  innerY: number,
  innerWidth: number,
  innerHeight: number,
  rng: SeededRandom
) {
  const borderThickness = innerX; // assuming equal borders
  
  // Corner symbols pool
  const symbols = ['●', '▲', '■', '★', '✦', '◆', '◇', '▼', '►'];
  const cornerSymbols = [
    symbols[rng.nextInt(0, symbols.length - 1)],
    symbols[rng.nextInt(0, symbols.length - 1)],
    symbols[rng.nextInt(0, symbols.length - 1)],
    symbols[rng.nextInt(0, symbols.length - 1)]
  ];
  
  // Pattern mix (combine 2-3 patterns)
  const patterns = ['checker', 'circles', 'lines', 'dots'];
  const patternMix: string[] = [];
  for (let i = 0; i < 2 + rng.nextInt(0, 1); i++) {
    patternMix.push(patterns[rng.nextInt(0, patterns.length - 1)]);
  }
  
  // Base cell size varies
  const baseCellSize = rng.nextInt(20, 32);
  
  // Fill border region with mixed patterns
  for (let y = 0; y < canvasHeight; y += baseCellSize) {
    for (let x = 0; x < canvasWidth; x += baseCellSize) {
      // Skip interior
      const insideInterior = 
        x >= innerX && 
        x < innerX + innerWidth && 
        y >= innerY && 
        y < innerY + innerHeight;
      if (insideInterior) continue;
      
      // Pseudo-random cell size variation (±20%)
      const cellW = baseCellSize + rng.nextInt(-4, 4);
      const cellH = baseCellSize + rng.nextInt(-4, 4);
      
      // Pseudo-random offset
      const offsetX = rng.nextInt(-3, 3);
      const offsetY = rng.nextInt(-3, 3);
      
      // Choose pattern based on position hash
      const patternIdx = ((x / baseCellSize) + (y / baseCellSize)) % patternMix.length;
      const pattern = patternMix[Math.floor(patternIdx)];
      
      const isDark = ((Math.floor(x / baseCellSize) + Math.floor(y / baseCellSize)) % 2) === 0;
      
      ctx.save();
      ctx.translate(x + offsetX, y + offsetY);
      
      if (pattern === 'checker') {
        ctx.fillStyle = isDark ? '#000' : '#FFF';
        ctx.fillRect(0, 0, cellW, cellH);
      } else if (pattern === 'circles') {
        ctx.fillStyle = isDark ? '#000' : '#FFF';
        ctx.fillRect(0, 0, cellW, cellH);
        ctx.fillStyle = isDark ? '#FFF' : '#000';
        ctx.beginPath();
        ctx.arc(cellW / 2, cellH / 2, Math.min(cellW, cellH) / 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (pattern === 'lines') {
        ctx.fillStyle = isDark ? '#000' : '#FFF';
        ctx.fillRect(0, 0, cellW, cellH);
        ctx.strokeStyle = isDark ? '#FFF' : '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (rng.next() > 0.5) {
          ctx.moveTo(0, 0);
          ctx.lineTo(cellW, cellH);
        } else {
          ctx.moveTo(cellW, 0);
          ctx.lineTo(0, cellH);
        }
        ctx.stroke();
      } else if (pattern === 'dots') {
        ctx.fillStyle = isDark ? '#000' : '#FFF';
        ctx.fillRect(0, 0, cellW, cellH);
        ctx.fillStyle = isDark ? '#FFF' : '#000';
        const dotRadius = Math.min(cellW, cellH) / 6;
        ctx.beginPath();
        ctx.arc(cellW / 4, cellH / 4, dotRadius, 0, Math.PI * 2);
        ctx.arc(3 * cellW / 4, 3 * cellH / 4, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
  }
  
  // Draw asymmetric corner symbols
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.font = `bold ${borderThickness / 2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Top-left
  ctx.fillText(cornerSymbols[0], borderThickness / 2, borderThickness / 2);
  // Top-right
  ctx.fillText(cornerSymbols[1], canvasWidth - borderThickness / 2, borderThickness / 2);
  // Bottom-left
  ctx.fillText(cornerSymbols[2], borderThickness / 2, canvasHeight - borderThickness / 2);
  // Bottom-right
  ctx.fillText(cornerSymbols[3], canvasWidth - borderThickness / 2, canvasHeight - borderThickness / 2);
  
  ctx.restore();
  
  return { cornerSymbols, patternMix };
}

/**
 * Draw text watermark along border edges
 */
function drawTextWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  borderThickness: number,
  text: string
) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.font = '8px monospace';
  
  // Top edge
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, borderThickness + 5, 5);
  
  // Bottom edge
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, canvasWidth - borderThickness - 5, canvasHeight - 5);
  
  ctx.restore();
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
  ctx.lineWidth = 3;
  ctx.strokeRect(innerX + 1.5, innerY + 1.5, innerWidth - 3, innerHeight - 3);
  ctx.restore();
}

/**
 * Performs unique variative pattern enhancement with hash-based seeding.
 */
export async function enhanceMarkerPhotoSimple(
  photoPath: string,
  outputDir: string,
  projectId?: string
): Promise<{ photoPath: string; enhanced: boolean }> {
  const startTime = Date.now();
  const flagRaw = (process.env.AR_ENABLE_BORDER_ENHANCER || '').trim().toLowerCase();
  const ENABLE = flagRaw === '' || flagRaw === 'true' || flagRaw === '1' || flagRaw === 'yes'; // default ON

  if (!ENABLE) {
    console.log('[Unique Border] Feature disabled via AR_ENABLE_BORDER_ENHANCER');
    return { photoPath, enhanced: false };
  }

  // Check file existence
  const exists = await fs
    .access(photoPath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    console.warn('[Unique Border] Original photo missing, skipping enhancement:', photoPath);
    return { photoPath, enhanced: false };
  }

  try {
    // Generate deterministic seed from photo hash
    const seedNumber = await generatePhotoSeed(photoPath);
    const rng = new SeededRandom(seedNumber);
    
    const img = (await loadImage(photoPath)) as Image;
    const origW = img.width;
    const origH = img.height;
    const maxSide = Math.max(origW, origH);

    // Deterministic thickness (12-15% based on seed)
    const borderThickness = Math.round(maxSide * (0.12 + (rng.next() * 0.03)));

    const canvasW = origW + borderThickness * 2;
    const canvasH = origH + borderThickness * 2;

    const canvas = createCanvas(canvasW, canvasH);
    const ctx = canvas.getContext('2d');

    // Fill background white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Draw unique variative border with multiple patterns and asymmetric corners
    const borderInfo = drawUniqueBorder(
      ctx,
      canvasW,
      canvasH,
      borderThickness,
      borderThickness,
      origW,
      origH,
      rng
    );

    // Draw original image centered
    ctx.drawImage(img, borderThickness, borderThickness, origW, origH);

    // Draw inner stroke
    drawInnerStroke(ctx, borderThickness, borderThickness, origW, origH);
    
    // Draw text watermark with project ID
    if (projectId) {
      drawTextWatermark(ctx, canvasW, canvasH, borderThickness, `AR-${projectId.substring(0, 8)}`);
    }

    const enhancedPhotoPath = path.join(outputDir, 'enhanced-photo.jpg');
    const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
    await fs.writeFile(enhancedPhotoPath, jpegBuffer);

    const totalArea = canvasW * canvasH;
    const origArea = origW * origH;
    const borderPixels = totalArea - origArea;
    const borderPercent = (borderPixels / totalArea) * 100;

    console.log('[Unique Border] ✅ Enhanced photo saved:', enhancedPhotoPath);
    console.log(`[Unique Border] Seed: ${seedNumber.toString(16)}, Border: ${borderThickness}px (each side)`);
    console.log(`[Unique Border] Corners: [${borderInfo.cornerSymbols.join(', ')}]`);
    console.log(`[Unique Border] Pattern mix: [${borderInfo.patternMix.join(', ')}]`);
    console.log(
      `[Unique Border] Border pixels: ${borderPixels} (${borderPercent.toFixed(2)}% of final image area)`
    );
    console.log('[Unique Border] Original size:', `${origW}x${origH}`, 'Final size:', `${canvasW}x${canvasH}`);
    console.log('[Unique Border] Processing time:', Date.now() - startTime, 'ms');

    return { photoPath: enhancedPhotoPath, enhanced: true };
  } catch (err: any) {
    console.error('[Unique Border] ❌ Enhancement error:', err.message);
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
