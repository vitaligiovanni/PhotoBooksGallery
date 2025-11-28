import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Configure ffmpeg paths
if (ffmpegInstaller?.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeStatic?.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

interface VideoMetadata {
  width: number;
  height: number;
  aspectRatio: number;
}

function extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) return reject(err);
      const stream = data.streams.find(s => s.width && s.height) as any;
      const width = stream?.width;
      const height = stream?.height;
      if (!width || !height) {
        return reject(new Error('Unable to read video dimensions'));
      }
      resolve({ width, height, aspectRatio: width / height });
    });
  });
}

/**
 * Resize/crop video to match photo dimensions
 * - If video AR ≈ photo AR: just resize
 * - If video wider: crop sides to match photo AR, then resize
 * - If video taller: crop top/bottom to match photo AR, then resize
 * - Never upscale beyond 1920px (keeps file size reasonable)
 */
export async function resizeVideoToMatchPhoto(
  videoSrc: string,
  photoWidth: number,
  photoHeight: number,
  outputPath: string
): Promise<void> {
  const photoAR = photoWidth / photoHeight;
  const videoMeta = await extractVideoMetadata(videoSrc);
  const videoAR = videoMeta.width / videoMeta.height;
  
  console.log(`[Video Processor] Source: ${videoMeta.width}×${videoMeta.height} (AR=${videoAR.toFixed(3)})`);
  console.log(`[Video Processor] Target: ${photoWidth}×${photoHeight} (AR=${photoAR.toFixed(3)})`);
  
  // Calculate target dimensions (max 1920px on longest side)
  const maxDimension = 1920;
  let targetWidth = photoWidth;
  let targetHeight = photoHeight;
  
  if (Math.max(photoWidth, photoHeight) > maxDimension) {
    const scale = maxDimension / Math.max(photoWidth, photoHeight);
    targetWidth = Math.round(photoWidth * scale);
    targetHeight = Math.round(photoHeight * scale);
    console.log(`[Video Processor] Optimizing: scaled to ${targetWidth}×${targetHeight} (max ${maxDimension}px)`);
  }
  
  // Build ffmpeg command
  let command = ffmpeg(videoSrc);
  
  // If aspect ratios differ significantly, crop first
  const arDiff = Math.abs(videoAR - photoAR);
  if (arDiff > 0.05) {
    if (videoAR > photoAR) {
      // Video wider → crop sides (center crop)
      const cropWidth = Math.round(videoMeta.height * photoAR);
      const cropX = Math.round((videoMeta.width - cropWidth) / 2);
      console.log(`[Video Processor] Cropping sides: ${cropWidth}×${videoMeta.height} (offset X=${cropX})`);
      command = command.videoFilters(`crop=${cropWidth}:${videoMeta.height}:${cropX}:0`);
    } else {
      // Video taller → crop top/bottom (center crop)
      const cropHeight = Math.round(videoMeta.width / photoAR);
      const cropY = Math.round((videoMeta.height - cropHeight) / 2);
      console.log(`[Video Processor] Cropping top/bottom: ${videoMeta.width}×${cropHeight} (offset Y=${cropY})`);
      command = command.videoFilters(`crop=${videoMeta.width}:${cropHeight}:0:${cropY}`);
    }
  }
  
  // Resize to target dimensions
  return new Promise((resolve, reject) => {
    command
      .size(`${targetWidth}x${targetHeight}`)
      .videoCodec('libx264')
      .outputOptions([
        '-crf 23', // Good quality, reasonable size
        '-preset fast', // Balance speed/quality
        '-movflags +faststart', // Web optimization
      ])
      .output(outputPath)
      .on('start', (cmdLine) => {
        console.log(`[Video Processor] ffmpeg: ${cmdLine}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[Video Processor] Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`[Video Processor] ✅ Processed: ${outputPath}`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`[Video Processor] ❌ ffmpeg error:`, err);
        reject(err);
      })
      .run();
  });
}
