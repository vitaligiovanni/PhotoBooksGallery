#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    const [k, v] = a.includes('=') ? a.split('=') : [a, true];
    if (k.startsWith('--')) out[k.slice(2)] = v === true ? true : v;
  }
  return out;
}

function pickFirstExisting(files) {
  for (const f of files) {
    if (fs.existsSync(f)) return f;
  }
  return null;
}

async function main() {
  const { dir, video, frontendUrl } = parseArgs();
  if (!dir) {
    console.error('Usage: node finalize-ar-folder.js --dir="absolute/path/to/ar-storage/<folder>" [--video="/path/to/video.mp4"] [--frontendUrl="https://photobooksgallery.am"]');
    process.exit(1);
  }
  const absDir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  const dirName = path.basename(absDir);

  if (!fs.existsSync(absDir)) {
    console.error('Folder does not exist:', absDir);
    process.exit(1);
  }

  // 1) Normalize marker files: rename any <basename>.fset/fset3/iset to marker.* if marker.* not present
  const existingFset3 = pickFirstExisting([
    path.join(absDir, 'marker.fset3'),
    ...fs.readdirSync(absDir).filter(f => f.endsWith('.fset3')).map(f => path.join(absDir, f)),
  ]);
  if (!existingFset3) {
    console.error('No .fset3 found in folder. Aborting.');
    process.exit(1);
  }

  // Determine current baseName
  const currentBase = path.basename(existingFset3, '.fset3');
  const srcFset3 = path.join(absDir, `${currentBase}.fset3`);
  const srcFset = path.join(absDir, `${currentBase}.fset`);
  const srcIset = path.join(absDir, `${currentBase}.iset`);

  const dstFset3 = path.join(absDir, 'marker.fset3');
  const dstFset = path.join(absDir, 'marker.fset');
  const dstIset = path.join(absDir, 'marker.iset');

  if (!fs.existsSync(dstFset3) && fs.existsSync(srcFset3)) {
    await fsp.copyFile(srcFset3, dstFset3);
  }
  if (!fs.existsSync(dstFset) && fs.existsSync(srcFset)) {
    await fsp.copyFile(srcFset, dstFset);
  }
  if (!fs.existsSync(dstIset) && fs.existsSync(srcIset)) {
    await fsp.copyFile(srcIset, dstIset);
  }

  // 2) Create marker.mind from marker.fset3
  const mindPath = path.join(absDir, 'marker.mind');
  if (!fs.existsSync(mindPath)) {
    await fsp.copyFile(dstFset3, mindPath);
  }

  // 3) Ensure video.mp4 exists: copy provided or try to find by timestamp in ar-uploads
  const videoDest = path.join(absDir, 'video.mp4');
  if (!fs.existsSync(videoDest)) {
    if (video && fs.existsSync(video)) {
      await fsp.copyFile(video, videoDest);
    } else {
      // Try to guess from timestamp in currentBase if it looks like photo-<stamp>-random
      let guessed = null;
      if (currentBase.startsWith('photo-')) {
        const parts = currentBase.split('-');
        if (parts.length >= 3) {
          const stamp = parts[1];
          const uploadsDir = path.join(path.dirname(path.dirname(absDir)), 'ar-uploads');
          if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir).filter(f => f.startsWith(`video-${stamp}-`) && f.endsWith('.mp4'));
            if (files.length > 0) {
              guessed = path.join(uploadsDir, files[0]);
            }
          }
        }
      }
      if (guessed) {
        await fsp.copyFile(guessed, videoDest);
      } else {
        console.warn('Could not locate matching video automatically. Provide --video="/path/to/video.mp4" to include it.');
      }
    }
  }

  // 4) Generate index.html
  const htmlPath = path.join(absDir, 'index.html');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AR Viewer - ${dirName}</title>
  <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
  <style>
    body { margin: 0; overflow: hidden; }
    #loading { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; background:#111; color:#fff; font-family:sans-serif }
    #loading.hidden { display:none }
    #hint { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,.7); color:#fff; padding:10px 14px; border-radius:20px; font-size:14px; font-family: sans-serif }
  </style>
</head>
<body>
  <div id="loading">Загрузка AR...</div>
  <div id="hint">📸 Наведите камеру на фотографию</div>
  <a-scene mindar-image="imageTargetSrc: ./marker.mind; filterMinCF:0.0001; filterBeta:0.001; warmupTolerance:5; missTolerance:5" color-space="sRGB" renderer="colorManagement:true, physicallyCorrectLights" vr-mode-ui="enabled:false" device-orientation-permission-ui="enabled:false">
    <a-assets>
      <video id="ar-video" src="./video.mp4" preload="auto" loop autoplay playsinline webkit-playsinline crossorigin="anonymous"></video>
    </a-assets>
    <a-camera position="0 0 0" look-controls="enabled:false"></a-camera>
    <a-entity mindar-image-target="targetIndex: 0">
      <a-video src="#ar-video" position="0 0 0" rotation="0 0 0" width="1" height="0.75"></a-video>
    </a-entity>
  </a-scene>
  <script>
    const sceneEl = document.querySelector('a-scene');
    const loading = document.getElementById('loading');
    sceneEl.addEventListener('loaded', () => loading.classList.add('hidden'));
  </script>
</body>
</html>`;
  await fsp.writeFile(htmlPath, html, 'utf-8');

  // 5) Generate QR code if possible
  try {
    const QRCode = require('qrcode');
    const base = frontendUrl || process.env.FRONTEND_URL || 'https://photobooksgallery.am';
    // Note: backend serves at /api/ar-storage/:id/, but manual folder may not be routable. Still generate a hint URL.
    const viewUrl = `${base}/api/ar-storage/${dirName}/index.html`;
    const qrPath = path.join(absDir, 'qr-code.png');
    await QRCode.toFile(qrPath, viewUrl, { width: 512, margin: 2 });
    console.log('QR code written:', qrPath, '->', viewUrl);
  } catch (e) {
    console.warn('QR code generation skipped (qrcode not available?):', e.message);
  }

  console.log('Done. Files present:');
  console.log('-', path.relative(process.cwd(), path.join(absDir, 'marker.fset')));
  console.log('-', path.relative(process.cwd(), path.join(absDir, 'marker.fset3')));
  console.log('-', path.relative(process.cwd(), path.join(absDir, 'marker.iset')));
  console.log('-', path.relative(process.cwd(), path.join(absDir, 'marker.mind')));
  console.log('-', path.relative(process.cwd(), path.join(absDir, 'index.html')));
  console.log('-', path.relative(process.cwd(), path.join(absDir, 'qr-code.png')));
  if (fs.existsSync(videoDest)) console.log('-', path.relative(process.cwd(), videoDest));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
