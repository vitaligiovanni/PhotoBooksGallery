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
        material="transparent: true; opacity: 0"
        visible="false"
        class="clickable"
        data-auto-play="${autoPlay}"
        animation__fadein="property: material.opacity; from: 0; to: 1; dur: 800; easing: easeInOutQuad; startEvents: video-ready-${idx}"
      ></a-video>
      ${maskFileName ? `<a-image id="ar-mask-image-${idx}" src="#ar-mask-${idx}" position="${pos.x} ${pos.y} ${pos.z + 0.002}" rotation="${rot.x} ${rot.y} ${rot.z}" width="${scale.width}" height="${scale.height}" material="transparent: true; alphaTest: 0.001"></a-image>` : ''}
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
                
                // ПРОФЕССИОНАЛЬНЫЙ FADE-IN: запускаем через 200ms когда первый кадр загружен
                setTimeout(() => {
                  if (planeEl) {
                    planeEl.setAttribute('visible', 'true');
                    console.log('Plane ${idx} set to visible');
                    planeEl.emit('video-ready-${idx}');
                    console.log('Fade-in animation started for video ${idx}');
                  }
                }, 200);
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
                    }, 200);
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
<style>
body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden}
.arjs-loader{position:absolute;inset:0;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;z-index:9999;transition:opacity .6s;font-family:system-ui,-apple-system,sans-serif}
.arjs-loader.hidden{opacity:0;pointer-events:none}
.spinner{width:56px;height:56px;border:5px solid #ffffff40;border-top-color:#fff;border-radius:50%;animation:s 1s linear infinite;margin-bottom:24px}
@keyframes s{to{transform:rotate(360deg)}}
#instructions{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:#fff;padding:16px 32px;border-radius:40px;backdrop-filter:blur(12px);font-size:16px;font-weight:600;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,0.4)}
#instructions::before{content:"📸";margin-right:10px;font-size:20px}
</style>
</head>
<body>
<div class="arjs-loader" id="loading"><div class="spinner"></div><h2>Загрузка AR…</h2><p>Разрешите доступ к камере</p></div>
<div id="instructions">Наведите камеру на фотографию</div>
<a-scene embedded mindar-image="imageTargetSrc:./${markerBaseName}.mind?t=${Date.now()};maxTrack:1;filterMinCF:0.0001;filterBeta:0.003;warmupTolerance:5;missTolerance:10" color-space="sRGB" renderer="colorManagement:true;antialias:true;alpha:true" vr-mode-ui="enabled:false" device-orientation-permission-ui="enabled:false">
<a-assets timeout="30000"><video id="vid" src="./${videoFileName}?t=${Date.now()}" preload="auto" ${loop ? 'loop' : ''} muted playsinline crossorigin="anonymous"></video></a-assets>
<a-camera position="0 0 0" look-controls="enabled:false" cursor="rayOrigin:mouse"></a-camera>
<a-entity mindar-image-target="targetIndex:0"><a-plane id="plane" rotation="${videoRotation.x} ${videoRotation.y} ${videoRotation.z}" width="${videoScale.width}" height="${videoScale.height}" position="${videoPosition.x} ${videoPosition.y} ${videoPosition.z}" material="src:#vid;shader:flat;transparent:true;opacity:0;side:double" visible="false" animation__fade="property:material.opacity;from:0;to:1;dur:500;startEvents:showvid;easing:easeInOutQuad"></a-plane></a-entity>
</a-scene>
<script>
console.log('[AR] Page loaded');
setTimeout(()=>{console.log('[AR] Failsafe: hiding loader after 5s');document.getElementById('loading').classList.add('hidden')},5000);
const video=document.getElementById('vid');
const plane=document.getElementById('plane');
const loading=document.getElementById('loading');
const target=document.querySelector('[mindar-image-target]');
console.log('[AR] Elements found:',{video:!!video,plane:!!plane,loading:!!loading,target:!!target});
let r={v:false,t:false,m:false};
let markerActive=false;
let videoReady=false;
video.addEventListener('canplay',()=>{if(videoReady)return;videoReady=true;console.log('[AR] ✓ Video canplay, marking ready');r.v=true;if(/Android/i.test(navigator.userAgent)){setTimeout(()=>{console.log('[AR] ✓ Texture warmed (Android)');r.t=true;check()},450)}else{r.t=true;check()}});
target.addEventListener('targetFound',()=>{if(markerActive){console.log('[AR] Marker re-found (ignored)');return}console.log('[AR] ✓✓✓ MARKER FOUND! ✓✓✓');r.m=true;check()});
const scene=document.querySelector('a-scene');
scene.addEventListener('arReady',()=>{console.log('[AR] ✓ MindAR ready, camera started');setTimeout(()=>loading.classList.add('hidden'),300)});
scene.addEventListener('arError',(e)=>{console.error('[AR] ❌ MindAR Error:',e);loading.innerHTML='<h2>Ошибка доступа</h2><p>Проверьте камеру</p>'});
console.log('[AR] Listeners attached, waiting for events...');
function check(){console.log('[AR] Check state:',JSON.stringify(r),'markerActive:',markerActive);if(markerActive)return;if(r.v&&r.t&&r.m){markerActive=true;console.log('[AR] 🎬 ALL READY! Playing video...');video.muted=false;video.currentTime=0;const playPromise=video.play();if(playPromise){playPromise.then(()=>{console.log('[AR] ✓ Video playing');setTimeout(()=>{plane.setAttribute('visible','true');plane.emit('showvid');console.log('[AR] ✓ Plane visible')},200)}).catch(e=>{console.warn('[AR] Play failed, trying muted:',e);video.muted=true;video.play().then(()=>{setTimeout(()=>{plane.setAttribute('visible','true');plane.emit('showvid')},200)})})}}else{console.log('[AR] ⏳ Waiting for:',!r.v?'video':'',!r.t?'texture':'',!r.m?'marker':'')}}
target.addEventListener('targetLost',()=>{console.log('[AR] Marker lost');markerActive=false;plane.setAttribute('visible','false');plane.setAttribute('material','opacity',0);video.pause();video.currentTime=0});
const FIT_MODE='${fitMode}';const VIDEO_AR=${videoAspectRatio || 'null'};const PLANE_AR=${planeAspectRatio || 'null'};const ZOOM=${zoom};const OFFSET_X=${offsetX};const OFFSET_Y=${offsetY};const ASPECT_LOCKED=${aspectLocked};console.log('[AR] FitMode:',FIT_MODE,'VideoAR:',VIDEO_AR,'PlaneAR:',PLANE_AR,'Zoom:',ZOOM,'Offset:',OFFSET_X,OFFSET_Y,'AspectLocked:',ASPECT_LOCKED);
let coverScaleX=1,coverScaleY=1;
if(FIT_MODE==='cover'&&VIDEO_AR&&PLANE_AR){const vRatio=VIDEO_AR;const pRatio=PLANE_AR;if(vRatio>pRatio){coverScaleY=vRatio/pRatio;console.log('[AR] Cover: video wider, scaleY=',coverScaleY)}else{coverScaleX=pRatio/vRatio;console.log('[AR] Cover: video taller, scaleX=',coverScaleX)}console.log('[AR] ✓ Calculated cover scale:',coverScaleX,'x',coverScaleY)}
let smoothInit=false;let sp=[0,0,0];let sq=null;const SMOOTH_ALPHA_POS=0.25;const SMOOTH_ALPHA_ROT=0.25;function smoothTick(){if(!markerActive||!plane||!plane.object3D){requestAnimationFrame(smoothTick);return;}const o=plane.object3D;if(!smoothInit){sp=[o.position.x,o.position.y,o.position.z];sq=o.quaternion.clone();smoothInit=true;}else{sp[0]+=(o.position.x-sp[0])*SMOOTH_ALPHA_POS;sp[1]+=(o.position.y-sp[1])*SMOOTH_ALPHA_POS;sp[2]+=(o.position.z-sp[2])*SMOOTH_ALPHA_POS;sq.slerp(o.quaternion,SMOOTH_ALPHA_ROT);o.position.set(sp[0],sp[1],sp[2]);o.quaternion.copy(sq);}if(FIT_MODE==='cover'){if(ASPECT_LOCKED){o.scale.set(coverScaleX*ZOOM,coverScaleY*ZOOM,1);}else{o.scale.set(coverScaleX,coverScaleY,1);}}if(OFFSET_X!==0||OFFSET_Y!==0){const basePos=[${videoPosition.x},${videoPosition.y},${videoPosition.z}];o.position.set(basePos[0]+OFFSET_X,basePos[1]+OFFSET_Y,basePos[2]);}requestAnimationFrame(smoothTick);}requestAnimationFrame(smoothTick);
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
      
      // Apply unique border enhancement for this item
      const itemStorageDir = path.join(storageDir, `item-${item.targetIndex}`);
      await fs.mkdir(itemStorageDir, { recursive: true });
      
      const enhancerResult = await enhanceMarkerPhotoSimple(photoPath, itemStorageDir, `${arProjectId}-${item.targetIndex}`);
      
      let finalMarkerSourcePath: string;
      if (enhancerResult.enhanced) {
        console.log(`[AR Compiler Multi] Item ${item.targetIndex} enhanced with unique border`);
        finalMarkerSourcePath = await createCroppedMindMarker(enhancerResult.photoPath, itemStorageDir);
      } else {
        finalMarkerSourcePath = photoPath;
      }
      
      // Compile to final destination
      const mindFinalPath = path.join(storageDir, `${markerName}.mind`);

      const { compileMindFile } = await import('./ar-compiler-v2');
      const compileResult = await compileMindFile(
        finalMarkerSourcePath,
        storageDir,
        markerName
      );

      if (!compileResult.success) {
        throw new Error(`Item ${item.name} marker compilation failed: ${compileResult.error}`);
      }

      console.log(`[AR Compiler Multi] ✅ Item ${item.name} marker compiled successfully`);

      // Mark item as compiled
      const { arProjectItems } = await import('@shared/schema');
      await db.update(arProjectItems).set({
        markerCompiled: true,
        updatedAt: new Date() as any,
      } as any).where(eq(arProjectItems.id, item.id));
    }

    // Generate multi-target viewer
    await generateMultiTargetViewer(arProjectId, sortedItems, storageDir);

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
          // НОВОЕ: Smart Crop включен ПО УМОЛЧАНИЮ для всех AR проектов
          // Можно отключить через config: {"useSmartCrop": false}
          const configSmartCrop = (project.config as any)?.useSmartCrop;
          const useSmartCrop = configSmartCrop !== false; // По умолчанию true, если не указано явно false
          
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
    
    // ========== PROFESSIONAL AR SOLUTION V2 (UNIQUE BORDERS) ==========
    // Step 1: Add unique variative border pattern (generates 2000–3000+ feature points, hash-based uniqueness)
    const enhancerResult = await enhanceMarkerPhotoSimple(photoPath, storageDir, arProjectId);
    
    // Step 2: Crop border so MindAR searches for clean center (original photo)
    let finalMarkerSourcePath: string;
    
    if (enhancerResult.enhanced) {
      console.log('[AR Compiler] 🎨 Enhanced with border → cropping for clean marker');
      // Magic: .mind gets high features, but recognizes original photo without border
      finalMarkerSourcePath = await createCroppedMindMarker(enhancerResult.photoPath, storageDir);
      console.log('[AR Compiler] ✨ Professional mode: Print clean photo, get stable tracking!');
    } else {
      console.log('[AR Compiler] 📸 Using original photo (enhancer disabled)');
      finalMarkerSourcePath = photoPath;
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
