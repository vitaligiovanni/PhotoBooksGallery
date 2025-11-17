# AR Video Sizing (Auto)

This service computes the video plane size so the video visually matches the printed photo marker with minimal setup.

How it works:
- Photo plane (marker) is modeled with width=1.0 A-Frame units; height = photoHeight/photoWidth to preserve the photo's aspect ratio.
- We read:
  - Photo dimensions via `sharp`
  - Video width/height/duration via `ffprobe` (`fluent-ffmpeg` + `ffprobe-static`)
- Sizing mode is `contain`:
  - The video scales to fit entirely within the photo plane, preserving its aspect ratio.
  - If video is taller than the plane at full width, we limit by height; otherwise we use full plane width.

Persisted fields (ar_projects):
- photoWidth/Height, videoWidth/Height, videoDurationMs
- photoAspectRatio, videoAspectRatio
- fitMode ('contain')
- scaleWidth, scaleHeight — final A-Frame plane dimensions for `<a-video>`

Viewer generation:
- `generateARViewer(...)` receives `videoScale.width/height` when available and applies them to the `<a-video>` element.
- Defaults remain if metadata isn’t available.

Admin calibration (future):
- Schema includes `isCalibrated` and `calibratedPosX/Y/Z` for later manual fine-tuning UI.
- Next steps could add rotation and fine per-device offsets, then write back to `config`.
