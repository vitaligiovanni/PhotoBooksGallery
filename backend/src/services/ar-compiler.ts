import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import { db } from '../db';
import { arProjects, users, type ARProject } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendARReadyEmail } from './email-service';
import { extractMediaMetadata, computeVideoScaleForPhoto } from './media-metadata';

interface CompilationResult {
  success: boolean;
  markerFsetPath?: string;
  markerFset3Path?: string;
  markerIsetPath?: string;
  quality?: number;
  keyPointsCount?: number;
  compilationTimeMs?: number;
  error?: string;
}

interface ARViewerConfig {
  arId: string;
  markerBaseName: string;
  videoFileName: string;
  maskFileName?: string; // optional overlay image
  videoPosition?: { x: number; y: number; z: number };
  videoRotation?: { x: number; y: number; z: number };
  videoScale?: { width: number; height: number };
  autoPlay?: boolean;
  loop?: boolean;
}

/**
 * DEPRECATED: NFT CLI больше не используется.
 * Теперь используется только MindAR web compiler (https://hiukim.github.io/mind-ar-js-doc/tools/compile/)
 * который генерирует .mind файл напрямую, быстро и надёжно.
 * 
 * Эта функция оставлена для обратной совместимости, но не вызывается.
 */

/**
 * Generate multi-target viewer (multiple живые фото)
 */
