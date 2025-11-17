import { Compiler } from 'mind-ar/src/image-target/compiler.js';
import fs from 'fs/promises';
import path from 'path';

async function testMindCompiler() {
  try {
    console.log('🔧 Testing official MindAR compiler...\n');
    
    const photoPath = 'objects/ar-uploads/photo-1762465103878-ttlnzb.png';
    const outputPath = 'objects/ar-storage/manual-test/marker-new.mind';
    
    console.log(`📷 Input photo: ${photoPath}`);
    console.log(`📦 Output: ${outputPath}\n`);
    
    // Читаем фото
    const imageData = await fs.readFile(photoPath);
    console.log(`✅ Photo loaded: ${imageData.length} bytes\n`);
    
    // Создаём компилятор
    const compiler = new Compiler();
    
    // Компилируем
    console.log('⚙️ Compiling...');
    const startTime = Date.now();
    
    const mindData = await compiler.compileImageTargets(
      [{ data: imageData, scale: 1.0 }],
      (progress) => {
        if (progress % 10 === 0 || progress === 100) {
          console.log(`   Progress: ${progress}%`);
        }
      }
    );
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Compilation completed in ${duration}ms`);
    console.log(`📊 Generated .mind file: ${mindData.byteLength} bytes\n`);
    
    // Сохраняем
    await fs.writeFile(outputPath, Buffer.from(mindData));
    console.log(`💾 Saved to: ${outputPath}`);
    
    // Также копируем старый для сравнения
    const oldMindPath = 'objects/ar-storage/manual-test/marker.mind';
    const oldMindData = await fs.readFile(oldMindPath);
    console.log(`\n📊 OLD .mind (from .fset3): ${oldMindData.length} bytes`);
    console.log(`📊 NEW .mind (official): ${mindData.byteLength} bytes`);
    console.log(`\n${mindData.byteLength > oldMindData.length ? '✅' : '⚠️'} Size difference: ${mindData.byteLength - oldMindData.length} bytes`);
    
    console.log('\n✨ Test complete! Now replace marker.mind with marker-new.mind and try AR again.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testMindCompiler();
