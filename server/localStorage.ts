import { Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class LocalStorageService {
  private uploadsDir: string;
  private publicDir: string;

  constructor() {
    this.uploadsDir = path.join(__dirname, '../objects/local-upload');
    this.publicDir = path.join(__dirname, '../public');
    
    // Создаем директории если они не существуют
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.publicDir)) {
      fs.mkdirSync(this.publicDir, { recursive: true });
    }
  }

  // Для локальной разработки - возвращаем статический URL
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    return `/api/local-upload/${objectId}`;
  }

  // Обработка загрузки файлов для локальной разработки
  async handleLocalUpload(req: any, res: Response): Promise<string> {
    const objectId = req.params.id;
    console.log('[LocalStorageService] Handling upload for objectId:', objectId);
    
    if (!req.files || !req.files.file) {
      console.error('[LocalStorageService] No file uploaded');
      throw new Error("No file uploaded");
    }

    const file = req.files.file;
    console.log('[LocalStorageService] File received:', file.name, 'size:', file.size);
    
    // Получаем оригинальное расширение файла
    const originalName = file.name;
    const fileExtension = path.extname(originalName);
    const fileName = `${objectId}${fileExtension}`;
    const filePath = path.join(this.uploadsDir, fileName);

    console.log('[LocalStorageService] Saving file to:', filePath);
    
    // Создаем директорию если не существует
    if (!fs.existsSync(this.uploadsDir)) {
      console.log('[LocalStorageService] Creating uploads directory:', this.uploadsDir);
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    try {
      // Сохраняем файл
      await file.mv(filePath);
      console.log('[LocalStorageService] File saved successfully:', fileName);
      
      // Возвращаем путь для доступа к файлу
      return `/objects/local-upload/${fileName}`;
    } catch (error) {
      console.error('[LocalStorageService] Error saving file:', error);
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Обслуживание загруженных файлов
  async serveLocalFile(fileName: string, res: Response): Promise<void> {
    const filePath = path.join(this.uploadsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      throw new ObjectNotFoundError();
    }

    const stat = fs.statSync(filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  // Нормализация путей для локальной разработки
  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath || typeof rawPath !== 'string') {
      return rawPath || '';
    }
    
    // Если это путь API загрузки, преобразуем в путь для обслуживания файлов
    if (rawPath.startsWith('/api/local-upload/')) {
      const pathParts = rawPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return `/objects/local-upload/${fileName}`;
    }

    // Если это уже локальный путь для обслуживания, возвращаем как есть
    if (rawPath.startsWith('/objects/local-upload/')) {
      return rawPath;
    }

    // Если это Google Storage URL, извлекаем имя файла
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      try {
        const url = new URL(rawPath);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        return `/objects/local-upload/${fileName}`;
      } catch (error) {
        console.error('Error normalizing Google Storage URL:', error);
        return rawPath;
      }
    }

    return rawPath;
  }

  // Поиск публичных файлов (для совместимости)
  async searchPublicObject(filePath: string): Promise<any> {
    const fullPath = path.join(this.publicDir, filePath);
    if (fs.existsSync(fullPath)) {
      return { path: fullPath };
    }
    return null;
  }
}
