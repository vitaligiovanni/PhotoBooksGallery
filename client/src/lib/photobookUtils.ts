import type {
  PhotobookProject,
  PhotobookSpread,
  PhotobookPage,
  PhotoElement,
  PhotobookSize,
  QuickPreviewState,
} from '@/types';
import { DEFAULT_PHOTOBOOK_SIZE, MIN_PAGES } from './photobookSizes';
import exifr from 'exifr';

// ---------- Layout constants ----------
const PAGE_MARGIN = 2;             // outer page margins (% of page)
const CONTENT_BOX_SCALE = 0.9;     // 90% centered content area
const ROW_MERGE_THRESHOLD = 8;     // vertical merge threshold in %
const GAP_REDUCTION = 0.5;         // reduce uneven gaps by 50%
const TARGET_GUTTER_MM = 3;        // fixed gutter target
const MIN_DIMENSION_MM = 40;       // minimal width/height of any zone (mm)
const ASPECT_MIN = 0.5;            // min acceptable aspect ratio (w/h)
const ASPECT_MAX = 2.0;            // max acceptable aspect ratio (w/h)
const FACE_PADDING_PERCENT = 0.05; // face padding relative to min(zoneW, zoneH)
const DPI_PREVIEW = 96;            // px = mm * dpi / 25.4
const MIN_ZONE_PAGE_FRACTION = 0.2; // fallback constraint if no face detection

function clampPercent(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
function mmToPercentX(mm: number, size: PhotobookSize): number { return (mm / size.width) * 100; }
function mmToPercentY(mm: number, size: PhotobookSize): number { return (mm / size.height) * 100; }
function pxFromMm(mm: number, dpi: number = DPI_PREVIEW): number { return (mm * dpi) / 25.4; }
// Quantize percent values to 2 decimals to avoid visual jitter while keeping sums consistent
function q(v: number): number { return Math.round(v * 100) / 100; }

// ---------- Local helper types ----------
interface PhotoWithMetadata {
  id: string;
  file: File;
  url: string;
  metadata?: { dateTaken?: Date; dimensions?: { width: number; height: number } };
  faceData?: Array<{ x: number; y: number; width: number; height: number }>|null;
}

interface PhotoZone {
  x: number; y: number; width: number; height: number;
  importance: number;
  faceOptimal?: boolean;
  aspectRatio?: 'portrait'|'landscape'|'square'|'adaptive';
  rotation?: number;
}

interface PageCollageTemplate {
  id: string; name: string; description: string;
  photoCount: number; zones: PhotoZone[];
  aestheticRating: number; tags: string[];
}

// ---------- Row grouping and normalization ----------
function groupZonesIntoRows(zones: PhotoZone[]): Array<{ items: PhotoZone[]; top: number; bottom: number; height: number; }> {
  const sorted = [...zones].sort((a, b) => a.y - b.y);
  const rows: Array<{ items: PhotoZone[]; top: number; bottom: number; height: number; }> = [];
  for (const z of sorted) {
    let placed = false;
    for (const row of rows) {
      const overlap = Math.min(row.bottom, z.y + z.height) - Math.max(row.top, z.y);
      if (overlap > Math.min(row.height, z.height) * 0.3 || overlap > ROW_MERGE_THRESHOLD) {
        row.items.push(z);
        row.top = Math.min(row.top, z.y);
        row.bottom = Math.max(row.bottom, z.y + z.height);
        row.height = row.bottom - row.top;
        placed = true;
        break;
      }
    }
    if (!placed) rows.push({ items: [z], top: z.y, bottom: z.y + z.height, height: z.height });
  }
  rows.forEach(r => r.items.sort((a, b) => a.x - b.x));
  return rows;
}

type NormalizeOptions = { contentBox?: { x: number; y: number; width: number; height: number }; targetGutterMm?: number; size?: PhotobookSize; };
function normalizePageZones(zones: PhotoZone[], options: NormalizeOptions = {}): PhotoZone[] {
  if (zones.length === 0) return zones;
  const contentBox = options.contentBox;
  const pageLeft = contentBox ? contentBox.x : PAGE_MARGIN;
  const pageTop = contentBox ? contentBox.y : PAGE_MARGIN;
  const pageWidth = contentBox ? contentBox.width : (100 - PAGE_MARGIN * 2);
  const pageHeight = contentBox ? contentBox.height : (100 - PAGE_MARGIN * 2);

  let targetGapXPercent: number | null = null;
  let targetGapYPercent: number | null = null;
  if (options.size && typeof options.targetGutterMm === 'number') {
    targetGapXPercent = mmToPercentX(options.targetGutterMm, options.size);
    targetGapYPercent = mmToPercentY(options.targetGutterMm, options.size);
  }

  const rows = groupZonesIntoRows(zones);
  for (const row of rows) {
    const items = row.items; if (items.length <= 1) continue;
    const totalWidth = items.reduce((s, it) => s + it.width, 0);
    const gaps: number[] = [];
    for (let i = 0; i < items.length - 1; i++) {
      const g = items[i + 1].x - (items[i].x + items[i].width);
      gaps.push(Math.max(0, g));
    }
    const targetGaps = gaps.map(g => targetGapXPercent != null ? targetGapXPercent! : g * GAP_REDUCTION);
    const contentWidth = totalWidth + targetGaps.reduce((s, g) => s + g, 0);
    const leftover = Math.max(0, pageWidth - contentWidth);
    let cursor = pageLeft + leftover / 2;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.x = cursor;
      cursor += it.width;
      if (i < items.length - 1) cursor += targetGaps[i];
    }
  }

  if (rows.length > 1) {
    const rowHeights = rows.map(r => Math.max(...r.items.map(it => it.height)));
    const targetGapsY = rows.slice(0, -1).map(() => targetGapYPercent != null ? targetGapYPercent! : 5 * GAP_REDUCTION);
    const contentHeight = rowHeights.reduce((s, h) => s + h, 0) + targetGapsY.reduce((s, g) => s + g, 0);
    const leftoverY = Math.max(0, pageHeight - contentHeight);
    let currentY = pageTop + leftoverY / 2;
    for (let r = 0; r < rows.length; r++) {
      const h = rowHeights[r];
      for (const it of rows[r].items) it.y = currentY;
      currentY += h; if (r < rows.length - 1) currentY += targetGapsY[r];
    }
  } else if (rows.length === 1) {
    const h = Math.max(...rows[0].items.map(it => it.height));
    const top = pageTop + (pageHeight - h) / 2;
    for (const it of rows[0].items) it.y = top;
  }

  zones.forEach(it => {
    const left = pageLeft; const top = pageTop; const right = pageLeft + pageWidth; const bottom = pageTop + pageHeight;
    it.x = clampPercent(it.x, left, right);
    it.y = clampPercent(it.y, top, bottom);
    it.width = Math.min(it.width, right - it.x);
    it.height = Math.min(it.height, bottom - it.y);
  });
  return zones;
}

