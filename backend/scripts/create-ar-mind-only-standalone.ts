import fs from 'fs/promises';
import path from 'path';
import { compileMindFile } from '../src/services/mind-ar-web-compiler';
import { extractMediaMetadata, computeVideoScaleForPhoto } from '../src/services/media-metadata';

async function writeViewerHTML(outPath: string, cfg: {
  arId: string;
  markerBaseName: string;
  videoFileName: string;
  videoScale?: { width: number; height: number };
  autoPlay?: boolean;
  loop?: boolean;
}) {
  const { arId, markerBaseName, videoFileName, videoScale, autoPlay = true, loop = true } = cfg;
  const width = (videoScale?.width ?? 1).toString();
  const height = (videoScale?.height ?? 0.75).toString();
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AR Viewer ${arId}</title>
  <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
  <style>
    body { margin: 0; overflow: hidden; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    #loading { position: fixed; inset: 0; display: grid; place-items: center; background: #111; color: #fff }
    #loading.hidden { display: none }
  </style>
</head>
<body>
  <div id="loading">Загрузка AR...</div>
  <a-scene
    mindar-image="imageTargetSrc: ./${markerBaseName}.mind; filterMinCF:0.0001; filterBeta: 0.001; warmupTolerance: 5; missTolerance: 5"
    color-space="sRGB"
    renderer="colorManagement: true, physicallyCorrectLights"
    vr-mode-ui="enabled: false"
    device-orientation-permission-ui="enabled: false"
  >
    <a-assets>
      <video id="ar-video" src="./${videoFileName}" preload="auto" ${autoPlay ? 'autoplay' : ''} ${loop ? 'loop' : ''} playsinline webkit-playsinline crossorigin="anonymous"></video>
    </a-assets>
    <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
    <a-entity mindar-image-target="targetIndex: 0">
      <a-video src="#ar-video" position="0 0 0" rotation="0 0 0" width="${width}" height="${height}"></a-video>
    </a-entity>
  </a-scene>
  <script>
    const sceneEl = document.querySelector('a-scene');
    const loading = document.getElementById('loading');
    sceneEl.addEventListener('loaded', () => loading.classList.add('hidden'));
  </script>
</body>
</html>`;
  await fs.writeFile(outPath, html, 'utf-8');
}

async function main() {
  const photoPath = 'C:/Users/galle/Downloads/test000.png';
  const videoPath = 'C:/Users/galle/Downloads/Моя+школа+.mp4';

  const arId = `mind-only-${Date.now()}`;
  const backendRoot = process.cwd();
  const storageDir = path.join(backendRoot, 'objects', 'ar-storage', arId);
  const markerName = 'marker';

  console.log(`[Standalone] Photo: ${photoPath}`);
  console.log(`[Standalone] Video: ${videoPath}`);
  await fs.mkdir(storageDir, { recursive: true });

  const videoFileName = 'video.mp4';
  const videoDestPath = path.join(storageDir, videoFileName);
  await fs.copyFile(videoPath, videoDestPath);

  const mindPath = path.join(storageDir, `${markerName}.mind`);
  const mindRes = await compileMindFile({ photoPath, outputMindPath: mindPath, maxWaitTimeMs: 5 * 60 * 1000 });
  if (!mindRes.success) throw new Error(`MindAR web compilation failed: ${mindRes.error}`);
  console.log(`[Standalone] ✓ .mind compiled (${mindRes.fileSizeBytes} bytes)`);

  let scale: { width: number; height: number } | undefined;
  try {
    const meta = await extractMediaMetadata(photoPath, videoDestPath);
    const s = computeVideoScaleForPhoto(meta.photo, meta.video);
    scale = { width: s.videoScaleWidth, height: s.videoScaleHeight };
  } catch (e: any) {
    console.warn('[Standalone] metadata/scale failed:', e?.message);
  }

  const viewerHtmlPath = path.join(storageDir, 'index.html');
  await writeViewerHTML(viewerHtmlPath, { arId, markerBaseName: markerName, videoFileName, videoScale: scale, autoPlay: true, loop: true });
  console.log(`[Standalone] ✓ Viewer generated: ${viewerHtmlPath}`);

  const url = `${process.env.API_URL || 'http://localhost:5002'}/api/ar-storage/${arId}/index.html`;
  console.log(`\n[Standalone] Open viewer: ${url}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
