import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';

// Настроить пути к ffmpeg и ffprobe
if (ffmpegInstaller?.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeStatic?.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

export interface PhotoMetadata {
  width: number;
  height: number;
  aspectRatio: number; // width / height
}

export interface VideoMetadata {
  width: number;
  height: number;
  durationMs?: number;
  aspectRatio: number; // width / height
}

export interface MediaMetadataResult {
  photo: PhotoMetadata;
  video: VideoMetadata;
}

/**
 * Извлечь размеры изображения (маркер) через sharp
 */
export async function extractPhotoMetadata(photoPath: string): Promise<PhotoMetadata> {
  const img = sharp(photoPath);
  const info = await img.metadata();
  if (!info.width || !info.height) {
    throw new Error('Unable to read photo dimensions');
  }
  return {
    width: info.width,
    height: info.height,
    aspectRatio: info.width / info.height,
  };
}

/**
 * Извлечь размеры и длительность видео через ffprobe (fluent-ffmpeg)
 */
export function extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    // Ensure ffprobe path is set from bundled binary
    try {
      if (ffprobeStatic?.path) {
        ffmpeg.setFfprobePath(ffprobeStatic.path);
      }
    } catch {}
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) return reject(err);
      const stream = data.streams.find(s => s.width && s.height) as any;
      const width = stream?.width;
      const height = stream?.height;
      const duration = (data.format?.duration ?? 0) * 1000; // seconds -> ms
      if (!width || !height) {
        return reject(new Error('Unable to read video dimensions'));
      }
      resolve({
        width,
        height,
        durationMs: Math.round(duration) || undefined,
        aspectRatio: width / height,
      });
    });
  });
}

/**
 * Комплексная функция извлечения метаданных фото + видео
 */
export async function extractMediaMetadata(photoPath: string, videoPath: string): Promise<MediaMetadataResult> {
  const [photo, video] = await Promise.all([
    extractPhotoMetadata(photoPath),
    extractVideoMetadata(videoPath),
  ]);
  return { photo, video };
}

/**
 * Вычислить масштаб (width/height) для видео так, чтобы ОНО вписывалось (contain) в фото-маркер.
 * Предполагаем, что базовая ширина целевой плоскости = 1 единица (MindAR target plane шириной 1),
 * а высота целевой плоскости = photoHeight/photoWidth.
 * Затем масштабируем видео внутри этой плоскости по режиму 'contain'.
 */
export function computeVideoScaleForPhoto(photo: PhotoMetadata, video: VideoMetadata) {
  // Размер плоскости маркера в AR единицах
  const planeWidth = 1; // базовая ширина
  const planeHeight = photo.height / photo.width; // сохраняем пропорции фото

  // Пропорции
  const photoAR = photo.aspectRatio; // w/h
  const videoAR = video.aspectRatio; // w/h

  // Фит режим: contain => масштабируем видео так, чтобы оно целиком поместилось в плоскость
  // Сравним относительные ширины/высоты при подгонке
  // Если видео более "узкое" (меньший AR) чем фото, высота ограничивает
  // Иначе ширина ограничивает
  let resultWidth = planeWidth;
  let resultHeight = planeHeight;

  // Видео высота при ширине = planeWidth
  const videoHeightAtFullWidth = planeWidth / videoAR; // h = w / (w/h)
  if (videoHeightAtFullWidth <= planeHeight) {
    // Можно использовать полную ширину, высота вписывается
    resultWidth = planeWidth;
    resultHeight = videoHeightAtFullWidth;
  } else {
    // Высота видео больше чем плоскость, ограничиваем по высоте
    resultHeight = planeHeight;
    resultWidth = planeHeight * videoAR; // w = h * (w/h)
  }

  return {
    planeWidth,
    planeHeight,
    videoScaleWidth: resultWidth,
    videoScaleHeight: resultHeight,
    fitMode: 'contain' as const,
  };
}

/**
 * НОВАЯ ФУНКЦИЯ: Правильное вычисление размеров плоскости для разных режимов fit
 * @param photo - Метаданные маркера (фото)
 * @param video - Метаданные видео (уже обработанного в cover/contain)
 * @param mode - Режим: 'contain' (вписать), 'cover' (заполнить), 'fill' (растянуть), 'exact' (точные пропорции видео)
 */
