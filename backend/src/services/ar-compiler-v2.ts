/**
 * AR Compiler v2 - Offline MindAR Compilation (Node.js only, Docker-compatible)
 * 
 * Заменяет Puppeteer + hiukim web compiler на:
 * - OfflineCompiler из mind-ar@1.2.5
 * - TensorFlow.js CPU backend (работает без GPU/WebGL)
 * - Локальная компиляция .mind файлов (10-30 секунд)
 * 
 * Зависимости (добавить в package.json):
 * - mind-ar@^1.2.5
 * - canvas@^2.11.2
 * - @tensorflow/tfjs-node@^4.15.0
 * - @msgpack/msgpack@^3.0.0-beta2
 * 
 * Docker: требует libcairo2-dev, libpango1.0-dev (см. Dockerfile)
 */

import fs from 'fs/promises';
import path from 'path';
import { loadImage } from 'canvas';

// ВАЖНО: Динамический import для ESM модулей из mind-ar
// Альтернатива: изменить package.json на "type": "module" (но это ломает CommonJS)
let OfflineCompiler: any;
let registerCPUKernels: any;

/**
 * Ленивая загрузка MindAR модулей (ESM)
 */
async function initMindAR() {
  if (OfflineCompiler) return;

  try {
    // Динамический import для ESM модулей
    // @ts-ignore
    const compilerModule = await import('mind-ar/src/image-target/offline-compiler.js');
    OfflineCompiler = compilerModule.OfflineCompiler;

    // Регистрируем CPU kernels для TensorFlow.js
    // @ts-ignore
    await import('mind-ar/src/image-target/detector/kernels/cpu/index.js');
    
    console.log('[AR Compiler v2] ✅ MindAR OfflineCompiler loaded');
  } catch (error: any) {
    console.error('[AR Compiler v2] ❌ Failed to load MindAR:', error);
    throw new Error(
      `MindAR initialization failed. Make sure dependencies are installed:\n` +
      `npm install mind-ar@1.2.5 canvas@2.11.2 @tensorflow/tfjs-node@4.15.0 @msgpack/msgpack@3.0.0-beta2`
    );
  }
}

export interface CompilationResult {
  success: boolean;
  mindFilePath?: string;
  compilationTimeMs?: number;
  fileSize?: number;
  error?: string;
  metadata?: {
    photoWidth?: number;
    photoHeight?: number;
    photoAspectRatio?: number;
    videoWidth?: number;
    videoHeight?: number;
  };
}

/**
 * Компилирует одно фото в .mind файл (оффлайн, Node.js)
 * 
 * @param photoPath - Абсолютный путь к фото-маркеру (JPG/PNG)
 * @param outputDir - Директория для сохранения .mind файла
 * @param markerBaseName - Имя файла без расширения (по умолчанию 'marker')
 * @returns Результат компиляции с путём к .mind файлу
 * 
 * @example
 * const result = await compileMindFile(
 *   'backend/objects/ar-uploads/photo.jpg',
 *   'backend/objects/ar-storage/project-123',
 *   'marker'
 * );
 * // Создаст: backend/objects/ar-storage/project-123/marker.mind
 */
export async function compileMindFile(
  photoPath: string,
  outputDir: string,
  markerBaseName: string = 'marker'
): Promise<CompilationResult> {
  const startTime = Date.now();
  
  try {
    // 1. Инициализация MindAR (только первый раз)
    await initMindAR();

    // 2. Проверка существования фото
    await fs.access(photoPath);
    console.log(`[AR Compiler v2] 📸 Loading image: ${photoPath}`);

    // 3. Загрузка изображения через node-canvas
    let image = await loadImage(photoPath);
    console.log(`[AR Compiler v2] Original image: ${image.width}x${image.height}px`);

    // 4. ОПТИМИЗАЦИЯ: Автоматически уменьшаем слишком большие изображения
    // Макс рекомендуемый размер: 1920x1080 (HD). Это ускоряет компиляцию в 2-3 раза!
    const MAX_DIMENSION = 1920;
    if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION) {
      const { createCanvas } = await import('canvas');
      const aspectRatio = image.width / image.height;
      let targetWidth = image.width;
      let targetHeight = image.height;
      
      if (image.width > image.height) {
        targetWidth = MAX_DIMENSION;
        targetHeight = Math.round(MAX_DIMENSION / aspectRatio);
      } else {
        targetHeight = MAX_DIMENSION;
        targetWidth = Math.round(MAX_DIMENSION * aspectRatio);
      }
      
      console.log(`[AR Compiler v2] 📐 Resizing to ${targetWidth}x${targetHeight}px for faster compilation...`);
      const canvas = createCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
      image = canvas as any; // Canvas implements same interface as Image
      console.log(`[AR Compiler v2] ✓ Resized (2-3x faster compilation expected)`);
    }

    // 5. Создание компилятора и компиляция
    // ОПТИМИЗАЦИЯ: maxScale уменьшаем для ускорения (от 1024 до 640)
    // Это снижает размер финального .mind файла и ускоряет компиляцию на 30-50%
    // Качество трекинга остаётся достаточным для фото размером до A4 печати
    const compiler = new OfflineCompiler({ maxScale: 640 });
    let lastProgressLog = 0;

    await compiler.compileImageTargets([image], (progress: number) => {
      // Логируем каждые 10% для избежания спама
      if (Math.floor(progress / 10) > lastProgressLog) {
        lastProgressLog = Math.floor(progress / 10);
        console.log(`[AR Compiler v2] 🔄 Progress: ${progress.toFixed(1)}%`);
      }
    });

    console.log('[AR Compiler v2] 🎯 Extracting tracking features...');

    // 6. Экспорт .mind файла (бинарный MessagePack)
    const exportedBuffer = compiler.exportData();
    
    // 7. Сохранение на диск
    await fs.mkdir(outputDir, { recursive: true });
    const mindFilePath = path.join(outputDir, `${markerBaseName}.mind`);
    await fs.writeFile(mindFilePath, exportedBuffer);

    const compilationTimeMs = Date.now() - startTime;
    const fileSize = exportedBuffer.length;

    console.log(
      `[AR Compiler v2] ✅ SUCCESS! Created ${mindFilePath}\n` +
      `  - Size: ${(fileSize / 1024).toFixed(1)} KB\n` +
      `  - Time: ${(compilationTimeMs / 1000).toFixed(1)}s`
    );

    return {
      success: true,
      mindFilePath,
      compilationTimeMs,
      fileSize,
    };
  } catch (error: any) {
    const compilationTimeMs = Date.now() - startTime;
    console.error(`[AR Compiler v2] ❌ FAILED after ${compilationTimeMs}ms:`, error);

    return {
      success: false,
      error: error.message || 'Unknown compilation error',
      compilationTimeMs,
    };
  }
}

