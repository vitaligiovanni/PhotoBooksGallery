# AR Mask System - Complete Implementation Guide

## ✅ Implemented Features

### 1. Backend (ar-service)

#### 1.1 Mask Processing (`ar-compiler-core.ts`)
- ✅ **Auto-generation** from shape templates (circle, oval, square, rect)
- ✅ **Custom PNG/WebP** upload support
- ✅ **Multi-target masks** - individual mask per video
- ✅ **Size matching** - masks scaled to 1024x1024 or custom dimensions
- ✅ **Error handling** - validates mask files, handles missing templates

#### 1.2 Mask Templates (`/ar-mask-templates/`)
- ✅ `circle.png` - Perfect circle mask (1024x1024)
- ✅ `oval.png` - Horizontal oval mask
- ✅ `square.png` - Full square (no mask effect)
- ✅ `rounded-rect.png` - Rounded rectangle mask

#### 1.3 API Endpoints (`compile.ts`)
```typescript
POST /compile
{
  "photoUrls": ["photo-0.jpg", "photo-1.jpg"],
  "videoUrls": ["video-0.mp4", "video-1.mp4"],
  
  // Option 1: Auto-generate mask
  "shapeType": "circle" | "oval" | "square" | "rect",
  
  // Option 2: Single custom mask for all videos
  "maskUrl": "/objects/uploads/custom-mask.png",
  
  // Option 3: Individual custom masks (multi-target)
  "maskUrls": [
    "/objects/uploads/mask-0.png",
    "/objects/uploads/mask-1.png"
  ]
}
```

### 2. AR Viewer (`generateMultiTargetARViewer`)

#### 2.1 A-Frame Material with alphaMap
```html
<!-- Without mask -->
<a-plane material="src:#vid0;shader:flat;transparent:true">
</a-plane>

<!-- With mask -->
<a-plane material="src:#vid0;alphaMap:#mask0;shader:standard;transparent:true;roughness:1;metalness:0">
</a-plane>
```

#### 2.2 Assets
```html
<a-assets>
  <!-- Videos -->
  <video id="vid0" src="./video-0.mp4"></video>
  <video id="vid1" src="./video-1.mp4"></video>
  
  <!-- Masks -->
  <img id="mask0" src="./mask-0.png" crossorigin="anonymous">
  <img id="mask1" src="./mask-1.png" crossorigin="anonymous">
</a-assets>
```

### 3. Storage Structure
```
/objects/ar-storage/{projectId}/
├── marker.mind           # MindAR compiled markers
├── index.html            # AR viewer with masks
├── qr-code.png          # QR code
├── video-0.mp4          # Videos
├── video-1.mp4
├── mask-0.png           # Generated or custom masks
└── mask-1.png
```

---

## 🎨 CRM Integration (TODO)

### Required UI Changes in AR Editor

#### Location: `frontend/src/pages/AdminAREdit.tsx` or `CreateAR.tsx`

#### 1. Add Mask Shape Selector
```tsx
<div className="mask-section">
  <h3>📐 Форма маски (опционально)</h3>
  
  <div className="shape-selector">
    <button 
      className={shapeType === 'circle' ? 'active' : ''}
      onClick={() => setShapeType('circle')}
    >
      ⭕ Круг
    </button>
    
    <button 
      className={shapeType === 'oval' ? 'active' : ''}
      onClick={() => setShapeType('oval')}
    >
      🥚 Овал
    </button>
    
    <button 
      className={shapeType === 'square' ? 'active' : ''}
      onClick={() => setShapeType('square')}
    >
      ◻️ Квадрат
    </button>
    
    <button 
      className={shapeType === 'rect' ? 'active' : ''}
      onClick={() => setShapeType('rect')}
    >
      ▭ Прямоугольник
    </button>
    
    <button 
      className={shapeType === 'custom' ? 'active' : ''}
      onClick={() => setShapeType('custom')}
    >
      🎭 Своя маска (PNG/WebP)
    </button>
  </div>
  
  {/* Show upload only if custom selected */}
  {shapeType === 'custom' && (
    <div className="custom-mask-upload">
      <input
        type="file"
        accept=".png,.webp"
        onChange={handleMaskUpload}
      />
      {maskPreview && (
        <img 
          src={maskPreview} 
          alt="Mask preview"
          style={{width: 200, height: 200, objectFit: 'contain'}}
        />
      )}
    </div>
  )}
</div>
```

#### 2. State Management
```tsx
const [shapeType, setShapeType] = useState<'circle' | 'oval' | 'square' | 'rect' | 'custom' | null>(null);
const [maskFile, setMaskFile] = useState<File | null>(null);
const [maskPreview, setMaskPreview] = useState<string | null>(null);
const [maskUrl, setMaskUrl] = useState<string | null>(null);

const handleMaskUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.match(/image\/(png|webp)/)) {
    alert('Only PNG or WebP masks allowed');
    return;
  }
  
  // Validate dimensions (optional but recommended)
  const img = new Image();
  img.onload = () => {
    if (img.width !== img.height) {
      console.warn('Mask should be square for best results');
    }
    setMaskFile(file);
    setMaskPreview(URL.createObjectURL(file));
  };
  img.src = URL.createObjectURL(file);
  
  // Upload to backend
  const formData = new FormData();
  formData.append('mask', file);
  
  const response = await fetch('/api/upload/mask', {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  setMaskUrl(data.url); // e.g., /objects/uploads/mask-abc123.png
};
```

