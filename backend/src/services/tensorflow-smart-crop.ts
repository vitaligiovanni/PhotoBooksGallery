/**
 * TensorFlow.js Smart Crop для AR видео
 * 
 * Использует BlazeFace модель для детекции лиц вместо OpenCV
 * Преимущество: Не требует компиляции нативных модулей
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node'; // Backend для Node.js
import * as blazeface from '@tensorflow-models/blazeface';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs-extra';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number; // 0.0-1.0
  reason: 'face' | 'center' | 'edge' | 'motion';
}

export interface SmartCropConfig {
  maxFramesToAnalyze?: number; // Default: 5 (меньше чем OpenCV для скорости)
  padding?: number; // Default: 0.15 (15% padding вокруг лица)
  confidenceThreshold?: number; // Default: 0.5
}

/**
 * Главная функция: Детектирует лучшую область crop для видео
 */
export async function detectOptimalCropRegion(
  videoPath: string,
  targetAspectRatio: number, // например 1.0 для квадратного
  config: SmartCropConfig = {}
): Promise<CropRegion> {
  const {
    maxFramesToAnalyze = 5,
    padding = 0.15,
    confidenceThreshold = 0.5,
  } = config;

  console.log(`[TensorFlow] Analyzing video with BlazeFace: ${videoPath}`);

  // Получить метаданные видео
  const metadata = await getVideoMetadata(videoPath);
  console.log(`[TensorFlow] Video: ${metadata.width}x${metadata.height}, ${metadata.duration}s`);

  // Извлечь ключевые кадры
  const frames = await extractKeyFrames(videoPath, maxFramesToAnalyze, metadata);
  console.log(`[TensorFlow] Extracted ${frames.length} keyframes`);

  // Загрузить BlazeFace модель
  const model = await blazeface.load();
  console.log('[TensorFlow] BlazeFace model loaded');

  // Анализировать каждый кадр
  const detections: CropRegion[] = [];
  
  for (let i = 0; i < frames.length; i++) {
    const framePath = frames[i];
    try {
      const faces = await detectFacesInFrame(model, framePath, metadata);
      
      if (faces.length > 0) {
        const cropRegion = computeCropForFaces(
          faces,
          metadata.width,
          metadata.height,
          targetAspectRatio,
          padding
        );
        console.log(`[TensorFlow] Frame ${i}: Found ${faces.length} face(s), confidence: ${cropRegion.confidence.toFixed(2)}`);
        detections.push(cropRegion);
      } else {
        console.log(`[TensorFlow] Frame ${i}: No faces detected`);
      }
    } catch (error) {
      console.error(`[TensorFlow] Error analyzing frame ${i}:`, error);
    }
  }

  // Очистка временных файлов
  await cleanupFrames(frames);

  // Усреднить результаты
  if (detections.length > 0) {
    const avgRegion = averageRegions(detections);
    console.log(`[TensorFlow] ✅ Face detection successful: ${detections.length}/${maxFramesToAnalyze} frames, confidence: ${avgRegion.confidence.toFixed(2)}`);
    return avgRegion;
  }

  // Fallback: Center crop
  console.log('[TensorFlow] ⚠️ No faces detected, using center crop');
  return getCenterCrop(metadata.width, metadata.height, targetAspectRatio);
}

/**
 * Получить метаданные видео
 */
function getVideoMetadata(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));
      resolve({
        width: videoStream.width || 1920,
        height: videoStream.height || 1080,
        duration: parseFloat(String(metadata.format.duration || '10')),
      });
    });
  });
}

/**
 * Извлечь ключевые кадры из видео
 */
