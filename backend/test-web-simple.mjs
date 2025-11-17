/**
 * Простой тест веб-компилятора MindAR (чистый JS)
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMPILER_URL = 'https://hiukim.github.io/mind-ar-js-doc/tools/compile';

async function compileMind() {
  console.log('🚀 Starting MindAR web compiler test\n');
  
  const photoPath = path.join(__dirname, 'objects', 'ar-uploads', 'photo-1762465103878-ttlnzb.png');
  const outputDir = path.join(__dirname, 'objects', 'ar-storage', 'manual-test');
  const outputPath = path.join(outputDir, 'marker-web.mind');
  
  console.log(`📷 Photo: ${photoPath}`);
  console.log(`💾 Output: ${outputPath}\n`);
  
  let browser = null;
  
  try {
    // Проверка фото
    await fs.access(photoPath);
    console.log('✅ Photo found\n');
    
    // Запуск браузера
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Настройка загрузок
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: outputDir,
    });
    
    // Открыть компилятор
    console.log('📖 Opening compiler page...');
    await page.goto(COMPILER_URL, { waitUntil: 'networkidle2' });
    console.log('✅ Page loaded\n');
    
    // Загрузить фото
    console.log('📤 Uploading photo...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');
    await fileInput.uploadFile(photoPath);
    console.log('✅ Photo uploaded\n');
    
    // Подождать
    await new Promise(r => setTimeout(r, 2000));
    
    // Найти кнопку Start
    console.log('▶️  Starting compilation...');
    const buttons = await page.$$('button');
    let startButton = null;
    
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.toLowerCase().includes('start')) {
        startButton = btn;
        break;
      }
    }
    
    if (!startButton) throw new Error('Start button not found');
    await startButton.click();
    console.log('✅ Compilation started\n');
    
    // Ждать завершения (появление кнопки Download)
    console.log('⏳ Waiting for compilation (this may take 1-3 minutes)...');
    let attempts = 0;
    const maxAttempts = 60; // 5 минут
    let downloadButton = null;
    
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000)); // Каждые 5 секунд
      attempts++;
      
      const allButtons = await page.$$('button');
      for (const btn of allButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.toLowerCase().includes('download') || text.toLowerCase().includes('export'))) {
          downloadButton = btn;
          break;
        }
      }
      
      if (downloadButton) {
        console.log(`✅ Compilation complete! (${attempts * 5}s)\n`);
        break;
      }
      
      if (attempts % 6 === 0) { // Каждые 30 секунд
        console.log(`   Still compiling... (${attempts * 5}s elapsed)`);
      }
    }
    
    if (!downloadButton) {
      throw new Error('Compilation timeout - Download button never appeared');
    }
    
    // Скачать файл
    console.log('💾 Downloading .mind file...');
    
    // Ждём появления файла
    const targetsFile = path.join(outputDir, 'targets.mind');
    
    // Удалить старый файл если есть
    try {
      await fs.unlink(targetsFile);
    } catch {}
    
    // Нажать Download
    await downloadButton.click();
    
    // Ждать появления файла
    let fileAppeared = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        await fs.access(targetsFile);
        fileAppeared = true;
        break;
      } catch {}
    }
    
    if (!fileAppeared) {
      throw new Error('Download timeout - targets.mind file not found');
    }
    
    console.log('✅ File downloaded\n');
    
    // Переименовать если нужно
    if (targetsFile !== outputPath) {
      await fs.rename(targetsFile, outputPath);
    }
    
    // Статистика
    const stats = await fs.stat(outputPath);
    console.log('📊 Result:');
    console.log(`   File: ${outputPath}`);
    console.log(`   Size: ${stats.size} bytes`);
    console.log(`   Time: ${attempts * 5}s\n`);
    
    console.log('✨ SUCCESS! Now replace the old marker.mind:');
    console.log(`   cd "${outputDir}"`);
    console.log('   mv marker.mind marker-old.mind');
    console.log('   mv marker-web.mind marker.mind');
    console.log('\n📱 Then refresh AR viewer on phone and test!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🏁 Browser closed');
    }
  }
}

compileMind();
