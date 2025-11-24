import * as path from 'path';
import * as fs from 'fs-extra';

// File Manager for AR Storage
// Handles file paths, creation, cleanup

const AR_STORAGE_PATH = process.env.AR_STORAGE_PATH || '/app/storage/ar-storage';
const SHARED_UPLOADS_PATH = process.env.SHARED_UPLOADS_PATH || '/app/storage/uploads';

export class FileManager {
  
  /**
   * Get storage directory for AR project
   */
  getProjectStorageDir(projectId: string): string {
    return path.join(AR_STORAGE_PATH, projectId);
  }
  
  /**
   * Create storage directory for new project
   */
  async createProjectStorage(projectId: string): Promise<string> {
    const storageDir = this.getProjectStorageDir(projectId);
    
    await fs.ensureDir(storageDir);
    console.log(`[Files] ✅ Created storage: ${storageDir}`);
    
    return storageDir;
  }
  
  /**
   * Delete project storage (for cleanup)
   */
  async deleteProjectStorage(projectId: string): Promise<void> {
    const storageDir = this.getProjectStorageDir(projectId);
    
    if (await fs.pathExists(storageDir)) {
      await fs.remove(storageDir);
      console.log(`[Files] 🗑️ Deleted storage: ${storageDir}`);
    }
  }
  
  /**
   * Get absolute path from relative storage path
   */
  resolveStoragePath(relativePath: string): string {
    // /objects/ar-storage/demo-xxx/file.jpg
    // → /app/storage/ar-storage/demo-xxx/file.jpg
    
    if (relativePath.startsWith('/objects/ar-storage/')) {
      return relativePath.replace('/objects/ar-storage/', AR_STORAGE_PATH + '/');
    }
    
    return relativePath;
  }
  
  /**
   * Get relative storage path for database
   */
  getRelativePath(absolutePath: string, projectId: string): string {
    // /app/storage/ar-storage/demo-xxx/file.jpg
    // → /objects/ar-storage/demo-xxx/file.jpg
    
    if (absolutePath.includes(AR_STORAGE_PATH)) {
      return absolutePath.replace(AR_STORAGE_PATH, '/objects/ar-storage');
    }
    
    return absolutePath;
  }
  
  /**
   * Get absolute path from upload URL
   */
  resolveUploadPath(uploadUrl: string): string {
    // /objects/uploads/uuid.jpg
    // → /app/storage/uploads/uuid.jpg
    
    if (uploadUrl.startsWith('/objects/uploads/')) {
      return uploadUrl.replace('/objects/uploads/', SHARED_UPLOADS_PATH + '/');
    }
    
    return uploadUrl;
  }
  
  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }
  
  /**
   * Get file size in bytes
   */
  async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }
  
  /**
   * List all project storages (for cleanup/maintenance)
   */
  async listProjectStorages(): Promise<string[]> {
    const dirs = await fs.readdir(AR_STORAGE_PATH);
    return dirs.filter(dir => dir.startsWith('demo-') || dir.startsWith('prod-'));
  }
}

export const fileManager = new FileManager();
