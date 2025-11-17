/**
 * Автоматическая компиляция .mind файлов через официальный веб-компилятор MindAR
 * Использует Puppeteer для автоматизации браузера
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

const COMPILER_URL = 'https://hiukim.github.io/mind-ar-js-doc/tools/compile';

let browserInstance: Browser | null = null;

/**
 * Получить или создать экземпляр браузера (singleton для оптимизации)
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    console.log('[MindAR Web Compiler] Launching browser with WebGL enabled...');
    browserInstance = await puppeteer.launch({
      headless: false, // headful to ensure WebGL availability
      defaultViewport: { width: 1280, height: 900 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--ignore-gpu-blocklist',
        '--enable-webgl',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--window-size=1280,900',
      ],
    });
    console.log('[MindAR Web Compiler] ✅ Browser launched');
  }
  return browserInstance;
}

/**
 * Закрыть браузер (вызывается при завершении процесса)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log('[MindAR Web Compiler] Browser closed');
  }
}

interface CompilationOptions {
  photoPath: string;          // Путь к фото-маркеру
  outputMindPath: string;      // Куда сохранить targets.mind
  maxWaitTimeMs?: number;      // Максимальное время ожидания компиляции (по умолчанию 5 минут)
}

interface CompilationResult {
  success: boolean;
  mindFilePath?: string;
  fileSizeBytes?: number;
  compilationTimeMs?: number;
  error?: string;
}

/**
 * Скомпилировать .mind файл через веб-интерфейс MindAR
 */
