const sharp = require('sharp');
const path = require('path');

const maskPath = path.join(__dirname, 'objects', 'ar-storage', '8cbdf39d-4414-4340-b241-0bfff6f90334', 'mask-0.png');

sharp(maskPath)
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    const centerX = Math.floor(info.width / 2);
    const centerY = Math.floor(info.height / 2);
    
    // Calculate correct offset
    const offset = (centerY * info.width + centerX) * info.channels;
    
    console.log('Image size:', info.width, 'x', info.height, 'channels:', info.channels);
    console.log('Center coordinates:', centerX, centerY);
    console.log('Center offset:', offset);
    console.log('Center pixel (RGBA):', [
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3]
    ]);
    
    // Check a few points in the circle
    console.log('\nSample points:');
    for (let angle = 0; angle < 360; angle += 90) {
      const rad = angle * Math.PI / 180;
      const x = Math.floor(centerX + 200 * Math.cos(rad));
      const y = Math.floor(centerY + 200 * Math.sin(rad));
      const idx = (y * info.width + x) * info.channels;
      console.log(`At ${x},${y} (${angle}°):`, [data[idx], data[idx+1], data[idx+2], data[idx+3]]);
    }
  })
  .catch(console.error);
