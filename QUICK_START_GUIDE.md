# 🚀 AR Microservice - Быстрый Старт

## 📋 Пошаговая Инструкция по Подключению

### Шаг 1: Установка Зависимостей

```powershell
# Перейти в папку AR сервиса
cd ar-service

# Установить зависимости
npm install

# Вернуться в корень проекта
cd ..
```

**Что устанавливается:**
- `mind-ar` - MindAR offline компилятор (120s CPU работа)
- `pg-boss` - PostgreSQL очередь заданий (БЕЗ Redis!)
- `express` - Web framework
- `sharp`, `canvas` - Обработка изображений
- `qrcode` - Генерация QR кодов

---

### Шаг 2: Настройка Окружения

#### 2.1 AR Service Environment

```powershell
# Скопировать шаблон
Copy-Item ar-service\.env.example ar-service\.env

# Открыть для редактирования
notepad ar-service\.env
```

**ar-service/.env** - настроить следующие переменные:

```env
# AR Database (ОТДЕЛЬНАЯ от основной!)
AR_DATABASE_URL=postgresql://photobooks:YourPassword@localhost:5434/ar_db

# Backend URL (для вебхуков)
BACKEND_URL=http://localhost:5002
BACKEND_WEBHOOK_SECRET=generate-secure-random-string-here

# Frontend URL (для QR кодов)
FRONTEND_URL=http://localhost:3000

# Storage Paths (Docker volumes)
AR_STORAGE_PATH=/app/storage/ar-storage
SHARED_UPLOADS_PATH=/app/storage/uploads

# Demo Cleanup (2 AM daily)
DEMO_CLEANUP_SCHEDULE=0 2 * * *

# Feature Flags
AR_ENABLE_BORDER_ENHANCER=true

# Port
PORT=5000
NODE_ENV=development
```

#### 2.2 Backend Environment (обновить)

```powershell
notepad backend\.env
```

**Добавить в backend/.env:**

```env
# AR Microservice Integration
AR_SERVICE_URL=http://localhost:5000
AR_WEBHOOK_SECRET=same-as-ar-service-secret
```

---

### Шаг 3: Запуск Баз Данных

```powershell
# Запустить только базы данных
docker-compose -f docker-compose.ar-microservice.yml up -d db-main ar-db

# Проверить статус
docker-compose -f docker-compose.ar-microservice.yml ps

# Должны быть запущены:
# - photobooks-db-main (port 5433)
# - photobooks-ar-db (port 5434)
```

**Подождать 10 секунд** пока базы стартуют:

```powershell
Start-Sleep -Seconds 10
```

---

### Шаг 4: Миграция AR Database

```powershell
cd ar-service

# Запустить миграции (создать таблицы)
npm run migrate

# Ожидаемый вывод:
# ✅ Migration 001_initial_schema.sql executed successfully
# ✅ All migrations completed
```

**Что создается:**
- `ar_projects` - метаданные AR проектов (id, status, URLs)
- `ar_compilation_logs` - пошаговые логи компиляции
- `ar_webhook_events` - отслеживание вебхуков
- `pgboss.*` - таблицы pg-boss очереди

---

### Шаг 5: Запуск AR Service

#### Вариант A: Development Mode (рекомендуется для тестирования)

```powershell
cd ar-service
npm run dev
```

**Вывод:**
```
🚀 Starting AR Microservice...
[Startup] 🔌 Connecting to database...
[Startup] ✅ Database connected
[Startup] 📤 Starting pg-boss queue...
[Startup] ✅ pg-boss started
[Startup] 👷 Registering workers...
[Startup] ✅ Registered AR_COMPILE worker (teamSize: 2)
[Startup] ✅ Registered DEMO_CLEANUP worker

✅ AR Microservice running on port 5000
   Environment: development
   Health check: http://localhost:5000/health
```

#### Вариант B: Production Mode (Docker)

```powershell
# В корне проекта
docker-compose -f docker-compose.ar-microservice.yml up -d ar-service

# Проверить логи
docker logs -f photobooks-ar-service
```

---

### Шаг 6: Проверка Работоспособности

```powershell
# Health check
curl http://localhost:5000/health

# Ожидаемый ответ:
# {
#   "status": "healthy",
#   "service": "ar-microservice",
#   "database": "connected",
#   "queue": "ok",
#   "uptime": 10.5
# }
```

---

## 🔌 Интеграция с Backend

### Шаг 1: Создать AR Router

**backend/src/routers/ar-router.ts** (НОВЫЙ ФАЙЛ):