async function generateMultiTargetViewer(arProjectId: string, items: any[], storageDir: string): Promise<void> {
  // Build list of marker .mind files with ./ prefix for proper relative loading
  // Note: MindAR requires comma-separated list WITHOUT spaces
  // NOTE: MindAR "imageTargetSrc" official API expects a SINGLE .mind file containing multiple targets.
  // Current pipeline produces individual marker-N.mind files (one per item). Full aggregation step is pending.
  // Temporary fallback: use ONLY the first marker file so at least one target works and the viewer exits loading state.
  // Roadmap: implement multi-upload compile to produce a combined targets.mind, then switch imageTargetSrc accordingly.
  const markerFiles = `./marker-0.mind`; // fallback (was comma-separated list of individual mind files)
  
  // Build video assets + entities
  const videoAssets = items.map((item, idx) => {
    const videoFileName = `video-${idx}.mp4`;
    const maskFileName = item.maskUrl ? `mask-${idx}${path.extname(item.maskUrl)}` : null;
    
    // Copy video to storage
    const videoSrc = path.join(process.cwd(), item.videoUrl);
    const videoDest = path.join(storageDir, videoFileName);
    fs.copyFile(videoSrc, videoDest).catch(e => console.warn(`Failed to copy video for item ${idx}:`, e));

    // Copy mask if exists
    if (item.maskUrl) {
      const maskSrc = path.join(process.cwd(), item.maskUrl);
      const maskDest = path.join(storageDir, maskFileName!);
      fs.copyFile(maskSrc, maskDest).catch(e => console.warn(`Failed to copy mask for item ${idx}:`, e));
    }

    return { videoFileName, maskFileName, item, idx };
  }).filter(Boolean);

  const assetsHtml = videoAssets.map(({ videoFileName, maskFileName, idx }) => `
      <video
        id="ar-video-${idx}"
        src="./${videoFileName}"
        preload="metadata"
        ${(items[idx].config?.loop !== false) ? 'loop' : ''}
        playsinline
        webkit-playsinline
        crossorigin="anonymous"
        muted
      ></video>
      ${maskFileName ? `<img id="ar-mask-${idx}" src="./${maskFileName}" crossorigin="anonymous" />` : ''}
  `).join('');

  const entitiesHtml = videoAssets.map(({ videoFileName, maskFileName, item, idx }) => {
    const config = item.config || {};
    const pos = config.videoPosition || { x: 0, y: 0, z: 0 };
    const rot = config.videoRotation || { x: 0, y: 0, z: 0 };
    const scale = config.videoScale || { width: 1, height: 0.75 };
    const autoPlay = config.autoPlay !== false;

    return `
    <a-entity mindar-image-target="targetIndex: ${idx}">
      <a-video
        id="ar-plane-${idx}"
        src="#ar-video-${idx}"
        position="${pos.x} ${pos.y} ${pos.z}"
        rotation="${rot.x} ${rot.y} ${rot.z}"
        width="${scale.width}"
        height="${scale.height}"
        class="clickable"
        data-auto-play="${autoPlay}"
      ></a-video>
      ${maskFileName ? `<a-image id="ar-mask-image-${idx}" src="#ar-mask-${idx}" position="${pos.x} ${pos.y} ${pos.z + 0.002}" rotation="${rot.x} ${rot.y} ${rot.z}" width="${scale.width}" height="${scale.height}" material="transparent: true; alphaTest: 0.001"></a-image>` : ''}
    </a-entity>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PhotoBooks Gallery AR - Multi View ${arProjectId}</title>
  <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
  <style>
    body { margin: 0; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #loading-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; z-index: 1000; transition: opacity 0.5s; }
    #loading-screen.hidden { opacity: 0; pointer-events: none; }
    .spinner { width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    #instructions { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 15px 25px; border-radius: 25px; font-size: 14px; z-index: 100; backdrop-filter: blur(10px); text-align: center; max-width: 80%; }
    .marker-found { display: none; position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(76, 175, 80, 0.9); color: white; padding: 10px 20px; border-radius: 20px; font-size: 12px; z-index: 100; }
  </style>
</head>
<body>
  <div id="loading-screen">
    <div class="spinner"></div>
    <h2>Загрузка AR...</h2>
    <p>Разрешите доступ к камере</p>
  </div>
  <div id="instructions">📸 Наведите камеру на любую фотографию из проекта</div>
  <div class="marker-found" id="marker-found">✓ Фото распознано!</div>
  
  <a-scene
    mindar-image="imageTargetSrc: ${markerFiles}; filterMinCF:0.0001; filterBeta: 0.001; warmupTolerance: 5; missTolerance: 5"
    color-space="sRGB"
    renderer="colorManagement: true, physicallyCorrectLights"
    vr-mode-ui="enabled: false"
    device-orientation-permission-ui="enabled: false"
  >
    <a-assets>
      ${assetsHtml}
    </a-assets>

    <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

    ${entitiesHtml}
  </a-scene>

  <script>
    const sceneEl = document.querySelector('a-scene');
    const loadingScreen = document.getElementById('loading-screen');
    const markerFoundIndicator = document.getElementById('marker-found');
    const videos = [${videoAssets.map((_, idx) => `document.getElementById('ar-video-${idx}')`).join(',')}];
    
    videos.forEach(v => { if (v) { try { v.pause(); v.muted = true; } catch {} } });

    sceneEl.addEventListener('loaded', () => {
      setTimeout(() => { loadingScreen.classList.add('hidden'); }, 1000);
    });
    // Fallback: hide loading screen after 10s even if 'loaded' never fired (prevents perpetual spinner when markers fail)
    setTimeout(() => {
      if (!loadingScreen.classList.contains('hidden')) {
        console.warn('Fallback hiding loading screen after timeout');
        loadingScreen.classList.add('hidden');
      }
    }, 10000);

    // Handle multi-target detection
    ${videoAssets.map(({ idx }) => `
    const target${idx} = document.querySelector('[mindar-image-target][mindar-image-target\\\\.targetIndex="${idx}"]');
    if (target${idx}) {
      target${idx}.addEventListener('targetFound', () => {
        console.log('Marker ${idx} found');
        markerFoundIndicator.style.display = 'block';
        const vid = videos[${idx}];
        if (vid) {
          const autoPlay = vid.closest('a-video')?.getAttribute('data-auto-play') !== 'false';
          if (autoPlay) {
            try { vid.muted = false; } catch {}
            vid.play().catch(e => console.warn('Play failed:', e));
          }
        }
      });
      target${idx}.addEventListener('targetLost', () => {
        console.log('Marker ${idx} lost');
        markerFoundIndicator.style.display = 'none';
        const vid = videos[${idx}];
        if (vid) {
          try { vid.pause(); vid.currentTime = 0; vid.muted = true; } catch {}
        }
      });
    }`).join('\n')}

    // Live calibration via postMessage
    window.addEventListener('message', (evt) => {
      const data = evt?.data;
      if (!data || data.type !== 'ar-calibration') return;
      const { targetIndex, position, rotation, scale } = data.payload || {};
      if (targetIndex === undefined) return;
      const plane = document.getElementById('ar-plane-' + targetIndex);
      const maskImg = document.getElementById('ar-mask-image-' + targetIndex);
      try {
        if (plane && scale) { plane.setAttribute('width', String(scale.width)); plane.setAttribute('height', String(scale.height)); }
        if (plane && position) { plane.setAttribute('position', String(position.x)+' '+String(position.y)+' '+String(position.z)); }
        if (plane && rotation) { plane.setAttribute('rotation', String(rotation.x)+' '+String(rotation.y)+' '+String(rotation.z)); }
        if (maskImg && scale) { maskImg.setAttribute('width', String(scale.width)); maskImg.setAttribute('height', String(scale.height)); }
        if (maskImg && position) { var z = (position.z||0)+0.002; maskImg.setAttribute('position', String(position.x)+' '+String(position.y)+' '+String(z)); }
        if (maskImg && rotation) { maskImg.setAttribute('rotation', String(rotation.x)+' '+String(rotation.y)+' '+String(rotation.z)); }
      } catch (e) { console.warn('Live calibration failed', e); }
    });

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(response => {
        if (response === 'granted') { console.log('Device orientation permission granted'); }
      }).catch(console.error);
    }
  </script>
</body>
</html>`;

  const viewerPath = path.join(storageDir, 'index.html');
  await fs.writeFile(viewerPath, html, 'utf-8');
  console.log(`[Multi-Target Viewer] Generated viewer at ${viewerPath} with ${items.length} targets`);
}

/**
 * Генерирует HTML viewer для AR проекта (single-photo legacy)
 */
export async function generateARViewer(
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
  } = config;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PhotoBooks Gallery AR - View ${arId}</title>
  <meta name="description" content="Наведите камеру на фотографию чтобы увидеть AR-эффект">
  
  <!-- AR.js and A-Frame -->
  <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
  
  <style>
    body {
      margin: 0;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #loading-screen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      z-index: 1000;
      transition: opacity 0.5s;
    }
    
    #loading-screen.hidden {
      opacity: 0;
      pointer-events: none;
    }
    
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    #instructions {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 15px 25px;
      border-radius: 25px;
      font-size: 14px;
      z-index: 100;
      backdrop-filter: blur(10px);
      text-align: center;
      max-width: 80%;
    }
    
    .marker-found {
      display: none;
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 12px;
      z-index: 100;
    }
  </style>
