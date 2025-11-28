/**
 * AR Microservice Client
 * 
 * Sends compilation requests to AR microservice instead of compiling locally
 * Microservice runs on port 5000, handles MindAR compilation in isolation
 */

const AR_SERVICE_URL = process.env.AR_SERVICE_URL || 'http://localhost:5000';

interface CompileRequest {
  userId: string;
  photoUrl?: string; // Одно фото (legacy)
  photoUrls?: string[]; // Множественные фото для multi-target AR
  videoUrl?: string; // Одно видео (legacy)
  videoUrls?: string[]; // Множественные видео (по одному на фото)
  maskUrl?: string;
  maskUrls?: string[]; // Multi-target custom masks
  shapeType?: 'circle' | 'oval' | 'square' | 'rect' | 'custom'; // Mask shape for auto-generation
  orderId?: string;
  isDemo?: boolean;
  projectId?: string; // For recompilation of existing project
  config?: {
    fitMode?: 'contain' | 'cover' | 'fill' | 'exact';
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
    aspectLocked?: boolean;
    autoPlay?: boolean;
    loop?: boolean;
    videoPosition?: { x: number; y: number; z: number };
    videoRotation?: { x: number; y: number; z: number };
    videoScale?: { width: number; height: number };
    shapeType?: 'circle' | 'oval' | 'square' | 'rect' | 'custom';
  };
}

interface CompileResponse {
  projectId: string;
  status: 'pending';
  message: string;
  estimatedTimeSeconds: number;
  statusUrl: string;
  viewUrl: string;
}

interface StatusResponse {
  projectId: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  progress?: number;
  photoUrl?: string;
  videoUrl?: string;
  viewUrl?: string;
  qrCodeUrl?: string;
  markerMindUrl?: string;
  viewerHtmlUrl?: string;
  compilationTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
  expiresAt?: string | null;
}

/**
 * Send compilation request to AR microservice
 * Returns immediately (202 Accepted), compilation happens in background
 */
export async function requestARCompilation(request: CompileRequest): Promise<CompileResponse> {
  const photos = request.photoUrls || (request.photoUrl ? [request.photoUrl] : []);
  const videos = request.videoUrls || (request.videoUrl ? [request.videoUrl] : []);
  console.log(`[AR Service Client] 📤 Sending compilation request to ${AR_SERVICE_URL}/compile`);
  console.log(`[AR Service Client] User: ${request.userId}, Photos: ${photos.length}, Videos: ${videos.length}`);
  
  const response = await fetch(`${AR_SERVICE_URL}/compile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(300000), // 5 minutes timeout
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
    throw new Error(`AR Service error: ${error.error || response.statusText}`);
  }

  const result = await response.json() as CompileResponse;
  console.log(`[AR Service Client] ✅ Compilation queued: ${result.projectId}`);
  
  return result;
}

/**
 * Check AR compilation status
 */
export async function getARStatus(projectId: string): Promise<StatusResponse> {
  console.log(`[AR Service Client] 🔍 Fetching status for project ${projectId}...`);
  
  const response = await fetch(`${AR_SERVICE_URL}/status/${projectId}`, {
    signal: AbortSignal.timeout(300000), // 5 minutes timeout
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
    console.error(`[AR Service Client] ❌ Status check failed (${response.status}):`, error);
    throw new Error(`AR Service error (${response.status}): ${error.error || response.statusText}`);
  }

  const status = await response.json() as StatusResponse;
  console.log(`[AR Service Client] ✅ Status: ${status.status}, Progress: ${status.progress}%`);
  
  return status;
}

/**
 * Get AR viewer URL
 */
export function getARViewerUrl(projectId: string): string {
  return `${AR_SERVICE_URL}/view/${projectId}`;
}
