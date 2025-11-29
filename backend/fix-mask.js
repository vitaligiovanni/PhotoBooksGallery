const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const size = 1024;
const radius = 480;

// Create white circle on transparent background
const svgCircle = `
<svg width="${size}" height="${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="white"/>
</svg>`;

sharp({
  create: {
    width: size,
    height: size,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
.composite([{
  input: Buffer.from(svgCircle),
  top: 0,
  left: 0
}])
.png()
.toFile(path.join(__dirname, 'objects', 'ar-mask-templates', 'circle.png'))
.then(() => {
  console.log('✅ Fixed circle.png (white on transparent)');
  
  // Copy to project
  const destPath = path.join(__dirname, 'objects', 'ar-storage', '8cbdf39d-4414-4340-b241-0bfff6f90334', 'mask-0.png');
  fs.copyFileSync(
    path.join(__dirname, 'objects', 'ar-mask-templates', 'circle.png'),
    destPath
  );
  console.log('✅ Copied to project mask-0.png');
})
.catch(console.error);
