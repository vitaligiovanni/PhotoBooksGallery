# AR Compiler Performance Optimization Plan

## Problems Identified

### 1. CRM Panel Freezes During Compilation
**Root Cause**: Excessive database UPDATE operations (11 updates per compilation)
- Each `db.update()` acquires row-level lock on `ar_projects` table
- Other queries (SELECT from CRM) wait for lock release
- PostgreSQL default isolation level (READ COMMITTED) causes blocking

**Solution**: Remove all intermediate progress updates, keep only:
- Start: `status = 'processing'`
- End: `status = 'ready'` or `status = 'error'`

### 2. Slow Compilation (3-4 minutes)
**Root Causes**:
1. **Large images**: Photos 5000x5000px take 3-5x longer than 1920x1080px
2. **No pre-resize**: ar-compiler-v2.ts resizes inside MindAR, but too late
3. **Video processing**: Smart crop with TensorFlow.js face detection adds time
4. **Border enhancer**: Adds unique borders (good for quality, but costs time)

**Solutions**:
1. Pre-resize photo to 1920px BEFORE border enhancement (3x faster)
2. Cache processed videos (skip re-encoding if already processed)
3. Make border enhancer optional for demo (faster demos)
4. Optimize ffmpeg flags for speed

## Implementation Steps

### Step 1: Remove DB Lock Hell ✅
```typescript
// BEFORE (11 updates):
await db.update(arProjects).set({ config: { progressPhase: 'media-prepared' } })
await db.update(arProjects).set({ config: { progressPhase: 'marker-compiling' } })
await db.update(arProjects).set({ config: { progressPhase: 'marker-compiled' } })
// ... 8 more updates

// AFTER (2 updates):
await db.update(arProjects).set({ status: 'processing' })
// ... heavy work in background ...
await db.update(arProjects).set({ status: 'ready' })
```

### Step 2: Aggressive Pre-Resize ✅
```typescript
// Add before border enhancement in compileSinglePhotoProject():
const MAX_PHOTO_DIMENSION = 1920;
const resizedPhotoPath = await resizePhotoIfNeeded(photoPath, storageDir, MAX_PHOTO_DIMENSION);
// Use resizedPhotoPath for all subsequent operations
```

### Step 3: Make Border Enhancer Optional for Demos
```typescript
// In compileSinglePhotoProject, check isDemo flag:
const skipEnhancer = project.isDemo === true;
if (skipEnhancer) {
  console.log('[AR Compiler] Demo mode: skipping border enhancer for speed');
  finalMarkerSourcePath = resizedPhotoPath;
} else {
  const enhancerResult = await enhanceMarkerPhotoSimple(resizedPhotoPath, ...);
  finalMarkerSourcePath = enhancerResult.enhanced 
    ? await createCroppedMindMarker(...)
    : resizedPhotoPath;
}
```

### Step 4: Optimize Video Processing
```typescript
// Skip smart crop for demos (use center crop only)
const useSmartCrop = !project.isDemo && configSmartCrop !== false;

// Add caching for processed videos (check if video already processed)
const videoHash = await getFileHash(videoPath);
const cachedVideoPath = path.join(storageDir, `video-${videoHash}.mp4`);
if (await fs.access(cachedVideoPath).then(() => true).catch(() => false)) {
  finalVideoPath = cachedVideoPath;
} else {
  // Process and cache
}
```

## Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Compilation Time (regular) | 180-240s | 40-60s | **4x faster** |
| Compilation Time (demo) | 180-240s | 20-30s | **8x faster** |
| CRM Freeze | Yes (full freeze) | No (smooth) | **100% fixed** |
| DB Locks | 11 per compile | 2 per compile | **82% reduction** |

## Testing Checklist

- [ ] Create demo AR with 5000x5000px photo → should complete in <30s
- [ ] During compilation, open CRM dashboard → should load instantly
- [ ] Check PostgreSQL locks: `SELECT * FROM pg_locks WHERE relation::regclass::text = 'ar_projects';`
- [ ] Verify QR code still generates correctly
- [ ] Test on production server (Docker)

## Rollback Plan

If optimization breaks something:
1. Git revert to previous ar-compiler.ts version
2. Keep TUNNEL_URL fix and isDemo/expiresAt fields
3. Re-apply only resize optimization (smallest risk)