```typescript
import { Router } from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const AR_SERVICE_URL = process.env.AR_SERVICE_URL || 'http://localhost:5000';

/**
 * POST /api/ar/compile - Создать AR проект
 * 
 * Требует JWT токен (userId извлекается из токена)
 */
router.post('/compile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Из JWT
    
    console.log(`[AR Router] Compile request from user: ${userId}`);
    
    // Проксировать запрос в AR-service
    const response = await axios.post(`${AR_SERVICE_URL}/compile`, {
      userId, // Инжектируем userId из JWT
      photoUrl: req.body.photoUrl,
      videoUrl: req.body.videoUrl,
      maskUrl: req.body.maskUrl,
      orderId: req.body.orderId,
      isDemo: req.body.isDemo || false,
      config: req.body.config || {}
    }, {
      timeout: 10000 // 10s (должен отвечать мгновенно)
    });
    
    console.log(`[AR Router] Created project: ${response.data.projectId}`);
    
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('[AR Router] Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'AR service unavailable',
        message: 'Please try again later'
      });
    }
    
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Internal server error'
    });
  }
});

/**
 * GET /api/ar/status/:id - Проверить статус компиляции
 */
router.get('/status/:id', async (req, res) => {
  try {
    const response = await axios.get(`${AR_SERVICE_URL}/status/${req.params.id}`);
    res.json(response.data);
  } catch (error: any) {
    console.error('[AR Router] Status error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to get status'
    });
  }
});

/**
 * GET /api/ar/status/:id/logs - Получить логи компиляции
 */
router.get('/status/:id/logs', async (req, res) => {
  try {
    const response = await axios.get(`${AR_SERVICE_URL}/status/${req.params.id}/logs`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'Failed to get logs'
    });
  }
});

export default router;
```

### Шаг 2: Создать Webhook Receiver

**backend/src/routers/webhooks.ts** (НОВЫЙ ФАЙЛ):

```typescript
import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Middleware: Проверка подписи вебхука
 */
function verifyWebhookSignature(req: Request): boolean {
  const secret = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.AR_WEBHOOK_SECRET;
  
  if (!expectedSecret) {
    console.warn('[Webhook] AR_WEBHOOK_SECRET not configured!');
    return false;
  }
  
  return secret === expectedSecret;
}

/**
 * POST /webhooks/ar-service - Получать события от AR-service
 */
router.post('/ar-service', async (req: Request, res: Response) => {
  // Проверка подписи
  if (!verifyWebhookSignature(req)) {
    console.error('[Webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  
  const { event, data } = req.body;
  
  console.log(`[Webhook] 📥 Received event: ${event}`, JSON.stringify(data, null, 2));
  
  try {
    // Обработка события: компиляция завершена
    if (event === 'ar.compilation.complete') {
      const { projectId, viewUrl, qrCodeUrl } = data;
      
      console.log(`[Webhook] ✅ AR compilation complete: ${projectId}`);
      console.log(`[Webhook] View URL: ${viewUrl}`);
      
      // TODO: Обновить заказ, отправить уведомление пользователю
      // Example:
      // await updateOrder(data.orderId, { arViewUrl: viewUrl });
      // await sendEmailNotification(data.userId, viewUrl);
    }
    
    // Обработка события: компиляция провалилась
    else if (event === 'ar.compilation.failed') {
      const { projectId, error } = data;
      
      console.error(`[Webhook] ❌ AR compilation failed: ${projectId}`);
      console.error(`[Webhook] Error: ${error}`);
      
      // TODO: Уведомить пользователя об ошибке
      // Example:
      // await notifyCompilationError(data.userId, error);
    }
    
    // Обработка события: запрос отправки email
    else if (event === 'ar.email.request') {
      const { projectId, userId, viewUrl } = data;
      
      console.log(`[Webhook] 📧 Email request for project: ${projectId}`);
      
      // TODO: Отправить email пользователю
      // Example:
      // await sendEmail({
      //   to: userId, // или получить email из базы
      //   subject: 'Ваш AR опыт готов!',
      //   body: `Просмотреть AR: ${viewUrl}`
      // });
      
      console.log(`[Webhook] ✅ Email sent (stub) for project: ${projectId}`);
    }
    
    // Неизвестное событие
    else {
      console.warn(`[Webhook] ⚠️ Unknown event: ${event}`);
    }
    
    // Всегда отвечать 200 OK (иначе AR-service будет ретраить)
    res.json({ success: true, received: event });
    
  } catch (error: any) {
    console.error('[Webhook] ❌ Processing error:', error);
    
    // 500 = AR-service будет ретраить позже
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Шаг 3: Подключить Роутеры

**backend/src/index.ts** (добавить):

```typescript
// ... существующие импорты ...

import arRouter from './routers/ar-router';
import webhookRouter from './routers/webhooks';