export async function compileMindFile(options: CompilationOptions): Promise<CompilationResult> {
  const startTime = Date.now();
  const { photoPath, outputMindPath, maxWaitTimeMs = 5 * 60 * 1000 } = options;

  let page: Page | null = null;

  try {
    console.log('[MindAR Web Compiler] Starting compilation...');
    console.log(`  Photo: ${photoPath}`);
    console.log(`  Output: ${outputMindPath}`);

    // Проверка что фото существует
    await fs.access(photoPath);

    // Создать выходную директорию если нужно
    await fs.mkdir(path.dirname(outputMindPath), { recursive: true });

    // Получить браузер
    const browser = await getBrowser();
    page = await browser.newPage();

    // Включаем подробные логи из контекста страницы для диагностики
    page.on('console', (msg) => {
      try { console.log(`[MindAR Page][${msg.type()}]`, msg.text()); } catch {}
    });
    page.on('pageerror', (err: any) => {
      console.error('[MindAR Page][pageerror]', (err && (err.message || String(err))) );
    });
    page.on('requestfailed', (req) => {
      console.warn('[MindAR Page][requestfailed]', req.url(), req.failure()?.errorText);
    });

    // Настроить загрузки
    // CRITICAL: Ensure absolute path with proper Windows format for Chrome CDP
    const downloadPath = path.resolve(path.normalize(path.dirname(outputMindPath)));
    console.log(`[MindAR Web Compiler] Download path: ${downloadPath}`);
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    // Открыть страницу компилятора
    console.log('[MindAR Web Compiler] Opening compiler page...');
    await page.goto(COMPILER_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Отладка: проверим структуру страницы сразу после загрузки
    const initialState = await page.evaluate(() => {
      return {
        // @ts-expect-error - Browser context has DOM types
        buttons: Array.from(document.querySelectorAll('button')).map((b: any) => ({
          text: b.textContent?.trim(),
          disabled: b.disabled,
          id: b.id,
          className: b.className
        })),
        // @ts-expect-error - Browser context has DOM types
        inputs: Array.from(document.querySelectorAll('input')).map((i: any) => ({
          type: i.type,
          id: i.id,
          className: i.className
        }))
      };
    });
    console.log('[MindAR Web Compiler] Initial page state:', JSON.stringify(initialState, null, 2));

    // Загрузить фото в input[type="file"]
    console.log('[MindAR Web Compiler] Uploading photo...');
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found on compiler page');
    }
    await fileInput.uploadFile(photoPath);

    // Подождать немного чтобы UI обновился
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Убедимся, что Dropzone отрисовал превью загруженного изображения
    try {
      await page.waitForSelector('.dz-preview', { timeout: 10000 });
      const dzInfo = await page.evaluate(() => {
        // @ts-expect-error
        const previews = Array.from(document.querySelectorAll('.dz-preview')) as any[];
        return { previews: previews.length };
      });
      console.log('[MindAR Web Compiler] Dropzone previews:', dzInfo);
    } catch {
      console.warn('[MindAR Web Compiler] .dz-preview not detected; proceeding anyway');
    }
    
    // Отладка: проверим состояние после загрузки файла
    const afterUploadState = await page.evaluate(() => {
      return {
        // @ts-expect-error - Browser context has DOM types
        buttons: Array.from(document.querySelectorAll('button')).map((b: any) => ({
          text: b.textContent?.trim(),
          disabled: b.disabled,
          visible: b.offsetParent !== null
        }))
      };
    });
    console.log('[MindAR Web Compiler] After upload state:', JSON.stringify(afterUploadState, null, 2));

    // Найти и нажать кнопку "Start"
    console.log('[MindAR Web Compiler] Looking for Start button...');
    // В puppeteer v22+ $x убран; используем evaluate для поиска по тексту
    const startHandle = await page.evaluateHandle(() => {
      // @ts-expect-error - Browser context DOM
      const btns = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
      return (
        btns.find(b => (b.textContent || '').trim().toLowerCase() === 'start') ||
        btns.find(b => (b.textContent || '').toLowerCase().includes('start')) ||
        null
      );
    });
    let startButton = startHandle.asElement();
    if (!startButton) {
      startButton = await page.$('button.startButton_OY2G');
    }
    if (!startButton) {
      // Попробуем найти кнопку по role и имени
      const candidates = await page.$$('button, [role="button"]');
      for (const c of candidates) {
        const txt = (await c.evaluate(el => (el as any).innerText || '')).trim().toLowerCase();
        if (txt.includes('start')) { startButton = c; break; }
      }
    }
    if (!startButton) {
      const allButtons = await page.$$eval('button', btns => btns.map(b => (b as any).textContent?.trim()));
      console.error('[MindAR Web Compiler] Start button not found. Buttons:', allButtons);
      throw new Error('Start button not found');
    }
    console.log('[MindAR Web Compiler] Clicking Start button...');
    await startButton.click();

    // Дождаться появления и установить Scale = 5
    try {
      console.log('[MindAR Web Compiler] Waiting for Scale control...');
      // Ищем input c подписью "Scale" (range или number)
      await page.waitForFunction(() => {
        // @ts-expect-error - Browser context DOM
        const labels = Array.from(document.querySelectorAll('label')) as HTMLLabelElement[];
        const label = labels.find(l => (l.textContent || '').toLowerCase().includes('scale'));
        if (!label) return false;
        const input = label.querySelector('input');
        return !!input;
      }, { timeout: 20000 });

      await page.evaluate(() => {
        // @ts-expect-error - Browser context DOM available
        const labels = Array.from(document.querySelectorAll('label')) as any[];
        const label = labels.find((l: any) => (l.textContent || '').toLowerCase().includes('scale')) as any | undefined;
        let input: any | null = null;
        if (label) input = label.querySelector('input');
        if (!input) {
          // fallback: первый range/number input на странице
          // @ts-expect-error - Browser context DOM available
          input = (document.querySelector('input[type="range"]') || document.querySelector('input[type="number"]')) as any | null;
        }
        if (input) {
          input.value = '5';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      console.log('[MindAR Web Compiler] Scale set to 5');
    } catch (e) {
      console.warn('[MindAR Web Compiler] Scale control not found or failed to set. Proceeding with default.');
    }

    // Дождаться кнопки "Download compiled" и нажать
    console.log('[MindAR Web Compiler] Waiting for "Download compiled" button...');
    try {
      const downloadBtnHandle = await page.waitForFunction(() => {
        // @ts-expect-error - Browser context DOM
        const btns = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
        return (
          btns.find(b => (b.textContent || '').toLowerCase().includes('download compiled')) ||
          null
        );
      }, { timeout: 120000 });
      const downloadBtn = downloadBtnHandle.asElement();
      if (downloadBtn) {
        console.log('[MindAR Web Compiler] Clicking "Download compiled"...');
        await downloadBtn.click();
      }
    } catch {
      console.warn('[MindAR Web Compiler] "Download compiled" button not found within 120s. Will rely on direct link or filesystem watch.');
    }

    // Ожидание завершения компиляции: отслеживаем появление .mind файла в папке загрузки
    console.log('[MindAR Web Compiler] Waiting for compiled file to appear in download folder...');

    let progressReported = 0;
    const progressCheckInterval = setInterval(async () => {
      progressReported += 5;
      if (progressReported <= 100) {
        console.log(`  Progress: ~${progressReported}% (estimated)`);
      }
      // Легкая телеметрия DOM (на случай изменений разметки)
      try {
        const pageState = await page!.evaluate(() => {
          // @ts-expect-error - Browser context has DOM types
          const btns = Array.from(document.querySelectorAll('button'));
          // @ts-expect-error - Browser context has DOM types
          const links = Array.from(document.querySelectorAll('a'));
          const downloadLink = links.find((a: any) => a.getAttribute('download'));
          return {
            buttonsCount: btns.length,
            linksCount: links.length,
            downloadLinkFound: !!downloadLink,
          };
        });
        console.log(`  [Debug] Page state:`, JSON.stringify(pageState));
      } catch {}
    }, 5000);

    // Разрешить загрузки в папку output
    const cdpSession = await page.createCDPSession();
    await cdpSession.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    const startedWait = Date.now();
    let detectedMindPath: string | null = null;
    let downloadClicked = false;
    while (Date.now() - startedWait < maxWaitTimeMs) {
      // Периодически пробуем нажать на ссылку с атрибутом download, если она появилась
      try {
        if (!downloadClicked) {
          const clicked = await page.evaluate(() => {
            // @ts-expect-error - Browser context DOM available
            const a = document.querySelector('a[download]') as any | null;
            if (a) {
              (a as any).click?.();
              return true;
            }
            return false;
          });
          if (clicked) {
            downloadClicked = true;
            console.log('[MindAR Web Compiler] Clicked direct download link');
          }
        }
      } catch {}

      const files = await fs.readdir(downloadPath);
      const mind = files.find(f => f.toLowerCase().endsWith('.mind') && !f.toLowerCase().endsWith('.crdownload'));
      if (mind) {
        detectedMindPath = path.join(downloadPath, mind);
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    clearInterval(progressCheckInterval);

    if (!detectedMindPath) {
      console.warn('[MindAR Web Compiler] No .mind file detected via filesystem. Trying DOM blob extraction fallback...');
      try {
        const blobData = await page.evaluate(async () => {
          // @ts-expect-error - Browser context has DOM types
          const links = Array.from(document.querySelectorAll('a')) as any[];
          const dl = links.find((a: any) => a.getAttribute && a.getAttribute('download')) as any;
          if (!dl || !dl.href) return null;
          const response = await fetch(dl.href);
          const blob = await response.blob();
          // @ts-expect-error - Browser context has DOM types
          const reader = new FileReader();
          return await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        });

        if (!blobData) {
          throw new Error('Blob extraction returned null');
        }

        const out = path.join(downloadPath, 'targets.mind');
        await fs.writeFile(out, Buffer.from(blobData as string, 'base64'));
        detectedMindPath = out;
        console.log('[MindAR Web Compiler] ✅ Blob extracted and saved to file');
      } catch (e) {
        // Финальная диагностика DOM
        const finalState = await page.evaluate(() => ({
          // @ts-expect-error - Browser context has DOM types
          html: document.body.innerHTML.substring(0, 1200),
          // @ts-expect-error - Browser context has DOM types
          links: Array.from(document.querySelectorAll('a')).map((a: any) => ({
            text: a.textContent,
            download: a.getAttribute('download'),
            href: a.getAttribute('href')?.substring(0, 120)
          })),
        }));
        try {
          const shotPath = path.join(downloadPath, `mindar-compiler-failed-${Date.now()}.png`) as `${string}.png`;
          await page.screenshot({ path: shotPath, fullPage: true });
          console.error('[MindAR Web Compiler] Saved debug screenshot:', shotPath);
        } catch {}
        console.error('[MindAR Web Compiler] ❌ No file and blob fallback failed. Final DOM:', JSON.stringify(finalState, null, 2));
        throw new Error(`Compilation timeout after ${maxWaitTimeMs}ms - no .mind file detected`);
      }
    }

    // Переместить/переименовать итоговый файл
    if (detectedMindPath && detectedMindPath !== outputMindPath) {
      await fs.rename(detectedMindPath, outputMindPath);
    }
    console.log(`[MindAR Web Compiler] ✅ File ready: ${outputMindPath}`);

    // Получить размер файла
    const stats = await fs.stat(outputMindPath);
    const compilationTime = Date.now() - startTime;

    console.log(`[MindAR Web Compiler] ✅ Success!`);
    console.log(`  File size: ${stats.size} bytes`);
    console.log(`  Time: ${compilationTime}ms`);

    return {
      success: true,
      mindFilePath: outputMindPath,
      fileSizeBytes: stats.size,
      compilationTimeMs: compilationTime,
    };

  } catch (error: any) {
    console.error('[MindAR Web Compiler] ❌ Error:', error.message);
    return {
      success: false,
      error: error.message,
      compilationTimeMs: Date.now() - startTime,
    };

  } finally {
    if (page) {
      await page.close();
    }
  }
}

// Закрыть браузер при завершении процесса
process.on('exit', () => {
  if (browserInstance) {
    browserInstance.close();
  }
});

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
