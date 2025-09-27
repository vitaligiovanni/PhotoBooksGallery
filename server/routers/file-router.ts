import express, { Router } from "express";
import fs from "fs";
import path from "path";
import formidable from "formidable";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { LocalStorageService } from "../localStorage";
import { ObjectStorageService, ObjectNotFoundError } from "../objectStorage";

export function createFileRouter() {
  const router = Router();
  const localStorageService = new LocalStorageService();

  // Настройка multer для загрузки файлов
  const uploadDir = path.join(process.cwd(), 'objects/local-upload');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({ storage: multerStorage });

  // Middleware для поиска файлов по UUID с любым расширением
  router.get('/local-upload/:uuid', async (req, res, next) => {
    const { uuid } = req.params;
    const uploadsDir = path.join(process.cwd(), 'objects/local-upload');
    
    // Если UUID уже содержит точку (скорее всего это уже файл с расширением), пропускаем обработку
    if (uuid.includes('.')) {
      console.log(`[UUID Middleware] UUID contains extension, skipping: ${uuid}`);
      return next();
    }
    
    console.log(`[UUID Middleware] Searching for file with UUID: ${uuid}`);
    
    try {
      // Проверяем существование директории
      if (!fs.existsSync(uploadsDir)) {
        console.log(`[UUID Middleware] Directory not found: ${uploadsDir}`);
        return res.status(404).json({ error: "Directory not found" });
      }
      
      // Ищем файлы с таким UUID и любым расширением
      const files = fs.readdirSync(uploadsDir);
      console.log(`[UUID Middleware] Found files: ${files.join(', ')}`);
      
      const matchingFile = files.find(file => {
        const fileNameWithoutExt = path.parse(file).name;
        console.log(`[UUID Middleware] Checking file: ${file}, name without ext: ${fileNameWithoutExt}`);
        return fileNameWithoutExt === uuid;
      });
      
      if (matchingFile) {
        console.log(`[UUID Middleware] Found matching file: ${matchingFile}, redirecting...`);
        // Если нашли файл, отдаем его через статическое обслуживание
        return res.redirect(302, `/objects/local-upload/${matchingFile}`);
      }
      
      console.log(`[UUID Middleware] No matching file found for UUID: ${uuid}`);
      // Если файл не найден, возвращаем 404
      return res.status(404).json({ error: "File not found" });
    } catch (error) {
      console.error('Error searching for file by UUID:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Статическое обслуживание файлов из папки objects/local-upload
  router.use('/local-upload', express.static(path.join(process.cwd(), 'objects/local-upload')));

  router.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Новый endpoint для загрузки файлов с использованием formidable (POST запрос)
  router.post("/upload/formidable", async (req, res) => {
    try {
      const uploadDir = path.join(process.cwd(), 'objects/local-upload');
      
      // Убедимся, что папка существует
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const form = formidable({
        multiples: false,
        uploadDir,
        keepExtensions: true
      });

      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Formidable parse error:", err);
          return res.status(500).json({ error: "File upload failed" });
        }

        const fileArray = files.file as formidable.File[];
        if (!fileArray || fileArray.length === 0) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        const file = fileArray[0];

        // Создаём уникальное имя файла с UUID
        const ext = path.extname(file.originalFilename || "");
        const newFilename = `${uuidv4()}${ext}`;
        const newPath = path.join(uploadDir, newFilename);

        fs.rename(file.filepath, newPath, (err) => {
          if (err) {
            console.error("File rename error:", err);
            return res.status(500).json({ error: "File saving failed" });
          }

          // Возвращаем URL файла для фронтенда
          const fileUrl = `/objects/local-upload/${newFilename}`;
          res.status(200).json({ url: fileUrl });
        });
      });
    } catch (error) {
      console.error("Error in formidable upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Новый endpoint для загрузки файлов с использованием multer (POST запрос)
  router.post("/local-upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("Uploaded file info:", {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype
      });

      // Получаем правильное расширение из оригинального имени файла
      const ext = path.extname(req.file.originalname);
      const newFilename = `${uuidv4()}${ext}`;
      const newPath = path.join(uploadDir, newFilename);

      console.log("Renaming file:", req.file.path, "->", newPath);

      // Переименовываем файл в UUID имя с правильным расширением
      fs.renameSync(req.file.path, newPath);

      // Возвращаем URL файла для фронтенда
      const fileUrl = `/objects/local-upload/${newFilename}`;
      console.log("File uploaded successfully:", fileUrl);
      res.status(200).json({ url: fileUrl });
    } catch (error) {
      console.error("Error in multer upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Обслуживание локально загруженных файлов
  router.get("/uploads/:fileName", async (req, res) => {
    try {
      await localStorageService.serveLocalFile(req.params.fileName, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      console.error("Error serving local file:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });

  // Переопределяем загрузку файлов для локальной разработки
  router.post("/objects/upload", async (req, res) => {
    console.log('[SERVER] Getting upload URL for local development');
    try {
      const uploadURL = await localStorageService.getObjectEntityUploadURL();
      console.log('[SERVER] Generated local upload URL:', uploadURL);
      res.json({ uploadURL });
    } catch (error) {
      console.error("[SERVER] Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  router.post("/objects/normalize", async (req, res) => {
    console.log('[SERVER] Normalize request received:', req.body);
    try {
      const { rawPath } = req.body;
      
      if (!rawPath) {
        console.error('[SERVER] Missing rawPath in request');
        return res.status(400).json({ error: "rawPath is required" });
      }
      
      console.log('[SERVER] Normalizing path:', rawPath);
      const normalizedPath = localStorageService.normalizeObjectEntityPath(rawPath);
      console.log('[SERVER] Normalized path result:', normalizedPath);
      res.json({ normalizedPath });
    } catch (error) {
      console.error("[SERVER] Error normalizing object path:", error);
      res.status(500).json({ error: "Failed to normalize object path" });
    }
  });

  return router;
}