async function extractKeyFrames(
  videoPath: string,
  count: number,
  metadata: { duration: number }
): Promise<string[]> {
  const tempDir = path.join(path.dirname(videoPath), 'temp-frames');
  await fs.ensureDir(tempDir);

  const framePaths: string[] = [];
  const interval = Math.max(1, Math.floor(metadata.duration / (count + 1)));

  for (let i = 1; i <= count; i++) {
    const timestamp = interval * i;
    const framePath = path.join(tempDir, `frame-${i}.jpg`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .output(framePath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    framePaths.push(framePath);
  }

  return framePaths;
}

/**
 * Детектировать лица в кадре с помощью BlazeFace
 */
async function detectFacesInFrame(
  model: any,
  framePath: string,
  metadata: { width: number; height: number }
): Promise<Array<{ x: number; y: number; width: number; height: number; confidence: number }>> {
  // Загрузить изображение
  const image = await loadImage(framePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  // Конвертировать в тензор
  const imageTensor = tf.browser.fromPixels(canvas as any);

  // Детектировать лица
  const predictions: any[] = await model.estimateFaces(imageTensor, false);

  // Очистить память
  imageTensor.dispose();

  // Конвертировать результаты
  return predictions.map((pred) => {
    const x1 = Number(Array.from(pred.topLeft)[0]);
    const y1 = Number(Array.from(pred.topLeft)[1]);
    const x2 = Number(Array.from(pred.bottomRight)[0]);
    const y2 = Number(Array.from(pred.bottomRight)[1]);
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      confidence: Array.isArray(pred.probability) ? pred.probability[0] : pred.probability,
    };
  });
}

/**
 * Вычислить область crop для найденных лиц
 */
function computeCropForFaces(
  faces: Array<{ x: number; y: number; width: number; height: number; confidence: number }>,
  videoWidth: number,
  videoHeight: number,
  targetAspectRatio: number,
  padding: number
): CropRegion {
  // Найти bounding box всех лиц
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const face of faces) {
    minX = Math.min(minX, face.x);
    minY = Math.min(minY, face.y);
    maxX = Math.max(maxX, face.x + face.width);
    maxY = Math.max(maxY, face.y + face.height);
  }

  // Добавить padding
  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;
  const padX = boxWidth * padding;
  const padY = boxHeight * padding;

  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(videoWidth, maxX + padX);
  maxY = Math.min(videoHeight, maxY + padY);

  // Центр лиц
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Вычислить размеры crop
  let cropWidth: number;
  let cropHeight: number;

  if (targetAspectRatio > videoWidth / videoHeight) {
    // Широкий crop (ограничен по ширине)
    cropWidth = Math.min(videoWidth, (maxY - minY) * targetAspectRatio);
    cropHeight = cropWidth / targetAspectRatio;
  } else {
    // Высокий crop (ограничен по высоте)
    cropHeight = Math.min(videoHeight, (maxX - minX) / targetAspectRatio);
    cropWidth = cropHeight * targetAspectRatio;
  }

  // Центрировать crop на лицах
  let cropX = centerX - cropWidth / 2;
  let cropY = centerY - cropHeight / 2;

  // Убедиться что crop в пределах видео
  cropX = Math.max(0, Math.min(videoWidth - cropWidth, cropX));
  cropY = Math.max(0, Math.min(videoHeight - cropHeight, cropY));

  // Средняя уверенность
  const avgConfidence = faces.reduce((sum, f) => sum + f.confidence, 0) / faces.length;

  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
    confidence: avgConfidence,
    reason: 'face',
  };
}

/**
 * Усреднить несколько crop регионов для стабильности
 */
function averageRegions(regions: CropRegion[]): CropRegion {
  const avgX = regions.reduce((sum, r) => sum + r.x, 0) / regions.length;
  const avgY = regions.reduce((sum, r) => sum + r.y, 0) / regions.length;
  const avgWidth = regions.reduce((sum, r) => sum + r.width, 0) / regions.length;
  const avgHeight = regions.reduce((sum, r) => sum + r.height, 0) / regions.length;
  const avgConfidence = regions.reduce((sum, r) => sum + r.confidence, 0) / regions.length;

  return {
    x: Math.round(avgX),
    y: Math.round(avgY),
    width: Math.round(avgWidth),
    height: Math.round(avgHeight),
    confidence: avgConfidence,
    reason: regions[0].reason,
  };
}

/**
 * Fallback: Центральный crop
 */
function getCenterCrop(videoWidth: number, videoHeight: number, targetAspectRatio: number): CropRegion {
  let cropWidth: number;
  let cropHeight: number;

  const videoAspectRatio = videoWidth / videoHeight;

  if (targetAspectRatio > videoAspectRatio) {
    cropWidth = videoWidth;
    cropHeight = videoWidth / targetAspectRatio;
  } else {
    cropHeight = videoHeight;
    cropWidth = videoHeight * targetAspectRatio;
  }

  const cropX = (videoWidth - cropWidth) / 2;
  const cropY = (videoHeight - cropHeight) / 2;

  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
    confidence: 0.3,
    reason: 'center',
  };
}

/**
 * Очистить временные файлы кадров
 */
async function cleanupFrames(framePaths: string[]): Promise<void> {
  for (const framePath of framePaths) {
    try {
      await fs.remove(framePath);
    } catch (error) {
      console.warn(`[TensorFlow] Failed to remove frame: ${framePath}`);
    }
  }
  
  // Удалить временную папку
  if (framePaths.length > 0) {
    const tempDir = path.dirname(framePaths[0]);
    try {
      await fs.remove(tempDir);
    } catch (error) {
      console.warn(`[TensorFlow] Failed to remove temp directory: ${tempDir}`);
    }
  }
}

/**
 * Главная функция: Smart crop видео с использованием TensorFlow.js
 */
export async function smartCropVideo(
  inputPath: string,
  outputPath: string,
  targetAspectRatio: number,
  strategy: 'auto' | 'face' = 'auto'
): Promise<{ success: boolean; cropRegion?: CropRegion; error?: string }> {
  try {
    console.log(`[TensorFlow] Starting smart crop: ${inputPath}`);
    
    // Детектировать оптимальный crop
    const cropRegion = await detectOptimalCropRegion(inputPath, targetAspectRatio);

    // Применить crop с помощью ffmpeg
    await applyCrop(inputPath, outputPath, cropRegion);

    console.log(`[TensorFlow] ✅ Smart crop completed: ${cropRegion.reason} (confidence: ${cropRegion.confidence.toFixed(2)})`);

    return {
      success: true,
      cropRegion,
    };
  } catch (error) {
    console.error('[TensorFlow] Smart crop failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Применить crop к видео с помощью ffmpeg
 */
function applyCrop(
  inputPath: string,
  outputPath: string,
  cropRegion: CropRegion
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cropFilter = `crop=${cropRegion.width}:${cropRegion.height}:${cropRegion.x}:${cropRegion.y}`;
    
    ffmpeg(inputPath)
      .videoFilters(cropFilter)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}
