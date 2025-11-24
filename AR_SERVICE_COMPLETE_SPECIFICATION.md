# 📋 ТЕХНИЧЕСКАЯ ХАРАКТЕРИСТИКА AR-СЕРВИСА PhotoBooks Gallery

**Дата:** 24 ноября 2025  
**Версия:** 1.0.0  
**Цель:** Полное описание архитектуры AR-сервиса для разработки browser preview приложения

---

## 🎯 1. ОБЩЕЕ ОПИСАНИЕ

**AR-сервис** — это **независимый микросервис** для компиляции дополненной реальности (AR), который работает **изолированно** от основного backend'а. Создан для обработки тяжёлых CPU-задач (MindAR компиляция 72+ секунд) без блокировки основного API.

### Ключевые особенности:
- ✅ **Асинхронная обработка**: pg-boss очередь заданий
- ✅ **Отдельная БД**: PostgreSQL ar_db (порт 5434)
- ✅ **Кеширование**: MD5-хеш .mind файлов (99% ускорение повторных компиляций)
- ✅ **WebAR**: HTML5 viewer (A-Frame + MindAR) — работает **без установки приложения**
- ✅ **QR-коды**: Автоматическая генерация для каждого проекта
- ✅ **Demo-режим**: 24-часовые проекты с автоудалением

---

## 🏗️ 2. АРХИТЕКТУРА СИСТЕМЫ

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  (React Frontend на порту 3000/8080)                             │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ├──► /api/ar/create-demo (upload photo+video)
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                    BACKEND API (порт 5002)                       │
│  - Express.js + Drizzle ORM                                      │
│  - Роутер: backend/src/routers/ar-router.ts                     │
│  - Клиент: backend/src/services/ar-service-client.ts            │
│  - БД: photobooks_db (порт 5433) — заказы, пользователи         │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    │ HTTP POST /compile
                    │ { userId, photoUrl, videoUrl, config }
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│               AR MICROSERVICE (порт 5000)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Express API Routes:                                       │   │
│  │  - POST /compile    → Создаёт проект, добавляет в queue  │   │
│  │  - GET /status/:id  → Проверка статуса компиляции        │   │
│  │  - GET /view/:id    → HTML5 AR viewer                     │   │
│  │  - GET /health      → Проверка работоспособности          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ pg-boss Queue Manager:                                    │   │
│  │  - Очередь: AR_COMPILE (teamSize: 2 параллельных)        │   │
│  │  - Очередь: DEMO_CLEANUP (каждые 6 часов)                │   │
│  │  - Retry logic: 3 попытки с экспоненциальной задержкой   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Compiler Worker:                                          │   │
│  │  1. Resize photo: 4961px → 1024px (5-8x быстрее)         │   │
│  │  2. Border enhancement: Уникальный хеш-паттерн           │   │
│  │  3. Crop center: Убрать рамку для MindAR                 │   │
│  │  4. MD5 cache check: Есть .mind? → копировать (1с)       │   │
│  │  5. MindAR compile: .mind файл (72с первый раз)          │   │
│  │  6. HTML viewer: A-Frame + MindAR.js                     │   │
│  │  7. QR code: ngrok/production URL                        │   │
│  │  8. Video copy: Если есть                                │   │
│  │  9. Logo copy: Если есть                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  БД: ar_db (PostgreSQL порт 5434)                                │
│  Storage: /objects/ar-storage/:projectId/                        │
└──────────────────────────────────────────────────────────────────┘
                    │
                    │ Результат компиляции сохраняется:
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│        AR STORAGE (файловая система)                             │
│  /objects/ar-storage/{projectId}/                                │
│    ├── marker.mind (436 KB) ← Скомпилированный маркер            │
│    ├── index.html (19 KB) ← HTML5 AR viewer                      │
│    ├── qr-code.png (8 KB) ← QR-код для сканирования             │
│    ├── video.mp4 (5-50 MB) ← Видео для AR                       │
│    ├── photo-resized.jpg (500 KB) ← Уменьшенное фото            │
│    ├── enhanced-photo.jpg (2 MB) ← С рамкой                      │
│    ├── marker-for-mind.jpg (800 KB) ← Без рамки для компиляции  │
│    └── logo_animate1.webp (optional)                             │
│                                                                  │
│  /objects/ar-storage/mind-cache/                                 │
│    └── {md5hash}.mind ← Кеш скомпилированных маркеров            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 3. ТЕХНОЛОГИЧЕСКИЙ СТЕК

### AR Microservice (`ar-service/`)
```json
{
  "runtime": "Node.js 20.17.0",
  "framework": "Express.js 4.18.2",
  "language": "TypeScript 5.3.3",
  "queue": "pg-boss 9.0.3",
  "database": "PostgreSQL 15 (ar_db)",
  "ar_engine": "mind-ar 1.2.5",
  "ml_backend": "@tensorflow/tfjs-node 4.22.0",
  "image_processing": "sharp 0.33.1 + canvas 2.11.2",
  "video_processing": "fluent-ffmpeg 2.1.2",
  "qr_generation": "qrcode 1.5.3"
}
```

### Backend Integration (`backend/`)
```json
{
  "ar_client": "backend/src/services/ar-service-client.ts",
  "ar_router": "backend/src/routers/ar-router.ts",
  "communication": "HTTP REST (fetch API)",
  "timeout": "300 seconds (5 minutes)",
  "retry": "None (AR service handles retries)"
}
```

### Frontend (`frontend/`)
```json
{
  "framework": "React + Vite",
  "pages": [
    "/living-photos → LivingPhotos.tsx",
    "/ar/view/:id → ARViewRedirect.tsx",
    "/admin/ar-edit → AdminAREdit.tsx"
  ],
  "ar_viewer_access": "Direct URL (QR scan) → /objects/ar-storage/{id}/index.html"
}
```