#### 3. Compilation Request
```tsx
const handleCompile = async () => {
  const compileData = {
    photoUrls,
    videoUrls,
    userId,
    
    // Add mask data
    ...(shapeType && shapeType !== 'custom' && { shapeType }),
    ...(shapeType === 'custom' && maskUrl && { maskUrl }),
    
    config: { /* ...existing config */ }
  };
  
  const response = await fetch('http://localhost:5000/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(compileData),
  });
  
  // Handle response...
};
```

#### 4. Preview in CRM
```tsx
// When displaying AR project details
{arProject.metadata?.maskEnabled && (
  <div className="mask-info">
    <span className="badge">🎭 Маска включена</span>
    {arProject.metadata.maskFiles?.map((file, i) => (
      <img 
        key={i}
        src={`/objects/ar-storage/${arProject.id}/${file}`}
        alt={`Mask ${i + 1}`}
        style={{width: 100, height: 100, margin: 5}}
      />
    ))}
  </div>
)}
```

---

## 🧪 Testing Checklist

### Backend Tests
- [x] ✅ Mask templates generated (`circle.png`, `oval.png`, `square.png`, `rounded-rect.png`)
- [x] ✅ `generateMask()` function creates masks from templates
- [x] ✅ `generateMask()` resizes custom masks
- [x] ✅ Masks saved to project storage (`/ar-storage/{id}/mask-0.png`)
- [ ] ⏳ Test with shapeType='circle' → verify mask-0.png exists
- [ ] ⏳ Test with custom maskUrl → verify mask copied and resized
- [ ] ⏳ Test with maskUrls array → verify individual masks per video

### Viewer Tests
- [ ] ⏳ Open generated `index.html` → verify `<img id="mask0">` in assets
- [ ] ⏳ Verify `material="...alphaMap:#mask0..."` on plane
- [ ] ⏳ Test on Android Chrome → video shows circular shape
- [ ] ⏳ Test on iOS Safari → video shows circular shape (CRITICAL)
- [ ] ⏳ Test multi-target → each video has different mask
- [ ] ⏳ Verify fade-in animation not broken by mask
- [ ] ⏳ Verify video plays smoothly with mask applied

### CRM Tests
- [ ] ⏳ Add mask selector UI to AR editor
- [ ] ⏳ Test shape selection → shapeType sent to backend
- [ ] ⏳ Test custom upload → maskUrl sent to backend
- [ ] ⏳ Verify mask preview works in CRM
- [ ] ⏳ Verify mask shown in AR project details

---

## 📝 API Examples

### Example 1: Circle Mask for Single Video
```bash
curl -X POST http://localhost:5000/compile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "photoUrls": ["/objects/uploads/photo.jpg"],
    "videoUrls": ["/objects/uploads/video.mp4"],
    "shapeType": "circle"
  }'
```

### Example 2: Custom Mask Multi-Target
```bash
curl -X POST http://localhost:5000/compile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "photoUrls": [
      "/objects/uploads/photo-0.jpg",
      "/objects/uploads/photo-1.jpg"
    ],
    "videoUrls": [
      "/objects/uploads/video-0.mp4",
      "/objects/uploads/video-1.mp4"
    ],
    "maskUrls": [
      "/objects/uploads/mask-heart.png",
      "/objects/uploads/mask-star.png"
    ]
  }'
```

### Example 3: Oval Mask for All Videos
```bash
curl -X POST http://localhost:5000/compile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "photoUrls": [
      "/objects/uploads/photo-0.jpg",
      "/objects/uploads/photo-1.jpg"
    ],
    "videoUrls": [
      "/objects/uploads/video-0.mp4",
      "/objects/uploads/video-1.mp4"
    ],
    "shapeType": "oval"
  }'
```

---

## 🔧 Troubleshooting

### Issue: Mask not visible
**Solution:** Check browser console for texture loading errors. Ensure `crossorigin="anonymous"` on `<img>` tag.

### Issue: Black square instead of mask
**Solution:** Verify mask has alpha channel (4 channels). Use `sharp` to check: `await sharp(mask).metadata()` → channels should be 4.

### Issue: Mask inverted (white shows, black hides)
**Solution:** In alphaMap, white = opaque, black = transparent. Ensure template has white shape on transparent background.

### Issue: Mask doesn't match video size
**Solution:** Masks are resized to 1024x1024 by default. If video has different aspect ratio, mask will stretch. Consider using `fit: 'contain'` instead of `'fill'` in `sharp.resize()`.

### Issue: iOS Safari doesn't show mask
**Solution:** Ensure `shader: standard` is used (not `flat`). Add `roughness: 1; metalness: 0` to material.

---

## 🚀 Next Steps

1. **Test backend compilation** with `shapeType='circle'`
2. **Add CRM UI** for mask selection
3. **Test on mobile devices** (Android + iOS)
4. **Add mask preview** in admin panel
5. **Optimize mask loading** (preload with videos)

---

## ✅ Status: Backend Complete, CRM UI Pending

**Backend (ar-service):** ✅ 100% Complete
- Mask generation: ✅
- Mask templates: ✅
- Multi-target support: ✅
- API endpoints: ✅
- Viewer generation: ✅

**Frontend (CRM):** ⏳ 0% Complete
- Mask selector UI: ❌
- Upload handler: ❌
- Preview: ❌
- Integration: ❌

**Testing:** ⏳ 20% Complete
- Template generation: ✅
- Backend compilation: ⏳
- Mobile testing: ❌
- Multi-target: ❌
