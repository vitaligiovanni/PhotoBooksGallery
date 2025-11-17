/**
 * Тестовый скрипт для проверки автоматической компиляции .mind файлов
 */

import { compileMindFile, closeBrowser } from './src/services/mind-ar-web-compiler.js';
import path from 'path';

async function testWebCompiler() {
  try {
    console.log('🧪 Testing MindAR Web Compiler\n');
    
    const photoPath = path.join(process.cwd(), 'objects', 'ar-uploads', 'photo-1762465103878-ttlnzb.png');
    const outputPath = path.join(process.cwd(), 'objects', 'ar-storage', 'manual-test', 'marker-web.mind');
    
    console.log(`📷 Input: ${photoPath}`);
    console.log(`💾 Output: ${outputPath}\n`);
    
    const result = await compileMindFile({
      photoPath,
      outputMindPath: outputPath,
      maxWaitTimeMs: 5 * 60 * 1000, // 5 минут
    });
    
    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ SUCCESS! .mind file generated via web compiler');
      console.log('\n📝 Next steps:');
      console.log('1. Replace marker.mind with marker-web.mind:');
      console.log('   cd backend/objects/ar-storage/manual-test/');
      console.log('   cp marker-web.mind marker.mind');
      console.log('2. Refresh AR page on phone and test!');
    } else {
      console.log('\n❌ FAILED:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await closeBrowser();
    console.log('\n🏁 Test complete');
  }
}

testWebCompiler();