---

## 🔄 4. DATA FLOW (Полный жизненный цикл AR-проекта)

### Шаг 1: Пользователь создаёт AR-проект

```javascript
// Frontend: LivingPhotos.tsx
const formData = new FormData();
formData.append('photo', photoFile);
formData.append('video', videoFile);

const response = await fetch('/api/ar/create-demo', {
  method: 'POST',
  body: formData
});

const { data } = await response.json();
// data = { arId: 'demo-123-abc', status: 'pending', statusUrl: '/api/ar/status/demo-123-abc' }
```

### Шаг 2: Backend принимает запрос

```typescript
// backend/src/routers/ar-router.ts
router.post('/create-demo', requireAuth, upload.fields([...]), async (req, res) => {
  // 1. Сохранить файлы в /objects/uploads/
  const photoPath = `/objects/uploads/demo-${timestamp}-photo.jpg`;
  const videoPath = `/objects/uploads/demo-${timestamp}-video.mp4`;
  
  // 2. Отправить в AR microservice
  const result = await requestARCompilation({
    userId: req.user.id,
    photoUrl: photoPath,
    videoUrl: videoPath,
    isDemo: true
  });
  
  // 3. Немедленно вернуть 202 Accepted
  res.status(202).json({
    arId: result.projectId,
    status: 'pending',
    statusUrl: `/api/ar/status/${result.projectId}`
  });
});
```

### Шаг 3: AR Microservice обрабатывает запрос

```typescript
// ar-service/src/routes/compile.ts
router.post('/compile', async (req, res) => {
  const projectId = uuidv4();
  
  // 1. Создать запись в ar_projects
  await pool.query(`
    INSERT INTO ar_projects (id, user_id, photo_url, video_url, status, is_demo, expires_at)
    VALUES ($1, $2, $3, $4, 'queued', true, NOW() + INTERVAL '24 hours')
  `, [projectId, userId, photoUrl, videoUrl]);
  
  // 2. Добавить задание в pg-boss
  const jobId = await boss.send('AR_COMPILE', {
    projectId,
    photoPath: resolveFilePath(photoUrl),
    videoPath: resolveFilePath(videoUrl),
    storageDir: `/app/storage/ar-storage/${projectId}`,
    config: req.body.config || {}
  });
  
  // 3. Вернуть немедленно (не ждать компиляции!)
  res.status(202).json({
    projectId,
    status: 'queued',
    estimatedTimeSeconds: 120
  });
});
```

### Шаг 4: pg-boss Worker компилирует AR

```typescript
// ar-service/src/workers/compiler-worker.ts
await boss.work('AR_COMPILE', { teamSize: 2 }, async (job) => {
  const { projectId, photoPath, videoPath, storageDir, config } = job.data;
  
  // Обновить статус: processing
  await updateProjectStatus(projectId, 'processing');
  
  // ============ КОМПИЛЯЦИЯ ============
  const result = await compileARProject({
    projectId,
    photoPath,    // /app/objects/uploads/demo-123-photo.jpg
    videoPath,    // /app/objects/uploads/demo-123-video.mp4
    storageDir,   // /app/storage/ar-storage/demo-123-abc
    config
  });
  
  if (result.success) {
    // Обновить БД с результатами
    await pool.query(`
      UPDATE ar_projects
      SET status = 'ready',
          marker_mind_url = '/objects/ar-storage/${projectId}/marker.mind',
          viewer_html_url = '/objects/ar-storage/${projectId}/index.html',
          qr_code_url = '/objects/ar-storage/${projectId}/qr-code.png',
          view_url = '${TUNNEL_URL}/ar/view/${projectId}',
          compilation_time_ms = $1,
          compilation_finished_at = NOW()
      WHERE id = $2
    `, [result.compilationTimeMs, projectId]);
  } else {
    await updateProjectStatus(projectId, 'error', result.error);
  }
});
```

### Шаг 5: Frontend проверяет статус (polling)

```typescript
// frontend/src/pages/LivingPhotos.tsx
const pollStatus = async () => {
  const response = await fetch(`/api/ar/status/${arId}`);
  const { data } = await response.json();
  
  if (data.status === 'ready') {
    setQrCodeUrl(data.qrCodeUrl);
    setViewUrl(data.viewUrl);
    stopPolling();
  } else if (data.status === 'error') {
    showError(data.error);
    stopPolling();
  }
};

// Проверять каждые 5 секунд
const interval = setInterval(pollStatus, 5000);
```

### Шаг 6: Пользователь сканирует QR-код

```
QR Code содержит: https://photobooksgallery.am/ar/view/demo-123-abc
                           ↓
         Браузер телефона открывает AR viewer
                           ↓
/objects/ar-storage/demo-123-abc/index.html (WebAR)
```

### Шаг 7: AR Viewer работает в браузере

```html
<!-- /objects/ar-storage/demo-123-abc/index.html -->
<a-scene mindar-image="imageTargetSrc:./marker.mind">
  <a-assets>
    <video id="vid" src="./video.mp4" loop muted playsinline></video>
  </a-assets>
  
  <a-camera></a-camera>
  
  <a-entity mindar-image-target="targetIndex:0">
    <a-plane material="src:#vid" width="1" height="0.75"></a-plane>
  </a-entity>
</a-scene>

<script>
// 1. MindAR загружает marker.mind (436 KB)
// 2. Запускается камера телефона
// 3. Когда видит фото → автоматически показывает видео поверх него
// 4. Работает БЕЗ установки приложения!
</script>
```

---