</head>
<body>
  <!-- Loading Screen -->
  <div id="loading-screen">
    <div class="spinner"></div>
    <h2>Загрузка AR...</h2>
    <p>Разрешите доступ к камере</p>
  </div>
  
  <!-- Instructions -->
  <div id="instructions">
    📸 Наведите камеру на фотографию
  </div>
  
  <!-- Marker Found Indicator -->
  <div class="marker-found" id="marker-found">
    ✓ Фото распознано!
  </div>
  
  <!-- AR Scene -->
  <a-scene
    mindar-image="imageTargetSrc: ./${markerBaseName}.mind; filterMinCF:0.0001; filterBeta: 0.001; warmupTolerance: 5; missTolerance: 5"
    color-space="sRGB"
    renderer="colorManagement: true, physicallyCorrectLights"
    vr-mode-ui="enabled: false"
    device-orientation-permission-ui="enabled: false"
  >
    <a-assets>
      <video
        id="ar-video"
        src="./${videoFileName}"
        preload="metadata"
        ${loop ? 'loop' : ''}
        playsinline
        webkit-playsinline
        crossorigin="anonymous"
        muted
      ></video>
      ${maskFileName ? `<img id="ar-mask" src="./${maskFileName}" crossorigin="anonymous" />` : ''}
    </a-assets>

    <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

    <a-entity mindar-image-target="targetIndex: 0">
      <a-video
        id="ar-plane"
        src="#ar-video"
        position="${videoPosition.x} ${videoPosition.y} ${videoPosition.z}"
        rotation="${videoRotation.x} ${videoRotation.y} ${videoRotation.z}"
        width="${videoScale.width}"
        height="${videoScale.height}"
        class="clickable"
      ></a-video>
      ${maskFileName ? `<a-image id="ar-mask-image" src="#ar-mask" position="${videoPosition.x} ${videoPosition.y} ${videoPosition.z + 0.002}" rotation="${videoRotation.x} ${videoRotation.y} ${videoRotation.z}" width="${videoScale.width}" height="${videoScale.height}" material="transparent: true; alphaTest: 0.001"></a-image>` : ''}
    </a-entity>
  </a-scene>

  <script>
    const sceneEl = document.querySelector('a-scene');
    const loadingScreen = document.getElementById('loading-screen');
    const markerFoundIndicator = document.getElementById('marker-found');
    const videoEl = document.getElementById('ar-video');
    // Ensure video is paused and muted until marker is found
    if (videoEl) {
      try { videoEl.pause(); } catch {}
      videoEl.muted = true;
    }
    
    // Hide loading screen when AR is ready
    sceneEl.addEventListener('loaded', () => {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
      }, 1000);
    });
    
    // Show/hide marker found indicator
    const targetEl = document.querySelector('[mindar-image-target]');
    
    targetEl.addEventListener('targetFound', () => {
      console.log('AR marker found!');
      markerFoundIndicator.style.display = 'block';
      
      // Play video
      if (videoEl) {
        // Interpret autoPlay as: play when marker found
        if (${autoPlay ? 'true' : 'false'}) {
          // try unmute then play
          try { videoEl.muted = false; } catch {}
          const p = videoEl.play();
          if (p && typeof p.catch === 'function') {
            p.catch(e => {
              console.warn('Video play on marker found failed (user gesture may be required). Keeping paused.', e);
            });
          }
        }
      }
    });
    
    targetEl.addEventListener('targetLost', () => {
      console.log('AR marker lost');
      markerFoundIndicator.style.display = 'none';
      // Pause (and optionally reset) when marker lost to avoid background audio
      if (videoEl) {
        try { videoEl.pause(); } catch {}
        try { videoEl.currentTime = 0; } catch {}
        // keep muted until next detection
        videoEl.muted = true;
      }
    });
    
    // Live calibration updates via postMessage
    window.addEventListener('message', (evt) => {
      const data = evt?.data;
      if (!data || data.type !== 'ar-calibration') return;
      const { position, rotation, scale } = data.payload || {};
      const plane = document.getElementById('ar-plane');
      const maskImg = document.getElementById('ar-mask-image');
      try {
        if (plane && scale) { plane.setAttribute('width', String(scale.width)); plane.setAttribute('height', String(scale.height)); }
        if (plane && position) { plane.setAttribute('position', String(position.x)+' '+String(position.y)+' '+String(position.z)); }
        if (plane && rotation) { plane.setAttribute('rotation', String(rotation.x)+' '+String(rotation.y)+' '+String(rotation.z)); }
        if (maskImg && scale) { maskImg.setAttribute('width', String(scale.width)); maskImg.setAttribute('height', String(scale.height)); }
        if (maskImg && position) { var z = (position.z||0)+0.002; maskImg.setAttribute('position', String(position.x)+' '+String(position.y)+' '+String(z)); }
        if (maskImg && rotation) { maskImg.setAttribute('rotation', String(rotation.x)+' '+String(rotation.y)+' '+String(rotation.z)); }
      } catch (e) { console.warn('Live calibration update failed', e); }
    });

    // Request camera permission on iOS
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            console.log('Device orientation permission granted');
          }
        })
        .catch(console.error);
    }
  </script>
