const sharp = require('sharp');
const path = require('path');
const fs = require('fs-extra');

async function testMaskGeneration() {
  console.log('🧪 Testing mask generation...\n');

  const testDir = path.join(__dirname, 'test-masks-output');
  await fs.ensureDir(testDir);

  const shapes = ['circle', 'oval', 'square', 'rect'];
  const templateDir = path.join(__dirname, 'ar-mask-templates');

  for (const shape of shapes) {
    const templateFiles = {
      circle: 'circle.png',
      oval: 'oval.png',
      square: 'square.png',
      rect: 'rounded-rect.png'
    };

    const templateFile = templateFiles[shape];
    const templatePath = path.join(templateDir, templateFile);
    const outputPath = path.join(testDir, `test-${shape}-1024x1024.png`);

    console.log(`📐 Testing ${shape}...`);
    
    try {
      const exists = await fs.pathExists(templatePath);
      if (!exists) {
        console.error(`  ❌ Template not found: ${templatePath}`);
        continue;
      }

      await sharp(templatePath)
        .resize(1024, 1024, {
          fit: 'fill',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      const meta = await sharp(outputPath).metadata();
      console.log(`  ✅ Generated: ${outputPath} (${meta.width}x${meta.height}, ${meta.channels} channels)`);
    } catch (error) {
      console.error(`  ❌ Error generating ${shape}:`, error.message);
    }
  }

  console.log('\n✅ Mask generation test complete!');
  console.log(`Check output: ${testDir}`);
}

testMaskGeneration().catch(console.error);