// ... существующий код ...

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
// ... другие роутеры ...

// AR Integration (НОВОЕ!)
app.use('/api/ar', arRouter);
app.use('/webhooks', webhookRouter);

// ... остальной код ...
```

---

## 🧪 Тестирование

### Тест 1: Health Check

```powershell
# AR Service
curl http://localhost:5000/health

# Backend (должен быть запущен)
curl http://localhost:5002/health
```

### Тест 2: Создать Тестовый AR Проект

```powershell
# Создать тестовое фото и видео (если нет)
# Положить в backend/objects/uploads/test-photo.jpg
# Положить в backend/objects/uploads/test-video.mp4

# Получить JWT токен (авторизоваться в frontend)
$token = "YOUR_JWT_TOKEN"

# Создать AR проект
$response = Invoke-RestMethod -Uri "http://localhost:5002/api/ar/compile" `
  -Method Post `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -ContentType "application/json" `
  -Body (@{
    photoUrl = "/objects/uploads/test-photo.jpg"
    videoUrl = "/objects/uploads/test-video.mp4"
    isDemo = $true
    config = @{
      fitMode = "contain"
      autoPlay = $true
      loop = $true
    }
  } | ConvertTo-Json)

# Сохранить Project ID
$projectId = $response.projectId
Write-Host "Project ID: $projectId" -ForegroundColor Green
Write-Host "Status URL: http://localhost:5002/api/ar/status/$projectId" -ForegroundColor Cyan
```

**Ожидаемый ответ (202 Accepted):**
```json
{
  "projectId": "uuid-here",
  "status": "pending",
  "message": "Compilation job queued successfully",
  "estimatedTimeSeconds": 120,
  "statusUrl": "/status/uuid-here",
  "viewUrl": "/view/uuid-here"
}
```

### Тест 3: Проверить Статус

```powershell
# Проверить статус компиляции
$status = Invoke-RestMethod -Uri "http://localhost:5002/api/ar/status/$projectId"
Write-Host "Status: $($status.status)" -ForegroundColor Yellow

# Статусы:
# - pending: В очереди
# - processing: Компилируется (Worker Thread работает)
# - ready: Готово (можно просматривать)
# - error: Ошибка компиляции
```

### Тест 4: Просмотреть AR (после готовности)

```powershell
# Подождать пока status = "ready" (примерно 120 секунд)
do {
  Start-Sleep -Seconds 5
  $status = Invoke-RestMethod -Uri "http://localhost:5002/api/ar/status/$projectId"
  Write-Host "Status: $($status.status) (progress: $($status.progress)%)" -ForegroundColor Yellow
} while ($status.status -ne "ready" -and $status.status -ne "error")

# Открыть AR viewer
if ($status.status -eq "ready") {
  Start-Process "http://localhost:3000/ar/view/$projectId"
  Write-Host "✅ AR viewer opened!" -ForegroundColor Green
} else {
  Write-Host "❌ Compilation failed: $($status.errorMessage)" -ForegroundColor Red
}
```

---

## 📱 Frontend Интеграция

### Пример: React Component для создания AR

