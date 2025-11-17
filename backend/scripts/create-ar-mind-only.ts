import fs from 'fs/promises';
import path from 'path';
import { compileMindFile } from '../src/services/mind-ar-web-compiler';
import { generateARViewer } from '../src/services/ar-compiler';
import { extractMediaMetadata, computeVideoScaleForPhoto } from '../src/services/media-metadata';

async function main() {
  // Пользовательские файлы (Windows пути)
  const photoPath = 'C:/Users/galle/Downloads/test000.png';
  const videoPath = 'C:/Users/galle/Downloads/Моя+школа+.mp4';

  // ID проекта и директория хранения
  const arId = `mind-only-${Date.now()}`;
  const backendRoot = process.cwd(); // уже backend/
  const storageDir = path.join(backendRoot, 'objects', 'ar-storage', arId);
  const markerName = 'marker';

  console.log(`[MindOnly] Photo: ${photoPath}`);
  console.log(`[MindOnly] Video: ${videoPath}`);
  console.log(`[MindOnly] Output: ${storageDir}`);

  await fs.mkdir(storageDir, { recursive: true });

  // Скопируем видео в целевую директорию
  const videoFileName = 'video.mp4';
  const videoDestPath = path.join(storageDir, videoFileName);
  await fs.copyFile(videoPath, videoDestPath);

  // Скомпилируем .mind через официальный веб-компилятор
  const mindPath = path.join(storageDir, `${markerName}.mind`);
  const mindRes = await compileMindFile({
    photoPath,
    outputMindPath: mindPath,
    maxWaitTimeMs: 5 * 60 * 1000,
  });

  if (!mindRes.success) {
    throw new Error(`MindAR web compilation failed: ${mindRes.error}`);
  }
  console.log(`[MindOnly] ✓ .mind compiled (${mindRes.fileSizeBytes} bytes)`);

  // Метаданные и автоподгонка размеров
  try {
    const meta = await extractMediaMetadata(photoPath, videoDestPath);
    const scale = computeVideoScaleForPhoto(meta.photo, meta.video);

    // Сгенерируем viewer HTML
    const viewerHtmlPath = path.join(storageDir, 'index.html');
    await generateARViewer(
      {
        arId,
        markerBaseName: markerName,
        videoFileName,
        videoScale: { width: scale.videoScaleWidth, height: scale.videoScaleHeight },
        autoPlay: true,
        loop: true,
      },
      viewerHtmlPath
    );
    console.log(`[MindOnly] ✓ Viewer generated: ${viewerHtmlPath}`);
  } catch (e: any) {
    console.warn('[MindOnly] metadata/scale failed, generating viewer with defaults:', e?.message);
    const viewerHtmlPath = path.join(storageDir, 'index.html');
    await generateARViewer(
      {
        arId,
        markerBaseName: markerName,
        videoFileName,
        autoPlay: true,
        loop: true,
      },
      viewerHtmlPath
    );
    console.log(`[MindOnly] ✓ Viewer generated (defaults): ${viewerHtmlPath}`);
  }

  const url = `${process.env.API_URL || 'http://localhost:5002'}/api/ar-storage/${arId}/index.html`;
  console.log(`\n[MindOnly] Open viewer: ${url}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