## 🗄️ 5. БАЗА ДАННЫХ

### ar_db (PostgreSQL на порту 5434)

**Таблица: `ar_projects`**
```sql
id               VARCHAR(255) PRIMARY KEY  -- demo-1763981287240-9ydtkf1
user_id          VARCHAR(255)              -- Ссылка на users.id из основной БД
order_id         VARCHAR(255)              -- NULL для demo-проектов
photo_url        VARCHAR(500)              -- /objects/uploads/photo.jpg
video_url        VARCHAR(500)              -- /objects/uploads/video.mp4 (optional)
marker_mind_url  VARCHAR(500)              -- /ar-storage/{id}/marker.mind
viewer_html_url  VARCHAR(500)              -- /ar-storage/{id}/index.html
qr_code_url      VARCHAR(500)              -- /ar-storage/{id}/qr-code.png
view_url         VARCHAR(500)              -- https://...ngrok.../ar/view/{id}
status           VARCHAR(50)               -- pending/queued/processing/ready/error
queue_job_id     VARCHAR(255)              -- pg-boss job ID
compilation_time_ms  INTEGER               -- 72000 (72 секунды)
is_demo          BOOLEAN                   -- true = автоудаление через 24ч
expires_at       TIMESTAMP                 -- 2025-11-25 10:44:15
config           JSONB                     -- {fitMode, zoom, offsetX, offsetY, ...}
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

**Ключевые индексы:**
- `idx_ar_projects_user_id` — быстрый поиск по пользователю
- `idx_ar_projects_status` — фильтрация по статусу (pending/ready)
- `idx_ar_projects_demo_expires` — автоочистка demo-проектов

**Изоляция от основной БД:**
- ❌ **НЕТ foreign keys** к `photobooks_db`
- ✅ **Eventual consistency** через webhooks (опционально)
- ✅ Независимое масштабирование

---

## 🔗 6. ИНТЕГРАЦИЯ С ОСНОВНЫМ САЙТОМ

### Backend ← → AR Service

**Файл:** `backend/src/services/ar-service-client.ts`

```typescript
const AR_SERVICE_URL = process.env.AR_SERVICE_URL || 'http://localhost:5000';

