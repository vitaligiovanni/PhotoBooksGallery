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
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Configure ffmpeg paths
if (ffmpegInstaller?.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeStatic?.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}
// TensorFlow MUST be imported and configured BEFORE mind-ar
// Using pure JavaScript version (@tensorflow/tfjs) instead of @tensorflow/tfjs-node
// to avoid native compilation issues on Windows
import * as tf from '@tensorflow/tfjs';

// ==== INTERFACES (from backend) ====

/**
 * Extract video dimensions using ffprobe
 */
function extractVideoMetadata(videoPath: string): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) return reject(err);
      const stream = data.streams.find(s => s.width && s.height) as any;
      const width = stream?.width;
      const height = stream?.height;
      if (!width || !height) {
        return reject(new Error('Unable to read video dimensions'));
      }
      resolve({ width, height, aspectRatio: width / height });
    });
  });
}

/**
 * Resize/crop video to match photo dimensions
 * - If video AR ≈ photo AR: just resize
 * - If video wider: crop sides to match photo AR, then resize
 * - If video taller: crop top/bottom to match photo AR, then resize
 * - Never upscale beyond 1920px (keeps file size reasonable)
 */
async function resizeVideoToMatchPhoto(
  videoSrc: string,
  photoWidth: number,
  photoHeight: number,
  outputPath: string
): Promise<void> {
  const photoAR = photoWidth / photoHeight;
  const videoMeta = await extractVideoMetadata(videoSrc);
  const videoAR = videoMeta.width / videoMeta.height;
  
  console.log(`[AR Video] Source: ${videoMeta.width}×${videoMeta.height} (AR=${videoAR.toFixed(3)})`);
  console.log(`[AR Video] Target: ${photoWidth}×${photoHeight} (AR=${photoAR.toFixed(3)})`);
  
  // Calculate target dimensions (max 1920px on longest side)
  const maxDimension = 1920;
  let targetWidth = photoWidth;
  let targetHeight = photoHeight;
  
  if (Math.max(photoWidth, photoHeight) > maxDimension) {
    const scale = maxDimension / Math.max(photoWidth, photoHeight);
    targetWidth = Math.round(photoWidth * scale);
    targetHeight = Math.round(photoHeight * scale);
    console.log(`[AR Video] Optimizing: scaled to ${targetWidth}×${targetHeight} (max ${maxDimension}px)`);
  }
  
  // Build ffmpeg command
  let command = ffmpeg(videoSrc);
  
  // If aspect ratios differ significantly, crop first
  const arDiff = Math.abs(videoAR - photoAR);
  if (arDiff > 0.05) {
    if (videoAR > photoAR) {
      // Video wider → crop sides (center crop)
      const cropWidth = Math.round(videoMeta.height * photoAR);
      const cropX = Math.round((videoMeta.width - cropWidth) / 2);
      console.log(`[AR Video] Cropping sides: ${cropWidth}×${videoMeta.height} (offset X=${cropX})`);
      command = command.videoFilters(`crop=${cropWidth}:${videoMeta.height}:${cropX}:0`);
    } else {
      // Video taller → crop top/bottom (center crop)
      const cropHeight = Math.round(videoMeta.width / photoAR);
      const cropY = Math.round((videoMeta.height - cropHeight) / 2);
      console.log(`[AR Video] Cropping top/bottom: ${videoMeta.width}×${cropHeight} (offset Y=${cropY})`);
      command = command.videoFilters(`crop=${videoMeta.width}:${cropHeight}:0:${cropY}`);
    }
  }
  
  // Resize to target dimensions
  return new Promise((resolve, reject) => {
    command
      .size(`${targetWidth}x${targetHeight}`)
      .videoCodec('libx264')
      .outputOptions([
        '-crf 23', // Good quality, reasonable size
        '-preset fast', // Balance speed/quality
        '-movflags +faststart', // Web optimization
      ])
      .output(outputPath)
      .on('start', (cmdLine) => {
        console.log(`[AR Video] ffmpeg: ${cmdLine}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[AR Video] Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`[AR Video] ✅ Processed: ${outputPath}`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`[AR Video] ❌ ffmpeg error:`, err);
        reject(err);
      })
      .run();
  });
}

export interface CompilationJob {
  projectId: string;
  userId: string;
  photoPath?: string; // Legacy: single photo path
  videoPath?: string; // Legacy: single video path
  photoPaths?: string[]; // Multi-target: array of photo paths
  videoPaths?: string[]; // Multi-target: array of video paths (one per photo)
  maskPath?: string; // Absolute path to custom mask/overlay image (optional)
  maskUrls?: string[]; // Multi-target: array of mask URLs (optional)
  shapeType?: 'circle' | 'oval' | 'square' | 'rect' | 'custom'; // Auto-generate mask shape
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
    markersCount?: number; // Number of markers for multi-target
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
    markersCount?: number; // Multi-target mode
    multiTarget?: boolean; // True for multi-target
    photoWidth?: number; // DEPRECATED: use photoSizes instead
    photoHeight?: number; // DEPRECATED: use photoSizes instead
    photoSizes?: Array<{ width: number; height: number; aspectRatio: number }>; // Multi-target: size for each marker
    videoWidth?: number; // Optional in multi-target
    videoHeight?: number; // Optional in multi-target
    videoDurationMs?: number; // Optional in multi-target
    photoAspectRatio?: string; // DEPRECATED: use photoSizes instead
    videoAspectRatio?: string; // Optional in multi-target
    fitMode?: string; // Optional in multi-target
    scaleWidth?: string; // Optional in multi-target
    scaleHeight?: string; // Optional in multi-target
    maskEnabled?: boolean; // True if mask applied
    maskFiles?: string[]; // ['mask-0.png', 'mask-1.png', ...]
  };
}

// ==== MAIN COMPILATION FUNCTION ====

/**
 * Main AR compilation workflow (runs in Worker Thread)
 * 
 * WORKFLOW:
 * 1. Resize photo (5000px → 1024px) - 5-8x faster compilation
 * 2. Enhance marker with unique border (hash-based pattern)
 * 3. Crop border for MindAR (clean center recognition)
 * 4. Compile .mind file with MD5 caching (105s first, 2-5s cached)
 * 5. Generate HTML5 viewer (A-Frame + MindAR)
 * 6. Generate QR code for sharing
 * 7. Copy assets (video, logo, etc.)
 */
export async function compileARProject(job: CompilationJob): Promise<CompilationResult> {
  const startTime = Date.now();
  
  // Support both single and multi-target modes
  const photoPaths = job.photoPaths || (job.photoPath ? [job.photoPath] : []);
  const videoPaths = job.videoPaths || (job.videoPath ? [job.videoPath] : []);
  const markersCount = photoPaths.length;
  
  console.log(`[AR Core] 🔨 Starting compilation for project: ${job.projectId}`);
  console.log(`[AR Core] Mode: ${markersCount > 1 ? 'MULTI-TARGET' : 'SINGLE'} (${markersCount} marker(s))`);
  console.log(`[AR Core] Config:`, JSON.stringify(job.config, null, 2));
  
  // CRITICAL: Validate photo paths
  if (photoPaths.length === 0) {
    const compilationTimeMs = Date.now() - startTime;
    console.error('[AR Core] ❌❌❌ VALIDATION FAILED: At least one photo is required! ❌❌❌');
    return {
      success: false,
      error: 'At least one photo is required for compilation',
      compilationTimeMs
    };
  }
  
  // Check if all photo files exist
  for (let i = 0; i < photoPaths.length; i++) {
    const photoExists = await fs.pathExists(photoPaths[i]);
    if (!photoExists) {
      const compilationTimeMs = Date.now() - startTime;
      console.error(`[AR Core] ❌❌❌ VALIDATION FAILED: Photo ${i + 1} not found: ${photoPaths[i]} ❌❌❌`);
      return {
        success: false,
        error: `Photo file ${i + 1} not found: ${photoPaths[i]}`,
        compilationTimeMs
      };
    }
    console.log(`[AR Core] ✅ Photo ${i + 1}/${markersCount} validated: ${photoPaths[i]}`);
  }
  
  try {
    // STEP 1: Process ALL photos (resize + enhance)
    console.log(`[AR Core] 📐 STEP 1: Processing ${markersCount} photo(s)...`);
    const processedPhotos: string[] = [];
    const resizedPhotos: string[] = []; // Store pre-cropped photos for metadata
    
    for (let i = 0; i < photoPaths.length; i++) {
      console.log(`[AR Core] Processing photo ${i + 1}/${markersCount}...`);
      
      // Resize with unique filename per photo
      const resizedPhotoPath = await resizePhotoIfNeeded(photoPaths[i], job.storageDir, 1024, i);
      resizedPhotos.push(resizedPhotoPath); // SAVE: Pre-cropped photo for metadata
      
      // DISABLED: Border enhancement completely disabled for ALL projects (single + multi)
      // MindAR does not need border - it uses natural feature detection
      const finalPath = resizedPhotoPath;
      console.log(`[AR Core] Using resized photo AS-IS (no border) for photo ${i + 1}`);
      
      processedPhotos.push(finalPath);
      console.log(`[AR Core] ✅ Photo ${i + 1}/${markersCount} processed: ${finalPath}`);
    }
    
    console.log(`[AR Core] ✅ All ${markersCount} photo(s) processed for compilation`);
    
    // STEP 2: Process ALL videos - resize/crop to match photo dimensions
    console.log(`[AR Core] 🎬 STEP 2: Processing ${videoPaths.length} video(s) to match photo dimensions...`);
    for (let i = 0; i < videoPaths.length; i++) {
      if (videoPaths[i]) {
        const videoDestPath = path.join(job.storageDir, `video-${i}.mp4`);
        
        // CRITICAL: Get photo dimensions from RESIZED (pre-cropped) photo, not cropped one!
        const photoMeta = await sharp(resizedPhotos[i]).metadata();
        if (!photoMeta.width || !photoMeta.height) {
          throw new Error(`Cannot read dimensions of photo ${i}`);
        }
        
        console.log(`[AR Core] 📐 Original photo ${i}: ${photoMeta.width}×${photoMeta.height}px (pre-crop for video)`);
        
        // Resize/crop video to match ORIGINAL photo dimensions (not cropped)
        await resizeVideoToMatchPhoto(
          videoPaths[i],
          photoMeta.width,
          photoMeta.height,
          videoDestPath
        );
        
        console.log(`[AR Core] ✅ Video ${i + 1}/${videoPaths.length} processed and matched to photo`);
      }
    }
    
    // STEP 2.5: Generate or copy masks (if enabled)
    const maskFiles: string[] = [];
    const maskEnabled = job.shapeType || job.maskPath || (job.maskUrls && job.maskUrls.length > 0);
    
    if (maskEnabled) {
      console.log(`[AR Core] 🎭 STEP 2.5: Processing masks...`);
      
      for (let i = 0; i < markersCount; i++) {
        const maskFileName = `mask-${i}.png`;
        const maskDestPath = path.join(job.storageDir, maskFileName);
        
        // CRITICAL: Get dimensions from RESIZED (pre-cropped) photo to match video!
        const photoMeta = await sharp(resizedPhotos[i]).metadata();
        const maskWidth = photoMeta.width || 1024;
        const maskHeight = photoMeta.height || 1024;
        
        console.log(`[AR Core] 🎭 Mask ${i + 1}: generating at ${maskWidth}×${maskHeight}px (matches original photo + video)`);
        
        if (job.shapeType && job.shapeType !== 'custom') {
          // Auto-generate mask from shape template
          await generateMask(job.shapeType, maskDestPath, undefined, maskWidth, maskHeight);
          maskFiles.push(maskFileName);
          console.log(`[AR Core] ✅ Mask ${i + 1}/${markersCount}: auto-generated (${job.shapeType})`);
        } else if (job.maskPath) {
          // Single custom mask for all markers
          await generateMask('custom', maskDestPath, job.maskPath, maskWidth, maskHeight);
          maskFiles.push(maskFileName);
          console.log(`[AR Core] ✅ Mask ${i + 1}/${markersCount}: custom mask copied`);
        } else if (job.maskUrls && job.maskUrls[i]) {
          // Individual mask per marker (multi-target custom)
          const maskSourcePath = job.maskUrls[i];
          if (await fs.pathExists(maskSourcePath)) {
            await generateMask('custom', maskDestPath, maskSourcePath, maskWidth, maskHeight);
            maskFiles.push(maskFileName);
            console.log(`[AR Core] ✅ Mask ${i + 1}/${markersCount}: individual custom mask`);
          } else {
            console.warn(`[AR Core] ⚠️ Mask ${i + 1} not found: ${maskSourcePath}, skipping`);
          }
        }
      }
      
      if (maskFiles.length > 0) {
        console.log(`[AR Core] ✅ ${maskFiles.length} mask(s) processed`);
      }
    } else {
      console.log('[AR Core] ℹ️ No masks enabled, videos will display in rectangular plane');
    }
    
    // STEP 3: Compile .mind file with MULTIPLE markers
    console.log(`[AR Core] ⏳ STEP 3: Compiling .mind file with ${markersCount} marker(s)...`);
    
    // Calculate combined hash for cache
    const combinedBuffer = Buffer.concat(await Promise.all(
      processedPhotos.map(p => fs.readFile(p))
    ));
    const combinedHash = crypto.createHash('md5').update(combinedBuffer).digest('hex');
    const cacheDir = path.join(job.storageDir, '..', 'mind-cache');
    const cachedMindPath = path.join(cacheDir, `multi-${markersCount}-${combinedHash}.mind`);
    
    let mindResult: { success: boolean; error?: string; mindFilePath?: string; compilationTimeMs: number };
    const cachedExists = await fs.access(cachedMindPath).then(() => true).catch(() => false);
    
    if (cachedExists) {
      console.log(`[AR Core] ✅ Cache HIT! Reusing multi-target .mind file (${markersCount} markers)`);
      const targetMindPath = path.join(job.storageDir, 'marker.mind');
      await fs.copyFile(cachedMindPath, targetMindPath);
      console.log('[AR Core] ⚡ Compilation skipped (instant vs ~2min per marker!)');
      mindResult = { success: true, mindFilePath: targetMindPath, compilationTimeMs: 0 };
    } else {
      console.log(`[AR Core] ❌ Cache MISS. Compiling ${markersCount} markers into ONE .mind file...`);
      console.log(`[AR Core] ⏳ This takes ~${markersCount * 60}s (${markersCount} markers × ~60s each)...`);
      mindResult = await compileMultiTargetMindFile(processedPhotos, job.storageDir, 'marker');
      
      // Save to cache
      if (mindResult.success && mindResult.mindFilePath) {
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.copyFile(mindResult.mindFilePath, cachedMindPath);
        console.log(`[AR Core] 💾 Cached multi-target .mind file for future use`);
      }
    }
    
    if (!mindResult.success) {
      throw new Error(`MindAR multi-target compilation failed: ${mindResult.error}`);
    }
    
    console.log(`[AR Core] ✅ Multi-target .mind file compiled in ${mindResult.compilationTimeMs}ms`);
    
    // STEP 4: Get photo metadata from ALL resized photos (each marker has unique size!)
    const photoSizes = await Promise.all(
      resizedPhotos.map(async (photoPath) => {
        const meta = await sharp(photoPath).metadata();
        const width = meta.width!;
        const height = meta.height!;
        const aspectRatio = width / height;
        return { width, height, aspectRatio };
      })
    );
    
    console.log(`[AR Core] 📐 Photo dimensions for each marker:`);
    photoSizes.forEach((size, i) => {
      console.log(`  Marker ${i + 1}: ${size.width}×${size.height}px (AR=${size.aspectRatio.toFixed(3)})`);
    });
    
    // STEP 5: Generate multi-target HTML viewer
    console.log(`[AR Core] 🌐 STEP 4: Generating multi-target HTML viewer with ${markersCount} videos...`);
    const viewerHtmlPath = path.join(job.storageDir, 'index.html');
    const videoFiles = videoPaths.map((_, i) => `video-${i}.mp4`);
    
    await generateMultiTargetARViewer(
      {
        arId: job.projectId,
        markerBaseName: 'marker',
        markersCount,
        videoFiles,
        photoSizes, // CRITICAL: Array of sizes, one per marker
        maskFiles: maskFiles.length > 0 ? maskFiles : undefined,
        videoPosition: job.config.videoPosition || { x: 0, y: 0, z: 0 },
        videoRotation: job.config.videoRotation || { x: 0, y: 0, z: 0 },
        loop: job.config.loop ?? true,
        zoom: job.config.zoom ?? 1.0,
        offsetX: job.config.offsetX ?? 0,
        offsetY: job.config.offsetY ?? 0,
      },
      viewerHtmlPath
    );
    console.log(`[AR Core] ✅ Multi-target HTML viewer generated with ${markersCount} videos${maskFiles.length > 0 ? ' + masks' : ''}`);
    
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
    
    console.log(`[AR Core] ✅✅✅ MULTI-TARGET COMPILATION COMPLETED in ${(compilationTimeMs / 1000).toFixed(1)}s ✅✅✅`);
    console.log(`[AR Core] 📊 Result: ${markersCount} markers, 1 .mind file, ${markersCount} videos`);
    
    return {
      success: true,
      compilationTimeMs,
      markerMindUrl: `/objects/ar-storage/${job.projectId}/marker.mind`,
      viewerHtmlUrl: `/objects/ar-storage/${job.projectId}/index.html`,
      qrCodeUrl: `/objects/ar-storage/${job.projectId}/qr-code.png`,
      metadata: {
        markersCount,
        photoSizes, // Array of sizes for all markers
        multiTarget: true,
        maskEnabled: maskFiles.length > 0,
        maskFiles: maskFiles.length > 0 ? maskFiles : undefined
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
 * Resize photo to 1024px (5-8x faster compilation)
 * FROM: backend/src/services/ar-compiler.ts lines 31-62
 */
async function resizePhotoIfNeeded(photoPath: string, outputDir: string, maxDimension: number = 1024, photoIndex: number = 0): Promise<string> {
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
    
    const resizedPath = path.join(outputDir, `photo-resized-${photoIndex}.jpg`);
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
async function createCroppedMindMarker(enhancedPhotoPath: string, outputDir: string, suffix: string = ''): Promise<string> {
  const croppedPath = path.join(outputDir, `marker-for-mind${suffix}.jpg`);
  
  const meta = await sharp(enhancedPhotoPath).metadata();
  const w = meta.width!;
  const h = meta.height!;
  
  // Calculate border thickness (5% instead of 13.5% to preserve more photo area)
  const maxSide = Math.max(w, h);
  const borderThickness = Math.round(maxSide * 0.05); // 5% - minimal crop
  
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
 * Generate mask PNG from shape type or resize custom mask
 * Supports: circle, oval, square, rect, custom
 */
async function generateMask(
  shapeType: 'circle' | 'oval' | 'square' | 'rect' | 'custom',
  outputPath: string,
  customMaskPath?: string,
  targetWidth: number = 1024,
  targetHeight: number = 1024
): Promise<void> {
  console.log(`[AR Core] 🎭 Generating mask: ${shapeType} (${targetWidth}x${targetHeight})`);

  if (shapeType === 'custom' && customMaskPath) {
    // Resize custom mask to match video dimensions
    const maskExists = await fs.pathExists(customMaskPath);
    if (!maskExists) {
      throw new Error(`Custom mask not found: ${customMaskPath}`);
    }
    
    await sharp(customMaskPath)
      .resize(targetWidth, targetHeight, {
        fit: 'fill',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    
    console.log('[AR Core] ✅ Custom mask resized and saved');
    return;
  }

  // Auto-generate mask from template
  const templateDir = path.join(process.cwd(), '..', 'ar-mask-templates');
  const templateFiles: Record<string, string> = {
    circle: 'circle.png',
    oval: 'oval.png',
    square: 'square.png',
    rect: 'rounded-rect.png'
  };

  const templateFile = templateFiles[shapeType];
  if (!templateFile) {
    throw new Error(`Unknown shape type: ${shapeType}. Use: circle, oval, square, rect`);
  }

  const templatePath = path.join(templateDir, templateFile);
  const templateExists = await fs.pathExists(templatePath);
  
  if (!templateExists) {
    throw new Error(`Mask template not found: ${templatePath}. Run generate-templates.js first.`);
  }

  // CRITICAL: Use 'contain' to preserve shape proportions (circle stays circle!)
  // Template is square (1024×1024), target may be portrait/landscape
  // 'contain' = fit inside, background fills edges with transparent black
  await sharp(templatePath)
    .resize(targetWidth, targetHeight, {
      fit: 'contain', // ✅ PRESERVES CIRCLE SHAPE!
      background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent edges
    })
    .png()
    .toFile(outputPath);

  console.log(`[AR Core] ✅ Mask generated with preserved proportions: ${templateFile}`);
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
    // @ts-ignore - mind-ar has no type definitions
    const compilerModule = await import('mind-ar/src/image-target/offline-compiler.js');
    OfflineCompiler = compilerModule.OfflineCompiler;

    // Force load CPU kernels for offline compilation (no GPU in Node.js)
    // @ts-ignore - mind-ar has no type definitions
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

/**
 * Compile MULTIPLE images into ONE .mind file (multi-target AR)
 * FROM: Modified compileMindFile to support arrays
 */
async function compileMultiTargetMindFile(
  photoPaths: string[],
  outputDir: string,
  markerBaseName: string = 'marker'
): Promise<{ success: boolean; compilationTimeMs: number; error?: string; mindFilePath?: string }> {
  const startTime = Date.now();
  
  try {
    await initMindAR();
    
    console.log(`[AR Core] 📸 Loading ${photoPaths.length} images for multi-target compilation...`);
    const images: any[] = [];
    
    for (let i = 0; i < photoPaths.length; i++) {
      await fs.access(photoPaths[i]);
      let image = await loadImage(photoPaths[i]);
      console.log(`[AR Core] Image ${i + 1}: ${image.width}x${image.height}px`);
      
      // Resize if needed
      const MAX_DIMENSION = 1024;
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
        
        console.log(`[AR Core] 📐 Resizing image ${i + 1} to ${targetWidth}x${targetHeight}px...`);
        const canvas = createCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image as any, 0, 0, targetWidth, targetHeight);
        image = canvas as any;
      }
      
      images.push(image);
    }
    
    console.log(`[AR Core] ✅ All ${images.length} images loaded. Starting multi-target compilation...`);
    
    const compiler = new OfflineCompiler({ maxScale: 640 });
    let lastProgressLog = 0;

    // CRITICAL: Pass array of images to compile multiple markers
    await compiler.compileImageTargets(images, (progress: number) => {
      if (Math.floor(progress / 10) > lastProgressLog) {
        lastProgressLog = Math.floor(progress / 10);
        console.log(`[AR Core] 🔄 Multi-target compilation progress: ${progress.toFixed(1)}%`);
      }
    });

    console.log('[AR Core] 🎯 Extracting tracking features for all markers...');

    const exportedBuffer = compiler.exportData();
    
    await fs.mkdir(outputDir, { recursive: true });
    const mindFilePath = path.join(outputDir, `${markerBaseName}.mind`);
    await fs.writeFile(mindFilePath, exportedBuffer);

    const compilationTimeMs = Date.now() - startTime;
    const fileSize = exportedBuffer.length;

    console.log(
      `[AR Core] ✅ MULTI-TARGET SUCCESS! Created ${mindFilePath}\n` +
      `  - Markers: ${images.length}\n` +
      `  - Size: ${(fileSize / 1024).toFixed(1)} KB\n` +
      `  - Time: ${(compilationTimeMs / 1000).toFixed(1)}s`
    );

    return {
      success: true,
      compilationTimeMs,
      mindFilePath
    };
  } catch (error: any) {
    const compilationTimeMs = Date.now() - startTime;
    console.error(`[AR Core] ❌ Multi-target compilation FAILED after ${compilationTimeMs}ms:`, error);

    return {
      success: false,
      error: error.message || 'Unknown compilation error',
      compilationTimeMs
    };
  }
}

/**
 * Compile SINGLE image .mind file (legacy single-target)
 */
async function compileMindFile(
  photoPath: string,
  outputDir: string,
  markerBaseName: string = 'marker'
): Promise<{ success: boolean; compilationTimeMs: number; error?: string; mindFilePath?: string }> {
  const startTime = Date.now();
  
  try {
    await initMindAR();
    await fs.access(photoPath);
    
    console.log(`[AR Core] 📸 Loading image: ${photoPath}`);
    let image = await loadImage(photoPath);
    console.log(`[AR Core] Original image: ${image.width}x${image.height}px`);

    const MAX_DIMENSION = 1024;
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
      compilationTimeMs,
      mindFilePath
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

/**
 * Generate MULTI-TARGET HTML5 AR viewer
 * FROM: Modified generateARViewer to support multiple videos
 */
interface MultiTargetARViewerConfig {
  arId: string;
  markerBaseName: string;
  markersCount: number;
  videoFiles: string[]; // ['video-0.mp4', 'video-1.mp4', ...]
  maskFiles?: string[]; // ['mask-0.png', 'mask-1.png', ...] (optional)
  photoSizes: Array<{ width: number; height: number; aspectRatio: number }>; // Size for EACH marker
  videoPosition?: { x: number; y: number; z: number };
  videoRotation?: { x: number; y: number; z: number };
  videoScale?: { width: number; height: number }; // DEPRECATED: use photoSizes instead
  autoPlay?: boolean;
  loop?: boolean;
  fitMode?: string;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
}

async function generateMultiTargetARViewer(
  config: MultiTargetARViewerConfig,
  outputPath: string
): Promise<void> {
  const {
    arId,
    markerBaseName,
    markersCount,
    videoFiles,
    maskFiles,
    videoPosition = { x: 0, y: 0, z: 0 },
    videoRotation = { x: 0, y: 0, z: 0 },
    videoScale = { width: 1, height: 0.75 },
    loop = true,
    zoom = 1.0,
    offsetX = 0,
    offsetY = 0,
  } = config;

  const hasMasks = maskFiles && maskFiles.length > 0;

  // Generate <a-assets> with multiple videos and masks
  const videoAssetsHTML = videoFiles.map((file, i) => 
    `<video id="vid${i}" src="./${file}?t=${Date.now()}" preload="auto" ${loop ? 'loop' : ''} muted playsinline crossorigin="anonymous"></video>`
  ).join('\n    ');

  const maskAssetsHTML = hasMasks ? maskFiles.map((file, i) =>
    `<img id="mask${i}" src="./${file}?t=${Date.now()}" crossorigin="anonymous">`
  ).join('\n    ') : '';

  const assetsHTML = `${videoAssetsHTML}${hasMasks ? '\n    ' + maskAssetsHTML : ''}`;

  // Generate multiple <a-entity mindar-image-target> with different videos and masks
  const targetsHTML = videoFiles.map((file, i) => {
    const maskMaterial = hasMasks && maskFiles[i]
      ? `src:#vid${i};alphaMap:#mask${i};shader:standard;transparent:true;opacity:0;side:double;roughness:1;metalness:0`
      : `src:#vid${i};shader:flat;transparent:true;opacity:0;side:double`;

    // CRITICAL: Each marker has its OWN size based on its photo dimensions
    const photoSize = config.photoSizes[i];
    const planeWidth = 1.0;
    const planeHeight = 1.0 / photoSize.aspectRatio; // height = width / AR

    return `
<a-entity mindar-image-target="targetIndex:${i}">
  <a-plane id="plane${i}" 
    rotation="${videoRotation.x} ${videoRotation.y} ${videoRotation.z}" 
    width="${planeWidth}" 
    height="${planeHeight}" 
    position="${videoPosition.x} ${videoPosition.y} ${videoPosition.z}" 
    material="${maskMaterial}" 
    visible="false" 
    animation__fade="property:material.opacity;from:0;to:1;dur:500;startEvents:showvid${i};easing:easeInOutQuad">
  </a-plane>
</a-entity>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>PhotoBooks Gallery AR - ${arId} (${markersCount} photos)</title>
<script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
<style>
body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden}
.arjs-loader{position:fixed;inset:0;background:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#333;z-index:9999;transition:opacity .6s;font-family:system-ui,-apple-system,sans-serif}
.arjs-loader.hidden{opacity:0;pointer-events:none}
.loading-text{font-size:20px;font-weight:600;color:#667eea;text-align:center;padding:0 20px}
#instructions{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:16px 32px;border-radius:40px;font-size:16px;font-weight:600;z-index:100}
#marker-counter{position:fixed;top:20px;right:20px;background:rgba(0,0,0,0.75);color:#fff;padding:12px 20px;border-radius:20px;font-size:18px;font-weight:600;z-index:101}
</style>
</head>
<body>
<div class="arjs-loader" id="loading">
  <div style="font-size:64px;margin-bottom:20px">📸${hasMasks ? '🎭' : ''}</div>
  <div class="loading-text">Загрузка AR с ${markersCount} фотографиями${hasMasks ? ' + маски' : ''}...</div>
</div>
<div id="instructions">Наведите на любую фотографию из альбома</div>
<div id="marker-counter">Найдено: <span id="found-count">0</span>/${markersCount}</div>

<a-scene embedded 
  mindar-image="imageTargetSrc:./${markerBaseName}.mind?t=${Date.now()};maxTrack:${Math.min(markersCount, 2)};filterMinCF:0.0001;filterBeta:0.003;warmupTolerance:5;missTolerance:10" 
  color-space="sRGB" 
  renderer="colorManagement:true;antialias:true;alpha:true" 
  vr-mode-ui="enabled:false" 
  device-orientation-permission-ui="enabled:false">
  
  <a-assets timeout="30000">
    ${assetsHTML}
  </a-assets>
  
  <a-camera position="0 0 0" look-controls="enabled:false" cursor="rayOrigin:mouse"></a-camera>
  
  ${targetsHTML}
  
</a-scene>

<script>
console.log('[AR Multi-Target] ${markersCount} markers loaded');
const loading = document.getElementById('loading');
const foundCount = document.getElementById('found-count');
const markerStates = Array(${markersCount}).fill(false);
let foundMarkers = 0;

// Setup all videos and planes
${videoFiles.map((file, i) => `
const video${i} = document.getElementById('vid${i}');
const plane${i} = document.getElementById('plane${i}');
const target${i} = document.querySelectorAll('[mindar-image-target]')[${i}];

video${i}.load();
video${i}.addEventListener('canplay', () => console.log('[AR] Video ${i} ready'));

target${i}.addEventListener('targetFound', () => {
  console.log('[AR] ✓ Marker ${i} found!');
  if (!markerStates[${i}]) {
    markerStates[${i}] = true;
    foundMarkers++;
    foundCount.textContent = foundMarkers;
  }
  video${i}.currentTime = 0;
  video${i}.muted = true;
  video${i}.play().then(() => {
    plane${i}.setAttribute('visible', 'true');
    plane${i}.emit('showvid${i}');
    setTimeout(() => video${i}.muted = false, 800);
  });
});

target${i}.addEventListener('targetLost', () => {
  console.log('[AR] Marker ${i} lost');
  plane${i}.setAttribute('visible', 'false');
  video${i}.pause();
  video${i}.currentTime = 0;
});
`).join('\n')}

const scene = document.querySelector('a-scene');
scene.addEventListener('arReady', () => {
  console.log('[AR] MindAR ready with ${markersCount} markers');
  setTimeout(() => loading.classList.add('hidden'), 300);
});
scene.addEventListener('arError', (e) => {
  console.error('[AR] Error:', e);
  loading.innerHTML = '<h2>Ошибка камеры</h2>';
});
</script>
</body>
</html>`;

  await fs.writeFile(outputPath, html, 'utf-8');
  console.log(`[AR Core] ✅ Generated multi-target viewer with ${markersCount} markers at ${outputPath}`);
}

/**
 * Generate SINGLE-TARGET HTML5 AR viewer (legacy)
 */
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
