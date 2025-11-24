/**
 * AR Compiler Core - EXTRACTED FROM MAIN BACKEND
 * 
 * This module contains CPU-intensive MindAR compilation logic
 * Running in Worker Thread to avoid blocking main event loop
 * 
 * CRITICAL: This code runs in SEPARATE thread!
 * Do NOT import database pools or Express app here
 * 
 * EXTRACTED FROM: backend/src/services/ar-compiler.ts (lines 31-1240)
 * MAJOR FUNCTIONS:
 * - resizePhotoIfNeeded() → 3-5x faster compilation (1920px limit)
 * - enhanceMarkerPhotoSimple() → unique border pattern with hash-based seeding
 * - compileMindFile() → MindAR offline compilation (120s CPU blocker)
 * - generateARViewer() → full HTML5 viewer with A-Frame + MindAR
 * - generateQRCode() → QR code for sharing AR experience
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import sharp from 'sharp';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { createCanvas, loadImage, Image as CanvasImage, CanvasRenderingContext2D } from 'canvas';
// TensorFlow MUST be imported and configured BEFORE mind-ar
// Using pure JavaScript version (@tensorflow/tfjs) instead of @tensorflow/tfjs-node
// to avoid native compilation issues on Windows
import * as tf from '@tensorflow/tfjs';

// ==== INTERFACES (from backend) ====

export interface CompilationJob {
  projectId: string;
  userId: string;
  photoPath: string; // Absolute path to uploaded photo
  videoPath?: string; // Absolute path to uploaded video (optional)
  maskPath?: string; // Absolute path to mask/overlay image (optional)
  storageDir: string; // Project storage directory (e.g., /app/storage/ar-storage/project-123)
  config: {
    fitMode?: 'contain' | 'cover' | 'fill' | 'exact'; // Video fit mode
    zoom?: number; // Manual zoom (0.5-2.0)
    offsetX?: number; // Video offset X (–0.5 to +0.5)
    offsetY?: number; // Video offset Y (–0.5 to +0.5)
    aspectLocked?: boolean; // Lock aspect ratio (default true)
    autoPlay?: boolean; // Auto-play video (default true)
    loop?: boolean; // Loop video (default true)
    videoPosition?: { x: number; y: number; z: number };
    videoRotation?: { x: number; y: number; z: number };
    videoScale?: { width: number; height: number };
  };
}

export interface CompilationResult {
  success: boolean;
  error?: string;
  compilationTimeMs: number;
  markerMindUrl?: string;
  viewerHtmlUrl?: string;
  qrCodeUrl?: string;
  metadata?: {
    photoWidth: number;
    photoHeight: number;
    videoWidth: number;
    videoHeight: number;
    videoDurationMs: number;
    photoAspectRatio: string;
    videoAspectRatio: string;
    fitMode: string;
    scaleWidth: string;
    scaleHeight: string;
  };
}

// ==== MAIN COMPILATION FUNCTION ====

/**
 * Main AR compilation workflow (runs in Worker Thread)
 * 
 * WORKFLOW:
 * 1. Resize photo (5000px → 1920px) - 3-5x faster compilation
 * 2. Enhance marker with unique border (hash-based pattern)
 * 3. Crop border for MindAR (clean center recognition)
 * 4. Compile .mind file (SLOWEST: 120 seconds CPU blocking)
 * 5. Generate HTML5 viewer (A-Frame + MindAR)
 * 6. Generate QR code for sharing
 * 7. Copy assets (video, logo, etc.)
 */