export function computeOptimalPlaneScale(
  photo: PhotoMetadata,
  video: VideoMetadata,
  mode: 'contain' | 'cover' | 'fill' | 'exact' = 'contain'
) {
  const planeWidth = 1; // Стандартная ширина AR плоскости
  const photoAR = photo.aspectRatio;
  const videoAR = video.aspectRatio;

  switch (mode) {
    case 'cover':
      // Видео УЖЕ обрезано под пропорции фото
      // Плоскость = размер маркера
      return {
        width: planeWidth,
        height: planeWidth / photoAR, // Высота по пропорциям фото
        description: 'Cover: video cropped to match photo, plane sized to marker',
      };

    case 'fill':
      // Растянуть видео на весь маркер (игнорируя пропорции)
      return {
        width: planeWidth,
        height: planeWidth / photoAR,
        description: 'Fill: video stretched to fill entire marker (may distort)',
      };

    case 'exact':
      // Использовать точные пропорции ВИДЕО на маркере
      return {
        width: planeWidth,
        height: planeWidth / videoAR, // Высота по пропорциям ВИДЕО
        description: 'Exact: plane sized to video aspect ratio (may not match photo)',
      };

    case 'contain':
    default:
      // Вписать видео в маркер с сохранением пропорций
      const planeHeight = planeWidth / photoAR;
      
      if (videoAR >= photoAR) {
        // Видео шире: ограничиваем по ширине
        return {
          width: planeWidth,
          height: planeWidth / videoAR,
          description: 'Contain: video fits width, height adjusted',
        };
      } else {
        // Видео выше: ограничиваем по высоте
        return {
          width: planeHeight * videoAR,
          height: planeHeight,
          description: 'Contain: video fits height, width adjusted',
        };
      }
  }
}

/**
 * Обработать видео в режиме cover: обрезать/масштабировать чтобы соответствовать пропорциям фото
 * (без полос, заполнение всей области).
 * @param inputVideoPath - Исходное видео
 * @param outputVideoPath - Путь для сохранения обработанного видео
 * @param photoAspectRatio - Целевое соотношение сторон (width/height фото)
 * @returns Promise<void>
 */
export function processCoverModeVideo(
  inputVideoPath: string,
  outputVideoPath: string,
  photoAspectRatio: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (ffprobeStatic?.path) {
        ffmpeg.setFfprobePath(ffprobeStatic.path);
      }
    } catch {}

    // Сначала получаем метаданные видео
    ffmpeg.ffprobe(inputVideoPath, (err, data) => {
      if (err) return reject(err);
      
      const stream = data.streams.find(s => s.width && s.height) as any;
      const videoWidth = stream?.width;
      const videoHeight = stream?.height;
      
      if (!videoWidth || !videoHeight) {
        return reject(new Error('Unable to read video dimensions for cover processing'));
      }

      const videoAR = videoWidth / videoHeight;
      
      // Определяем как кадрировать:
      // Если видео "шире" чем фото (videoAR > photoAR), обрезаем слева-справа
      // Если видео "выше" чем фото (videoAR < photoAR), обрезаем сверху-снизу
      
      let cropFilter: string;
      
      if (Math.abs(videoAR - photoAspectRatio) < 0.01) {
        // Пропорции уже совпадают: избегаем дорогостоящего перекодирования
        // Быстро копируем исходный файл как результат и выходим
        try {
          const fs = require('fs');
          fs.copyFileSync(inputVideoPath, outputVideoPath);
          console.log('[Cover Mode] Aspect ratios match; skipped re-encode and copied video');
          return resolve();
        } catch (copyErr) {
          console.warn('[Cover Mode] Fast copy failed, falling back to re-encode:', (copyErr as any)?.message);
          cropFilter = '';
        }
      } else if (videoAR > photoAspectRatio) {
        // Видео шире, обрезаем по ширине (crop слева/справа)
        const targetWidth = Math.round(videoHeight * photoAspectRatio);
        const cropX = Math.round((videoWidth - targetWidth) / 2);
        cropFilter = `crop=${targetWidth}:${videoHeight}:${cropX}:0`;
      } else {
        // Видео выше, обрезаем по высоте (crop сверху/снизу)
        const targetHeight = Math.round(videoWidth / photoAspectRatio);
        const cropY = Math.round((videoHeight - targetHeight) / 2);
        cropFilter = `crop=${videoWidth}:${targetHeight}:0:${cropY}`;
      }

      const cmd = ffmpeg(inputVideoPath)
        .outputOptions('-c:a copy') // Копируем аудио без перекодирования
        .outputOptions('-preset ultrafast') // Ускоренное кодирование (было fast)
        .outputOptions('-crf 23'); // Качество (разумный баланс)

      // Если видео очень большое, ограничим ширину до 1280 для ускорения
      let filters: string[] = [];
      if (cropFilter) {
        filters.push(cropFilter);
      }
      if (videoWidth > 1280) {
        filters.push('scale=1280:-2');
        console.log('[Cover Mode] Downscaling video to 1280px width for performance');
      }
      if (filters.length > 0) {
        cmd.videoFilters(filters.join(','));
      }

      // Таймаут на перекодирование (60s) — при превышении убиваем процесс
      const killTimer = setTimeout(() => {
        try {
          (cmd as any)?._ffmpegProc?.kill('SIGKILL');
        } catch {}
        reject(new Error('Cover processing timeout (60s exceeded)'));
      }, 60_000);

      cmd
        .output(outputVideoPath)
        .on('end', () => {
          clearTimeout(killTimer);
          console.log(`[Cover Mode] Video processed successfully: ${outputVideoPath}`);
          resolve();
        })
        .on('error', (error) => {
          clearTimeout(killTimer);
          console.error('[Cover Mode] ffmpeg error:', error);
          reject(error);
        })
        .run();
    });
  });
}