// 1. Отправить запрос на компиляцию
export async function requestARCompilation(request: CompileRequest) {
  const response = await fetch(`${AR_SERVICE_URL}/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(300000) // 5 минут
  });
  
  return await response.json(); // { projectId, status: 'pending' }
}

// 2. Проверить статус
export async function getARStatus(projectId: string) {
  const response = await fetch(`${AR_SERVICE_URL}/status/${projectId}`);
  return await response.json(); // { status: 'ready', qrCodeUrl, viewUrl, ... }
}
```

**Файл:** `backend/src/routers/ar-router.ts`

```typescript
// Проксирование статуса
router.get('/status/:projectId', async (req, res) => {
  const status = await getARStatus(req.params.projectId);
  res.json({ message: 'AR project status', data: status });
});
```

### Frontend ← → Backend API

**Файл:** `frontend/src/pages/LivingPhotos.tsx`

```typescript
// 1. Создать AR-проект
const createAR = async () => {
  const formData = new FormData();
  formData.append('photo', photoFile);
  formData.append('video', videoFile);
  
  const response = await fetch('/api/ar/create-demo', {
    method: 'POST',
    body: formData
  });
  
  const { data } = await response.json();
  setArId(data.arId);
  startPolling(data.arId);
};

// 2. Polling статуса
const checkStatus = async (arId: string) => {
  const response = await fetch(`/api/ar/status/${arId}`);
  const { data } = await response.json();
  
  if (data.status === 'ready') {
    setQrCode(data.qrCodeUrl);
    setViewUrl(data.viewUrl);
  }
};
```

### QR Code → AR Viewer (прямой доступ)

```
Пользователь сканирует QR:
  https://photobooksgallery.am/ar/view/demo-123-abc
         ↓
Frontend роутер: /ar/view/:id (ARViewRedirect.tsx)
         ↓
Редирект на: /objects/ar-storage/demo-123-abc/index.html
         ↓
Статический HTML файл с A-Frame + MindAR
         ↓
Камера запускается → распознаёт фото → показывает видео
```

**Ключевой момент:** AR viewer работает **БЕЗ React**, это **статический HTML** с встроенным JavaScript, загружается **мгновенно**.

---

## ⚡ 7. ПРОИЗВОДИТЕЛЬНОСТЬ И ОПТИМИЗАЦИИ

### До оптимизации:
- ❌ Разрешение: 1920px
- ❌ Компиляция: **174 секунды**
- ❌ Повторная компиляция: 174 секунды (без кеша)
- ❌ Размер .mind: 581 KB

### После оптимизации (текущая версия):
- ✅ Разрешение: **1024px** (5-8x быстрее)
- ✅ Компиляция: **72 секунды** (первый раз)
- ✅ Повторная компиляция: **1 секунда** (MD5 кеш)
- ✅ Размер .mind: **436 KB** (25% меньше)

### MD5 Cache Logic:
```typescript
// ar-service/src/workers/ar-compiler-core.ts
const photoBuffer = await fs.readFile(finalMarkerSourcePath);
const photoHash = crypto.createHash('md5').update(photoBuffer).digest('hex');
const cachedMindPath = path.join(cacheDir, `${photoHash}.mind`);

if (await fs.access(cachedMindPath)) {
  // CACHE HIT! Копировать за 1 секунду
  await fs.copyFile(cachedMindPath, targetMindPath);
  console.log('⚡ Compilation skipped (cached)');
} else {
  // CACHE MISS. Компилировать 72s и сохранить в кеш
  const mindFile = await compileMindFile(...);
  await fs.copyFile(mindFile, cachedMindPath);
}
```

### pg-boss Queue Configuration:
```typescript
await boss.work('AR_COMPILE', {
  teamSize: 2,           // 2 параллельных worker'а
  teamConcurrency: 1,    // 1 задание на worker (избежать перегрузки CPU)
  retryLimit: 3,         // 3 попытки при ошибке
  retryDelay: 60,        // 60 секунд между попытками
  retryBackoff: true     // Экспоненциальная задержка (60s, 120s, 240s)
}, handleCompileJob);
```

---

## 📱 8. BROWSER AR VIEWER (WebAR)

### Технологии:
- **A-Frame 1.4.2** — Фреймворк для WebVR/WebAR
- **MindAR 1.2.5** — Image tracking библиотека
- **TensorFlow.js** — ML backend для распознавания маркеров
- **getUserMedia API** — Доступ к камере телефона

### Как работает viewer:

```html
<!-- Генерируется в ar-compiler-core.ts функцией generateARViewer() -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
</head>
<body>
  <!-- Loading screen с анимацией -->
  <div class="arjs-loader" id="loading">
    <img src="./logo_animate1.webp" alt="Loading">
    <div>Приготовьтесь к волшебству</div>
  </div>
  
  <!-- Instructions -->
  <div id="instructions">Наведите камеру на фотографию</div>
  
  <!-- A-Frame сцена -->
  <a-scene 
    embedded
    mindar-image="imageTargetSrc:./marker.mind;maxTrack:1"
    renderer="colorManagement:true;antialias:true">
    
    <!-- Видео как asset -->
    <a-assets>
      <video id="vid" src="./video.mp4" loop muted playsinline></video>
    </a-assets>
    
    <!-- Камера пользователя -->
    <a-camera position="0 0 0" look-controls="enabled:false"></a-camera>
    
    <!-- AR плоскость с видео -->
    <a-entity mindar-image-target="targetIndex:0">
      <a-plane 
        material="src:#vid"
        width="1"
        height="0.75"
        position="0 0 0"
        visible="false">
      </a-plane>
    </a-entity>
  </a-scene>
  
  <script>
    // JavaScript логика:
    const video = document.getElementById('vid');
    const plane = document.querySelector('a-plane');
    const target = document.querySelector('[mindar-image-target]');
    
    // 1. Загрузить marker.mind (компилированный маркер)
    // 2. Запустить камеру
    // 3. Слушать событие targetFound
    target.addEventListener('targetFound', () => {
      console.log('Маркер найден!');
      plane.setAttribute('visible', 'true');
      video.play();
    });
    
    // 4. Скрыть видео когда маркер потерян
    target.addEventListener('targetLost', () => {
      console.log('Маркер потерян');
      plane.setAttribute('visible', 'false');
      video.pause();
    });
  </script>
</body>
</html>
```

### Поддержка браузеров:
- ✅ **iOS Safari** 11+ (iPhone/iPad)
- ✅ **Chrome Android** 80+
- ✅ **Samsung Internet**
- ✅ **Firefox Android**
- ⚠️ **Desktop** (работает с веб-камерой, но не оптимально)

### Без установки приложения:
- ✅ Работает прямо в браузере
- ✅ Не требует App Store/Google Play
- ✅ Мгновенный доступ по QR-коду
- ✅ Кросс-платформенность (iOS + Android)

---

## 🔐 9. БЕЗОПАСНОСТЬ И ИЗОЛЯЦИЯ

### Изоляция микросервиса:
```yaml
# docker-compose.yml
ar-service:
  container_name: photobooks-ar-service
  ports:
    - "5000:5000"
  networks:
    - internal  # Изолированная сеть
  environment:
    AR_DATABASE_URL: postgresql://photobooks:...@ar-db:5432/ar_db
  volumes:
    - ./backend/objects:/app/objects  # Shared storage
```

### Общее хранилище файлов:
```
/backend/objects/
  ├── uploads/         ← Backend складывает загрузки
  └── ar-storage/      ← AR service пишет результаты
      ├── {projectId}/
      │   ├── marker.mind
      │   ├── index.html
      │   ├── qr-code.png
      │   └── video.mp4
      └── mind-cache/
          └── {md5hash}.mind
```

### Eventual Consistency:
- **НЕТ** прямых foreign keys между `ar_db` и `photobooks_db`
- Связь через `user_id` и `order_id` (строковые идентификаторы)
- Webhooks (опционально) для синхронизации событий

---

## 📊 10. МОНИТОРИНГ И ЛОГИРОВАНИЕ

### Healthcheck:
```bash
curl http://localhost:5000/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "ar-microservice",
  "version": "1.0.0",
  "timestamp": "2025-11-24T10:42:54.654Z",
  "database": "connected",
  "queue": "ok",
  "uptime": 42.5
}
```

### Compilation logs:
```typescript
// ar-service/src/workers/ar-compiler-core.ts
console.log('[AR Core] 📐 Resizing large photo 4961x4961px → max 1024px');
console.log('[AR Core] ✅ Resized to 1920x1920px');
console.log('[AR Core] 🎨 Enhanced with border (Seed: 711c2f2b)');
console.log('[AR Core] ⏳ STEP 4: Compiling .mind marker...');
console.log('[AR Core] ✅ MindAR SUCCESS! Time: 72.0s');
console.log('[AR Core] ✅✅✅ COMPILATION COMPLETED in 75.3s ✅✅✅');
```

### Database tracking:
```sql
-- Таблица ar_compilation_logs
INSERT INTO ar_compilation_logs (project_id, step, status, duration_ms)
VALUES ('demo-123-abc', 'resize', 'completed', 3000);

INSERT INTO ar_compilation_logs (project_id, step, status, duration_ms)
VALUES ('demo-123-abc', 'compile', 'completed', 72000);
```

---

## 🚀 11. ДЕПЛОЙ И ОКРУЖЕНИЯ

### Development (локальная разработка):
```bash
# AR Service
cd ar-service
npm run dev  # tsx watch src/index.ts (порт 5000)

# Backend
cd backend
npm run dev  # tsx watch src/index.ts (порт 5002)

# Frontend
cd frontend
npm run dev  # vite (порт 3000)
```

### Production (Docker):
```yaml
# docker-compose.yml
services:
  ar-db:
    image: postgres:15-alpine
    ports:
      - "5434:5432"
  
  ar-service:
    build: ./ar-service
    ports:
      - "5000:5000"
    depends_on:
      - ar-db
    environment:
      AR_DATABASE_URL: postgresql://photobooks:...@ar-db:5432/ar_db
      TUNNEL_URL: https://photobooksgallery.am
      ENABLE_WEBHOOKS: true
```

### Environment variables:
```bash
# ar-service/.env
NODE_ENV=production
PORT=5000
AR_DATABASE_URL=postgresql://photobooks:SecurePassword2025@ar-db:5432/ar_db
TUNNEL_URL=https://photobooksgallery.am
FRONTEND_URL=https://photobooksgallery.am
ENABLE_WEBHOOKS=false
AR_ENABLE_BORDER_ENHANCER=true
```

---

## 🎯 12. КЛЮЧЕВЫЕ ВЫВОДЫ ДЛЯ ПРОМПТА ПРИЛОЖЕНИЯ

### Что важно знать:

1. **AR работает БЕЗ установки приложения** — это WebAR (HTML5 + JavaScript)
2. **QR-код ведёт на статический HTML** — `/objects/ar-storage/{id}/index.html`
3. **Viewer использует A-Frame + MindAR** — стандартные библиотеки
4. **Маркер = компилированный .mind файл** (436 KB) — загружается в браузер
5. **Камера запускается автоматически** — getUserMedia API
6. **Видео накладывается поверх фото** — когда MindAR распознаёт маркер
7. **Изоляция микросервиса** — отдельная БД, очередь, storage
8. **Асинхронная компиляция** — pg-boss + worker threads
9. **Кеширование** — MD5 хеш для повторных компиляций
10. **Demo-режим** — автоудаление через 24 часа

### Проблема для решения в браузерном preview:

**Текущая ситуация:**
- QR-код генерируется с production URL (ngrok/photobooksgallery.am)
- HTML viewer ссылается на относительные пути (`./marker.mind`, `./video.mp4`)
- Работает **только** при прямом доступе к storage

**Что нужно для preview:**
- Возможность **предпросмотра AR** в браузере на desktop
- Эмуляция камеры или загрузка статичного изображения-маркера
- Отображение viewer'а в iframe/окне админки
- Возможно, WebSocket для live-updates конфигурации

---

## 📝 13. СТРУКТУРА ФАЙЛОВ ПРОЕКТА

### AR Service Structure:
```
ar-service/
├── src/
│   ├── index.ts                    # Главный файл (Express server)
│   ├── config/
│   │   ├── database.ts            # PostgreSQL pool (ar_db)
│   │   └── queue.ts               # pg-boss configuration
│   ├── routes/
│   │   ├── compile.ts             # POST /compile (создать проект)
│   │   ├── status.ts              # GET /status/:id (проверить статус)
│   │   └── viewer.ts              # GET /view/:id (HTML viewer)
│   ├── workers/
│   │   ├── compiler-worker.ts     # Worker thread manager
│   │   └── ar-compiler-core.ts    # MindAR compilation logic
│   ├── services/
│   │   ├── webhook-client.ts      # Webhooks к backend
│   │   └── file-manager.ts        # Управление файлами
│   └── migrations/
│       └── 001_initial_schema.sql # Database schema
├── package.json
├── tsconfig.json
└── .env

Backend Integration:
backend/
├── src/
│   ├── routers/
│   │   └── ar-router.ts           # /api/ar/* endpoints
│   ├── services/
│   │   └── ar-service-client.ts   # HTTP client для AR service
│   └── objects/
│       ├── uploads/                # Загрузки пользователей
│       └── ar-storage/             # Результаты компиляции
│           ├── {projectId}/
│           │   ├── marker.mind
│           │   ├── index.html
│           │   ├── qr-code.png
│           │   └── video.mp4
│           └── mind-cache/
│               └── {md5hash}.mind

Frontend Integration:
frontend/
└── src/
    ├── pages/
    │   ├── LivingPhotos.tsx       # Создание AR-проектов
    │   ├── ARViewRedirect.tsx     # Редирект /ar/view/:id
    │   └── AdminAREdit.tsx        # Админка для редактирования
    └── components/
        └── ar/
            └── ARProjectItemsList.tsx
```

---

## 📋 14. API ENDPOINTS

### AR Microservice (порт 5000)

**1. POST /compile**
```typescript
// Request
{
  "userId": "user-123",
  "photoUrl": "/objects/uploads/photo.jpg",
  "videoUrl": "/objects/uploads/video.mp4",  // optional
  "orderId": "order-456",                     // optional
  "isDemo": true,
  "config": {
    "fitMode": "contain",
    "zoom": 1.0,
    "offsetX": 0,
    "offsetY": 0,
    "aspectLocked": true,
    "autoPlay": true,
    "loop": true
  }
}

// Response (202 Accepted)
{
  "projectId": "demo-1763981287240-9ydtkf1",
  "status": "queued",
  "message": "Compilation job queued",
  "estimatedTimeSeconds": 120,
  "statusUrl": "/status/demo-1763981287240-9ydtkf1",
  "viewUrl": "/view/demo-1763981287240-9ydtkf1"
}
```

**2. GET /status/:projectId**
```typescript
// Response
{
  "projectId": "demo-1763981287240-9ydtkf1",
  "status": "ready",  // pending/queued/processing/ready/error
  "progress": 100,
  "viewUrl": "https://photobooksgallery.am/ar/view/demo-1763981287240-9ydtkf1",
  "qrCodeUrl": "/objects/ar-storage/demo-1763981287240-9ydtkf1/qr-code.png",
  "markerMindUrl": "/objects/ar-storage/demo-1763981287240-9ydtkf1/marker.mind",
  "compilationTimeMs": 72275,
  "isDemo": true,
  "expiresAt": "2025-11-25T10:44:15.225Z",
  "createdAt": "2025-11-24T06:44:15.227Z",
  "updatedAt": "2025-11-24T06:45:45.442Z"
}
```

**3. GET /view/:projectId**
```html
<!-- Returns HTML file -->
<!DOCTYPE html>
<html>
  <!-- Full AR viewer with A-Frame + MindAR -->
</html>
```

**4. GET /health**
```json
{
  "status": "healthy",
  "service": "ar-microservice",
  "version": "1.0.0",
  "database": "connected",
  "queue": "ok",
  "uptime": 3600.5
}
```

### Backend API (порт 5002)

**1. POST /api/ar/create-demo**
```typescript
// Request (multipart/form-data)
FormData {
  photo: File (image/jpeg)
  video: File (video/mp4)
}

// Response (202 Accepted)
{
  "message": "Demo AR project created (expires in 24 hours)",
  "data": {
    "arId": "demo-1763981287240-9ydtkf1",
    "status": "pending",
    "expiresAt": "2025-11-25T10:44:15.225Z",
    "isDemo": true,
    "estimatedTimeSeconds": 120,
    "statusUrl": "/api/ar/status/demo-1763981287240-9ydtkf1"
  }
}
```

**2. GET /api/ar/status/:projectId**
```typescript
// Response
{
  "message": "AR project status",
  "data": {
    "id": "demo-1763981287240-9ydtkf1",
    "status": "ready",
    "progress": 100,
    "viewUrl": "https://photobooksgallery.am/ar/view/...",
    "qrCodeUrl": "/objects/ar-storage/.../qr-code.png",
    "markerMindUrl": "/objects/ar-storage/.../marker.mind",
    "compilationTimeMs": 72275,
    "isDemo": true,
    "expiresAt": "2025-11-25T10:44:15.225Z"
  }
}
```

---

## 🔄 15. COMPILATION WORKFLOW (детально)

### Этап 1: Resize Photo (3 секунды)
```typescript
// Input:  /uploads/photo.jpg (4961x4961px, 5 MB)
// Output: /ar-storage/{id}/photo-resized.jpg (1024x1024px, 500 KB)

await sharp(photoPath)
  .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 90 })
  .toFile(resizedPath);
```

### Этап 2: Border Enhancement (7 секунд)
```typescript
// Input:  photo-resized.jpg (1024x1024px)
// Output: enhanced-photo.jpg (1305x1305px с рамкой)

// Генерация уникального паттерна на основе MD5 хеша фото
const seed = generatePhotoSeed(photoPath);
const rng = new SeededRandom(seed);
const borderThickness = Math.round(maxSide * 0.135); // 13.5%

// Canvas: рисуем рамку с геометрическим паттерном
const canvas = createCanvas(origW + borderThickness * 2, origH + borderThickness * 2);
drawUniqueBorder(ctx, borderThickness, rng);
ctx.drawImage(originalPhoto, borderThickness, borderThickness);
```

### Этап 3: Crop Center (2 секунды)
```typescript
// Input:  enhanced-photo.jpg (1305x1305px с рамкой)
// Output: marker-for-mind.jpg (1024x1024px без рамки)

// Вырезать центр (убрать рамку) для чистого распознавания MindAR
await sharp(enhancedPhotoPath)
  .extract({
    left: borderThickness,
    top: borderThickness,
    width: origW,
    height: origH
  })
  .jpeg({ quality: 95 })
  .toFile(croppedPath);
```

### Этап 4: MD5 Cache Check (0.1 секунды)
```typescript
// Вычислить MD5 хеш финального маркера
const photoBuffer = await fs.readFile(markerPath);
const photoHash = crypto.createHash('md5').update(photoBuffer).digest('hex');
// photoHash = "5fdb97bea087c2756b7a3d2de32b4531"

const cachedMindPath = `/ar-storage/mind-cache/${photoHash}.mind`;

if (await fs.access(cachedMindPath)) {
  // CACHE HIT! Копировать готовый .mind файл
  await fs.copyFile(cachedMindPath, targetMindPath);
  console.log('⚡ Compilation skipped (1 second)');
  return { success: true, compilationTimeMs: 1000 };
}
```

### Этап 5: MindAR Compilation (72 секунды - если нет кеша)
```typescript
// Input:  marker-for-mind.jpg (1024x1024px)
// Output: marker.mind (436 KB бинарный файл)

// Загрузить TensorFlow.js
await tf.ready();

// Загрузить MindAR compiler
const { Compiler } = await import('mind-ar/src/image-target/offline-compiler.js');
const compiler = new Compiler({ maxScale: 640 });

// Загрузить изображение маркера
const image = await loadImage(markerPath);

// Компиляция (CPU-intensive!)
await compiler.compileImageTargets([image], (progress) => {
  console.log(`MindAR compilation progress: ${progress.toFixed(1)}%`);
});

// Экспорт бинарного .mind файла
const exportedBuffer = compiler.exportData();
await fs.writeFile('/ar-storage/{id}/marker.mind', exportedBuffer);

// Сохранить в кеш для повторного использования
await fs.copyFile(mindFilePath, `/ar-storage/mind-cache/${photoHash}.mind`);
```

### Этап 6: HTML Viewer Generation (1 секунда)
```typescript
// Input:  marker.mind, video.mp4, config
// Output: index.html (19 KB)

const html = `<!DOCTYPE html>
<html>
<head>
  <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
</head>
<body>
  <a-scene mindar-image="imageTargetSrc:./marker.mind">
    <a-assets>
      <video id="vid" src="./video.mp4" loop muted playsinline></video>
    </a-assets>
    <a-camera></a-camera>
    <a-entity mindar-image-target="targetIndex:0">
      <a-plane material="src:#vid" width="${videoScale.width}" height="${videoScale.height}"></a-plane>
    </a-entity>
  </a-scene>
  <script>
    // AR tracking logic
  </script>
</body>
</html>`;

await fs.writeFile('/ar-storage/{id}/index.html', html);
```

### Этап 7: QR Code Generation (1 секунда)
```typescript
// Input:  projectId, TUNNEL_URL
// Output: qr-code.png (8 KB)

const viewUrl = `${TUNNEL_URL}/ar/view/${projectId}`;
// viewUrl = "https://photobooksgallery.am/ar/view/demo-123-abc"

await QRCode.toFile('/ar-storage/{id}/qr-code.png', viewUrl, {
  type: 'png',
  width: 512,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
});
```

### Этап 8: Copy Assets (3 секунды)
```typescript
// Копировать видео
await fs.copyFile(
  '/objects/uploads/video.mp4',
  '/ar-storage/{id}/video.mp4'
);

// Копировать логотип (если есть)
await fs.copyFile(
  '/assets/logo_animate1.webp',
  '/ar-storage/{id}/logo_animate1.webp'
);
```

### Итого:
```
Resize:             3s
Border Enhancement: 7s
Crop Center:        2s
MD5 Check:          0.1s
MindAR Compile:     72s (или 1s если кеш)
HTML Generation:    1s
QR Code:            1s
Copy Assets:        3s
─────────────────────
TOTAL (первый раз): ~89s (с учётом overhead)
TOTAL (с кешем):    ~17s
```

---

## 🎨 16. КОНФИГУРАЦИЯ AR VIEWER

### Параметры config (JSONB в БД):

```typescript
interface ARConfig {
  // Режим масштабирования видео
  fitMode?: 'contain' | 'cover' | 'fill' | 'exact';
  
  // Масштаб и позиционирование
  zoom?: number;              // 1.0 = 100%, 1.5 = 150%
  offsetX?: number;           // Сдвиг по X (в метрах AR)
  offsetY?: number;           // Сдвиг по Y (в метрах AR)
  aspectLocked?: boolean;     // Сохранять пропорции при zoom
  
  // Видео настройки
  autoPlay?: boolean;         // Автовоспроизведение
  loop?: boolean;             // Зациклить видео
  
  // 3D позиционирование
  videoPosition?: {
    x: number;  // -1.0 to 1.0
    y: number;
    z: number;
  };
  
  videoRotation?: {
    x: number;  // градусы
    y: number;
    z: number;
  };
  
  videoScale?: {
    width: number;   // относительно маркера
    height: number;
  };
}
```

### Пример использования:

```typescript
// Вариант 1: Видео точно по размеру фото (contain)
const config = {
  fitMode: 'contain',
  zoom: 1.0,
  autoPlay: true,
  loop: true
};

// Вариант 2: Видео заполняет всё фото (cover)
const config = {
  fitMode: 'cover',
  zoom: 1.2,
  aspectLocked: true,
  autoPlay: true,
  loop: true
};

// Вариант 3: Ручное позиционирование
const config = {
  fitMode: 'exact',
  videoPosition: { x: 0, y: 0.1, z: 0 },  // Сдвиг вверх на 0.1м
  videoRotation: { x: 0, y: 0, z: 0 },
  videoScale: { width: 1.5, height: 1.125 },  // 4:3 соотношение
  autoPlay: true,
  loop: true
};
```

---

## 📞 17. WEBHOOK СИСТЕМА (опционально)

### Отправка событий в Backend:

```typescript
// ar-service/src/services/webhook-client.ts

interface WebhookEvent {
  event_type: 'compilation_complete' | 'compilation_error' | 'demo_expired';
  project_id: string;
  payload: any;
}

export async function sendWebhook(event: WebhookEvent) {
  if (!process.env.ENABLE_WEBHOOKS) return;
  
  const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/ar`;
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    
    console.log(`[Webhook] ✅ Sent: ${event.event_type}`);
  } catch (error) {
    console.error(`[Webhook] ❌ Failed:`, error);
    
    // Сохранить в таблицу ar_webhook_events для retry
    await pool.query(`
      INSERT INTO ar_webhook_events (event_type, project_id, payload, attempts, next_retry_at)
      VALUES ($1, $2, $3, 0, NOW() + INTERVAL '1 minute')
    `, [event.event_type, event.project_id, event.payload]);
  }
}
```

### Использование:

```typescript
// После успешной компиляции
await sendWebhook({
  event_type: 'compilation_complete',
  project_id: projectId,
  payload: {
    status: 'ready',
    compilation_time_ms: 72275,
    view_url: `https://photobooksgallery.am/ar/view/${projectId}`,
    qr_code_url: `/objects/ar-storage/${projectId}/qr-code.png`
  }
});
```

---

## 🔍 18. DEBUGGING И TROUBLESHOOTING

### Проблема: Компиляция зависла на 10%

**Причина:** MindAR не может обработать изображение (слишком низкое качество, нет контраста)

**Решение:**
```typescript
// Проверить metadata фото
const meta = await sharp(photoPath).metadata();
console.log('Photo metadata:', meta);