```typescript
// components/ARCreator.tsx

import { useState } from 'react';
import axios from 'axios';

export default function ARCreator() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');

  const handleSubmit = async () => {
    if (!photo) {
      alert('Пожалуйста, выберите фото');
      return;
    }

    setLoading(true);

    try {
      // 1. Загрузить фото и видео
      const formData = new FormData();
      formData.append('photo', photo);
      if (video) formData.append('video', video);

      const uploadRes = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 2. Создать AR проект
      const compileRes = await axios.post('/api/ar/compile', {
        photoUrl: uploadRes.data.photoUrl,
        videoUrl: uploadRes.data.videoUrl,
        isDemo: false,
        config: {
          fitMode: 'contain',
          autoPlay: true,
          loop: true
        }
      });

      setProjectId(compileRes.data.projectId);
      setStatus('pending');

      // 3. Поллинг статуса
      pollStatus(compileRes.data.projectId);

    } catch (error: any) {
      console.error('AR creation error:', error);
      alert('Ошибка создания AR: ' + error.response?.data?.message);
      setLoading(false);
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/ar/status/${id}`);
        setStatus(res.data.status);

        if (res.data.status === 'ready') {
          clearInterval(interval);
          setLoading(false);
          // Перенаправить на просмотр
          window.location.href = `/ar/view/${id}`;
        } else if (res.data.status === 'error') {
          clearInterval(interval);
          setLoading(false);
          alert('Ошибка компиляции: ' + res.data.errorMessage);
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    }, 3000); // Каждые 3 секунды
  };

  return (
    <div className="ar-creator">
      <h2>Создать AR опыт</h2>

      <div>
        <label>Фото-маркер (обязательно):</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setPhoto(e.target.files?.[0] || null)} 
        />
      </div>

      <div>
        <label>Видео (опционально):</label>
        <input 
          type="file" 
          accept="video/*" 
          onChange={(e) => setVideo(e.target.files?.[0] || null)} 
        />
      </div>

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? `Компиляция... (${status})` : 'Создать AR'}
      </button>

      {projectId && (
        <div>
          <p>Project ID: {projectId}</p>
          <p>Status: {status}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔧 Настройка Nginx (Production)

**nginx/nginx.conf** уже создан, но нужно настроить SSL:

```nginx
# Раскомментировать секцию HTTPS в nginx.conf

server {
    listen 443 ssl http2;
    server_name photobooksgallery.am;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... все location блоки из HTTP версии ...
}

# Редирект HTTP → HTTPS
server {
    listen 80;
    server_name photobooksgallery.am;
    return 301 https://$server_name$request_uri;
}
```

**Получить SSL сертификат:**

```powershell
# Используя Let's Encrypt (Certbot)
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  certbot/certbot certonly \
  --standalone \
  -d photobooksgallery.am \
  -d www.photobooksgallery.am
```

---

## 🐛 Troubleshooting

### Проблема: AR Service не стартует

```powershell
# Проверить логи
docker logs photobooks-ar-service

# Частые причины:
# 1. База данных не готова
docker-compose -f docker-compose.ar-microservice.yml restart ar-db
Start-Sleep -Seconds 10
docker-compose -f docker-compose.ar-microservice.yml restart ar-service

# 2. Неверный AR_DATABASE_URL
docker exec photobooks-ar-service env | grep AR_DATABASE_URL
```

### Проблема: Компиляция зависла в "pending"

```powershell
# Проверить pg-boss worker
docker exec photobooks-ar-service npm run migrate

# Проверить логи AR service
docker logs -f photobooks-ar-service

# Перезапустить
docker-compose -f docker-compose.ar-microservice.yml restart ar-service
```

### Проблема: Backend не получает вебхуки

```powershell
# Проверить connectivity
docker exec photobooks-ar-service curl http://backend:5002/health

# Проверить webhook secret
docker exec photobooks-ar-service env | grep BACKEND_WEBHOOK_SECRET
docker exec photobooks-backend env | grep AR_WEBHOOK_SECRET
# Должны совпадать!

# Проверить логи backend
docker logs -f photobooks-backend | grep Webhook
```

---

## 📊 Мониторинг

### Проверить очередь pg-boss

```sql
-- Подключиться к ar-db
psql -h localhost -p 5434 -U photobooks -d ar_db

-- Активные задания
SELECT name, state, COUNT(*) 
FROM pgboss.job 
GROUP BY name, state;

-- Проваленные задания
SELECT * FROM pgboss.job 
WHERE state = 'failed' 
ORDER BY createdon DESC 
LIMIT 5;
```

### Проверить AR проекты

```sql
-- Последние 10 проектов
SELECT id, status, compilation_time_ms, created_at 
FROM ar_projects 
ORDER BY created_at DESC 
LIMIT 10;

-- Статистика за сегодня
SELECT 
  status, 
  COUNT(*) as count,
  AVG(compilation_time_ms) as avg_time_ms
FROM ar_projects 
WHERE created_at > CURRENT_DATE 
GROUP BY status;
```

---

## ✅ Чеклист Готовности к Production

- [ ] SSL сертификаты настроены в Nginx
- [ ] Environment переменные защищены (не default значения!)
- [ ] Backup баз данных настроен (ar-db + main-db)
- [ ] Monitoring алерты настроены (compilation failures, webhook errors)
- [ ] Load test пройден: 10 concurrent AR compilations
- [ ] Backend отвечает < 100ms во время компиляции ✅
- [ ] Demo auto-cleanup работает (24h expiration)
- [ ] AR viewer протестирован на iPhone, Android, Desktop
- [ ] QR коды работают с production URL
- [ ] Rollback plan протестирован (отключить AR service, backend работает)
- [ ] Документация обновлена для команды

---

## 🎯 Готово!

Теперь у вас есть:
- ✅ AR Microservice работает изолированно
- ✅ Backend НИКОГДА не блокируется (< 100ms всегда)
- ✅ База данных НИКОГДА не зависает
- ✅ CRM панель всегда отзывчива
- ✅ Можно компилировать 2+ AR одновременно

**Ключевые URL:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5002/api
- AR Service: http://localhost:5000
- AR Viewer: http://localhost:3000/ar/view/:projectId

**Следующий шаг:** Production deployment с SSL и мониторингом!