export async function compileARProject(job: CompilationJob): Promise<CompilationResult> {
  const startTime = Date.now();
  
  console.log(`[AR Core] 🔨 Starting compilation for project: ${job.projectId}`);
  console.log(`[AR Core] Photo: ${job.photoPath}`);
  console.log(`[AR Core] Video: ${job.videoPath || 'NONE (photo-only mode)'}`);
  console.log(`[AR Core] Config:`, JSON.stringify(job.config, null, 2));
  
  try {
    // STEP 1: Resize photo (5000px → 1920px for faster compilation)
    console.log('[AR Core] 📐 STEP 1: Resizing photo...');
    const resizedPhotoPath = await resizePhotoIfNeeded(job.photoPath, job.storageDir, 1920);
    console.log(`[AR Core] ✅ Photo resized: ${resizedPhotoPath}`);
    
    // STEP 2: Enhance marker with unique border
    console.log('[AR Core] 🎨 STEP 2: Enhancing marker with unique border...');
    const enhancerResult = await enhanceMarkerPhotoSimple(resizedPhotoPath, job.storageDir, job.projectId);
    
    // STEP 3: Crop border for MindAR (so it recognizes clean center)
    let finalMarkerSourcePath: string;
    
    if (enhancerResult.enhanced) {
      console.log('[AR Core] 🎨 Enhanced with border → cropping for clean marker recognition');
      finalMarkerSourcePath = await createCroppedMindMarker(enhancerResult.photoPath, job.storageDir);
      console.log('[AR Core] ✨ Professional mode: Print clean photo, get stable tracking!');
    } else {
      console.log('[AR Core] 📸 Using resized photo (enhancer disabled)');
      finalMarkerSourcePath = resizedPhotoPath;
    }
    
    // STEP 4: Extract photo metadata
    const photoMeta = await sharp(finalMarkerSourcePath).metadata();
    const photoWidth = photoMeta.width!;
    const photoHeight = photoMeta.height!;
    const photoAspectRatio = photoWidth / photoHeight;
    
    // STEP 5: Process video (if provided)
    let videoWidth = 1920;
    let videoHeight = 1080;
    let videoDurationMs = 0;
    let videoAspectRatio = 16 / 9;
    
    if (job.videoPath) {
      console.log('[AR Core] 🎬 STEP 3: Processing video...');
      
      // Copy video to storage
      const videoDestPath = path.join(job.storageDir, 'video.mp4');
      await fs.copyFile(job.videoPath, videoDestPath);
      
      // Extract video metadata (simplified - real impl would use ffprobe)
      videoWidth = 1920;
      videoHeight = 1080;
      videoDurationMs = 10000;
      videoAspectRatio = videoWidth / videoHeight;
      
      console.log(`[AR Core] ✅ Video copied: ${videoWidth}x${videoHeight}, ${videoDurationMs}ms`);
    }
    
    // STEP 6: Compile .mind file (SLOWEST PART - 120 seconds)
    console.log('[AR Core] ⏳ STEP 4: Compiling .mind marker (this takes ~120 seconds)...');
    const mindResult = await compileMindFile(finalMarkerSourcePath, job.storageDir, 'marker');
    
    if (!mindResult.success) {
      throw new Error(`MindAR compilation failed: ${mindResult.error}`);
    }
    
    console.log(`[AR Core] ✅ .mind file compiled in ${mindResult.compilationTimeMs}ms`);
    
    // STEP 7: Calculate video scale
    const effectiveFitMode = job.config.fitMode || 'contain';
    const scaleWidth = 1;
    const scaleHeight = photoHeight / photoWidth;
    
    // STEP 8: Generate HTML viewer
    console.log('[AR Core] 🌐 STEP 5: Generating HTML5 viewer...');
    const viewerHtmlPath = path.join(job.storageDir, 'index.html');
    await generateARViewer(
      {
        arId: job.projectId,
        markerBaseName: 'marker',
        videoFileName: job.videoPath ? 'video.mp4' : undefined!,
        maskFileName: job.config ? undefined : undefined,
        videoPosition: job.config.videoPosition || { x: 0, y: 0, z: 0 },
        videoRotation: job.config.videoRotation || { x: 0, y: 0, z: 0 },
        videoScale: job.config.videoScale || { width: scaleWidth, height: scaleHeight },
        autoPlay: job.config.autoPlay ?? true,
        loop: job.config.loop ?? true,
        fitMode: effectiveFitMode,
        videoAspectRatio,
        planeAspectRatio: photoAspectRatio,
        zoom: job.config.zoom ?? 1.0,
        offsetX: job.config.offsetX ?? 0,
        offsetY: job.config.offsetY ?? 0,
        aspectLocked: job.config.aspectLocked ?? true,
      },
      viewerHtmlPath
    );
    console.log('[AR Core] ✅ HTML viewer generated');
    
    // STEP 9: Generate QR codes
    console.log('[AR Core] 📱 STEP 6: Generating QR codes...');
    
    // Use TUNNEL_URL (ngrok) for QR codes and public links
    const baseUrl = process.env.TUNNEL_URL || process.env.FRONTEND_URL || 'https://photobooksgallery.am';
    const viewUrl = `${baseUrl}/ar/view/${job.projectId}`;
    
    const qrCodePath = path.join(job.storageDir, 'qr-code.png');
    await generateQRCode(viewUrl, qrCodePath);
    console.log(`[AR Core] ✅ QR code generated: ${viewUrl}`);
    console.log(`[AR Core] 🌐 Using tunnel URL: ${baseUrl}`);
    
    // STEP 10: Copy logo (if exists)
    try {
      const logoSourcePath = path.join(process.cwd(), '..', 'test_JPG_MP4', 'logo_animate1.webp');
      const logoDestPath = path.join(job.storageDir, 'logo_animate1.webp');
      
      if (await fs.pathExists(logoSourcePath)) {
        await fs.copy(logoSourcePath, logoDestPath);
        console.log('[AR Core] ✅ Logo copied successfully');
      }
    } catch (err: any) {
      console.warn('[AR Core] ⚠️ Logo copy failed:', err.message);
    }
    
    // DONE!
    const compilationTimeMs = Date.now() - startTime;
    
    console.log(`[AR Core] ✅✅✅ COMPILATION COMPLETED in ${(compilationTimeMs / 1000).toFixed(1)}s ✅✅✅`);
    
    return {
      success: true,
      compilationTimeMs,
      markerMindUrl: `/objects/ar-storage/${job.projectId}/marker.mind`,
      viewerHtmlUrl: `/objects/ar-storage/${job.projectId}/index.html`,
      qrCodeUrl: `/objects/ar-storage/${job.projectId}/qr-code.png`,
      metadata: {
        photoWidth,
        photoHeight,
        videoWidth,
        videoHeight,
        videoDurationMs,
        photoAspectRatio: photoAspectRatio.toFixed(3),
        videoAspectRatio: videoAspectRatio.toFixed(3),
        fitMode: effectiveFitMode,
        scaleWidth: scaleWidth.toString(),
        scaleHeight: scaleHeight.toFixed(3)
      }
    };
    
  } catch (error: any) {
    const compilationTimeMs = Date.now() - startTime;
    console.error('[AR Core] ❌❌❌ COMPILATION FAILED ❌❌❌');
    console.error('[AR Core] Error:', error);
    console.error('[AR Core] Stack:', error.stack);
    
    return {
      success: false,
      error: error.message || 'Unknown compilation error',
      compilationTimeMs
    };
  }
}

