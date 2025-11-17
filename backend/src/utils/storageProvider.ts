import path from 'path';
import fs from 'fs-extra';
import mime from 'mime-types';

export interface StorageFile {
  key: string;
  size: number;
  lastModified: Date;
  url?: string;
}

export interface PresignedUploadUrl {
  key: string;
  url: string;
  expiresAt: Date;
}

export interface StorageProvider {
  createPresignedPut(key: string, contentType: string, ttlSec: number): Promise<string>;
  deleteObjects(keys: string[]): Promise<void>;
  listObjects(prefix: string): Promise<StorageFile[]>;
  createPresignedGet(key: string, ttlSec: number): Promise<string>;
  objectExists(key: string): Promise<boolean>;
}

// Local Storage Provider (for development)
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor(config: { basePath: string; baseUrl: string }) {
    this.basePath = config.basePath;
    this.baseUrl = config.baseUrl;
  }

  async createPresignedPut(key: string, contentType: string, ttlSec: number): Promise<string> {
    // For local storage, we return a direct upload URL to our backend
    const expiresAt = Date.now() + (ttlSec * 1000);
    return `${this.baseUrl}/api/upload/local/${encodeURIComponent(key)}?expires=${expiresAt}&contentType=${encodeURIComponent(contentType)}`;
  }

  async createPresignedGet(key: string, ttlSec: number): Promise<string> {
    // Return direct file URL
    return `${this.baseUrl}/objects/uploads/${key}`;
  }

  async deleteObjects(keys: string[]): Promise<void> {
    const deletePromises = keys.map(async (key) => {
      const filePath = path.join(this.basePath, key);
      try {
        await fs.remove(filePath);
      } catch (error) {
        // Ignore file not found errors
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }
    });

    await Promise.all(deletePromises);
  }

  async listObjects(prefix: string): Promise<StorageFile[]> {
    const dirPath = path.join(this.basePath, prefix);
    
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      const result: StorageFile[] = [];

      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(dirPath, file.name);
          const stats = await fs.stat(filePath);
          result.push({
            key: path.join(prefix, file.name).replace(/\\/g, '/'), // Normalize path separators
            size: stats.size,
            lastModified: stats.mtime,
          });
        }
      }

      return result;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Helper method to save file directly (for local upload endpoint)
  async saveFile(key: string, buffer: Buffer): Promise<void> {
    const filePath = path.join(this.basePath, key);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, buffer);
  }
}

// Factory function to create storage provider
export function createStorageProvider(): StorageProvider {
  // Local storage only
  const configuredPath = process.env.UPLOADS_LOCAL_PATH || path.join(process.cwd(), 'uploads');
  const basePath = path.isAbsolute(configuredPath) ? configuredPath : path.resolve(configuredPath);
  // Prefer public API URL if provided; otherwise default to localhost
  const rawApi = process.env.API_URL || 'http://localhost:5032';
  // If API_URL mistakenly contains /api suffix, strip it
  const baseUrl = rawApi.replace(/\/?api\/?$/, '').replace(/\/$/, '') || rawApi;

  return new LocalStorageProvider({
    basePath,
    baseUrl,
  });
}

// Utility functions
export function generateUploadKey(uploadId: string, filename: string): string {
  const ext = path.extname(filename);
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `uploads/tmp/${uploadId}/${timestamp}-${randomStr}${ext}`;
}

export function getContentType(filename: string): string {
  return mime.lookup(filename) || 'application/octet-stream';
}

export function validateImageFile(filename: string, size: number): { valid: boolean; error?: string } {
  const maxSize = 15 * 1024 * 1024; // 15MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff'];
  const contentType = getContentType(filename);

  if (size > maxSize) {
    return { valid: false, error: 'File size exceeds 15MB limit' };
  }

  if (!allowedTypes.includes(contentType)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, WebP, HEIC, and TIFF are allowed' };
  }

  return { valid: true };
}