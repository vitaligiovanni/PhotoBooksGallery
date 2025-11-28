const sharp = require('sharp');
const size = 1024;

async function generateMasks() {
  // Circle
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`),
    top: 0,
    left: 0
  }])
  .png()
  .toFile('circle.png');
  console.log('✓ circle.png created');

  // Oval (horizontal)
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: Buffer.from(`<svg width="${size}" height="${size}"><ellipse cx="${size/2}" cy="${size/2}" rx="${size/2}" ry="${size/3}" fill="white"/></svg>`),
    top: 0,
    left: 0
  }])
  .png()
  .toFile('oval.png');
  console.log('✓ oval.png created');

  // Square
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: Buffer.from(`<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" fill="white"/></svg>`),
    top: 0,
    left: 0
  }])
  .png()
  .toFile('square.png');
  console.log('✓ square.png created');

  // Rounded rectangle
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([{
    input: Buffer.from(`<svg width="${size}" height="${size}"><rect x="64" y="192" width="896" height="640" rx="40" fill="white"/></svg>`),
    top: 0,
    left: 0
  }])
  .png()
  .toFile('rounded-rect.png');
  console.log('✓ rounded-rect.png created');
}

generateMasks().catch(console.error);