// Проверить что фото не размыто (blur detection)
const stats = await sharp(photoPath).stats();
console.log('Image stats:', stats);
```

### Проблема: AR не запускается на iPhone

**Причина:** iOS Safari требует HTTPS для getUserMedia API

**Решение:**
```bash
# Использовать ngrok для HTTPS tunnel
ngrok http 5000

# Или настроить SSL сертификат
# Let's Encrypt + Nginx reverse proxy
```

### Проблема: Видео не воспроизводится

**Причина:** 
1. Видео не в формате H.264 (Safari требует)
2. Видео слишком большое (>50 MB)
3. CORS ошибка

**Решение:**
```bash
# Конвертировать в H.264 с помощью ffmpeg
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -profile:v baseline \
  -level 3.0 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  output.mp4

# Проверить размер
ls -lh output.mp4
```

### Проблема: Port 5000 already in use

**Причина:** Старый процесс не завершился корректно

**Решение:**
```powershell
# Windows
netstat -ano | findstr :5000
taskkill /PID {PID} /F

# Или добавить graceful shutdown в index.ts
process.on('SIGTERM', async () => {
  await server.close();
  await boss.stop();
  await pool.end();
  process.exit(0);
});
```

---

## 📚 19. ПОЛЕЗНЫЕ ССЫЛКИ

### Документация:
- **MindAR:** https://github.com/hiukim/mind-ar-js
- **A-Frame:** https://aframe.io/docs/
- **TensorFlow.js:** https://www.tensorflow.org/js
- **pg-boss:** https://github.com/timgit/pg-boss

### Примеры AR проектов:
- **8th Wall:** https://www.8thwall.com/
- **AR.js:** https://github.com/AR-js-org/AR.js
- **Zappar:** https://www.zappar.com/

### Browser API:
- **getUserMedia:** https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- **WebGL:** https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API

---

## 📝 20. КРАТКАЯ СХЕМА ДЛЯ ПРОМПТА

```
╔═══════════════════════════════════════════════════════════════╗
║                  AR SERVICE ARCHITECTURE                       ║
╚═══════════════════════════════════════════════════════════════╝