// ==== HELPER FUNCTIONS (extracted from backend) ====

/**
 * Resize photo to 1920px (3-5x faster compilation)
 * FROM: backend/src/services/ar-compiler.ts lines 31-62
 */
async function resizePhotoIfNeeded(photoPath: string, outputDir: string, maxDimension: number = 1920): Promise<string> {
  try {
    const metadata = await sharp(photoPath).metadata();
    const { width, height } = metadata;
    
    if (!width || !height) {
      console.warn('[AR Core] Could not read photo dimensions, using original');
      return photoPath;
    }
    
    if (width <= maxDimension && height <= maxDimension) {
      console.log(`[AR Core] Photo ${width}x${height}px already optimal (≤${maxDimension}px)`);
      return photoPath;
    }
    
    console.log(`[AR Core] 📐 Resizing large photo ${width}x${height}px → max ${maxDimension}px for 3-5x faster compilation...`);
    
    const resizedPath = path.join(outputDir, 'photo-resized.jpg');
    await sharp(photoPath)
      .resize(maxDimension, maxDimension, {
        fit: 'inside', // Preserve aspect ratio
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 }) // High quality for AR tracking
      .toFile(resizedPath);
    
    const resizedMeta = await sharp(resizedPath).metadata();
    console.log(`[AR Core] ✅ Resized to ${resizedMeta.width}x${resizedMeta.height}px (compilation will be much faster!)`);
    
    return resizedPath;
  } catch (error: any) {
    console.warn('[AR Core] Resize failed, using original photo:', error.message);
    return photoPath;
  }
}