// ---------- Equal grid helpers ----------
function chooseGridDims(count: number): { cols: number; rows: number } {
  // Choose near-square grid even when count is prime, using ceil division
  let best: { cols: number; rows: number; score: number } | null = null;
  const maxRows = Math.ceil(Math.sqrt(count));
  for (let rows = 1; rows <= maxRows; rows++) {
    const cols = Math.ceil(count / rows);
    const diff = Math.abs(cols - rows);
    const areaOver = cols * rows - count; // prefer tighter fit
    const score = diff * 1000 + areaOver; // weight squareness first, then minimize extra cells
    if (!best || score < best.score) best = { cols, rows, score };
  }
  return { cols: best!.cols, rows: best!.rows };
}

function dimsZoneMm(cols: number, rows: number, size: PhotobookSize, contentBox: { width: number; height: number }, gutterMm: number) {
  const gutterXmm = gutterMm;
  const gutterYmm = gutterMm;
  const containerWmm = (contentBox.width / 100) * size.width;
  const containerHmm = (contentBox.height / 100) * size.height;
  const zoneWmm = (containerWmm - (cols - 1) * gutterXmm) / cols;
  const zoneHmm = (containerHmm - (rows - 1) * gutterYmm) / rows;
  return { zoneWmm, zoneHmm };
}

function isZoneValidByConstraints(zoneWmm: number, zoneHmm: number, size: PhotobookSize, contentBox: { width: number; height: number }): boolean {
  if (zoneWmm < MIN_DIMENSION_MM || zoneHmm < MIN_DIMENSION_MM) return false;
  const aspect = zoneWmm / zoneHmm;
  if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) return false;
  // Fallback page fraction rule
  const pageW = size.width; const pageH = size.height;
  const zoneWpageFrac = zoneWmm / pageW; const zoneHpageFrac = zoneHmm / pageH;
  if (zoneWpageFrac < MIN_ZONE_PAGE_FRACTION && zoneHpageFrac < MIN_ZONE_PAGE_FRACTION) return false;
  // Sum consistency will be ensured by last-row/col correction in actual builder
  return true;
}

