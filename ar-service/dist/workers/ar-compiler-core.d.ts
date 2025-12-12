/**
 * AR Compiler Core - EXTRACTED FROM MAIN BACKEND
 *
 * This module contains CPU-intensive MindAR compilation logic
 * Running in Worker Thread to avoid blocking main event loop
 *
 * CRITICAL: This code runs in SEPARATE thread!
 * Do NOT import database pools or Express app here
 *
 * EXTRACTED FROM: backend/src/services/ar-compiler.ts (lines 31-1240)
 * MAJOR FUNCTIONS:
 * - resizePhotoIfNeeded() → 3-5x faster compilation (1920px limit)
 * - enhanceMarkerPhotoSimple() → unique border pattern with hash-based seeding
 * - compileMindFile() → MindAR offline compilation (120s CPU blocker)
 * - generateARViewer() → full HTML5 viewer with A-Frame + MindAR
 * - generateQRCode() → QR code for sharing AR experience
 */
export interface CompilationJob {
    projectId: string;
    userId: string;
    photoPath?: string;
    videoPath?: string;
    photoPaths?: string[];
    videoPaths?: string[];
    maskPath?: string;
    maskUrls?: string[];
    shapeType?: 'circle' | 'oval' | 'square' | 'rect' | 'custom';
    storageDir: string;
    config: {
        fitMode?: 'contain' | 'cover' | 'fill' | 'exact';
        zoom?: number;
        offsetX?: number;
        offsetY?: number;
        aspectLocked?: boolean;
        autoPlay?: boolean;
        loop?: boolean;
        videoPosition?: {
            x: number;
            y: number;
            z: number;
        };
        videoRotation?: {
            x: number;
            y: number;
            z: number;
        };
        videoScale?: {
            width: number;
            height: number;
        };
        markersCount?: number;
    };
}
export interface CompilationResult {
    success: boolean;
    error?: string;
    compilationTimeMs: number;
    markerMindUrl?: string;
    viewerHtmlUrl?: string;
    qrCodeUrl?: string;
    metadata?: {
        markersCount?: number;
        multiTarget?: boolean;
        photoWidth?: number;
        photoHeight?: number;
        photoSizes?: Array<{
            width: number;
            height: number;
            aspectRatio: number;
        }>;
        videoWidth?: number;
        videoHeight?: number;
        videoDurationMs?: number;
        photoAspectRatio?: string;
        videoAspectRatio?: string;
        fitMode?: string;
        scaleWidth?: string;
        scaleHeight?: string;
        maskEnabled?: boolean;
        maskFiles?: string[];
    };
}
/**
 * Main AR compilation workflow (runs in Worker Thread)
 *
 * WORKFLOW:
 * 1. Resize photo (5000px → 1024px) - 5-8x faster compilation
 * 2. Enhance marker with unique border (hash-based pattern)
 * 3. Crop border for MindAR (clean center recognition)
 * 4. Compile .mind file with MD5 caching (105s first, 2-5s cached)
 * 5. Generate HTML5 viewer (A-Frame + MindAR)
 * 6. Generate QR code for sharing
 * 7. Copy assets (video, logo, etc.)
 */
export declare function compileARProject(job: CompilationJob): Promise<CompilationResult>;
//# sourceMappingURL=ar-compiler-core.d.ts.map