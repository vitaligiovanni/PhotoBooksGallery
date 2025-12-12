import * as fsExtra from 'fs-extra';
import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import { db } from '../db';
import { arProjects, users, type ARProject } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendARReadyEmail } from './email-service';
import { extractMediaMetadata, computeVideoScaleForPhoto } from './media-metadata';
// REMOVED: OpenCV enhancer (too hard to install on Windows)
// import { enhanceMarkerPhoto, saveQualityMetrics } from './opencv-enhancer/enhancer';
// NEW: Simple border enhancer using Sharp (already installed!)
import { enhanceMarkerPhotoSimple } from './border-enhancer';
import sharp from 'sharp';

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

/**
 * Aggressively resize photo if larger than maxDimension
 * CRITICAL for performance: 5000x5000 → 1920x1920 reduces compilation time by 3-5x
 */
async function resizePhotoIfNeeded(photoPath: string, outputDir: string, maxDimension: number = 1920): Promise<string> {
  try {
    const metadata = await sharp(photoPath).metadata();
    const { width, height } = metadata;
    
    if (!width || !height) {
      console.warn('[AR Compiler] Could not read photo dimensions, using original');
      return photoPath;
    }
    
    if (width <= maxDimension && height <= maxDimension) {
      console.log(`[AR Compiler] Photo ${width}x${height}px already optimal (≤${maxDimension}px)`);
      return photoPath;
    }
    
    console.log(`[AR Compiler] 📐 Resizing large photo ${width}x${height}px → max ${maxDimension}px for 3-5x faster compilation...`);
    
    const resizedPath = path.join(outputDir, 'photo-resized.jpg');
    await sharp(photoPath)
      .resize(maxDimension, maxDimension, {
        fit: 'inside', // Preserve aspect ratio
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 }) // High quality for AR tracking
      .toFile(resizedPath);
    
    const resizedMeta = await sharp(resizedPath).metadata();
    console.log(`[AR Compiler] ✅ Resized to ${resizedMeta.width}x${resizedMeta.height}px (compilation will be much faster!)`);
    
    return resizedPath;
  } catch (error: any) {
    console.warn('[AR Compiler] Resize failed, using original photo:', error.message);
    return photoPath;
  }
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
  fitMode?: string; // 'contain' | 'cover' | 'fill' | 'exact'
  videoAspectRatio?: number;
  planeAspectRatio?: number;
  zoom?: number; // Ручной зум поверх автоматической обрезки (0.5-2.0)
  offsetX?: number; // Смещение по X (–0.5 до +0.5)
  offsetY?: number; // Смещение по Y (–0.5 до +0.5)
  aspectLocked?: boolean; // Блокировка пропорций (по умолчанию true)
}

/**
 * DEPRECATED: NFT CLI больше не используется.
 * Теперь используется только MindAR web compiler (https://hiukim.github.io/mind-ar-js-doc/tools/compile/)
 * который генерирует .mind файл напрямую, быстро и надёжно.
 * 
 * Эта функция оставлена для обратной совместимости, но не вызывается.
 */

// REMOVED: Old OpenCV enhancer (replaced by simple border-enhancer.ts using Sharp)

/**
 * Generate multi-target viewer (multiple живые фото)
 */