function findFeasibleGrid(count: number, size: PhotobookSize, contentBox: { width: number; height: number }, gutterMm: number): { cols: number; rows: number } {
  // Max cols/rows constrained by min dimension
  const containerWmm = (contentBox.width / 100) * size.width;
  const containerHmm = (contentBox.height / 100) * size.height;
  const maxCols = Math.max(1, Math.floor((containerWmm + gutterMm) / (MIN_DIMENSION_MM + gutterMm)));
  const maxRows = Math.max(1, Math.floor((containerHmm + gutterMm) / (MIN_DIMENSION_MM + gutterMm)));
  let best: { cols: number; rows: number; score: number } | null = null;
  for (let rows = 1; rows <= maxRows; rows++) {
    for (let cols = 1; cols <= maxCols; cols++) {
      if (cols * rows < count) continue;
      const { zoneWmm, zoneHmm } = dimsZoneMm(cols, rows, size, contentBox, gutterMm);
      if (!isZoneValidByConstraints(zoneWmm, zoneHmm, size, contentBox)) continue;
      // Prefer near-square grids, minimal excess cells, and aspect closeness to 1
      const aspect = zoneWmm / zoneHmm;
      const squarePenalty = Math.abs(cols - rows) * 1000;
      const excess = cols * rows - count;
      const excessPenalty = excess * 10;
      const aspectPenalty = Math.abs(1 - aspect) * 100; // gentle preference for ~1:1
      const score = squarePenalty + excessPenalty + aspectPenalty;
      if (!best || score < best.score) best = { cols, rows, score };
    }
  }
  // Fallback to near-square if none met constraints (rare): chooseGridDims
  return best ? { cols: best.cols, rows: best.rows } : chooseGridDims(count);
}

function buildEqualGridZones(count: number, size: PhotobookSize, contentBox: { x: number; y: number; width: number; height: number }, targetGutterMm: number): PhotoZone[] {
  // Find feasible grid that respects min dimensions and aspect constraints
  const { cols, rows } = findFeasibleGrid(count, size, contentBox, targetGutterMm);
  const gutterX = mmToPercentX(targetGutterMm, size);
  const gutterY = mmToPercentY(targetGutterMm, size);
  // Raw cell sizes before quantization
  const rawCellW = (contentBox.width - gutterX * (cols - 1)) / cols;
  const rawCellH = (contentBox.height - gutterY * (rows - 1)) / rows;
  const zones: PhotoZone[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c; // create the full grid cell even if idx >= requested count
      // Position using raw sizes, then quantize.
      const rawX = contentBox.x + c * (rawCellW + gutterX);
      const rawY = contentBox.y + r * (rawCellH + gutterY);
      let x = q(rawX);
      let y = q(rawY);
      // Default quantized sizes
      let width = q(rawCellW);
      let height = q(rawCellH);
      // Adjust last column to ensure exact right edge alignment with content box (sum consistency)
      if (c === cols - 1) {
        const rightEdge = q(contentBox.x + contentBox.width);
        width = q(rightEdge - x);
      }
      // Adjust last row to ensure exact bottom edge alignment
      if (r === rows - 1) {
        const bottomEdge = q(contentBox.y + contentBox.height);
        height = q(bottomEdge - y);
      }
      zones.push({ x, y, width, height, importance: 3, faceOptimal: true, aspectRatio: 'adaptive', rotation: 0 });
    }
  }
  return zones;
}