МИКРОСЕРВИС (порт 5000)
├── Express API
│   ├── POST /compile → Создать AR проект
│   ├── GET /status/:id → Проверить статус
│   └── GET /view/:id → HTML5 AR viewer
├── pg-boss Queue
│   ├── AR_COMPILE (teamSize: 2)
│   └── DEMO_CLEANUP (каждые 6 часов)
├── Compiler Worker
│   ├── 1. Resize: 4961px → 1024px (3s)
│   ├── 2. Border: Хеш-паттерн (7s)
│   ├── 3. Crop: Убрать рамку (2s)
│   ├── 4. Cache: MD5 проверка (0.1s)
│   ├── 5. MindAR: Компиляция .mind (72s или 1s)
│   ├── 6. HTML: A-Frame viewer (1s)
│   ├── 7. QR: Генерация кода (1s)
│   └── 8. Assets: Копирование (3s)
└── PostgreSQL ar_db (порт 5434)
    ├── ar_projects (проекты)
    ├── ar_compilation_logs (логи)
    └── ar_webhook_events (webhooks)

STORAGE (/backend/objects/)
├── uploads/ ← Загрузки пользователей
│   ├── demo-123-photo.jpg
│   └── demo-123-video.mp4
└── ar-storage/ ← Результаты компиляции
    ├── demo-123-abc/
    │   ├── marker.mind (436 KB)
    │   ├── index.html (19 KB)
    │   ├── qr-code.png (8 KB)
    │   ├── video.mp4 (5-50 MB)
    │   ├── photo-resized.jpg (500 KB)
    │   ├── enhanced-photo.jpg (2 MB)
    │   └── marker-for-mind.jpg (800 KB)
    └── mind-cache/
        └── 5fdb97be...31.mind (кеш)