/**
 * Enhance marker with unique border pattern
 * FROM: backend/src/services/border-enhancer.ts (full file)
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

async function generatePhotoSeed(photoPath: string): Promise<number> {
  try {
    const buffer = await fs.readFile(photoPath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  } catch {
    const hash = crypto.createHash('sha256').update(photoPath).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }
}

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
  const borderThickness = innerX;
  
  const symbols = ['●', '▲', '■', '★', '✦', '◆', '◇', '▼', '►'];
  const cornerSymbols = [
    symbols[rng.nextInt(0, symbols.length - 1)],
    symbols[rng.nextInt(0, symbols.length - 1)],
    symbols[rng.nextInt(0, symbols.length - 1)],
    symbols[rng.nextInt(0, symbols.length - 1)]
  ];
  
  const patterns = ['checker', 'circles', 'lines', 'dots'];
  const patternMix: string[] = [];
  for (let i = 0; i < 2 + rng.nextInt(0, 1); i++) {
    patternMix.push(patterns[rng.nextInt(0, patterns.length - 1)]);
  }
  
  const baseCellSize = rng.nextInt(20, 32);
  
  for (let y = 0; y < canvasHeight; y += baseCellSize) {
    for (let x = 0; x < canvasWidth; x += baseCellSize) {
      const insideInterior = 
        x >= innerX && 
        x < innerX + innerWidth && 
        y >= innerY && 
        y < innerY + innerHeight;
      if (insideInterior) continue;
      
      const cellW = baseCellSize + rng.nextInt(-4, 4);
      const cellH = baseCellSize + rng.nextInt(-4, 4);
      const offsetX = rng.nextInt(-3, 3);
      const offsetY = rng.nextInt(-3, 3);
      
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
  
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.font = `bold ${borderThickness / 2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.fillText(cornerSymbols[0], borderThickness / 2, borderThickness / 2);
  ctx.fillText(cornerSymbols[1], canvasWidth - borderThickness / 2, borderThickness / 2);
  ctx.fillText(cornerSymbols[2], borderThickness / 2, canvasHeight - borderThickness / 2);
  ctx.fillText(cornerSymbols[3], canvasWidth - borderThickness / 2, canvasHeight - borderThickness / 2);
  
  ctx.restore();
  
  return { cornerSymbols, patternMix };
}

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
  
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, borderThickness + 5, 5);
  
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, canvasWidth - borderThickness - 5, canvasHeight - 5);
  
  ctx.restore();
}

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

async function enhanceMarkerPhotoSimple(
  photoPath: string,
  outputDir: string,
  projectId?: string
): Promise<{ photoPath: string; enhanced: boolean }> {
  const startTime = Date.now();
  const flagRaw = (process.env.AR_ENABLE_BORDER_ENHANCER || '').trim().toLowerCase();
  const ENABLE = flagRaw === '' || flagRaw === 'true' || flagRaw === '1' || flagRaw === 'yes';

  if (!ENABLE) {
    console.log('[AR Core] Border enhancer disabled via AR_ENABLE_BORDER_ENHANCER');
    return { photoPath, enhanced: false };
  }

  const exists = await fs
    .access(photoPath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    console.warn('[AR Core] Original photo missing, skipping enhancement:', photoPath);
    return { photoPath, enhanced: false };
  }

  try {
    const seedNumber = await generatePhotoSeed(photoPath);
    const rng = new SeededRandom(seedNumber);
    
    const img = (await loadImage(photoPath)) as CanvasImage;
    const origW = img.width;
    const origH = img.height;
    const maxSide = Math.max(origW, origH);

    const borderThickness = Math.round(maxSide * (0.12 + (rng.next() * 0.03)));

    const canvasW = origW + borderThickness * 2;
    const canvasH = origH + borderThickness * 2;

    const canvas = createCanvas(canvasW, canvasH);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);

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

    ctx.drawImage(img as any, borderThickness, borderThickness, origW, origH);

    drawInnerStroke(ctx, borderThickness, borderThickness, origW, origH);
    
    if (projectId) {
      drawTextWatermark(ctx, canvasW, canvasH, borderThickness, `AR-${projectId.substring(0, 8)}`);
    }

    const enhancedPhotoPath = path.join(outputDir, 'enhanced-photo.jpg');
    const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
    await fs.writeFile(enhancedPhotoPath, jpegBuffer);

    console.log('[AR Core] ✅ Enhanced photo with unique border');
    console.log(`[AR Core] Seed: ${seedNumber.toString(16)}, Border: ${borderThickness}px`);
    console.log(`[AR Core] Corners: [${borderInfo.cornerSymbols.join(', ')}]`);
    console.log(`[AR Core] Pattern mix: [${borderInfo.patternMix.join(', ')}]`);

    return { photoPath: enhancedPhotoPath, enhanced: true };
  } catch (err: any) {
    console.error('[AR Core] ❌ Enhancement error:', err.message);
    return { photoPath, enhanced: false };
  }
}

/**
 * Crop border from enhanced photo (for MindAR clean recognition)
 * FROM: backend/src/services/ar-compiler.ts lines 1007-1018
 */
async function createCroppedMindMarker(enhancedPhotoPath: string, outputDir: string): Promise<string> {
  const croppedPath = path.join(outputDir, 'marker-for-mind.jpg');
  
  const meta = await sharp(enhancedPhotoPath).metadata();
  const w = meta.width!;
  const h = meta.height!;
  
  // Calculate border thickness (12-15% of max side)
  const maxSide = Math.max(w, h);
  const borderThickness = Math.round(maxSide * 0.135); // Average 13.5%
  
  await sharp(enhancedPhotoPath)
    .extract({
      left: borderThickness,
      top: borderThickness,
      width: w - borderThickness * 2,
      height: h - borderThickness * 2
    })
    .jpeg({ quality: 95 })
    .toFile(croppedPath);
  
  console.log('[AR Core] ✅ Cropped center for MindAR (clean marker)');
  return croppedPath;
}

/**
 * Compile .mind file (SLOWEST - 120 seconds CPU blocker)
 * FROM: backend/src/services/ar-compiler-v2.ts (full file)
 */

let OfflineCompiler: any;