async function generateMultiTargetViewer(
  arProjectId: string, 
  items: any[], 
  storageDir: string, 
  metadata?: { photoWidth?: number; photoHeight?: number; photoAspectRatio?: number }
): Promise<void> {
  // MindAR "imageTargetSrc" expects a SINGLE .mind file containing multiple targets
  // The compileMultiItemProject() function now generates targets.mind with all markers combined
  const markerFiles = `./targets.mind`;
  
  // Get photo aspect ratio from metadata (or calculate from dimensions)
  const photoAR = metadata?.photoAspectRatio 
    ? metadata.photoAspectRatio
    : (metadata?.photoWidth && metadata?.photoHeight 
        ? metadata.photoWidth / metadata.photoHeight 
        : 0.75); // Fallback for old projects
  
  console.log(`[Multi Viewer] Photo AR: ${photoAR.toFixed(3)} (will use for plane scale)`);
  
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
        inline="true"
        x-webkit-airplay="allow"
        crossorigin="anonymous"
        muted
      ></video>
      ${maskFileName ? `<img id="ar-mask-${idx}" src="./${maskFileName}" crossorigin="anonymous" />` : ''}
  `).join('');

  const entitiesHtml = videoAssets.map(({ videoFileName, maskFileName, item, idx }) => {
    const config = item.config || {};
    const pos = config.videoPosition || { x: 0, y: 0, z: 0 };
    const rot = config.videoRotation || { x: 0, y: 0, z: 0 };
    
    // CRITICAL: Use photo aspect ratio for scale (video has been resized to match photo)
    const scale = config.videoScale || { width: 1.0, height: 1.0 / photoAR };
    const autoPlay = config.autoPlay !== false;
    
    console.log(`[Multi Viewer] Item ${idx}: scale=${scale.width}×${scale.height.toFixed(3)}`);

    // If mask exists, apply alphaMap directly to the video material
    const material = maskFileName
      ? `material="src:#ar-video-${idx}; alphaMap:#ar-mask-${idx}; shader:standard; roughness:1; metalness:0; transparent:true; opacity:0"`
      : `material="transparent: true; opacity: 0"`;

    return `
    <a-entity mindar-image-target="targetIndex: ${idx}">
      <a-plane
        id="ar-plane-${idx}"
        position="${pos.x} ${pos.y} ${pos.z}"
        rotation="${rot.x} ${rot.y} ${rot.z}"
        width="${scale.width}"
        height="${scale.height}"
        ${material}
        visible="false"
        class="clickable"
        data-auto-play="${autoPlay}"
        animation__fadein="property: material.opacity; from: 0; to: 1; dur: 300; easing: easeInOutQuad; startEvents: video-ready-${idx}"
      ></a-plane>
      <a-video id="ar-video-el-${idx}" src="#ar-video-${idx}" autoplay muted playsinline style="display:none"></a-video>
    </a-entity>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <meta name="mobile-web-app-capable" content="yes">
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
    mindar-image="imageTargetSrc: ${markerFiles}; physicalWidth: 100; filterMinCF:0.0001; filterBeta: 0.003; warmupTolerance: 5; missTolerance: 10"
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
    const loadingOverlay = document.getElementById('loading-overlay');
    const markerFoundIndicator = document.getElementById('marker-found');
    const videos = [${videoAssets.map((_, idx) => `document.getElementById('ar-video-${idx}')`).join(',')}];
    
    // Apply THREE.js alphaMap to planes with masks
    function applyAlphaMasks() {
      ${videoAssets.filter(({ maskFileName }) => maskFileName).map(({ idx }) => `
      const plane${idx} = document.getElementById('ar-plane-${idx}');
      const maskImg${idx} = document.getElementById('ar-mask-${idx}');
      if (plane${idx} && maskImg${idx} && maskImg${idx}.complete) {
        try {
          const mesh${idx} = plane${idx}.getObject3D('mesh');
          if (mesh${idx} && mesh${idx}.material) {
            const texture${idx} = new THREE.Texture(maskImg${idx});
            texture${idx}.needsUpdate = true;
            mesh${idx}.material.alphaMap = texture${idx};
            mesh${idx}.material.transparent = true;
            mesh${idx}.material.needsUpdate = true;
            console.log('[AR Mask] Applied alphaMap to plane ${idx}');
          }
        } catch (e) {
          console.warn('[AR Mask] Failed to apply alphaMap to plane ${idx}:', e);
        }
      }`).join('')}
    }
    
    // Apply masks after scene loads
    sceneEl.addEventListener('loaded', () => {
      setTimeout(applyAlphaMasks, 100);
    });
    
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
            // Unmute
            try { 
              vid.muted = false; 
            } catch {}
            
            // Задержка для инициализации WebGL текстуры (критично для Android)
            setTimeout(() => {
              // Принудительно обновляем материал ПЕРЕД воспроизведением
              const planeEl = document.getElementById('ar-plane-${idx}');
              if (planeEl && planeEl.components.material) {
                const mat = planeEl.components.material.material;
                if (mat) {
                  mat.needsUpdate = true;
                  if (mat.map) mat.map.needsUpdate = true;
                }
              }
              
              // Теперь пытаемся воспроизвести
              vid.play().then(() => {
                console.log('Video ${idx} playing');
                // Дополнительное обновление через 100ms для медленных GPU
                setTimeout(() => {
                  if (planeEl && planeEl.components.material) {
                    const mat = planeEl.components.material.material;
                    if (mat && mat.map) {
                      mat.map.needsUpdate = true;
                    }
                  }
                }, 100);

                // COVER: динамически подгоняем плоскость под пропорции видео, чтобы заполнить маркер
                try {
                  const mesh = planeEl.getObject3D('mesh');
                  const vRatio = vid.videoWidth && vid.videoHeight ? (vid.videoWidth / vid.videoHeight) : null;
                  const pWidth = parseFloat(planeEl.getAttribute('width')) || 1;
                  const pHeight = parseFloat(planeEl.getAttribute('height')) || 1;
                  const pRatio = pWidth / pHeight;
                  if (mesh && vRatio && pRatio) {
                    let scaleX = 1, scaleY = 1;
                    if (vRatio > pRatio) {
                      // Видео шире → растягиваем по вертикали
                      scaleY = vRatio / pRatio;
                      console.log('[Multi Cover] video wider; scaleY=', scaleY.toFixed(3));
                    } else if (vRatio < pRatio) {
                      // Видео выше → растягиваем по горизонтали
                      scaleX = pRatio / vRatio;
                      console.log('[Multi Cover] video taller; scaleX=', scaleX.toFixed(3));
                    }
                    mesh.scale.set(scaleX, scaleY, 1);
                    console.log('[Multi Cover] applied scale:', scaleX.toFixed(3), 'x', scaleY.toFixed(3));
                  }
                } catch (scaleErr) {
                  console.warn('[Multi Cover] scale apply failed:', scaleErr);
                }
                
                // ПРОФЕССИОНАЛЬНЫЙ FADE-IN: запускаем через 50ms когда первый кадр загружен
                setTimeout(() => {
                  if (planeEl) {
                    planeEl.setAttribute('visible', 'true');
                    console.log('Plane ${idx} set to visible');
                    planeEl.emit('video-ready-${idx}');
                    console.log('Fade-in animation started for video ${idx}');
                  }
                }, 50);
              }).catch(e => {
                console.warn('Play failed for video ${idx}, retrying muted:', e);
                try { 
                  vid.muted = true; 
                  vid.play().then(() => {
                    // Fade-in даже для muted видео
                    setTimeout(() => {
                      if (planeEl) {
                        planeEl.setAttribute('visible', 'true');
                        planeEl.emit('video-ready-${idx}');
                      }
                    }, 50);
                  });
                } catch {}
              });
            }, 400);
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
      console.log('Applying calibration for target ' + targetIndex + ': ' + JSON.stringify(data.payload));
      try {
        if (plane && scale) { 
          plane.setAttribute('width', String(scale.width)); 
          plane.setAttribute('height', String(scale.height)); 
          console.log('Target ' + targetIndex + ' scale: ' + scale.width + 'x' + scale.height);
        }
        if (plane && position) { 
          plane.setAttribute('position', String(position.x)+' '+String(position.y)+' '+String(position.z)); 
          console.log('Target ' + targetIndex + ' position: ' + position.x + ',' + position.y + ',' + position.z);
        }
        if (plane && rotation) { 
          plane.setAttribute('rotation', String(rotation.x)+' '+String(rotation.y)+' '+String(rotation.z)); 
          console.log('Target ' + targetIndex + ' rotation: ' + rotation.x + ',' + rotation.y + ',' + rotation.z);
        }
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
/**
 * Professional AR solution: Create cropped marker for MindAR compilation.
 * 
 * Process:
 * 1. Enhanced photo (with border) gives 2000–3000+ feature points during .mind creation
 * 2. We crop the border AFTER enhancement but BEFORE compilation
 * 3. MindAR searches for the center region (original photo without border)
 * 4. User prints clean original photo → perfect match + stable tracking
 * 
 * This is the standard approach used by Zappar, 8th Wall, and premium AR projects.
 */
async function createCroppedMindMarker(
  enhancedPath: string,
  storageDir: string
): Promise<string> {
  const { createCanvas, loadImage } = await import('canvas');
  const fs = await import('fs/promises');

  console.log('[AR Compiler] 🔪 Cropping border from enhanced photo for MindAR...');
  
  const img = await loadImage(enhancedPath);
  const borderPercent = 0.13; // Current border thickness ~13%
  
  // Calculate exact border pixels
  const borderPx = Math.round(img.width * borderPercent / (1 + 2 * borderPercent));
  
  const croppedWidth = img.width - 2 * borderPx;
  const croppedHeight = img.height - 2 * borderPx;
  
  const canvas = createCanvas(croppedWidth, croppedHeight);
  const ctx = canvas.getContext('2d');

  // Extract center region (original photo without border)
  ctx.drawImage(
    img as any,
    borderPx, borderPx, croppedWidth, croppedHeight,  // source region
    0, 0, croppedWidth, croppedHeight                 // destination
  );

  const croppedPath = path.join(storageDir, 'marker-for-mind.jpg');
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  await fs.writeFile(croppedPath, buffer);

  console.log(`[AR Compiler] ✅ Cropped marker: ${croppedWidth}x${croppedHeight} (border removed: ${borderPx}px each side)`);
  console.log('[AR Compiler] 📋 Result: User prints clean photo, MindAR gets high feature count!');
  
  return croppedPath;
}

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
    videoScale = { width: 1, height: 1.333 }, // ✅ Default for portrait (will be overridden)
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

  // Вычисляем правильный масштаб если плaneAspectRatio известен и videoScale не передан
  let finalVideoScale = videoScale;
  if (planeAspectRatio && (!videoScale || (videoScale.width === 1 && videoScale.height === 1))) {
    // Масштабируем width=1.0, а height вычисляем из плaneAspectRatio
    // Если плаза 3:4 (0.75), то height будет 1.333
    finalVideoScale = {
      width: 1.0,
      height: 1.0 / planeAspectRatio
    };
    console.log(`[generateARViewer] ✅ Computed videoScale from planeAspectRatio: ${finalVideoScale.width}×${finalVideoScale.height.toFixed(3)}`);
  } else {
    console.log(`[generateARViewer] planeAspectRatio=${planeAspectRatio}, videoScale=${JSON.stringify(videoScale)}`);
    if (!planeAspectRatio) {
      console.warn(`[generateARViewer] ⚠️ planeAspectRatio is undefined! Using default videoScale`);
    }
  }

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
<a-assets timeout="30000">
<video id="vid" src="./${videoFileName}?t=${Date.now()}" preload="auto" ${loop ? 'loop' : ''} muted playsinline crossorigin="anonymous"></video>
${maskFileName ? `<img id="mask" src="./${maskFileName}?t=${Date.now()}" crossorigin="anonymous">` : ''}
</a-assets>
<a-camera position="0 0 0" look-controls="enabled:false" cursor="rayOrigin:mouse"></a-camera>
<a-entity mindar-image-target="targetIndex:0"><a-plane id="plane" rotation="${videoRotation.x} ${videoRotation.y} ${videoRotation.z}" width="${finalVideoScale.width}" height="${finalVideoScale.height}" position="${videoPosition.x} ${videoPosition.y} ${videoPosition.z}" material="src:#vid;shader:flat;transparent:true;opacity:0;side:double${maskFileName ? ';alphaMap:#mask' : ''}" visible="false" animation__fade="property:material.opacity;from:0;to:1;dur:500;startEvents:showvid;easing:easeInOutQuad"></a-plane></a-entity>
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
${maskFileName ? `
const maskImg = document.getElementById('mask');
const planeEl = document.getElementById('plane');
if (maskImg && planeEl) {
  console.log('[AR] Mask element found, waiting for load...');
  let maskApplied = false;
  
  function applyMask() {
    if (maskApplied) return;
    const mesh = planeEl.getObject3D('mesh');
    if (mesh && mesh.material && maskImg.complete) {
      console.log('[AR] 🎭 Applying alphaMap to material...');
      const texture = new THREE.Texture(maskImg);
      texture.needsUpdate = true;
      mesh.material.alphaMap = texture;
      mesh.material.transparent = true;
      mesh.material.side = THREE.DoubleSide;
      mesh.material.needsUpdate = true;
      maskApplied = true;
      console.log('[AR] ✅ AlphaMap applied successfully! Video should be masked.');
      setTimeout(()=>{applyTextureTransform();console.log('[AR] 🔄 Initial texture transform applied to sync mask')},50);
    }
  }
  
  maskImg.addEventListener('load', () => {
    console.log('[AR] ✅ Mask image loaded');
    applyMask();
  });
  
  planeEl.addEventListener('loaded', () => {
    console.log('[AR] ✅ Plane loaded');
    setTimeout(applyMask, 100); // Small delay to ensure mesh is ready
  });
  
  maskImg.addEventListener('error', (e) => console.error('[AR] ❌ Mask failed to load:', maskImg.src, e));
  
  // Retry application after video starts playing
  video.addEventListener('playing', () => {
    if (!maskApplied) {
      console.log('[AR] Video playing, retrying mask application...');
      setTimeout(applyMask, 200);
    }
  });
} else {
  console.error('[AR] ❌ Mask or plane element not found!');
}
` : ''}
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
console.log('[AR] iOS detected:',isIOS);
function check(){console.log('[AR] Check state:',JSON.stringify(r),'markerActive:',markerActive);if(markerActive)return;if(r.v&&r.t&&r.m){markerActive=true;console.log('[AR] 🎬 ALL READY! Playing video...');video.currentTime=0;video.muted=true;const playPromise=video.play();if(playPromise){playPromise.then(()=>{console.log('[AR] ✓ Video playing (muted)');setTimeout(()=>{plane.setAttribute('visible','true');plane.emit('showvid');console.log('[AR] ✓ Plane visible');if(!isIOS){setTimeout(()=>{video.muted=false;console.log('[AR] ✓ Auto-unmuted (Android/Desktop)')},1000)}else{setTimeout(()=>{unmuteHint.style.display='block';console.log('[AR] 📢 Showing unmute hint (iOS)')},500);const handleUnmute=()=>{if(!video.muted)return;video.muted=false;unmuteHint.style.display='none';console.log('[AR] ✓ Unmuted by user tap (iOS)');document.body.removeEventListener('click',handleUnmute);document.body.removeEventListener('touchstart',handleUnmute)};document.body.addEventListener('click',handleUnmute);document.body.addEventListener('touchstart',handleUnmute)}setTimeout(()=>{orderBtn.style.display='block';orderBtn.classList.add('fade-in-up');console.log('[AR] 🛒 Order button shown')},5000)},200)}).catch(e=>{console.error('[AR] ❌ Play failed even muted:',e);loading.innerHTML='<h2>Ошибка видео</h2><p>'+e.message+'</p>'})}else{console.log('[AR] Play promise undefined')}}else{console.log('[AR] ⏳ Waiting for:',!r.v?'video':'',!r.t?'texture':'',!r.m?'marker':'')}}
target.addEventListener('targetLost',()=>{console.log('[AR] Marker lost');markerActive=false;plane.setAttribute('visible','false');plane.setAttribute('material','opacity',0);video.pause();video.currentTime=0;unmuteHint.style.display='none'});
let currentZoom=${zoom},currentOffsetX=${offsetX},currentOffsetY=${offsetY};
const VIDEO_AR=${videoAspectRatio || 'null'};const PLANE_AR=${planeAspectRatio || 'null'};console.log('[AR] Config: ZOOM='+currentZoom+' OFFSET_X='+currentOffsetX+' OFFSET_Y='+currentOffsetY+' VIDEO_AR='+VIDEO_AR+' PLANE_AR='+PLANE_AR);
let coverScaleX=1,coverScaleY=1;
if('${fitMode}'==='cover'&&VIDEO_AR&&PLANE_AR){const vRatio=VIDEO_AR,pRatio=PLANE_AR;if(vRatio>pRatio){coverScaleY=vRatio/pRatio;console.log('[AR] Cover: video wider (AR '+vRatio.toFixed(2)+' > '+pRatio.toFixed(2)+'), scaleY='+coverScaleY.toFixed(2))}else{coverScaleX=pRatio/vRatio;console.log('[AR] Cover: video taller (AR '+vRatio.toFixed(2)+' < '+pRatio.toFixed(2)+'), scaleX='+coverScaleX.toFixed(2))}}
function applyTextureTransform(){const mesh=plane.getObject3D('mesh');if(!mesh||!mesh.material||!mesh.material.map){return}const tex=mesh.material.map;const zX=coverScaleX*currentZoom,zY=coverScaleY*currentZoom;tex.repeat.set(zX,zY);const offX=0.5*(1-zX)+currentOffsetX,offY=0.5*(1-zY)-currentOffsetY;tex.offset.set(offX,offY);tex.needsUpdate=true;if(mesh.material.alphaMap){const alphaTex=mesh.material.alphaMap;alphaTex.repeat.set(zX,zY);alphaTex.offset.set(offX,offY);alphaTex.needsUpdate=true;console.log('[AR] 🎭 AlphaMap transform synced with video texture')}console.log('[AR] Texture transform: repeat=('+zX.toFixed(3)+','+zY.toFixed(3)+') offset=('+offX.toFixed(3)+','+offY.toFixed(3)+')')}
window.addEventListener('message',(e)=>{if(e.data.type==='ar-calibration'){console.log('[AR] 🔄 Live preview update:',e.data.payload);if(typeof e.data.payload.zoom==='number'){currentZoom=e.data.payload.zoom;console.log('[AR] Updated zoom:',currentZoom)}if(typeof e.data.payload.offsetX==='number'){currentOffsetX=e.data.payload.offsetX;console.log('[AR] Updated offsetX:',currentOffsetX)}if(typeof e.data.payload.offsetY==='number'){currentOffsetY=e.data.payload.offsetY;console.log('[AR] Updated offsetY:',currentOffsetY)}if(e.data.payload.position){plane.setAttribute('position',e.data.payload.position.x+' '+e.data.payload.position.y+' '+e.data.payload.position.z);console.log('[AR] Updated position:',e.data.payload.position)}if(e.data.payload.rotation){plane.setAttribute('rotation',e.data.payload.rotation.x+' '+e.data.payload.rotation.y+' '+e.data.payload.rotation.z);console.log('[AR] Updated rotation:',e.data.payload.rotation)}applyTextureTransform()}});
let frameCount=0;function updateLoop(){if(!markerActive||!plane||!plane.object3D){requestAnimationFrame(updateLoop);return}frameCount++;if(frameCount%10===0){applyTextureTransform();if(frameCount===10)console.log('[AR] ✓ Texture transform applied and running')}requestAnimationFrame(updateLoop)}
scene.addEventListener('renderstart',()=>{console.log('[AR] Render started, beginning texture update loop');updateLoop()});
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
  
  // Variables declared here to be accessible in catch block
  let project: ARProject | null = null;
  let itemsFromRawQuery: any[] = [];
  
  try {
    // 🔥 CRITICAL: Use RAW queries with explicit client for GUARANTEED release
    const { pool } = await import('../db');
    
    // Get a client, use it, RELEASE IT EXPLICITLY
    const client = await pool.connect();
    
    try {
      // Get project data
      const projectResult = await client.query(
        'SELECT * FROM ar_projects WHERE id = $1 LIMIT 1',
        [arProjectId]
      );
      
      if (projectResult.rows.length === 0) {
        throw new Error(`AR project ${arProjectId} not found`);
      }
      
      // Convert snake_case (PostgreSQL) to camelCase (TypeScript)
      const rawProject = projectResult.rows[0];
      project = {
        id: rawProject.id,
        userId: rawProject.user_id,
        orderId: rawProject.order_id,
        photoUrl: rawProject.photo_url,
        videoUrl: rawProject.video_url,
        maskUrl: rawProject.mask_url,
        status: rawProject.status,
        config: rawProject.config,
        markerFsetUrl: rawProject.marker_fset_url,
        markerFset3Url: rawProject.marker_fset3_url,
        markerIsetUrl: rawProject.marker_iset_url,
        viewerHtmlUrl: rawProject.viewer_html_url,
        qrCodeUrl: rawProject.qr_code_url,
        quality: rawProject.quality,
        keyPointsCount: rawProject.key_points_count,
        errorMessage: rawProject.error_message,
        createdAt: rawProject.created_at,
        updatedAt: rawProject.updated_at,
        compilationStartedAt: rawProject.compilation_started_at,
        compilationFinishedAt: rawProject.compilation_finished_at,
        externalViewUrl: rawProject.external_view_url,
        isDemo: rawProject.is_demo,
        expiresAt: rawProject.expires_at,
      } as any;
      
      // Get items
      const itemsResult = await client.query(
        'SELECT * FROM ar_project_items WHERE project_id = $1',
        [arProjectId]
      );
      itemsFromRawQuery = itemsResult.rows;
      
      // Update status
      await client.query(
        "UPDATE ar_projects SET status = 'processing', compilation_started_at = NOW(), updated_at = NOW() WHERE id = $1",
        [arProjectId]
      );
      
    } finally {
      // 🔥 CRITICAL: EXPLICITLY release the client back to pool
      client.release();
    }
    
    // Wait for connection to fully return to pool
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('[AR Compiler] 🔓 Client EXPLICITLY released to pool');
    console.log('[AR Compiler] ⚠️ WARNING: TensorFlow will block event loop for 120s (CPU-bound)');
    console.log('[AR Compiler] 💡 Pool has 100 connections to handle concurrent requests during block');
    
    // Пути файлов (process.cwd() уже указывает на backend/)
    const storageDir = path.join(process.cwd(), 'objects', 'ar-storage', arProjectId);
    await fs.mkdir(storageDir, { recursive: true });
    
    // Check if multi-item project (use data from raw query)
    if (itemsFromRawQuery.length > 0) {
      // Multi-item compilation path
      console.log(`[AR Compiler] Multi-item project detected: ${itemsFromRawQuery.length} items`);
      await compileMultiItemProject(arProjectId, itemsFromRawQuery, storageDir, watchdogTimer, pool);
      return;
    }

    // Legacy single-photo path (backwards compatibility)
    if (!project) {
      throw new Error('Project data not loaded');
    }
    console.log(`[AR Compiler] Legacy single-photo project`);
    await compileSinglePhotoProject(arProjectId, project, storageDir, watchdogTimer, pool);
  } catch (error: any) {
    clearTimeout(watchdogTimer);
    console.error(`[AR Compiler] ❌ Failed to compile project ${arProjectId}:`, error);
    
    // Use RAW query to avoid taking another connection from pool
    const { pool } = await import('../db');
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE ar_projects SET status = $1, error_message = $2, compilation_finished_at = $3, updated_at = $4 WHERE id = $5`,
        ['error', error.message, new Date(), new Date(), arProjectId]
      );
    } finally {
      client.release();
    }
    
    throw error;
  }
}

/**
 * Compile multi-item project (multiple живые фото in one project)
 * Each item gets its own .mind file; viewer supports multiple targets.
 */
async function compileMultiItemProject(arProjectId: string, items: any[], storageDir: string, watchdogTimer: NodeJS.Timeout, pool: any) {
  const startTime = Date.now();
  console.log(`[AR Compiler Multi] Starting compilation for ${items.length} items`);

  try {
    // Sort items by targetIndex
    const sortedItems = items.sort((a, b) => a.targetIndex - b.targetIndex);

    // Prepare all photo paths for multi-target compilation
    console.log(`[AR Compiler Multi] 📸 Preparing ${sortedItems.length} photos for multi-target compilation...`);
    const photoPaths: string[] = [];
    
    for (const item of sortedItems) {
      const photoPath = path.join(process.cwd(), item.photoUrl);
      const itemStorageDir = path.join(storageDir, `item-${item.targetIndex}`);
      await fs.mkdir(itemStorageDir, { recursive: true });
      
      // OPTIMIZATION: Resize photo first (3-5x faster)
      const resizedPhotoPath = await resizePhotoIfNeeded(photoPath, itemStorageDir, 1920);
      photoPaths.push(resizedPhotoPath);
      
      console.log(`[AR Compiler Multi] ✓ Item ${item.name} (targetIndex ${item.targetIndex}) prepared`);
    }

    // Compile ALL photos into ONE targets.mind file using ar-compiler-v2
    console.log(`[AR Compiler Multi] 🎯 Compiling ${photoPaths.length} photos into single targets.mind file...`);
    const { compileMultiTargetMindFile } = await import('./ar-compiler-v2');
    const compileResult = await compileMultiTargetMindFile(
      photoPaths,
      storageDir,
      'targets.mind'
    );

    if (!compileResult.success) {
      throw new Error(`Multi-target compilation failed: ${compileResult.error}`);
    }

    console.log(`[AR Compiler Multi] ✅ All ${photoPaths.length} targets compiled into single targets.mind (${(compileResult.fileSize! / 1024).toFixed(1)} KB)`);

    // CRITICAL: Process videos to match photo dimensions (resize/crop)
    console.log(`[AR Compiler Multi] 🎬 Processing videos to match photo dimensions...`);
    const { extractPhotoMetadata } = await import('./media-metadata');
    
    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      if (!item.videoUrl) continue;
      
      const videoSrc = path.join(process.cwd(), item.videoUrl);
      const videoDest = path.join(storageDir, `video-${i}.mp4`);
      
      // Get photo dimensions
      const photoPath = photoPaths[i];
      const photoMeta = await extractPhotoMetadata(photoPath);
      
      console.log(`[AR Compiler Multi] Video ${i}: resizing to ${photoMeta.width}×${photoMeta.height} (photo AR=${photoMeta.aspectRatio.toFixed(3)})`);
      
      // CRITICAL: Resize/crop video to match photo dimensions using ffmpeg
      const { resizeVideoToMatchPhoto, applyZoomOffsetCrop } = await import('./video-processor');
      try {
        await resizeVideoToMatchPhoto(
          videoSrc,
          photoMeta.width,
          photoMeta.height,
          videoDest
        );
        console.log(`[AR Compiler Multi] ✅ Video ${i} processed successfully (match photo)`);
        // Дополнительно применяем ручной zoom/offset, если заданы в конфиге item или проекта
        const itemConfig = item.config || {};
        const projConfig = (project as any)?.config || {};
        const zoom = (itemConfig.zoom ?? projConfig.zoom ?? 1.0);
        const offsetX = (itemConfig.offsetX ?? projConfig.offsetX ?? 0);
        const offsetY = (itemConfig.offsetY ?? projConfig.offsetY ?? 0);
        if (Math.abs(zoom - 1) > 0.01 || Math.abs(offsetX) > 0.0001 || Math.abs(offsetY) > 0.0001) {
          const zoomedPath = path.join(storageDir, `video-${i}-zoomed.mp4`);
          try {
            await applyZoomOffsetCrop(videoDest, photoMeta.width, photoMeta.height, zoom, offsetX, offsetY, zoomedPath);
            await fs.copyFile(zoomedPath, videoDest);
            console.log(`[AR Compiler Multi] ✓ Applied zoom/offset to video ${i} (zoom=${zoom}, off=${offsetX},${offsetY})`);
          } catch (zErr: any) {
            console.warn(`[AR Compiler Multi] Zoom/offset failed for video ${i}, keeping matched video:`, zErr?.message);
          }
        }
      } catch (videoError: any) {
        console.error(`[AR Compiler Multi] ❌ Video processing failed for ${i}:`, videoError.message);
        console.log(`[AR Compiler Multi] Falling back to copy...`);
        await fs.copyFile(videoSrc, videoDest);
      }
    }

    // Generate multi-target viewer WITH metadata from ar-service
    await generateMultiTargetViewer(arProjectId, sortedItems, storageDir, compileResult.metadata);

    // Generate QR code - use env tunnel if provided
    const TUNNEL_URL = (process.env.TUNNEL_URL || '').trim();
    const LOCAL_IP_URL = (process.env.LOCAL_IP_URL || '').trim(); // Локальный WiFi доступ (без ngrok)
    
    if (!TUNNEL_URL && !LOCAL_IP_URL) {
      console.log('[AR Compiler Multi] TUNNEL_URL and LOCAL_IP_URL not set, falling back to FRONTEND_URL / production domain');
    }
    
    // Приоритет: TUNNEL (ngrok HTTPS - нужен для камеры) > LOCAL_IP > FRONTEND_URL (prod)
    const baseUrl1 = TUNNEL_URL || LOCAL_IP_URL || process.env.FRONTEND_URL || 'https://photobooksgallery.am';
    console.log('[AR Compiler Multi] Resolved baseUrl for viewUrl:', baseUrl1);
    
    const viewUrl = `${baseUrl1}/ar/view/${arProjectId}`;
    const qrCodePath = path.join(storageDir, 'qr-code.png');
    await generateQRCode(viewUrl, qrCodePath);
    
    // Генерируем дополнительный QR для ngrok (если LOCAL_IP используется)
    let alternativeViewUrl: string | undefined;
    if (LOCAL_IP_URL && TUNNEL_URL) {
      alternativeViewUrl = `${TUNNEL_URL}/ar/view/${arProjectId}`;
      const qrCodeAltPath = path.join(storageDir, 'qr-code-ngrok.png');
      await generateQRCode(alternativeViewUrl, qrCodeAltPath);
      console.log('[AR Compiler Multi] Generated alternative ngrok QR code');
    }

    // Update project status using RAW query (no new connection from pool)
    // CRITICAL: Also save metadata from ar-service (photoAspectRatio, dimensions, etc.)
    const metadata = compileResult.metadata || {};
    const photoWidth = metadata.photoWidth || null;
    const photoHeight = metadata.photoHeight || null;
    const photoAspectRatio = metadata.photoAspectRatio || (photoWidth && photoHeight ? (photoWidth / photoHeight).toFixed(3) : null);
    
    console.log(`[AR Compiler Multi] Saving metadata: photo ${photoWidth}×${photoHeight}, AR=${photoAspectRatio}`);
    
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE ar_projects SET 
          status = $1, 
          view_url = $2, 
          viewer_html_url = $3, 
          qr_code_url = $4, 
          compilation_finished_at = $5, 
          compilation_time_ms = $6,
          photo_width = $7,
          photo_height = $8,
          photo_aspect_ratio = $9,
          updated_at = $10 
        WHERE id = $11`,
        [
          'ready', 
          viewUrl, 
          `/api/ar/storage/${arProjectId}/index.html`, 
          `/api/ar/storage/${arProjectId}/qr-code.png`, 
          new Date(), 
          Date.now() - startTime,
          photoWidth,
          photoHeight,
          photoAspectRatio,
          new Date(), 
          arProjectId
        ]
      );
    } finally {
      client.release();
    }

    clearTimeout(watchdogTimer);
    console.log(`[AR Compiler Multi] ✅ Multi-item project ${arProjectId} compiled successfully (${items.length} targets)`);
  } catch (error: any) {
    clearTimeout(watchdogTimer);
    console.error(`[AR Compiler Multi] ❌ Multi-item compilation failed:`, error);
    
    // Use RAW query to avoid taking another connection from pool
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE ar_projects SET status = $1, error_message = $2, compilation_finished_at = $3, updated_at = $4 WHERE id = $5`,
        ['error', `Multi-item compilation error: ${error.message}`, new Date(), new Date(), arProjectId]
      );
    } finally {
      client.release();
    }
    
    throw error;
  }
}

/**
 * Compile legacy single-photo project (existing logic moved here)
 */
async function compileSinglePhotoProject(arProjectId: string, project: any, storageDir: string, watchdogTimer: NodeJS.Timeout, pool: any) {
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
    let effectiveFitMode: string; // Вынесено из try-catch для доступа в generateARViewer
    
    // Определяем режим fit из config (по умолчанию contain для быстроты и надёжности)
    const fitMode = ((project.config as any)?.fitMode || (project as any).fitMode || 'contain') as string;
    console.log(`[AR Compiler] Using fitMode: ${fitMode}`);
    effectiveFitMode = fitMode; // Инициализация по умолчанию
    
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
          // 🔥 CRITICAL: Smart Crop ОТКЛЮЧЕН ПО УМОЛЧАНИЮ (блокирует БД на 120 секунд!)
          // Включается ТОЛЬКО через config: {"useSmartCrop": true}
          const configSmartCrop = (project.config as any)?.useSmartCrop;
          const useSmartCrop = configSmartCrop === true; // По умолчанию FALSE - TensorFlow слишком медленный
          
          if (useSmartCrop) {
            console.log('[AR Compiler] 🧠 Processing video with TensorFlow.js Smart Crop (BlazeFace face detection)...');
            try {
              const { smartCropVideo } = await import('./tensorflow-smart-crop');
              const processedVideoPath = path.join(storageDir, 'video-processed.mp4');
              
              const result = await smartCropVideo(
                videoPath,
                processedVideoPath,
                meta.photo.aspectRatio,
                'auto' // auto = пробует face detection, потом saliency, потом center
              );
              
              if (result.success) {
                finalVideoPath = processedVideoPath;
                console.log(`[AR Compiler] ✅ Smart crop applied: ${result.cropRegion?.reason} detection (confidence: ${result.cropRegion?.confidence.toFixed(2)})`);
              } else {
                console.warn('[AR Compiler] Smart crop failed, falling back to center crop');
                throw new Error(result.error || 'Smart crop failed');
              }
            } catch (smartCropErr: any) {
              console.warn('[AR Compiler] Smart crop error, using standard center crop:', smartCropErr?.message);
              // Fallback к обычному center crop
              const { processCoverModeVideo } = await import('./media-metadata');
              const processedVideoPath = path.join(storageDir, 'video-processed.mp4');
              await processCoverModeVideo(videoPath, processedVideoPath, meta.photo.aspectRatio);
              finalVideoPath = processedVideoPath;
            }
          } else {
            // Стандартный center crop (без OpenCV)
            console.log('[AR Compiler] Processing video in COVER mode (standard center crop)...');
            const { processCoverModeVideo } = await import('./media-metadata');
            const processedVideoPath = path.join(storageDir, 'video-processed.mp4');
            
            try {
              await processCoverModeVideo(videoPath, processedVideoPath, meta.photo.aspectRatio);
              finalVideoPath = processedVideoPath;
              console.log('[AR Compiler] ✓ Video processed for cover mode (center crop)');
            } catch (coverErr: any) {
              console.warn('[AR Compiler] Cover mode processing failed, fallback to original video:', coverErr?.message);
              finalVideoPath = videoPath;
            }
          }
            
          // После обработки обновляем метаданные видео
          if (finalVideoPath !== videoPath) {
            const { extractVideoMetadata } = await import('./media-metadata');
            const processedMeta = await extractVideoMetadata(finalVideoPath);
            videoWidth = processedMeta.width;
            videoHeight = processedMeta.height;
            videoAspectRatio = processedMeta.aspectRatio;
          }
        }
      }
      
      // При необходимости применяем ручной zoom/offset (близко к тому, что видит пользователь в редакторе)
      const cfgZoom = (project.config as any)?.zoom ?? 1.0;
      const cfgOffsetX = (project.config as any)?.offsetX ?? 0;
      const cfgOffsetY = (project.config as any)?.offsetY ?? 0;
      let videoAfterTransform = finalVideoPath;

      if (Math.abs(cfgZoom - 1) > 0.01 || Math.abs(cfgOffsetX) > 0.0001 || Math.abs(cfgOffsetY) > 0.0001) {
        try {
          const { applyZoomOffsetCrop } = await import('./video-processor');
          const zoomedPath = path.join(storageDir, 'video-zoomed.mp4');
          await applyZoomOffsetCrop(finalVideoPath, photoWidth ?? meta.photo.width, photoHeight ?? meta.photo.height, cfgZoom, cfgOffsetX, cfgOffsetY, zoomedPath);
          videoAfterTransform = zoomedPath;
          console.log('[AR Compiler] ✓ Applied zoom/offset crop to video');
        } catch (zoomErr: any) {
          console.warn('[AR Compiler] Zoom/offset crop failed, fallback to unmodified video:', zoomErr?.message);
          videoAfterTransform = finalVideoPath;
        }
      }

      // Копируем финальное видео в storage
      const videoFileName = 'video.mp4';
      const videoDestPath = path.join(storageDir, videoFileName);
      await fs.copyFile(videoAfterTransform, videoDestPath);

      // Progress logging (DB update removed to prevent CRM freeze)
      console.log(`[AR Compiler] ✓ Media prepared for ${arProjectId}`);

      // AUTO-DETECT: Если фото квадратное, а видео прямоугольное → автоматически применяем cover
      const photoAR = meta.photo.aspectRatio;
      const videoAR = videoAspectRatio || (videoWidth / videoHeight);
      const photoIsSquare = Math.abs(photoAR - 1.0) < 0.1; // AR близко к 1.0 (±10%)
      const videoIsRectangular = Math.abs(videoAR - 1.0) > 0.2; // AR далеко от 1.0 (>20%)
      
      // AUTO-DETECT: Если фото квадратное, а видео прямоугольное → автоматически применяем cover
      effectiveFitMode = fitMode; // Используем переменную, объявленную выше
      if (photoIsSquare && videoIsRectangular && fitMode === 'contain') {
        effectiveFitMode = 'cover';
        console.log(`[AR Compiler] 🔄 AUTO-SWITCH: Square photo (${photoAR.toFixed(2)}) + rectangular video (${videoAR.toFixed(2)}) → switching from 'contain' to 'cover' mode`);
      }

      // Вычисляем масштаб для viewer (для cover пропорции совпадают, для contain — вписываем)
      if (effectiveFitMode === 'cover') {
        // В cover режиме видео ОБРЕЗАНО под пропорции фото
        // Теперь videoAspectRatio === photoAspectRatio (после обработки)
        // Плоскость должна быть размером маркера
        const planeWidth = 1;
        const planeHeight = meta.photo.height / meta.photo.width;
        
        // КРИТИЧНО: используем пропорции МАРКЕРА (фото), а не обрезанного видео
        // Видео уже соответствует этим пропорциям благодаря crop операции
        scaleWidth = planeWidth;
        scaleHeight = planeHeight;
        
        console.log(`[AR Compiler] Cover scale: ${scaleWidth}x${scaleHeight} (matches photo ${meta.photo.width}x${meta.photo.height})`);
      } else if (effectiveFitMode === 'fill') {
        // НОВЫЙ режим: заполнить весь маркер, игнорируя пропорции видео
        // Видео может быть растянуто/сжато
        const planeWidth = 1;
        const planeHeight = meta.photo.height / meta.photo.width;
        scaleWidth = planeWidth;
        scaleHeight = planeHeight;
        console.log(`[AR Compiler] Fill mode: force ${scaleWidth}x${scaleHeight}`);
      } else if (fitMode === 'exact') {
        // НОВЫЙ режим: использовать точные пропорции ВИДЕО на маркере
        // Полезно когда видео и фото имеют одинаковые размеры
        const planeWidth = 1;
        const planeHeight = videoAspectRatio! > 0 ? planeWidth / videoAspectRatio! : 0.75;
        scaleWidth = planeWidth;
        scaleHeight = planeHeight;
        console.log(`[AR Compiler] Exact video proportions: ${scaleWidth}x${scaleHeight} (video AR: ${videoAspectRatio?.toFixed(3)})`);
      } else {
        // Contain режим (вписываем видео в маркер) - используется когда пропорции близки или явно задан contain
        const scale = computeVideoScaleForPhoto(meta.photo, { 
          width: videoWidth, 
          height: videoHeight, 
          aspectRatio: videoAspectRatio!, 
          durationMs: videoDurationMs 
        });
        scaleWidth = scale.videoScaleWidth;
        scaleHeight = scale.videoScaleHeight;
        console.log(`[AR Compiler] Contain mode: ${scaleWidth}x${scaleHeight} (video fitted inside marker)`);
      }
    } catch (e: any) {
      console.warn('[AR Compiler] Failed to extract media metadata, will fallback to defaults:', e?.message);
      // Если не удалось извлечь метаданные, просто копируем видео
      const videoFileName = 'video.mp4';
      const videoDestPath = path.join(storageDir, videoFileName);
      await fs.copyFile(videoPath, videoDestPath);
      
      // Progress logging (DB update removed to prevent CRM freeze)
      console.log(`[AR Compiler] ✓ Media prepared (fallback mode) for ${arProjectId}`);
    }

    // Компилировать .mind файл через MindAR web compiler (единственный нужный метод)
    const markerName = 'marker';
    console.log(`[AR Compiler] Starting .mind compilation via MindAR web compiler...`);
    
    // Progress logging only (DB update removed)
    console.log(`[AR Compiler] Starting .mind marker compilation for ${arProjectId}...`);
    
    // ========== AR COMPILATION (via microservice) ==========
    // OPTIMIZATION: Resize photo before processing (3-5x faster compilation)
    const resizedPhotoPath = await resizePhotoIfNeeded(photoPath, storageDir, 1920);
    
    // Border enhancement handled by AR microservice (port 5000)
    let finalMarkerSourcePath = resizedPhotoPath;
    
    if (false) {
      console.log('[AR Compiler] 🎨 Enhanced with border → cropping for clean marker');
      // Magic: .mind gets high features, but recognizes original photo without border
      // finalMarkerSourcePath = await createCroppedMindMarker(enhancerResult.photoPath, storageDir);
      console.log('[AR Compiler] ✨ Professional mode: Print clean photo, get stable tracking!');
    } else {
      console.log('[AR Compiler] 📸 Using resized photo (enhancer disabled)');
      finalMarkerSourcePath = resizedPhotoPath;
    }
    // ============================================
    
    const mindPath = path.join(storageDir, `${markerName}.mind`);
    const { compileMindFile } = await import('./ar-compiler-v2');
    
    const startCompileTime = Date.now();
    const compileResult = await compileMindFile(
      finalMarkerSourcePath,  // Cropped center (no border) for MindAR
      storageDir,
      markerName
    );
    
    if (!compileResult.success) {
      throw new Error(`MindAR compilation failed: ${compileResult.error || 'Unknown error'}`);
    }
    
    const compilationTimeMs = compileResult.compilationTimeMs || (Date.now() - startCompileTime);
    const fileSizeBytes = compileResult.fileSize || 0;
    console.log(`[AR Compiler] ✅ .mind file compiled in ${compilationTimeMs}ms (${fileSizeBytes} bytes)`);
    
    // Progress logging only (DB update removed)
    console.log(`[AR Compiler] ✅ Marker compiled successfully for ${arProjectId}`);

    // Копировать логотип в папку AR проекта
    const logoSourcePath = path.join(process.cwd(), '..', 'test_JPG_MP4', 'logo_animate1.webp');
    const logoDestPath = path.join(storageDir, 'logo_animate1.webp');
    try {
      if (await fsExtra.pathExists(logoSourcePath)) {
        await fsExtra.copy(logoSourcePath, logoDestPath);
        console.log('[AR Compiler] ✅ Logo copied successfully from:', logoSourcePath);
      } else {
        console.error('[AR Compiler] ❌ Logo file NOT FOUND at:', logoSourcePath);
        console.error('[AR Compiler] 🔍 Current working directory:', process.cwd());
      }
    } catch (err) {
      console.error('[AR Compiler] ❌ Failed to copy logo:', (err as any)?.message);
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
        fitMode: effectiveFitMode, // Передаём fitMode (contain/cover/fill)
        videoAspectRatio: videoAspectRatio, // Для cover scale вычислений
        planeAspectRatio: photoAspectRatio, // Соотношение сторон маркера
        zoom: (project.config as any)?.zoom ?? 1.0, // Ручной зум (по умолчанию 1.0)
        offsetX: (project.config as any)?.offsetX ?? 0, // Смещение X (по умолчанию 0)
        offsetY: (project.config as any)?.offsetY ?? 0, // Смещение Y (по умолчанию 0)
        aspectLocked: (project.config as any)?.aspectLocked ?? true, // Блокировка пропорций (по умолчанию true)
      },
      viewerHtmlPath
    );

    // Progress logging only (DB update removed)
    console.log(`[AR Compiler] ✅ HTML viewer generated for ${arProjectId}`);
    
    // Генерируем viewUrl с переменной окружения LOCAL_IP_URL или TUNNEL_URL (если установлены)
    // Приоритет: LOCAL_IP (прямой WiFi) > TUNNEL (ngrok) > FRONTEND_URL (prod)
    const TUNNEL_URL = (process.env.TUNNEL_URL || '').trim();
    const LOCAL_IP_URL = (process.env.LOCAL_IP_URL || '').trim();
    
    if (!TUNNEL_URL && !LOCAL_IP_URL) {
      console.log('[AR Compiler] TUNNEL_URL and LOCAL_IP_URL not set, falling back to FRONTEND_URL / production domain');
    }
    
    const baseUrl2 = TUNNEL_URL || LOCAL_IP_URL || process.env.FRONTEND_URL || 'https://photobooksgallery.am';
    console.log('[AR Compiler] Resolved baseUrl for viewUrl:', baseUrl2);
    const viewUrl = `${baseUrl2}/ar/view/${arProjectId}`;
    
    // Генерировать QR-код с правильным URL
    const qrCodePath = path.join(storageDir, 'qr-code.png');
    await generateQRCode(viewUrl, qrCodePath);
    
    // Генерируем дополнительный QR для ngrok (если LOCAL_IP используется)
    let alternativeViewUrl: string | undefined;
    if (LOCAL_IP_URL && TUNNEL_URL) {
      alternativeViewUrl = `${TUNNEL_URL}/ar/view/${arProjectId}`;
      const qrCodeAltPath = path.join(storageDir, 'qr-code-ngrok.png');
      await generateQRCode(alternativeViewUrl, qrCodeAltPath);
      console.log('[AR Compiler] Generated alternative ngrok QR code');
    }

    // Progress logging only (DB update removed)
    console.log(`[AR Compiler] ✅ QR code generated for ${arProjectId}`);
    
    // 🚀 CRITICAL: Финальный UPDATE в фоновой задаче (после разблокировки event loop)
    // Это гарантирует что другие API запросы смогут взять connections
    setImmediate(async () => {
      try {
        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE ar_projects SET 
              status = $1,
              marker_fset_url = $2,
              marker_fset3_url = $3,
              marker_iset_url = $4,
              view_url = $5,
              viewer_html_url = $6,
              qr_code_url = $7,
              marker_quality = $8,
              key_points_count = $9,
              compilation_finished_at = $10,
              compilation_time_ms = $11,
              photo_width = $12,
              photo_height = $13,
              video_width = $14,
              video_height = $15,
              video_duration_ms = $16,
              photo_aspect_ratio = $17,
              video_aspect_ratio = $18,
              fit_mode = $19,
              scale_width = $20,
              scale_height = $21,
              updated_at = $22
            WHERE id = $23`,
            [
              'ready',
              null, // marker_fset_url
              null, // marker_fset3_url
              null, // marker_iset_url
              viewUrl,
              `/api/ar/storage/${arProjectId}/index.html`,
              `/api/ar/storage/${arProjectId}/qr-code.png`,
              null, // marker_quality
              null, // key_points_count
              new Date(),
              compilationTimeMs ?? null,
              photoWidth ?? null,
              photoHeight ?? null,
              videoWidth ?? null,
              videoHeight ?? null,
              videoDurationMs ?? null,
              photoAspectRatio != null ? String(photoAspectRatio) : null,
              videoAspectRatio != null ? String(videoAspectRatio) : null,
              fitMode ?? null,
              scaleWidth != null ? String(scaleWidth) : null,
              scaleHeight != null ? String(scaleHeight) : null,
              new Date(),
              arProjectId
            ]
          );
          console.log('[AR Compiler] ✅ Background status UPDATE completed');
        } finally {
          client.release();
        }
      } catch (updateError) {
        console.error('[AR Compiler] ⚠️ Background UPDATE failed:', updateError);
      }
    });
    
    clearTimeout(watchdogTimer); // Clear watchdog on success
    console.log(`[AR Compiler] ✅ Project ${arProjectId} compiled successfully in ${Date.now() - startTime}ms`);
    
    // 🚀 CRITICAL: Email отправка в ФОНОВОЙ задаче (не блокирует основной поток)
    setImmediate(async () => {
      try {
        console.log('[AR Compiler] 📧 Starting background email notification...');
        const userClient = await pool.connect();
        try {
          const userResult = await userClient.query(
            'SELECT id, email, first_name FROM users WHERE id = $1 LIMIT 1',
            [project.userId]
          );
          const user = userResult.rows[0];
          
          if (user?.email) {
            await sendARReadyEmail({
              userEmail: user.email,
              userName: user.first_name || 'Пользователь',
              arId: arProjectId,
              viewUrl: viewUrl,
              qrCodePath: qrCodePath,
              markerQuality: undefined,
              keyPointsCount: undefined,
            });
            
            // Обновить флаг отправки уведомления (RAW query)
            await userClient.query(
              'UPDATE ar_projects SET notification_sent = $1, notification_sent_at = $2 WHERE id = $3',
              [true, new Date(), arProjectId]
            );
            
            console.log(`[AR Compiler] ✅ Background email sent to ${user.email}`);
          }
        } finally {
          userClient.release();
        }
      } catch (emailError) {
        console.error(`[AR Compiler] ⚠️ Background email failed (non-critical):`, emailError);
      }
    });
  } catch (error: any) {
    clearTimeout(watchdogTimer); // Clear watchdog on error
    console.error(`[AR Compiler] ❌ Failed to compile project ${arProjectId} after ${Date.now() - startTime}ms:`, error);
    
    // Обновить статус на "error" (RAW query)
    const errorClient = await pool.connect();
    try {
      await errorClient.query(
        'UPDATE ar_projects SET status = $1, error_message = $2, compilation_finished_at = $3, updated_at = $4 WHERE id = $5',
        ['error', error.message, new Date(), new Date(), arProjectId]
      );
    } finally {
      errorClient.release();
    }
    
    throw error;
  }
}
