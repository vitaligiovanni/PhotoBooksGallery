interface CompilationJob {
    projectId: string;
    userId: string;
    photoPath?: string;
    photoPaths?: string[];
    videoPath?: string;
    videoPaths?: string[];
    maskPath?: string;
    maskUrls?: string[];
    shapeType?: 'circle' | 'oval' | 'square' | 'rect' | 'custom';
    storageDir: string;
    config: Record<string, any>;
}
interface CompilationResult {
    success: boolean;
    error?: string;
    compilationTimeMs?: number;
    markerMindUrl?: string;
    viewerHtmlUrl?: string;
    qrCodeUrl?: string;
    metadata?: {
        markersCount?: number;
        multiTarget?: boolean;
        photoWidth?: number;
        photoHeight?: number;
        videoWidth?: number;
        videoHeight?: number;
        videoDurationMs?: number;
        photoAspectRatio?: string;
        videoAspectRatio?: string;
        videoDurationSec?: number;
        maskFiles?: string[];
    };
}
export declare class CompilerWorker {
    /**
     * Run compilation (Worker Thread in production, direct call in development)
     *
     * DEVELOPMENT: Runs in main thread (tsx doesn't support Worker Threads with .ts files)
     * PRODUCTION: Runs in Worker Thread (compiled .js files work fine)
     */
    compile(job: CompilationJob): Promise<CompilationResult>;
}
export declare const compilerWorker: CompilerWorker;
export {};
//# sourceMappingURL=compiler-worker.d.ts.map