</body>
</html>`;

  await fs.writeFile(outputPath, html, 'utf-8');
  console.log(`[AR Viewer] Generated viewer at ${outputPath}`);
}

/**
 * Генерирует QR-код для AR проекта
 */
export async function generateQRCode(url: string, outputPath: string): Promise<string> {
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
    
    console.log(`[QR Code] Generated QR code at ${outputPath}`);
    return outputPath;
  } catch (error: any) {
    console.error('[QR Code] Failed to generate QR code:', error);
    throw error;
  }
}

/**
 * Полный workflow компиляции AR проекта
 */
export async function compileARProject(arProjectId: string): Promise<void> {
  console.log(`[AR Compiler] Starting compilation for project ${arProjectId}`);
  
  const startTime = Date.now();
  const MAX_COMPILATION_TIME_MS = 240_000; // 240 seconds (4 minutes) maximum - increased from 150s
  
  // Watchdog timer: abort if compilation exceeds max time
  const watchdogTimer = setTimeout(async () => {
    console.error(`[AR Compiler] ⏱️ Compilation timeout (${MAX_COMPILATION_TIME_MS}ms) for ${arProjectId}`);
    try {
      await db.update(arProjects).set({
        status: 'error',
        errorMessage: 'Compilation timeout exceeded 4 minutes. Please use a shorter video (max 30 seconds) or smaller file size (max 50MB).',
        compilationFinishedAt: new Date(),
        updatedAt: new Date(),
      } as any).where(eq(arProjects.id, arProjectId));
    } catch {}
  }, MAX_COMPILATION_TIME_MS);
  
  try {
    // Получить проект из БД
    const [project] = await db
      .select()
      .from(arProjects)
      .where(eq(arProjects.id, arProjectId))
      .limit(1) as ARProject[];
    
    if (!project) {
      clearTimeout(watchdogTimer);
      throw new Error(`AR project ${arProjectId} not found`);
    }
    
    // Обновить статус на "processing"
    await db
      .update(arProjects)
      .set({
        status: 'processing',
        compilationStartedAt: new Date(),
      } as any)
      .where(eq(arProjects.id, arProjectId));
    
    // Пути файлов (process.cwd() уже указывает на backend/)
    const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', arProjectId);
    await fs.mkdir(storageDir, { recursive: true });

    // Check for multi-item project (новая архитектура: несколько живых фото)
    const { arProjectItems } = await import('@shared/schema');
    const items = await db.select().from(arProjectItems).where(eq(arProjectItems.projectId, arProjectId));
    
    if (items.length > 0) {
      // Multi-item compilation path
      console.log(`[AR Compiler] Multi-item project detected: ${items.length} items`);
      await compileMultiItemProject(arProjectId, items, storageDir, watchdogTimer);
      return;
    }

    // Legacy single-photo path (backwards compatibility)
    console.log(`[AR Compiler] Legacy single-photo project`);
    await compileSinglePhotoProject(arProjectId, project, storageDir, watchdogTimer);
  } catch (error: any) {
    clearTimeout(watchdogTimer);
    console.error(`[AR Compiler] ❌ Failed to compile project ${arProjectId}:`, error);
    await db.update(arProjects).set({
      status: 'error',
      errorMessage: error.message,
      compilationFinishedAt: new Date(),
      updatedAt: new Date(),
    } as any).where(eq(arProjects.id, arProjectId));
    throw error;
  }
}

/**
 * Compile multi-item project (multiple живые фото in one project)
 * Each item gets its own .mind file; viewer supports multiple targets.
 */
async function compileMultiItemProject(arProjectId: string, items: any[], storageDir: string, watchdogTimer: NodeJS.Timeout) {
  const startTime = Date.now();
  console.log(`[AR Compiler Multi] Starting compilation for ${items.length} items`);

  try {
    // Sort items by targetIndex
    const sortedItems = items.sort((a, b) => a.targetIndex - b.targetIndex);

    // Compile each item's marker
    for (const item of sortedItems) {
      console.log(`[AR Compiler Multi] Compiling item ${item.name} (targetIndex ${item.targetIndex})`);
      const photoPath = path.join(process.cwd(), item.photoUrl);
      const markerName = `marker-${item.targetIndex}`;
      
      // Compile directly to final destination (no temp folder needed!)
      // This avoids Chrome CDP scandir issues with temp folders
      const mindFinalPath = path.join(storageDir, `${markerName}.mind`);

      const { compileMindFile } = await import('./mind-ar-web-compiler');
      const compileResult = await compileMindFile({
        photoPath,
        outputMindPath: mindFinalPath,
        maxWaitTimeMs: 180_000,
      });

      if (!compileResult.success) {
        throw new Error(`Item ${item.name} marker compilation failed: ${compileResult.error}`);
      }

      console.log(`[AR Compiler Multi] ✅ Item ${item.name} marker compiled (${compileResult.fileSizeBytes} bytes)`);

      // Mark item as compiled
      const { arProjectItems } = await import('@shared/schema');
      await db.update(arProjectItems).set({
        markerCompiled: true,
        updatedAt: new Date() as any,
      } as any).where(eq(arProjectItems.id, item.id));
    }

    // Generate multi-target viewer
    await generateMultiTargetViewer(arProjectId, sortedItems, storageDir);

    // Generate QR code
    const viewUrl = `${process.env.FRONTEND_URL || 'https://photobooksgallery.am'}/ar/view/${arProjectId}`;
    const qrCodePath = path.join(storageDir, 'qr-code.png');
    await generateQRCode(viewUrl, qrCodePath);

    // Update project status
    await db.update(arProjects).set({
      status: 'ready',
      viewUrl,
      viewerHtmlUrl: `/api/ar/storage/${arProjectId}/index.html`,
      qrCodeUrl: `/api/ar/storage/${arProjectId}/qr-code.png`,
      compilationFinishedAt: new Date(),
      compilationTimeMs: Date.now() - startTime,
      updatedAt: new Date(),
    } as any).where(eq(arProjects.id, arProjectId));

    clearTimeout(watchdogTimer);
    console.log(`[AR Compiler Multi] ✅ Multi-item project ${arProjectId} compiled successfully (${items.length} targets)`);
  } catch (error: any) {
    clearTimeout(watchdogTimer);
    console.error(`[AR Compiler Multi] ❌ Multi-item compilation failed:`, error);
    await db.update(arProjects).set({
      status: 'error',
      errorMessage: `Multi-item compilation error: ${error.message}`,
      compilationFinishedAt: new Date(),
      updatedAt: new Date(),
    } as any).where(eq(arProjects.id, arProjectId));
    throw error;
  }
}

/**
 * Compile legacy single-photo project (existing logic moved here)
 */
async function compileSinglePhotoProject(arProjectId: string, project: any, storageDir: string, watchdogTimer: NodeJS.Timeout) {
  const startTime = Date.now();
  try {
    
    const photoPath = path.join(process.cwd(), project.photoUrl);
    const videoPath = path.join(process.cwd(), project.videoUrl);
    
    // Подготовить маску (если уже задана в проекте)
    let maskFileName: string | undefined;
    if ((project as any).maskUrl) {
      try {
        const maskSrcAbs = path.join(process.cwd(), (project as any).maskUrl as string);
        const maskExt = path.extname(maskSrcAbs) || '.png';
        maskFileName = `mask${maskExt}`;
        const maskDestPath = path.join(storageDir, maskFileName);
        await fs.copyFile(maskSrcAbs, maskDestPath);
      } catch (e) {
        console.warn('[AR Compiler] Failed to copy mask file, continue without mask:', (e as any)?.message);
        maskFileName = undefined;
      }
    }
    
    // Извлечь метаданные фото/видео и вычислить масштаб
    let photoWidth: number | undefined;
    let photoHeight: number | undefined;
    let videoWidth: number | undefined;
    let videoHeight: number | undefined;
    let videoDurationMs: number | undefined;
    let photoAspectRatio: number | undefined;
    let videoAspectRatio: number | undefined;
    let scaleWidth: number | undefined;
    let scaleHeight: number | undefined;
    
    // Определяем режим fit из config (по умолчанию contain для быстроты и надёжности)
    const fitMode = ((project.config as any)?.fitMode || (project as any).fitMode || 'contain') as string;
    console.log(`[AR Compiler] Using fitMode: ${fitMode}`);
    
    try {
      const meta = await extractMediaMetadata(photoPath, videoPath);
      photoWidth = meta.photo.width;
      photoHeight = meta.photo.height;
      videoWidth = meta.video.width;
      videoHeight = meta.video.height;
      videoDurationMs = meta.video.durationMs;
      photoAspectRatio = meta.photo.aspectRatio;
      videoAspectRatio = meta.video.aspectRatio;

      // Обработка видео в зависимости от режима
      let finalVideoPath = videoPath;
      
      if (fitMode === 'cover') {
        // Проверяем aspect ratios - если они уже близки, skip cover обработку
        const aspectRatioDiff = Math.abs(meta.photo.aspectRatio - meta.video.aspectRatio);
        
        if (aspectRatioDiff < 0.05) {
          // Пропорции уже близки (разница <5%) — skip cover обработку
          console.log(`[AR Compiler] Skipping cover processing: aspect ratios already close (diff: ${aspectRatioDiff.toFixed(3)})`);
        } else {
          console.log('[AR Compiler] Processing video in COVER mode (crop to match photo aspect ratio)...');
          const { processCoverModeVideo } = await import('./media-metadata');
          const processedVideoPath = path.join(storageDir, 'video-processed.mp4');
          
          try {
            await processCoverModeVideo(videoPath, processedVideoPath, meta.photo.aspectRatio);
            finalVideoPath = processedVideoPath;
            console.log('[AR Compiler] ✓ Video processed for cover mode');
            
            // После обработки обновляем метаданные видео
            const { extractVideoMetadata } = await import('./media-metadata');
            const processedMeta = await extractVideoMetadata(processedVideoPath);
            videoWidth = processedMeta.width;
            videoHeight = processedMeta.height;
            videoAspectRatio = processedMeta.aspectRatio;
          } catch (coverErr: any) {
            console.warn('[AR Compiler] Cover mode processing failed, fallback to original video:', coverErr?.message);
            // Update progress: cover timeout/failure, using original
            try {
              await db.update(arProjects).set({
                updatedAt: new Date() as any,
                config: {
                  ...(project.config as any || {}),
                  progressPhase: 'video-cover-fallback',
                  coverError: coverErr?.message
                } as any,
              } as any).where(eq(arProjects.id, arProjectId));
            } catch {}
            // Продолжаем с оригинальным видео в contain режиме
            finalVideoPath = videoPath; // Явно используем оригинал
          }
        }
      }
      
      // Копируем финальное видео в storage
      const videoFileName = 'video.mp4';
      const videoDestPath = path.join(storageDir, videoFileName);
      await fs.copyFile(finalVideoPath, videoDestPath);

      // Heartbeat progress after media prepared
      try {
        await db.update(arProjects).set({
          updatedAt: new Date() as any,
          config: {
            ...(project.config as any || {}),
            progressPhase: 'media-prepared'
          } as any,
        } as any).where(eq(arProjects.id, arProjectId));
        console.log(`[AR Compiler] Progress: media-prepared for ${arProjectId}`);
      } catch (err) {
        console.warn('[AR Compiler] Failed to set progressPhase media-prepared:', (err as any)?.message);
      }

      // Вычисляем масштаб для viewer (для cover пропорции совпадают, для contain — вписываем)
      if (fitMode === 'cover') {
        // В cover режиме видео заполняет всю плоскость
        const planeWidth = 1;
        const planeHeight = meta.photo.height / meta.photo.width;
        scaleWidth = planeWidth;
        scaleHeight = planeHeight;
      } else {
        // Contain режим
        const scale = computeVideoScaleForPhoto(meta.photo, { 
          width: videoWidth, 
          height: videoHeight, 
          aspectRatio: videoAspectRatio!, 
          durationMs: videoDurationMs 
        });
        scaleWidth = scale.videoScaleWidth;
        scaleHeight = scale.videoScaleHeight;
      }
    } catch (e: any) {
      console.warn('[AR Compiler] Failed to extract media metadata, will fallback to defaults:', e?.message);
      // Если не удалось извлечь метаданные, просто копируем видео
      const videoFileName = 'video.mp4';
      const videoDestPath = path.join(storageDir, videoFileName);
      await fs.copyFile(videoPath, videoDestPath);
      
      // Progress heartbeat даже при fallback
      try {
        await db.update(arProjects).set({
          updatedAt: new Date() as any,
          config: {
            ...(project.config as any || {}),
            progressPhase: 'media-prepared-fallback'
          } as any,
        } as any).where(eq(arProjects.id, arProjectId));
        console.log(`[AR Compiler] ✓ Progress: media-prepared-fallback for ${arProjectId}`);
      } catch (err) {
        console.warn('[AR Compiler] Failed to set progressPhase media-prepared-fallback:', (err as any)?.message);
      }
    }

    // Компилировать .mind файл через MindAR web compiler (единственный нужный метод)
    const markerName = 'marker';
    console.log(`[AR Compiler] Starting .mind compilation via MindAR web compiler...`);
    
    // Progress: starting marker compilation
    try {
      await db.update(arProjects).set({
        updatedAt: new Date() as any,
        config: {
          ...(project.config as any || {}),
          progressPhase: 'marker-compiling'
        } as any,
      } as any).where(eq(arProjects.id, arProjectId));
    } catch {}
    
    const mindPath = path.join(storageDir, `${markerName}.mind`);
    const { compileMindFile } = await import('./mind-ar-web-compiler');
    
    const startCompileTime = Date.now();
    const compileResult = await compileMindFile({
      photoPath,
      outputMindPath: mindPath,
      maxWaitTimeMs: 180_000, // 3 minutes max for complex images
    });
    
    if (!compileResult.success) {
      throw new Error(`MindAR compilation failed: ${compileResult.error || 'Unknown error'}`);
    }
    
    const compilationTimeMs = Date.now() - startCompileTime;
    console.log(`[AR Compiler] ✅ .mind file compiled in ${compilationTimeMs}ms (${compileResult.fileSizeBytes} bytes)`);
    
    // Progress after marker compilation
    try {
      await db.update(arProjects).set({
        updatedAt: new Date() as any,
        config: {
          ...(project.config as any || {}),
          progressPhase: 'marker-compiled'
        } as any,
      } as any).where(eq(arProjects.id, arProjectId));
      console.log(`[AR Compiler] Progress: marker-compiled for ${arProjectId}`);
    } catch (err) {
      console.warn('[AR Compiler] Failed to set progressPhase marker-compiled:', (err as any)?.message);
    }

    // Генерировать HTML viewer
    const viewerHtmlPath = path.join(storageDir, 'index.html');
    await generateARViewer(
      {
        arId: arProjectId,
        markerBaseName: markerName,
        videoFileName: 'video.mp4',
        maskFileName,
        videoPosition: project.config?.videoPosition,
        videoRotation: project.config?.videoRotation,
        videoScale: project.config?.videoScale || (scaleWidth && scaleHeight ? { width: Number(scaleWidth), height: Number(scaleHeight) } : undefined),
        autoPlay: project.config?.autoPlay ?? true,
        loop: project.config?.loop ?? true,
      },
      viewerHtmlPath
    );

    // Progress after viewer generated
    try {
      await db.update(arProjects).set({
        updatedAt: new Date() as any,
        config: {
          ...(project.config as any || {}),
          progressPhase: 'viewer-generated'
        } as any,
      } as any).where(eq(arProjects.id, arProjectId));
      console.log(`[AR Compiler] Progress: viewer-generated for ${arProjectId}`);
    } catch (err) {
      console.warn('[AR Compiler] Failed to set progressPhase viewer-generated:', (err as any)?.message);
    }
    
    // Генерировать QR-код
  const viewUrl = `${process.env.FRONTEND_URL || 'https://photobooksgallery.am'}/ar/view/${arProjectId}`;
  const qrCodePath = path.join(storageDir, 'qr-code.png');
    await generateQRCode(viewUrl, qrCodePath);

    // Progress after QR generated
    try {
      await db.update(arProjects).set({
        updatedAt: new Date() as any,
        config: {
          ...(project.config as any || {}),
          progressPhase: 'qr-generated'
        } as any,
      } as any).where(eq(arProjects.id, arProjectId));
      console.log(`[AR Compiler] Progress: qr-generated for ${arProjectId}`);
    } catch (err) {
      console.warn('[AR Compiler] Failed to set progressPhase qr-generated:', (err as any)?.message);
    }
    
    // Обновить проект в БД
    await db
      .update(arProjects)
      .set({
        status: 'ready',
        markerFsetUrl: null as any, // Only .mind file needed, no .fset
        markerFset3Url: null as any,
        markerIsetUrl: null as any,
        viewUrl: viewUrl,
  viewerHtmlUrl: `/api/ar/storage/${arProjectId}/index.html`,
  qrCodeUrl: `/api/ar/storage/${arProjectId}/qr-code.png`,
        markerQuality: null, // MindAR web compiler doesn't provide quality metrics
        keyPointsCount: null,
        compilationFinishedAt: new Date(),
        compilationTimeMs: compilationTimeMs ?? null,
        // Persist media metadata and computed scales
        photoWidth: photoWidth as any,
        photoHeight: photoHeight as any,
        videoWidth: videoWidth as any,
        videoHeight: videoHeight as any,
        videoDurationMs: videoDurationMs as any,
        photoAspectRatio: photoAspectRatio != null ? String(photoAspectRatio) : (null as any),
        videoAspectRatio: videoAspectRatio != null ? String(videoAspectRatio) : (null as any),
        fitMode: fitMode as any,
        scaleWidth: scaleWidth != null ? String(scaleWidth) : (null as any),
        scaleHeight: scaleHeight != null ? String(scaleHeight) : (null as any),
        updatedAt: new Date(),
      } as any)
      .where(eq(arProjects.id, arProjectId));
    
    clearTimeout(watchdogTimer); // Clear watchdog on success
    console.log(`[AR Compiler] ✅ Project ${arProjectId} compiled successfully in ${Date.now() - startTime}ms`);
    
    // Отправить email уведомление
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, project.userId))
        .limit(1);
      
      if (user?.email) {
        await sendARReadyEmail({
          userEmail: user.email,
          userName: user.firstName || 'Пользователь',
          arId: arProjectId,
          viewUrl: viewUrl,
          qrCodePath: qrCodePath,
          markerQuality: undefined, // MindAR web compiler doesn't provide quality metrics
          keyPointsCount: undefined,
        });
        
        // Обновить флаг отправки уведомления
        await db
          .update(arProjects)
          .set({
            notificationSent: true,
            notificationSentAt: new Date(),
          } as any)
          .where(eq(arProjects.id, arProjectId));
        
        console.log(`[AR Compiler] 📧 Email notification sent to ${user.email}`);
      }
    } catch (emailError) {
      console.error(`[AR Compiler] ⚠️ Failed to send email notification:`, emailError);
      // Не прерываем выполнение если email не отправился
    }
  } catch (error: any) {
    clearTimeout(watchdogTimer); // Clear watchdog on error
    console.error(`[AR Compiler] ❌ Failed to compile project ${arProjectId} after ${Date.now() - startTime}ms:`, error);
    
    // Обновить статус на "error"
    await db
      .update(arProjects)
      .set({
        status: 'error',
        errorMessage: error.message,
        compilationFinishedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(arProjects.id, arProjectId));
    
    throw error;
  }
}