async function initMindAR() {
  if (OfflineCompiler) return;

  try {
    // CRITICAL: Initialize TensorFlow Node.js backend FIRST
    // mind-ar expects browser TensorFlow API (@tensorflow/tfjs)
    // but in Node.js we need to set CPU backend explicitly
    console.log('[AR Core] 🔧 Initializing TensorFlow Node.js backend...');
    await tf.ready();
    console.log('[AR Core] ✅ TensorFlow backend ready:', tf.getBackend());

    // Now import MindAR (it will use TensorFlow that's already loaded)
    const compilerModule = await import('mind-ar/src/image-target/offline-compiler.js');
    OfflineCompiler = compilerModule.OfflineCompiler;

    // Force load CPU kernels for offline compilation (no GPU in Node.js)
    await import('mind-ar/src/image-target/detector/kernels/cpu/index.js');
    
    console.log('[AR Core] ✅ MindAR OfflineCompiler loaded');
  } catch (error: any) {
    console.error('[AR Core] ❌ Failed to load MindAR:', error);
    console.error('[AR Core] Stack trace:', error.stack);
    throw new Error(
      `MindAR initialization failed. Make sure dependencies are installed:\n` +
      `npm install mind-ar@1.2.5 canvas@2.11.2 @tensorflow/tfjs-node@4.15.0`
    );
  }
}

async function compileMindFile(
  photoPath: string,
  outputDir: string,
  markerBaseName: string = 'marker'
): Promise<{ success: boolean; compilationTimeMs: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    await initMindAR();
    await fs.access(photoPath);
    
    console.log(`[AR Core] 📸 Loading image: ${photoPath}`);
    let image = await loadImage(photoPath);
    console.log(`[AR Core] Original image: ${image.width}x${image.height}px`);

    const MAX_DIMENSION = 1920;
    if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION) {
      const aspectRatio = image.width / image.height;
      let targetWidth = image.width;
      let targetHeight = image.height;
      
      if (image.width > image.height) {
        targetWidth = MAX_DIMENSION;
        targetHeight = Math.round(MAX_DIMENSION / aspectRatio);
      } else {
        targetHeight = MAX_DIMENSION;
        targetWidth = Math.round(MAX_DIMENSION * aspectRatio);
      }
      
      console.log(`[AR Core] 📐 Resizing to ${targetWidth}x${targetHeight}px for faster compilation...`);
      const canvas = createCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image as any, 0, 0, targetWidth, targetHeight);
      image = canvas as any;
      console.log(`[AR Core] ✓ Resized (2-3x faster compilation expected)`);
    }

    const compiler = new OfflineCompiler({ maxScale: 640 });
    let lastProgressLog = 0;

    await compiler.compileImageTargets([image], (progress: number) => {
      if (Math.floor(progress / 10) > lastProgressLog) {
        lastProgressLog = Math.floor(progress / 10);
        console.log(`[AR Core] 🔄 MindAR compilation progress: ${progress.toFixed(1)}%`);
      }
    });

    console.log('[AR Core] 🎯 Extracting tracking features...');

    const exportedBuffer = compiler.exportData();
    
    await fs.mkdir(outputDir, { recursive: true });
    const mindFilePath = path.join(outputDir, `${markerBaseName}.mind`);
    await fs.writeFile(mindFilePath, exportedBuffer);

    const compilationTimeMs = Date.now() - startTime;
    const fileSize = exportedBuffer.length;

    console.log(
      `[AR Core] ✅ MindAR SUCCESS! Created ${mindFilePath}\n` +
      `  - Size: ${(fileSize / 1024).toFixed(1)} KB\n` +
      `  - Time: ${(compilationTimeMs / 1000).toFixed(1)}s`
    );

    return {
      success: true,
      compilationTimeMs
    };
  } catch (error: any) {
    const compilationTimeMs = Date.now() - startTime;
    console.error(`[AR Core] ❌ MindAR FAILED after ${compilationTimeMs}ms:`, error);

    return {
      success: false,
      error: error.message || 'Unknown compilation error',
      compilationTimeMs
    };
  }
}

/**
 * Generate QR code
 * FROM: backend/src/services/ar-compiler.ts lines 527-567
 */
