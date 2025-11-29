const sharp = require('sharp');
const { createCanvas } = require('canvas');
const path = require('path');
const fs = require('fs');

const size = 1024;
const radius = 480;

// Create canvas
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Clear to transparent
ctx.clearRect(0, 0, size, size);

// Draw white circle
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.arc(size/2, size/2, radius, 0, Math.PI * 2);
ctx.fill();

// Convert to buffer and save
const buffer = canvas.toBuffer('image/png');

const templatePath = path.join(__dirname, 'objects', 'ar-mask-templates', 'circle.png');
const projectPath = path.join(__dirname, 'objects', 'ar-storage', '8cbdf39d-4414-4340-b241-0bfff6f90334', 'mask-0.png');

fs.writeFileSync(templatePath, buffer);
console.log('✅ Created circle.png (white circle on transparent)');

fs.writeFileSync(projectPath, buffer);
console.log('✅ Copied to mask-0.png');

// Verify
sharp(templatePath)
  .metadata()
  .then(meta => console.log('Verified:', meta.width, 'x', meta.height, 'channels:', meta.channels))
  .catch(console.error);
