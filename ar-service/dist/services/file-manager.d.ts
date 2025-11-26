export declare class FileManager {
    /**
     * Get storage directory for AR project
     */
    getProjectStorageDir(projectId: string): string;
    /**
     * Create storage directory for new project
     */
    createProjectStorage(projectId: string): Promise<string>;
    /**
     * Delete project storage (for cleanup)
     */
    deleteProjectStorage(projectId: string): Promise<void>;
    /**
     * Get absolute path from relative storage path
     */
    resolveStoragePath(relativePath: string): string;
    /**
     * Get relative storage path for database
     */
    getRelativePath(absolutePath: string, projectId: string): string;
    /**
     * Get absolute path from upload URL
     */
    resolveUploadPath(uploadUrl: string): string;
    /**
     * Check if file exists
     */
    fileExists(filePath: string): Promise<boolean>;
    /**
     * Get file size in bytes
     */
    getFileSize(filePath: string): Promise<number>;
    /**
     * List all project storages (for cleanup/maintenance)
     */
    listProjectStorages(): Promise<string[]>;
}
export declare const fileManager: FileManager;
//# sourceMappingURL=file-manager.d.ts.map