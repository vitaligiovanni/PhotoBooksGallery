#!/usr/bin/env node
// Simple icon generator to create correctly sized square PNGs to replace 1x1 placeholders
// Usage: node scripts/generate-icons.cjs

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const sizes = [72,96,128,144,152,192,384,512];
const outDir = path.resolve(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function createPng(size) {
  const png = new PNG({ width: size, height: size });
  // Fill with subtle gray gradient so browsers see non-empty image
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const shade = 230 - Math.floor((y / size) * 40);
      png.data[idx] = shade;      // R
      png.data[idx + 1] = shade;  // G
      png.data[idx + 2] = shade;  // B
      png.data[idx + 3] = 255;    // A
    }
  }
  return png;
}

(async () => {
  for (const size of sizes) {
    const file = path.join(outDir, `icon-${size}x${size}.png`);
    await new Promise((resolve, reject) => {
      createPng(size).pack().pipe(fs.createWriteStream(file))
        .on('finish', resolve)
        .on('error', reject);
    });
    console.log('Generated', path.basename(file));
  }
  console.log('\nDone. Update manifest if needed and hard‑reload (Ctrl+Shift+R) in browser.');
})();
