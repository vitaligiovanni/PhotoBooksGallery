"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileManager = exports.FileManager = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
// File Manager for AR Storage
// Handles file paths, creation, cleanup
// Используем переменные окружения из .env (Windows пути для dev, Docker для prod)
const AR_STORAGE_PATH = process.env.AR_STORAGE_PATH || path.join(process.cwd(), '..', 'backend', 'objects', 'ar-storage');
const SHARED_UPLOADS_PATH = process.env.SHARED_UPLOADS_PATH || path.join(process.cwd(), '..', 'backend', 'objects', 'uploads');
console.log('[FileManager] AR_STORAGE_PATH:', AR_STORAGE_PATH);
console.log('[FileManager] SHARED_UPLOADS_PATH:', SHARED_UPLOADS_PATH);
class FileManager {
    /**
     * Get storage directory for AR project
     */
    getProjectStorageDir(projectId) {
        return path.join(AR_STORAGE_PATH, projectId);
    }
    /**
     * Create storage directory for new project
     */
    async createProjectStorage(projectId) {
        const storageDir = this.getProjectStorageDir(projectId);
        await fs.ensureDir(storageDir);
        console.log(`[Files] ✅ Created storage: ${storageDir}`);
        return storageDir;
    }
    /**
     * Delete project storage (for cleanup)
     */
    async deleteProjectStorage(projectId) {
        const storageDir = this.getProjectStorageDir(projectId);
        if (await fs.pathExists(storageDir)) {
            await fs.remove(storageDir);
            console.log(`[Files] 🗑️ Deleted storage: ${storageDir}`);
        }
    }
    /**
     * Get absolute path from relative storage path
     */
    resolveStoragePath(relativePath) {
        // /objects/ar-storage/demo-xxx/file.jpg
        // → C:/Projects/.../backend/objects/ar-storage/demo-xxx/file.jpg (Windows)
        // → /app/storage/ar-storage/demo-xxx/file.jpg (Docker)
        if (relativePath.startsWith('/objects/ar-storage/')) {
            const subPath = relativePath.replace('/objects/ar-storage/', '');
            const fullPath = path.join(AR_STORAGE_PATH, subPath);
            console.log(`[FileManager] resolveStoragePath: ${relativePath} → ${fullPath}`);
            return fullPath;
        }
        return relativePath;
    }
    /**
     * Get relative storage path for database
     */
    getRelativePath(absolutePath, projectId) {
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
    resolveUploadPath(uploadUrl) {
        // /objects/uploads/uuid.jpg
        // → C:/Projects/.../backend/objects/uploads/uuid.jpg (Windows)
        // → /app/storage/uploads/uuid.jpg (Docker)
        if (uploadUrl.startsWith('/objects/uploads/')) {
            const fileName = uploadUrl.replace('/objects/uploads/', '');
            const fullPath = path.join(SHARED_UPLOADS_PATH, fileName);
            console.log(`[FileManager] resolveUploadPath: ${uploadUrl} → ${fullPath}`);
            return fullPath;
        }
        return uploadUrl;
    }
    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        return fs.pathExists(filePath);
    }
    /**
     * Get file size in bytes
     */
    async getFileSize(filePath) {
        const stats = await fs.stat(filePath);
        return stats.size;
    }
    /**
     * List all project storages (for cleanup/maintenance)
     */
    async listProjectStorages() {
        const dirs = await fs.readdir(AR_STORAGE_PATH);
        return dirs.filter(dir => dir.startsWith('demo-') || dir.startsWith('prod-'));
    }
}
exports.FileManager = FileManager;
exports.fileManager = new FileManager();
//# sourceMappingURL=file-manager.js.map