/**
 * Компилирует несколько фото в один .mind файл (multi-target tracking)
 * 
 * Используйте для создания AR галерей, когда пользователь может навести камеру
 * на любое из нескольких фото и увидеть соответствующее видео.
 * 
 * @param photoPaths - Массив абсолютных путей к фото-маркерам
 * @param outputDir - Директория для сохранения .mind файла
 * @param outputFileName - Имя выходного файла (по умолчанию 'targets.mind')
 * @returns Результат компиляции
 * 
 * @example
 * const result = await compileMultiTargetMindFile(
 *   [
 *     'backend/objects/ar-uploads/photo1.jpg',
 *     'backend/objects/ar-uploads/photo2.jpg',
 *     'backend/objects/ar-uploads/photo3.jpg',
 *   ],
 *   'backend/objects/ar-storage/gallery-456',
 *   'gallery-targets.mind'
 * );
 * // Создаст 1 файл с 3 маркерами: gallery-targets.mind
 */
export async function compileMultiTargetMindFile(
  photoPaths: string[],
  outputDir: string,
  outputFileName: string = 'targets.mind'
): Promise<CompilationResult> {
  const startTime = Date.now();

  try {
    await initMindAR();

    if (photoPaths.length === 0) {
      throw new Error('No photo paths provided for multi-target compilation');
    }

    console.log(`[AR Compiler v2] 📸 Loading ${photoPaths.length} images...`);

    // Параллельная загрузка всех изображений
    const images = await Promise.all(
      photoPaths.map(async (photoPath, index) => {
        await fs.access(photoPath); // проверка существования
        const img = await loadImage(photoPath);
        console.log(`  [${index + 1}/${photoPaths.length}] ${path.basename(photoPath)}: ${img.width}x${img.height}px`);
        return img;
      })
    );

    // Извлекаем метаданные из первого изображения (используется как основное)
    const firstImageMetadata = {
      photoWidth: images[0]?.width || undefined,
      photoHeight: images[0]?.height || undefined,
      photoAspectRatio: images[0] ? (images[0].width / images[0].height) : undefined,
    };

    // ОПТИМИЗАЦИЯ: maxScale=640 для быстрой компиляции нескольких маркеров
    const compiler = new OfflineCompiler({ maxScale: 640 });
    let lastProgressLog = 0;

    await compiler.compileImageTargets(images, (progress: number) => {
      if (Math.floor(progress / 10) > lastProgressLog) {
        lastProgressLog = Math.floor(progress / 10);
        console.log(`[AR Compiler v2] 🔄 Multi-target progress: ${progress.toFixed(1)}%`);
      }
    });

    const exportedBuffer = compiler.exportData();
    
    await fs.mkdir(outputDir, { recursive: true });
    const mindFilePath = path.join(outputDir, outputFileName);
    await fs.writeFile(mindFilePath, exportedBuffer);

    const compilationTimeMs = Date.now() - startTime;
    const fileSize = exportedBuffer.length;

    console.log(
      `[AR Compiler v2] ✅ Multi-target SUCCESS! Created ${mindFilePath}\n` +
      `  - Targets: ${photoPaths.length}\n` +
      `  - First photo: ${firstImageMetadata.photoWidth}×${firstImageMetadata.photoHeight}px (AR=${firstImageMetadata.photoAspectRatio?.toFixed(3)})\n` +
      `  - Size: ${(fileSize / 1024).toFixed(1)} KB\n` +
      `  - Time: ${(compilationTimeMs / 1000).toFixed(1)}s`
    );

    return {
      success: true,
      mindFilePath,
      compilationTimeMs,
      fileSize,
      metadata: firstImageMetadata,
    };
  } catch (error: any) {
    const compilationTimeMs = Date.now() - startTime;
    console.error(`[AR Compiler v2] ❌ Multi-target FAILED after ${compilationTimeMs}ms:`, error);

    return {
      success: false,
      error: error.message,
      compilationTimeMs,
    };
  }
}

/**
 * Проверяет, доступна ли MindAR компиляция (зависимости установлены)
 */
export async function checkMindARAvailability(): Promise<{ available: boolean; error?: string }> {
  try {
    await initMindAR();
    return { available: true };
  } catch (error: any) {
    return {
      available: false,
      error: error.message,
    };
  }
}