ИНТЕГРАЦИЯ
Backend (5002) ──HTTP──> AR Service (5000)
     ↓                          ↓
  Drizzle ORM              pg-boss queue
     ↓                          ↓
photobooks_db (5433)        ar_db (5434)

Frontend (3000)
     ↓
  /api/ar/create-demo (upload)
     ↓
  /api/ar/status/:id (polling)
     ↓
  /objects/ar-storage/:id/index.html (viewer)

WebAR VIEWER
QR Code → Браузер → index.html → A-Frame + MindAR
                      ↓
         getUserMedia() (камера)
                      ↓
         marker.mind (436 KB)
                      ↓
         Распознавание фото
                      ↓
         Показать video.mp4 поверх

ОПТИМИЗАЦИИ
✅ 1024px разрешение: 72s (vs 174s с 1920px)
✅ MD5 кеш: 1s повторно (vs 72s без кеша)
✅ pg-boss retry: 3 попытки с backoff
✅ Border enhancement: +5x уникальных паттернов
✅ Worker threads: 2 параллельных компиляции

БЕЗ УСТАНОВКИ ПРИЛОЖЕНИЯ!
iOS Safari + Chrome Android + Samsung Internet
```

---

**КОНЕЦ СПЕЦИФИКАЦИИ**

Эта полная техническая характеристика описывает AR-сервис PhotoBooks Gallery для создания промпта приложения с browser preview функционалом.