/**
 * Обрезать видео по cropRegion (нормализованные координаты 0-1)
 * cropRegion.x, cropRegion.y - левый верхний угол (0-1 относительно ширины/высоты)
 * cropRegion.width, cropRegion.height - размер области (0-1)
 * @param inputVideoPath - Исходное видео
 * @param outputVideoPath - Путь для сохранения обрезанного видео
 * @param cropRegion - Область обрезки { x, y, width, height } в нормализованных единицах (0-1)
 * @returns Promise<void>
 */
export function cropVideoByRegion(
  inputVideoPath: string,
  outputVideoPath: string,
  cropRegion: { x: number; y: number; width: number; height: number }
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (ffprobeStatic?.path) {
        ffmpeg.setFfprobePath(ffprobeStatic.path);
      }
    } catch {}

    // Получаем размеры видео
    ffmpeg.ffprobe(inputVideoPath, (err, data) => {
      if (err) return reject(err);
      
      const stream = data.streams.find(s => s.width && s.height) as any;
      const videoWidth = stream?.width;
      const videoHeight = stream?.height;
      
      if (!videoWidth || !videoHeight) {
        return reject(new Error('Unable to read video dimensions for crop'));
      }

      // Конвертируем нормализованные координаты в пиксели
      const cropX = Math.round(cropRegion.x * videoWidth);
      const cropY = Math.round(cropRegion.y * videoHeight);
      const cropWidth = Math.round(cropRegion.width * videoWidth);
      const cropHeight = Math.round(cropRegion.height * videoHeight);

      // Проверка границ
      if (cropWidth <= 0 || cropHeight <= 0 || cropX < 0 || cropY < 0 || 
          cropX + cropWidth > videoWidth || cropY + cropHeight > videoHeight) {
        return reject(new Error(`Invalid crop region: x=${cropX}, y=${cropY}, w=${cropWidth}, h=${cropHeight} (video: ${videoWidth}x${videoHeight})`));
      }

      console.log(`[Crop Region] Cropping video: ${cropWidth}x${cropHeight} at (${cropX},${cropY}) from ${videoWidth}x${videoHeight}`);

      const cropFilter = `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`;

      const cmd = ffmpeg(inputVideoPath)
        .outputOptions('-c:a copy') // Копируем аудио
        .outputOptions('-preset ultrafast')
        .outputOptions('-crf 23')
        .videoFilters(cropFilter);

      const killTimer = setTimeout(() => {
        try {
          (cmd as any)?._ffmpegProc?.kill('SIGKILL');
        } catch {}
        reject(new Error('Crop processing timeout (60s exceeded)'));
      }, 60_000);

      cmd
        .output(outputVideoPath)
        .on('end', () => {
          clearTimeout(killTimer);
          console.log(`[Crop Region] Video cropped successfully: ${outputVideoPath}`);
          resolve();
        })
        .on('error', (error) => {
          clearTimeout(killTimer);
          console.error('[Crop Region] ffmpeg error:', error);
          reject(error);
        })
        .run();
    });
  });
}
