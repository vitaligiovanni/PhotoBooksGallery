# Square Marker Mode – User Guide

## Problem Statement

When creating AR projects for graduation albums with **square-printed photos**:
- Original photos are rectangular (e.g., 4:3 or 16:9)
- Printed versions are cropped to square (1:1)
- Videos are rectangular (e.g., 16:9)
- Without proper handling, videos appear **horizontally stretched** on square markers

## Solution: One-Click Square Mode

### Frontend: CreateAR.tsx

**New UI Element:**
```tsx
<input
  type="checkbox"
  id="squareMarkerMode"
  checked={squareMarkerMode}
  onChange={(e) => setSquareMarkerMode(e.target.checked)}
/>
<label htmlFor="squareMarkerMode">
  Квадратная печать (для выпускных альбомов)
</label>
```

**Description shown to user:**
> Автоматически обрежет видео в квадрат при наложении на квадратное фото. Используйте для печатных фотографий, обрезанных в квадрат.

**Behavior:**
When checkbox is enabled:
1. Form appends `fitMode='cover'` to FormData
2. Form appends `forceSquare='true'` to FormData
3. Backend receives these parameters during AR project creation

### Backend: ar-router.ts

**Parameter Extraction:**
```typescript
const { orderId, config, fitMode, forceSquare } = req.body;
```

**Configuration Applied:**
```typescript
if (forceSquare === 'true') {
  parsedConfig.fitMode = 'cover'; // Force cover mode
  parsedConfig.forceSquare = true; // Flag for tracking
  console.log('[AR Router] Square marker mode enabled - forcing cover fitMode');
}
```

**Database Storage:**
- `config` JSONB column stores: `{ fitMode: 'cover', forceSquare: true }`
- Available for future viewer regeneration or analytics

### AR Compilation: ar-compiler.ts

**Existing Auto-Detection (Still Active):**
```typescript
const photoIsSquare = Math.abs(photoAR - 1.0) < 0.1; // AR ~1.0 ±10%
const videoIsRectangular = Math.abs(videoAR - 1.0) > 0.2; // AR far from 1.0

if (photoIsSquare && videoIsRectangular && fitMode === 'contain') {
  effectiveFitMode = 'cover';
  console.log('🔄 AUTO-SWITCH: Square photo + rectangular video → cover mode');
}
```

**FitMode Processing:**
```typescript
const fitMode = ((project.config as any)?.fitMode || 'contain') as string;

if (fitMode === 'cover') {
  // Smart Crop video to match photo aspect ratio
  // Uses TensorFlow.js BlazeFace for face detection
  // Crops video to square while preserving important content
}
```

**Video Processing Pipeline:**
1. Extract metadata (photo: WxH, video: WxH)
2. Calculate aspect ratios (photoAR, videoAR)
3. If `fitMode === 'cover'`:
   - Run TensorFlow.js Smart Crop (face detection)
   - Crop video to match photo aspect ratio
   - Output: Square video for square markers
4. Generate AR viewer with correctly scaled video

## User Workflow

### Step 1: Upload Files
- Select rectangular photo (graduation photo)
- Select rectangular video (speech, congratulations)

### Step 2: Enable Square Mode
- ✅ Check **"Квадратная печать (для выпускных альбомов)"**
- System automatically sets `fitMode='cover'` + `forceSquare='true'`

### Step 3: Compilation
- Backend receives parameters
- Applies Smart Crop to video
- Generates viewer with square video overlay
- No CalibrationSandbox required!

### Step 4: AR Viewer Result
- Video appears correctly scaled on square marker
- No horizontal stretching
- Face/important content preserved via smart crop

## Technical Benefits

### ✅ Simplicity
- One checkbox instead of complex calibration UI
- No manual crop region adjustment
- Automatic processing

### ✅ Reliability
- Bypasses broken CalibrationSandbox
- Deterministic behavior
- Predictable results

### ✅ Performance
- TensorFlow.js Smart Crop: Face detection ensures optimal framing
- BlazeFace model: Fast, reliable face detection
- Fallback: Center crop if no faces detected

### ✅ Backward Compatibility
- Existing auto-detection still works
- Non-square markers use default `contain` mode
- Config stored in DB for future reference

## Testing Checklist

- [ ] Upload rectangular photo + video
- [ ] Enable Square Marker Mode checkbox
- [ ] Verify form sends `fitMode=cover` + `forceSquare=true`
- [ ] Backend logs: "Square marker mode enabled - forcing cover fitMode"
- [ ] Compilation logs: Using fitMode: cover
- [ ] Smart Crop logs: "Processing video with TensorFlow.js Smart Crop"
- [ ] AR viewer displays square video without stretching
- [ ] Print square photo → scan with phone → video appears correctly

## Alternative: Manual Override

If user needs custom crop:
1. Create AR project normally (without checkbox)
2. Navigate to Admin AR Edit page
3. Use CalibrationSandbox to manually adjust crop region
4. Click "Save Configuration" to regenerate viewer

This allows power users to fine-tune, while checkbox serves 90% of use cases.

## Code Locations

- `frontend/src/pages/CreateAR.tsx` - Lines 27, 107-113, 368-381
- `backend/src/routers/ar-router.ts` - Lines 92, 136-149
- `backend/src/services/ar-compiler.ts` - Lines 674, 776-790, 693-746

## Related Documentation

- `AR_COMPLETE_SUMMARY.md` - Full AR system overview
- `AR_FIX_QUICK_REF.md` - Previous bug fixes
- `FIX_HORIZONTAL_JUMP.md` - Horizontal stretch issue analysis
- `CalibrationSandbox.tsx` - Manual crop UI (backup solution)

---

**Status:** ✅ Implementation Complete  
**Tested:** 🟡 Awaiting User Testing  
**Next Step:** Deploy to production + user feedback
