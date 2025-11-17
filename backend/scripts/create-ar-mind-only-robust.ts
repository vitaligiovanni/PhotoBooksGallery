import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { extractMediaMetadata, computeVideoScaleForPhoto } from '../src/services/media-metadata';

const COMPILER_URL = 'https://hiukim.github.io/mind-ar-js-doc/tools/compile';

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

async function robustCompileMind(photoPath: string, outputMindPath: string, maxWaitMs = 180000) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Enable downloads to target folder
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: path.dirname(outputMindPath) });

  try {
    await page.goto(COMPILER_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Upload file
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('file input not found');
    await fileInput.uploadFile(photoPath);

    // Some pages auto-start compilation on upload. If not, try to click a Start-like button.
    await new Promise(res => setTimeout(res, 1500));

    // Try to click a button that contains Start (case-insensitive)
    await page.evaluate(() => {
      // @ts-ignore - evaluated in browser; window/document exist at runtime
      const btn = Array.from((window as any).document.querySelectorAll('button')).find((b: any) => /start/i.test((b.textContent || '')));
      if (btn) (btn as any).click();
    });

    // Poll for a Download/Export button existence
    const startTime = Date.now();
    let downloaded = false;
    while (Date.now() - startTime < maxWaitMs) {
      // Try clicking Download/Export if present
      await page.evaluate(() => {
        // @ts-ignore - evaluated in browser; window/document exist at runtime
        const btn = Array.from((window as any).document.querySelectorAll('button')).find((b: any) => {
          const t = ((b.textContent || '') as string).toLowerCase();
          return t.includes('download') || t.includes('export');
        });
        if (btn) { (btn as any).click(); }
      });

      // Check for targets.mind existence
      try {
        await fs.access(path.join(path.dirname(outputMindPath), 'targets.mind'));
        downloaded = true;
        break;
      } catch {}

      await new Promise(res => setTimeout(res, 2000));
    }

    if (!downloaded) throw new Error(`Timeout waiting for .mind download after ${Math.round((Date.now()-startTime)/1000)}s`);

    // Move/rename to desired path
    const src = path.join(path.dirname(outputMindPath), 'targets.mind');
    try { await fs.rename(src, outputMindPath); } catch { /* already at place */ }

  } finally {
    await page.close();
    await browser.close();
  }
}

async function main() {
  const photoPath = 'C:/Users/galle/Downloads/test000.png';
  const videoPath = 'C:/Users/galle/Downloads/Моя+школа+.mp4';

  const arId = `mind-only-${Date.now()}`;
  const backendRoot = process.cwd();
  const storageDir = path.join(backendRoot, 'objects', 'ar-storage', arId);
  const markerName = 'marker';

  await fs.mkdir(storageDir, { recursive: true });

  const videoFileName = 'video.mp4';
  const videoDestPath = path.join(storageDir, videoFileName);
  await fs.copyFile(videoPath, videoDestPath);

  const mindPath = path.join(storageDir, `${markerName}.mind`);
  console.log(`[Robust] Compiling .mind via web...`);
  await robustCompileMind(photoPath, mindPath, 180000);
  console.log(`[Robust] ✓ .mind ready at ${mindPath}`);

  let scale: { width: number; height: number } | undefined;
  try {
    const meta = await extractMediaMetadata(photoPath, videoDestPath);
    const s = computeVideoScaleForPhoto(meta.photo, meta.video);
    scale = { width: s.videoScaleWidth, height: s.videoScaleHeight };
  } catch (e: any) {
    console.warn('[Robust] metadata/scale failed:', e?.message);
  }

  const viewerHtmlPath = path.join(storageDir, 'index.html');
  await writeViewerHTML(viewerHtmlPath, { arId, markerBaseName: markerName, videoFileName, videoScale: scale, autoPlay: true, loop: true });
  console.log(`[Robust] ✓ Viewer generated: ${viewerHtmlPath}`);

  const url = `${process.env.API_URL || 'http://localhost:5002'}/api/ar-storage/${arId}/index.html`;
  console.log(`\n[Robust] Open viewer: ${url}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