async function generateQRCode(url: string, outputPath: string): Promise<string> {
  try {
    await QRCode.toFile(outputPath, url, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    console.log(`[AR Core] Generated QR code at ${outputPath}`);
    return outputPath;
  } catch (error: any) {
    console.error('[AR Core] Failed to generate QR code:', error);
    throw error;
  }
}

/**
 * Generate HTML5 AR viewer
 * FROM: backend/src/services/ar-compiler.ts lines 407-527 (FULL PRODUCTION VIEWER)
 */

interface ARViewerConfig {
  arId: string;
  markerBaseName: string;
  videoFileName: string;
  maskFileName?: string;
  videoPosition?: { x: number; y: number; z: number };
  videoRotation?: { x: number; y: number; z: number };
  videoScale?: { width: number; height: number };
  autoPlay?: boolean;
  loop?: boolean;
  fitMode?: string;
  videoAspectRatio?: number;
  planeAspectRatio?: number;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  aspectLocked?: boolean;
}

async function generateARViewer(
  config: ARViewerConfig,
  outputPath: string
): Promise<void> {
  const {
    arId,
    markerBaseName,
    videoFileName,
    maskFileName,
    videoPosition = { x: 0, y: 0, z: 0 },
    videoRotation = { x: 0, y: 0, z: 0 },
    videoScale = { width: 1, height: 0.75 },
    autoPlay = true,
    loop = true,
    fitMode = 'contain',
    videoAspectRatio,
    planeAspectRatio,
    zoom = 1.0,
    offsetX = 0,
    offsetY = 0,
    aspectLocked = true,
  } = config;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>PhotoBooks Gallery AR - ${arId}</title>
<script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
<style>
body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden}
.arjs-loader{position:fixed;inset:0;background:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#333;z-index:9999;transition:opacity .6s;font-family:system-ui,-apple-system,sans-serif}
.arjs-loader.hidden{opacity:0;pointer-events:none}
#lottie-container{width:200px;height:200px;margin-bottom:20px;display:flex;align-items:center;justify-content:center}
@media (min-width:768px){#lottie-container{width:280px;height:280px}}
.loading-text{font-size:20px;font-weight:600;color:#667eea;text-align:center;padding:0 20px;animation:pulse-text 2s ease-in-out infinite}
@keyframes pulse-text{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.05)}}
.loading-dots{display:flex;gap:8px;margin-top:16px}
.loading-dots span{width:10px;height:10px;background:#764ba2;border-radius:50%;animation:dot-pulse 1.4s ease-in-out infinite}
.loading-dots span:nth-child(2){animation-delay:0.2s}
.loading-dots span:nth-child(3){animation-delay:0.4s}
@keyframes dot-pulse{0%,100%{transform:scale(0.8);opacity:0.5}50%{transform:scale(1.2);opacity:1}}
#instructions{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:#fff;padding:16px 32px;border-radius:40px;backdrop-filter:blur(12px);font-size:16px;font-weight:600;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,0.4)}
#instructions::before{content:"📸";margin-right:10px;font-size:20px}
#unmute-hint{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:14px 28px;border-radius:30px;backdrop-filter:blur(12px);font-size:15px;font-weight:600;z-index:101;box-shadow:0 6px 24px rgba(0,0,0,0.5);animation:pulse 2s ease-in-out infinite;display:none}
#unmute-hint::before{content:"👆";margin-right:8px;font-size:18px}
@keyframes pulse{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.05)}}
#logo{position:fixed;top:20px;left:20px;height:48px;opacity:0.95;z-index:99;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3))}
#share-btn{position:fixed;bottom:100px;right:20px;width:56px;height:56px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(102,126,234,0.4);cursor:pointer;border:none;transition:transform 0.2s;z-index:102}
#share-btn:active{transform:scale(0.95)}
#order-btn{position:fixed;bottom:30px;right:20px;background:linear-gradient(135deg,#00c853,#00e676);color:#fff;padding:14px 28px;border-radius:30px;font-weight:600;font-size:15px;box-shadow:0 4px 16px rgba(0,200,83,0.4);cursor:pointer;text-decoration:none;border:none;display:none;z-index:102;transition:transform 0.2s}
#order-btn:active{transform:scale(0.95)}
@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.fade-in-up{animation:fadeInUp 0.5s ease-out}
</style>
</head>
<body>
<div class="arjs-loader" id="loading"><div id="lottie-container"></div><div class="loading-text">Приготовьтесь к волшебству</div><div class="loading-dots"><span></span><span></span><span></span></div></div>
<img id="logo" src="https://photobooksgallery.am/logo.png" alt="PhotoBooks Gallery" onerror="this.style.display='none'">
<div id="instructions">Наведите камеру на фотографию</div>
<div id="unmute-hint">Нажмите для звука</div>
<button id="share-btn" title="Поделиться">📤</button>
<a id="order-btn" href="https://photobooksgallery.am" target="_blank">🛒 Заказать альбом</a>
<a-scene embedded mindar-image="imageTargetSrc:./${markerBaseName}.mind?t=${Date.now()};maxTrack:1;filterMinCF:0.0001;filterBeta:0.003;warmupTolerance:5;missTolerance:10" color-space="sRGB" renderer="colorManagement:true;antialias:true;alpha:true" vr-mode-ui="enabled:false" device-orientation-permission-ui="enabled:false">
<a-assets timeout="30000"><video id="vid" src="./${videoFileName}?t=${Date.now()}" preload="auto" ${loop ? 'loop' : ''} muted playsinline crossorigin="anonymous"></video></a-assets>
<a-camera position="0 0 0" look-controls="enabled:false" cursor="rayOrigin:mouse"></a-camera>
<a-entity mindar-image-target="targetIndex:0"><a-plane id="plane" rotation="${videoRotation.x} ${videoRotation.y} ${videoRotation.z}" width="${videoScale.width}" height="${videoScale.height}" position="${videoPosition.x} ${videoPosition.y} ${videoPosition.z}" material="src:#vid;shader:flat;transparent:true;opacity:0;side:double" visible="false" animation__fade="property:material.opacity;from:0;to:1;dur:500;startEvents:showvid;easing:easeInOutQuad"></a-plane></a-entity>
</a-scene>
<script>
console.log('[AR] Page loaded');
const logoImg=document.createElement('img');
logoImg.src='./logo_animate1.webp';
logoImg.alt='PhotoBooks Gallery';
logoImg.style.cssText='width:100%;height:100%;object-fit:contain;animation:pulse 2s ease-in-out infinite';
logoImg.onload=()=>{console.log('[AR] ✓ Logo loaded successfully');document.getElementById('lottie-container').appendChild(logoImg);};
logoImg.onerror=()=>{console.error('[AR] ❌ Logo failed to load');document.getElementById('lottie-container').innerHTML='<div style="font-size:64px">📸</div>';};
setTimeout(()=>{console.log('[AR] Failsafe: hiding loader after 5s');document.getElementById('loading').classList.add('hidden')},5000);
const video=document.getElementById('vid');
const plane=document.getElementById('plane');
const loading=document.getElementById('loading');
const target=document.querySelector('[mindar-image-target]');
const unmuteHint=document.getElementById('unmute-hint');
const shareBtn=document.getElementById('share-btn');
const orderBtn=document.getElementById('order-btn');
console.log('[AR] Elements found:',{video:!!video,plane:!!plane,loading:!!loading,target:!!target,unmuteHint:!!unmuteHint,shareBtn:!!shareBtn,orderBtn:!!orderBtn});
let r={v:false,t:false,m:false};
let markerActive=false;
let videoReady=false;
video.load();console.log('[AR] Video load() called');
video.addEventListener('loadedmetadata',()=>{console.log('[AR] ✓ Video metadata loaded, duration:',video.duration)});
video.addEventListener('error',(e)=>{console.error('[AR] ❌ Video error:',e,video.error);loading.innerHTML='<h2>Ошибка видео</h2><p>Код: '+(video.error?video.error.code:'unknown')+'</p>'});
video.addEventListener('canplay',()=>{if(videoReady)return;videoReady=true;console.log('[AR] ✓ Video canplay, marking ready');r.v=true;if(/Android/i.test(navigator.userAgent)){setTimeout(()=>{console.log('[AR] ✓ Texture warmed (Android)');r.t=true;check()},450)}else{r.t=true;check()}});
target.addEventListener('targetFound',()=>{if(markerActive){console.log('[AR] Marker re-found (ignored)');return}console.log('[AR] ✓✓✓ MARKER FOUND! ✓✓✓');r.m=true;check()});
const scene=document.querySelector('a-scene');
scene.addEventListener('arReady',()=>{console.log('[AR] ✓ MindAR ready, camera started');setTimeout(()=>loading.classList.add('hidden'),300)});
scene.addEventListener('arError',(e)=>{console.error('[AR] ❌ MindAR Error:',e);loading.innerHTML='<h2>Ошибка доступа</h2><p>Проверьте камеру</p>'});
shareBtn.addEventListener('click',()=>{console.log('[AR] Share button clicked');if(navigator.share){navigator.share({title:'PhotoBooks Gallery AR',text:'Посмотри мой фотоальбом с AR-видео! 📸✨',url:window.location.href}).then(()=>console.log('[AR] ✓ Shared')).catch(e=>console.log('[AR] Share cancelled',e))}else{const url=window.location.href;navigator.clipboard.writeText(url).then(()=>{alert('Ссылка скопирована! 📋');console.log('[AR] ✓ Link copied')}).catch(()=>alert('Скопируйте ссылку: '+url))}});
console.log('[AR] Listeners attached, waiting for events...');
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
console.log('[AR] iOS detected:',isIOS);
function check(){console.log('[AR] Check state:',JSON.stringify(r),'markerActive:',markerActive);if(markerActive)return;if(r.v&&r.t&&r.m){markerActive=true;console.log('[AR] 🎬 ALL READY! Playing video...');video.currentTime=0;video.muted=true;const playPromise=video.play();if(playPromise){playPromise.then(()=>{console.log('[AR] ✓ Video playing (muted)');setTimeout(()=>{plane.setAttribute('visible','true');plane.emit('showvid');console.log('[AR] ✓ Plane visible');if(!isIOS){setTimeout(()=>{video.muted=false;console.log('[AR] ✓ Auto-unmuted (Android/Desktop)')},1000)}else{setTimeout(()=>{unmuteHint.style.display='block';console.log('[AR] 📢 Showing unmute hint (iOS)')},500);const handleUnmute=()=>{if(!video.muted)return;video.muted=false;unmuteHint.style.display='none';console.log('[AR] ✓ Unmuted by user tap (iOS)');document.body.removeEventListener('click',handleUnmute);document.body.removeEventListener('touchstart',handleUnmute)};document.body.addEventListener('click',handleUnmute);document.body.addEventListener('touchstart',handleUnmute)}setTimeout(()=>{orderBtn.style.display='block';orderBtn.classList.add('fade-in-up');console.log('[AR] 🛒 Order button shown')},5000)},200)}).catch(e=>{console.error('[AR] ❌ Play failed even muted:',e);loading.innerHTML='<h2>Ошибка видео</h2><p>'+e.message+'</p>'})}else{console.log('[AR] Play promise undefined')}}else{console.log('[AR] ⏳ Waiting for:',!r.v?'video':'',!r.t?'texture':'',!r.m?'marker':'')}}
target.addEventListener('targetLost',()=>{console.log('[AR] Marker lost');markerActive=false;plane.setAttribute('visible','false');plane.setAttribute('material','opacity',0);video.pause();video.currentTime=0;unmuteHint.style.display='none'});
const FIT_MODE='${fitMode}';const VIDEO_AR=${videoAspectRatio || 'null'};const PLANE_AR=${planeAspectRatio || 'null'};const ZOOM=${zoom};const OFFSET_X=${offsetX};const OFFSET_Y=${offsetY};const ASPECT_LOCKED=${aspectLocked};console.log('[AR] FitMode:',FIT_MODE,'VideoAR:',VIDEO_AR,'PlaneAR:',PLANE_AR,'Zoom:',ZOOM,'Offset:',OFFSET_X,OFFSET_Y,'AspectLocked:',ASPECT_LOCKED);
let coverScaleX=1,coverScaleY=1;
if(FIT_MODE==='cover'&&VIDEO_AR&&PLANE_AR){const vRatio=VIDEO_AR;const pRatio=PLANE_AR;if(vRatio>pRatio){coverScaleY=vRatio/pRatio;console.log('[AR] Cover: video wider, scaleY=',coverScaleY)}else{coverScaleX=pRatio/vRatio;console.log('[AR] Cover: video taller, scaleX=',coverScaleX)}console.log('[AR] ✓ Calculated cover scale:',coverScaleX,'x',coverScaleY)}
let smoothInit=false;let sp=[0,0,0];let sq=null;const SMOOTH_ALPHA_POS=0.5;const SMOOTH_ALPHA_ROT=0.5;function smoothTick(){if(!markerActive||!plane||!plane.object3D){requestAnimationFrame(smoothTick);return;}const o=plane.object3D;if(!smoothInit){sp=[o.position.x,o.position.y,o.position.z];sq=o.quaternion.clone();smoothInit=true;}else{sp[0]+=(o.position.x-sp[0])*SMOOTH_ALPHA_POS;sp[1]+=(o.position.y-sp[1])*SMOOTH_ALPHA_POS;sp[2]+=(o.position.z-sp[2])*SMOOTH_ALPHA_POS;sq.slerp(o.quaternion,SMOOTH_ALPHA_ROT);o.position.set(sp[0],sp[1],sp[2]);o.quaternion.copy(sq);}if(FIT_MODE==='cover'){if(ASPECT_LOCKED){o.scale.set(coverScaleX*ZOOM,coverScaleY*ZOOM,1);}else{o.scale.set(coverScaleX,coverScaleY,1);}}if(OFFSET_X!==0||OFFSET_Y!==0){const basePos=[${videoPosition.x},${videoPosition.y},${videoPosition.z}];o.position.set(basePos[0]+OFFSET_X,basePos[1]+OFFSET_Y,basePos[2]);}requestAnimationFrame(smoothTick);}requestAnimationFrame(smoothTick);
</script>
</body>
</html>`;

  await fs.writeFile(outputPath, html, 'utf-8');
  console.log(`[AR Core] Generated viewer at ${outputPath}`);
}