// ---------- Page collage templates ----------
const PAGE_COLLAGE_TEMPLATES: PageCollageTemplate[] = [
  { id: 'single-center', name: '1 фото по центру', description: 'Одно большое фото в центре', photoCount: 1, zones: [ { x: 15, y: 15, width: 70, height: 70, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 9, tags: ['single','centered'] },
  { id: 'single-large', name: '1 фото крупное', description: 'Одно фото на всю страницу', photoCount: 1, zones: [ { x: 5, y: 5, width: 90, height: 90, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 9, tags: ['single','large'] },
  { id: 'two-horizontal', name: '2 фото горизонтально', description: 'Два фото рядом', photoCount: 2, zones: [ { x: 5, y: 10, width: 42, height: 80, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 53, y: 10, width: 42, height: 80, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 8, tags: ['simple','balanced'] },
  { id: 'two-vertical', name: '2 фото вертикально', description: 'Два фото один над другим', photoCount: 2, zones: [ { x: 10, y: 5, width: 80, height: 42, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 10, y: 53, width: 80, height: 42, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 8, tags: ['simple','vertical'] },
  { id: 'three-row', name: '3 фото в ряд', description: 'Три фото в горизонтальном ряду', photoCount: 3, zones: [ { x: 2, y: 10, width: 30, height: 80, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 35, y: 10, width: 30, height: 80, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 68, y: 10, width: 30, height: 80, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 7, tags: ['row','balanced'] },
  { id: 'three-column', name: '3 фото в колонну', description: 'Три фото вертикально', photoCount: 3, zones: [ { x: 10, y: 2, width: 80, height: 30, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 10, y: 35, width: 80, height: 30, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 10, y: 68, width: 80, height: 30, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 7, tags: ['column','vertical'] },
  { id: 'four-grid', name: '4 фото сетка', description: 'Четыре фото квадратной сеткой', photoCount: 4, zones: [ { x: 5, y: 5, width: 42, height: 42, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 53, y: 5, width: 42, height: 42, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 5, y: 53, width: 42, height: 42, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 53, y: 53, width: 42, height: 42, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 8, tags: ['grid','symmetric'] },
  { id: 'six-grid', name: '6 фото сетка 3x2', description: 'Шесть фото в сетке', photoCount: 6, zones: [ { x: 2, y: 10, width: 30, height: 35, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 35, y: 10, width: 30, height: 35, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 68, y: 10, width: 30, height: 35, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 2, y: 55, width: 30, height: 35, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 35, y: 55, width: 30, height: 35, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 68, y: 55, width: 30, height: 35, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 8, tags: ['grid','organized'] },
  { id: 'eight-grid', name: '8 фото сетка 4x2', description: 'Восемь фото в сетке', photoCount: 8, zones: [ { x: 2, y: 5, width: 22, height: 40, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 26, y: 5, width: 22, height: 40, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 50, y: 5, width: 22, height: 40, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 74, y: 5, width: 22, height: 40, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 2, y: 50, width: 22, height: 40, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 26, y: 50, width: 22, height: 40, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 50, y: 50, width: 22, height: 40, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 74, y: 50, width: 22, height: 40, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 7, tags: ['grid','uniform'] },
  { id: 'nine-grid', name: '9 фото сетка 3x3', description: 'Девять фото в квадратной сетке', photoCount: 9, zones: [ { x: 2, y: 5, width: 30, height: 27, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 35, y: 5, width: 30, height: 27, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 68, y: 5, width: 30, height: 27, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 2, y: 36, width: 30, height: 27, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 35, y: 36, width: 30, height: 27, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 68, y: 36, width: 30, height: 27, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 2, y: 67, width: 30, height: 27, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 35, y: 67, width: 30, height: 27, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 68, y: 67, width: 30, height: 27, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 9, tags: ['grid','symmetric'] },
  // New designs
  { id: 'one-plus-right-three', name: '1 + 3 справа', description: 'Одно крупное слева и три равные вертикальные справа', photoCount: 4, zones: [ { x: 5, y: 5, width: 60, height: 90, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 67, y: 5, width: 28, height: 28, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 67, y: 36, width: 28, height: 28, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 67, y: 67, width: 28, height: 28, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 9, tags: ['mixed','balanced'] },
  { id: 'mosaic-9-complex', name: '9 фото мозаика сложная', description: 'Девять фото с центральным акцентом и равномерными гаттерами', photoCount: 9, zones: [ { x: 5, y: 5, width: 28, height: 28, importance: 3, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 36, y: 5, width: 28, height: 28, importance: 3, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 67, y: 5, width: 28, height: 28, importance: 3, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 5, y: 36, width: 28, height: 28, importance: 3, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 36, y: 36, width: 28, height: 28, importance: 5, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 67, y: 36, width: 28, height: 28, importance: 3, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 5, y: 67, width: 28, height: 28, importance: 3, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 36, y: 67, width: 28, height: 28, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' }, { x: 67, y: 67, width: 28, height: 28, importance: 3, faceOptimal: true, aspectRatio: 'adaptive' } ], aestheticRating: 9, tags: ['mosaic','balanced'] },
];

// ---------- Spread templates (exactly 10) ----------
interface SpreadTemplate { id: string; leftPageTemplate: string; rightPageTemplate: string; leftPhotoCount: number; rightPhotoCount: number; }
const SPREAD_TEMPLATES: SpreadTemplate[] = [
  { id: 'spread-1', leftPageTemplate: 'single-center', rightPageTemplate: 'four-grid', leftPhotoCount: 1, rightPhotoCount: 4 },
  { id: 'spread-2', leftPageTemplate: 'three-column', rightPageTemplate: 'three-row', leftPhotoCount: 3, rightPhotoCount: 3 },
  { id: 'spread-3', leftPageTemplate: 'two-horizontal', rightPageTemplate: 'six-grid', leftPhotoCount: 2, rightPhotoCount: 6 },
  { id: 'spread-4', leftPageTemplate: 'four-grid', rightPageTemplate: 'two-vertical', leftPhotoCount: 4, rightPhotoCount: 2 },
  { id: 'spread-5', leftPageTemplate: 'six-grid', rightPageTemplate: 'single-large', leftPhotoCount: 6, rightPhotoCount: 1 },
  { id: 'spread-6', leftPageTemplate: 'one-plus-right-three', rightPageTemplate: 'three-row', leftPhotoCount: 4, rightPhotoCount: 3 },
  { id: 'spread-7', leftPageTemplate: 'eight-grid', rightPageTemplate: 'two-vertical', leftPhotoCount: 8, rightPhotoCount: 2 },
  { id: 'spread-8', leftPageTemplate: 'mosaic-9-complex', rightPageTemplate: 'three-column', leftPhotoCount: 9, rightPhotoCount: 3 },
  { id: 'spread-9', leftPageTemplate: 'nine-grid', rightPageTemplate: 'single-large', leftPhotoCount: 9, rightPhotoCount: 1 },
  { id: 'spread-10', leftPageTemplate: 'four-grid', rightPageTemplate: 'six-grid', leftPhotoCount: 4, rightPhotoCount: 6 },
];

function getSpreadTemplate(spreadIndex: number): SpreadTemplate { return SPREAD_TEMPLATES[spreadIndex % SPREAD_TEMPLATES.length]; }

// ---------- Metadata and crop helpers ----------
export function sortPhotosByDate(photos: PhotoWithMetadata[]): PhotoWithMetadata[] {
  return photos.sort((a, b) => (a.metadata?.dateTaken?.getTime() || 0) - (b.metadata?.dateTaken?.getTime() || 0));
}

export async function extractPhotoMetadata(file: File): Promise<PhotoWithMetadata['metadata']> {
  try {
    const exifData: any = await exifr.parse(file);
    const img = new Image();
    img.src = URL.createObjectURL(file);
    return new Promise((resolve) => {
      img.onload = () => {
        resolve({
          dateTaken: (exifData?.DateTimeOriginal as Date) || (exifData?.DateTime as Date) || new Date(file.lastModified),
          dimensions: { width: img.naturalWidth, height: img.naturalHeight },
        });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

function calculateAdaptiveCrop(photo: PhotoWithMetadata, zone: PhotoZone, targetAspectRatio: number) {
  const photoDimensions = photo.metadata?.dimensions;
  if (!photoDimensions) { return { x: 0, y: 0, width: 1000, height: 1000 }; }
  const { width: photoWidth, height: photoHeight } = photoDimensions;
  const photoAspectRatio = photoWidth / photoHeight;
  if (zone.aspectRatio === 'adaptive') {
    // Face-aware path: attempt to preserve detected face(s)
    const mainFace = photo.faceData && photo.faceData.length ? photo.faceData[0] : null;
    if (mainFace) {
      // Expand face box by padding: 5% of min(zoneW, zoneH) in px; ensure >= 3mm
      const zoneWmm = (zone.width / 100) * DEFAULT_PHOTOBOOK_SIZE.width;
      const zoneHmm = (zone.height / 100) * DEFAULT_PHOTOBOOK_SIZE.height;
      const padMm = Math.max(FACE_PADDING_PERCENT * Math.min(zoneWmm, zoneHmm), 3);
      const padPxW = padMm * (photoWidth / DEFAULT_PHOTOBOOK_SIZE.width);
      const padPxH = padMm * (photoHeight / DEFAULT_PHOTOBOOK_SIZE.height);
      const fx = Math.max(0, mainFace.x - padPxW);
      const fy = Math.max(0, mainFace.y - padPxH);
      const fw = Math.min(photoWidth - fx, mainFace.width + 2 * padPxW);
      const fh = Math.min(photoHeight - fy, mainFace.height + 2 * padPxH);
      const faceAspect = fw / fh;
      // Compute crop that contains the expanded face box and matches target aspect
      let cropW = 0, cropH = 0, cx = 0, cy = 0;
      if (targetAspectRatio >= faceAspect) {
        // Wider than face box: match height to face height, extend width
        cropH = fh;
        cropW = cropH * targetAspectRatio;
      } else {
        // Taller: match width to face width, extend height
        cropW = fw;
        cropH = cropW / targetAspectRatio;
      }
      // Center crop around face box center
      const fcx = fx + fw / 2;
      const fcy = fy + fh / 2;
      cx = Math.max(0, Math.min(photoWidth - cropW, fcx - cropW / 2));
      cy = Math.max(0, Math.min(photoHeight - cropH, fcy - cropH / 2));
      // Validate: ensure expanded face is fully inside crop
      const containsFace = (cx <= fx) && (cy <= fy) && (cx + cropW >= fx + fw) && (cy + cropH >= fy + fh);
      if (containsFace) {
        return { x: cx, y: cy, width: cropW, height: cropH };
      }
      // Fallback to center-crop with bias towards face
      const biasX = Math.max(0, Math.min(photoWidth - cropW, fcx - cropW / 2));
      const biasY = Math.max(0, Math.min(photoHeight - cropH, fcy - cropH / 2));
      return { x: biasX, y: biasY, width: cropW, height: cropH };
    }
    if (Math.abs(photoAspectRatio - targetAspectRatio) < 0.2) return { x: 0, y: 0, width: photoWidth, height: photoHeight };
    if (photoAspectRatio > targetAspectRatio) { const cropWidth = photoHeight * targetAspectRatio; const offsetX = (photoWidth - cropWidth) / 2; return { x: offsetX, y: 0, width: cropWidth, height: photoHeight }; }
    const cropHeight = photoWidth / targetAspectRatio; const offsetY = Math.max(0, (photoHeight - cropHeight) * 0.3); return { x: 0, y: offsetY, width: photoWidth, height: cropHeight };
  }
  const cropWidth = Math.min(photoWidth, photoHeight * targetAspectRatio);
  const cropHeight = Math.min(photoHeight, photoWidth / targetAspectRatio);
  return { x: (photoWidth - cropWidth) / 2, y: (photoHeight - cropHeight) / 2, width: cropWidth, height: cropHeight };
}

// ---------- Core generation ----------
type AutoLayoutOptions = { desiredSpreads?: number; allowPhotoReuse?: boolean; uniformLayout?: boolean };
export async function autoLayoutPhotosWithPredefinedSpreads(photos: File[], size: PhotobookSize, options: AutoLayoutOptions = {}): Promise<PhotobookProject> {
  const processedPhotos: PhotoWithMetadata[] = await Promise.all(
    photos.map(async (file, index) => ({ id: `photo-${index}`, file, url: URL.createObjectURL(file), metadata: await extractPhotoMetadata(file), faceData: null }))
  );
  const sortedPhotos = sortPhotosByDate(processedPhotos);
  const spreads: PhotobookSpread[] = [];
  let photoIndex = 0; let spreadIndex = 0;
  const desiredSpreads = options.desiredSpreads; const allowPhotoReuse = options.allowPhotoReuse === true;
  const takePhotos = (count: number): PhotoWithMetadata[] => {
    const result: PhotoWithMetadata[] = [];
    if (sortedPhotos.length === 0) return result;
    for (let i = 0; i < count; i++) {
      const idx = allowPhotoReuse ? (photoIndex + i) % sortedPhotos.length : (photoIndex + i);
      if (!allowPhotoReuse && idx >= sortedPhotos.length) break;
      result.push(sortedPhotos[idx % sortedPhotos.length]);
    }
    photoIndex += count;
    return result;
  };
  while ((photoIndex < sortedPhotos.length || allowPhotoReuse) && (typeof desiredSpreads !== 'number' || spreads.length < desiredSpreads)) {
    const spreadTemplate = getSpreadTemplate(spreadIndex);
    const leftTemplate = PAGE_COLLAGE_TEMPLATES.find(t => t.id === spreadTemplate.leftPageTemplate);
    const rightTemplate = PAGE_COLLAGE_TEMPLATES.find(t => t.id === spreadTemplate.rightPageTemplate);
    if (!leftTemplate || !rightTemplate) break;
    const totalPhotosNeeded = spreadTemplate.leftPhotoCount + spreadTemplate.rightPhotoCount;
    if (!allowPhotoReuse && (photoIndex + totalPhotosNeeded > sortedPhotos.length)) break;
    const leftPhotos = takePhotos(spreadTemplate.leftPhotoCount);
    const leftPage = createPageFromCollageTemplate(leftTemplate, leftPhotos, size, 'left', { uniformLayout: options.uniformLayout === true, fillAllZones: true });
    const rightPhotos = takePhotos(spreadTemplate.rightPhotoCount);
    const rightPage = createPageFromCollageTemplate(rightTemplate, rightPhotos, size, 'right', { uniformLayout: options.uniformLayout === true, fillAllZones: true });
    spreads.push({ id: `spread-${spreadIndex + 1}`, spreadNumber: spreadIndex + 1, leftPage, rightPage });
    spreadIndex++; if (spreadIndex >= SPREAD_TEMPLATES.length) spreadIndex = 0;
  }
  return { id: `project-${Date.now()}`, title: `Фотокнига ${new Date().toLocaleDateString()}`, size, spreads, totalPages: spreads.length * 2, createdAt: new Date(), updatedAt: new Date(), status: 'draft' };
}

function createPageFromCollageTemplate(template: PageCollageTemplate, photos: PhotoWithMetadata[], size: PhotobookSize, pageType: 'left' | 'right', opts: { uniformLayout?: boolean; fillAllZones?: boolean } = {}): PhotobookPage {
  const pageNumber = Math.floor(Math.random() * 100000);
  const page: PhotobookPage = createEmptyPage(pageNumber);
  const contentBox = { x: (100 - CONTENT_BOX_SCALE * 100) / 2, y: (100 - CONTENT_BOX_SCALE * 100) / 2, width: CONTENT_BOX_SCALE * 100, height: CONTENT_BOX_SCALE * 100 };
  const isGridLike = opts.uniformLayout === true || template.tags.some(t => ['grid','uniform','symmetric'].includes(t));
  let normalizedZones: PhotoZone[];
  if (!opts.uniformLayout && template.id === 'one-plus-right-three') {
    const gutterX = q(mmToPercentX(TARGET_GUTTER_MM, size));
    const gutterY = q(mmToPercentY(TARGET_GUTTER_MM, size));
    const usableWidth = contentBox.width - gutterX;
    const leftColWraw = usableWidth * 0.6;
    const rightColWraw = usableWidth - leftColWraw;
    const leftX = q(contentBox.x);
    const leftColW = q(leftColWraw);
    const rightX = q(contentBox.x + leftColWraw + gutterX);
    const rightColW = q(rightColWraw);
    // Ensure right edge aligns perfectly with content box
    const contentRight = q(contentBox.x + contentBox.width);
    const correctedRightColW = q(contentRight - rightX);
    const rightCellHraw = (contentBox.height - 2 * gutterY) / 3;
    const rightCellH = q(rightCellHraw);
    const topY = q(contentBox.y);
    normalizedZones = [
      { x: leftX, y: topY, width: q(contentRight - leftX - correctedRightColW - gutterX), height: q(contentBox.height), importance: 5, faceOptimal: true, aspectRatio: 'adaptive' },
      { x: rightX, y: topY, width: correctedRightColW, height: rightCellH, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' },
      { x: rightX, y: q(topY + rightCellH + gutterY), width: correctedRightColW, height: rightCellH, importance: 4, faceOptimal: true, aspectRatio: 'adaptive' },
      { x: rightX, y: q(topY + 2 * (rightCellH + gutterY)), width: correctedRightColW, height: q((q(contentBox.y + contentBox.height) - (topY + 2 * (rightCellH + gutterY)))), importance: 4, faceOptimal: true, aspectRatio: 'adaptive' },
    ];
  } else if (isGridLike) {
    normalizedZones = buildEqualGridZones(template.photoCount, size, contentBox, TARGET_GUTTER_MM);
  } else {
    // Enforce mathematical equal zones when uniformLayout is requested
    if (opts.uniformLayout) {
      normalizedZones = buildEqualGridZones(template.photoCount, size, contentBox, TARGET_GUTTER_MM);
    } else {
      const candidate = normalizePageZones([...template.zones], { contentBox, targetGutterMm: TARGET_GUTTER_MM, size });
      // Validate candidate by constraints; if any zone invalid -> fallback to feasible grid
      const containerWmm = (contentBox.width / 100) * size.width;
      const containerHmm = (contentBox.height / 100) * size.height;
      const valid = candidate.every(z => {
        const zwmm = (z.width / 100) * size.width;
        const zhmm = (z.height / 100) * size.height;
        if (zwmm < MIN_DIMENSION_MM || zhmm < MIN_DIMENSION_MM) return false;
        const aspect = zwmm / zhmm; if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) return false;
        // Page fraction rule (only if no face detection will happen later). This is a hard lower bound here.
        if (zwmm / size.width < MIN_ZONE_PAGE_FRACTION && zhmm / size.height < MIN_ZONE_PAGE_FRACTION) return false;
        // Must be fully inside content box bounds
        const left = z.x; const top = z.y; const right = z.x + z.width; const bottom = z.y + z.height;
        const cLeft = contentBox.x; const cTop = contentBox.y; const cRight = contentBox.x + contentBox.width; const cBottom = contentBox.y + contentBox.height;
        if (left < cLeft - 0.001 || top < cTop - 0.001 || right > cRight + 0.001 || bottom > cBottom + 0.001) return false;
        return true;
      });
      normalizedZones = valid ? candidate : buildEqualGridZones(template.photoCount, size, contentBox, TARGET_GUTTER_MM);
    }
  }

  const sortedZones = [...normalizedZones].sort((a, b) => b.importance - a.importance);
  let photoIndex = 0;
  sortedZones.forEach((zone, zoneIndex) => {
    if (!photos.length) return;
    const photo = photos[photoIndex % photos.length];
    photoIndex++;
    const safeZone = {
      x: clampPercent(zone.x, PAGE_MARGIN, 100 - PAGE_MARGIN),
      y: clampPercent(zone.y, PAGE_MARGIN, 100 - PAGE_MARGIN),
      width: Math.min(zone.width, 100 - PAGE_MARGIN - clampPercent(zone.x, PAGE_MARGIN, 100 - PAGE_MARGIN)),
      height: Math.min(zone.height, 100 - PAGE_MARGIN - clampPercent(zone.y, PAGE_MARGIN, 100 - PAGE_MARGIN)),
      importance: zone.importance,
      faceOptimal: zone.faceOptimal,
      aspectRatio: zone.aspectRatio,
      rotation: zone.rotation,
    } as PhotoZone;
    const elementWidth = (safeZone.width / 100) * size.width;
    const elementHeight = (safeZone.height / 100) * size.height;
    const targetAspectRatio = elementWidth / elementHeight;
    const crop = calculateAdaptiveCrop(photo, safeZone, targetAspectRatio);
    const photoElement: PhotoElement = {
      id: `photo-${Date.now()}-${zoneIndex}`,
      type: 'photo',
      position: { x: safeZone.x, y: safeZone.y },
      size: { width: safeZone.width, height: safeZone.height },
      photoUrl: photo.url,
      crop: {
        x: crop.x / (photo.metadata?.dimensions?.width || 1),
        y: crop.y / (photo.metadata?.dimensions?.height || 1),
        width: crop.width / (photo.metadata?.dimensions?.width || 1),
        height: crop.height / (photo.metadata?.dimensions?.height || 1),
      },
      rotation: zone.rotation || 0,
      zIndex: 1,
    };
    page.elements.push(photoElement);
  });
  return page;
}

function createEmptyPage(pageNumber: number): PhotobookPage {
  return { id: `page-${pageNumber}`, elements: [], background: { type: 'color', value: '#ffffff' } };
}

// ---------- Public API ----------
export async function autoLayoutPhotos(photos: File[], projectSize: PhotobookSize = DEFAULT_PHOTOBOOK_SIZE): Promise<PhotobookProject> {
  return await autoLayoutPhotosWithPredefinedSpreads(photos, projectSize);
}

export function createPhotobookProject(title: string = `Фотокнига ${new Date().toLocaleDateString()}`, size: PhotobookSize = DEFAULT_PHOTOBOOK_SIZE): PhotobookProject {
  return { id: `project-${Date.now()}`, title, size, spreads: [], totalPages: 0, createdAt: new Date(), updatedAt: new Date(), status: 'draft' };
}

export async function generateQuickPreview(photos: File[]): Promise<QuickPreviewState> {
  const project = await autoLayoutPhotosWithPredefinedSpreads(photos, DEFAULT_PHOTOBOOK_SIZE, { desiredSpreads: 10, allowPhotoReuse: true, uniformLayout: true });
  return { photos, previewSpreads: project.spreads, isGenerating: false, showPreview: true };
}

export function calculatePrice(size: PhotobookSize, totalPages: number, quantity: number = 1) {
  const additionalPages = Math.max(0, totalPages - MIN_PAGES);
  const basePrice = size.basePrice; const additionalPagesPrice = additionalPages * size.additionalPagePrice; const subtotal = basePrice + additionalPagesPrice; const totalPrice = subtotal * quantity; return { basePrice, additionalPagesPrice, totalPrice };
}

export function exportProjectToJSON(project: PhotobookProject): string { return JSON.stringify(project, null, 2); }
export function importProjectFromJSON(jsonString: string): PhotobookProject { const data = JSON.parse(jsonString); data.createdAt = new Date(data.createdAt); data.updatedAt = new Date(data.updatedAt); return data as PhotobookProject; }

export { PAGE_COLLAGE_TEMPLATES, SPREAD_TEMPLATES };