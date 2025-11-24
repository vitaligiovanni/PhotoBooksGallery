# AR Microservice - Phase 1 Implementation (IN PROGRESS)

## 🎯 Objective

Isolate CPU-intensive AR compilation (MindAR 120s blocker) from main backend to prevent event loop blocking.

### Problem Solved:
- ❌ **Before**: MindAR blocks entire Node.js event loop for 120 seconds → API timeout, database lockup
- ✅ **After**: MindAR runs in Worker Thread in separate microservice → backend ALWAYS responsive

---

## 📦 Project Structure

```
ar-service/
├── src/
│   ├── config/
│   │   ├── database.ts         ✅ AR database pool (isolated)
│   │   └── queue.ts             ✅ pg-boss job queue (NO Redis!)
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  ✅ ar_projects, ar_compilation_logs, ar_webhook_events
│   │   └── run.ts               ✅ Migration runner
│   ├── services/
│   │   ├── webhook-client.ts    ✅ Backend communication (compilation complete, email request)
│   │   └── file-manager.ts      ✅ Storage path abstraction
│   ├── workers/
│   │   ├── compiler-worker.ts   ✅ Worker Thread wrapper
│   │   └── ar-compiler-core.ts  ✅ Full MindAR compilation engine (EXTRACTED from backend)
│   ├── routes/
│   │   ├── compile.ts           ❌ TODO: POST /compile endpoint
│   │   ├── status.ts            ❌ TODO: GET /status/:id endpoint
│   │   └── viewer.ts            ❌ TODO: GET /view/:id endpoint
│   └── index.ts                 ❌ TODO: Express app entry point
├── package.json                 ✅ Dependencies defined
├── tsconfig.json                ✅ TypeScript config
├── Dockerfile                   ✅ Alpine + ffmpeg + cairo
├── .env.example                 ✅ Environment template
└── README.md                    📄 This file
```

**Progress: 60% complete** (12 of 20 files created)

---

## 🚀 Installation

### 1. Install Dependencies

```powershell
cd ar-service
npm install
```

**Critical dependencies:**
- `@hiukim/mind-ar-js@^1.2.5` - MindAR offline compiler (CPU-bound, 120s)
- `pg-boss@^9.0.3` - PostgreSQL-based job queue (NO Redis needed)
- `express@^4.18.2` - Web framework
- `sharp@^0.33.1` - Image processing (resize, crop)
- `canvas@^2.11.2` - Native canvas for border enhancer + MindAR
- `qrcode@^1.5.3` - QR code generator
- `fluent-ffmpeg@^2.1.2` - Video processing (optional, future use)

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# AR Database (SEPARATE from main e-commerce database)
AR_DATABASE_URL=postgresql://photobooks:password@ar-db:5432/ar_db

# Main Backend URL (for webhooks)
BACKEND_URL=http://backend:5002
BACKEND_WEBHOOK_SECRET=your-secret-here

# Frontend URL (for QR codes)
FRONTEND_URL=https://photobooksgallery.am

# Storage Paths (Docker volumes)
AR_STORAGE_PATH=/app/storage/ar-storage
SHARED_UPLOADS_PATH=/app/storage/uploads

# Demo Cleanup (pg-boss cron)
DEMO_CLEANUP_SCHEDULE=0 2 * * *  # 2 AM daily

# Feature Flags
AR_ENABLE_BORDER_ENHANCER=true  # Unique border pattern (default ON)
```

### 3. Database Setup

Run migrations to create AR database schema:

```powershell
npm run migrate
```

This creates:
- **ar_projects** - AR project metadata (status, URLs, config)
- **ar_compilation_logs** - Step-by-step compilation logs (resize, enhance, compile, qr)
- **ar_webhook_events** - Webhook delivery tracking (retry logic)

---

## 🏗️ Architecture

### Microservice Components:

1. **Express API** (port 5000)
   - `POST /compile` - Receive compilation job from backend
   - `GET /status/:id` - Check compilation status
   - `GET /view/:id` - Redirect to AR viewer

2. **pg-boss Queue**
   - `AR_COMPILE` - Compilation jobs (Worker Thread execution)
   - `DEMO_CLEANUP` - Auto-delete demos after 24h (cron job)
   - `WEBHOOK_NOTIFY` - Webhook delivery with retry (exponential backoff)

3. **Worker Threads**
   - `CompilerWorker` - Spawns Worker Thread for MindAR compilation
   - `ar-compiler-core.ts` - FULL compilation logic (extracted from backend):
     - Resize photo (5000px → 1920px)
     - Enhance marker with unique border (hash-based pattern)
     - Crop border for MindAR (clean center recognition)
     - Compile .mind file (120s CPU blocker)
     - Generate HTML5 viewer (A-Frame + MindAR)
     - Generate QR code

4. **Webhooks**
   - Backend ← AR: `compilation.complete` (viewUrl, qrCodeUrl)
   - Backend ← AR: `compilation.failed` (error message)
   - Backend → AR: `order.deleted` (cleanup AR project)
   - AR → Backend: `email.request` (send notification)

---

## 🔄 Compilation Flow

```
┌─────────────┐
│   Frontend  │
│ (Next.js)   │
└──────┬──────┘
       │ 1. Upload photo/video
       ▼
┌─────────────┐
│   Backend   │  ← JWT validation, userId extraction
│ (Express)   │
└──────┬──────┘
       │ 2. POST /api/ar/compile → proxy to AR-service
       ▼
┌─────────────┐
│ AR-Service  │  ← POST /compile
│ (port 5000) │
└──────┬──────┘
       │ 3. Create ar_projects row (status: pending)
       │ 4. Enqueue pg-boss job: AR_COMPILE
       │ 5. Return 202 Accepted { projectId, status: 'pending' }
       ▼
┌─────────────┐
│  pg-boss    │  ← Job queue (PostgreSQL-based)
│   Worker    │
└──────┬──────┘
       │ 6. Dequeue AR_COMPILE job
       ▼
┌─────────────┐
│Worker Thread│  ← ar-compiler-core.ts (NON-BLOCKING!)
│  (120s CPU) │
└──────┬──────┘
       │ 7. Resize → Enhance → Crop → Compile .mind (120s)
       │ 8. Generate viewer.html + QR code
       ▼
┌─────────────┐
│ AR Database │  ← UPDATE ar_projects (status: 'ready')
│  (ar-db)    │
└──────┬──────┘
       │ 9. Webhook: compilation.complete
       ▼
┌─────────────┐
│   Backend   │  ← Receive webhook
│             │  10. Send email notification
└─────────────┘
```

**Key Points:**
- Backend responds INSTANTLY (step 5) - no waiting for compilation
- MindAR runs in Worker Thread - main event loop NEVER blocks
- Webhooks notify backend when compilation done
- User sees status updates via polling or WebSocket

---

## 🧪 Testing (TODO)

### Unit Tests
```powershell
npm test
```

### Integration Tests
```powershell
# 1. Start AR-service
docker-compose up ar-service ar-db

# 2. Create test AR
curl -X POST http://localhost:5000/compile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "photoUrl": "/uploads/test-photo.jpg",
    "videoUrl": "/uploads/test-video.mp4",
    "isDemo": true
  }'

# 3. Check status
curl http://localhost:5000/status/PROJECT_ID

# 4. Open viewer
curl http://localhost:5000/view/PROJECT_ID
```

### Performance Test
```powershell
# CRITICAL: Backend should respond in <100ms even during AR compilation
# Run 10 concurrent AR compilations
for ($i=0; $i -lt 10; $i++) {
  Start-Job { curl http://localhost:5000/compile }
}

# Backend API should still respond instantly
Measure-Command { curl http://localhost:5002/api/products }
# Expected: <100ms (NOT 50-70 seconds like before!)
```

---

## 📊 Monitoring

### Compilation Logs

```sql
-- Check recent compilations
SELECT 
  id,
  status,
  compilation_time_ms,
  error_message,
  created_at
FROM ar_projects
ORDER BY created_at DESC
LIMIT 10;

-- Check step-by-step logs
SELECT 
  project_id,
  step,
  status,
  duration_ms,
  details
FROM ar_compilation_logs
WHERE project_id = 'PROJECT_ID'
ORDER BY id ASC;
```

### Webhook Delivery

```sql
-- Check failed webhooks (need retry)
SELECT 
  id,
  event_type,
  payload,
  attempts,
  next_retry_at
FROM ar_webhook_events
WHERE response_status IS NULL OR response_status >= 500
ORDER BY next_retry_at ASC;
```

### pg-boss Queue

```sql
-- Check queue health
SELECT name, COUNT(*) FROM pgboss.job
WHERE state = 'created'
GROUP BY name;

-- Check failed jobs
SELECT * FROM pgboss.job
WHERE state = 'failed'
ORDER BY createdon DESC
LIMIT 10;
```

---

## 🐳 Docker Deployment

### Build Image
```powershell
docker build -t ar-service:latest .
```

### Run Standalone
```powershell
docker run -d \
  --name ar-service \
  -p 5000:5000 \
  -e AR_DATABASE_URL=postgresql://... \
  -e BACKEND_URL=http://backend:5002 \
  -v ar-storage:/app/storage/ar-storage \
  -v uploads:/app/storage/uploads \
  ar-service:latest
```

### Full Stack (TODO: docker-compose.yml)
```yaml
services:
  ar-service:
    build: ./ar-service
    ports:
      - "5000:5000"
    environment:
      AR_DATABASE_URL: postgresql://photobooks:password@ar-db:5432/ar_db
      BACKEND_URL: http://backend:5002
      FRONTEND_URL: https://photobooksgallery.am
    volumes:
      - ar-storage:/app/storage/ar-storage
      - uploads:/app/storage/uploads
    depends_on:
      - ar-db
  
  ar-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: photobooks
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ar_db
    volumes:
      - ar-db-data:/var/lib/postgresql/data
  
  backend:
    # ... existing backend config ...
    environment:
      AR_SERVICE_URL: http://ar-service:5000
      AR_WEBHOOK_SECRET: your-secret-here
```

---

## 🔧 Development

### Run in Dev Mode
```powershell
npm run dev
```

### Watch Mode (auto-restart)
```powershell
npm run watch
```

### Build for Production
```powershell
npm run build
npm start
```

---

## 📝 TODO (Phase 1 Completion)

**Remaining Files (40%):**

- [ ] `src/routes/compile.ts` - POST /compile endpoint
- [ ] `src/routes/status.ts` - GET /status/:id endpoint
- [ ] `src/routes/viewer.ts` - GET /view/:id endpoint
- [ ] `src/index.ts` - Express app initialization
- [ ] `docker-compose.yml` - Full 6-container stack
- [ ] `nginx.conf` - Reverse proxy configuration
- [ ] Backend integration:
  - [ ] Proxy routes in `backend/src/routers/ar-router.ts`
  - [ ] Webhook receiver `POST /webhooks/ar-service`
- [ ] Data migration script (main db → ar-db)
- [ ] Testing scripts
- [ ] Deployment automation

**Estimated Time: 6-10 hours remaining**

---

## 🎓 Key Learnings

### Why Worker Threads?

MindAR compilation is CPU-bound (not I/O-bound):
```javascript
// ❌ WRONG: async/await doesn't help with CPU work
async function compile() {
  await mindAR.compile(photo); // Still blocks event loop for 120s
}

// ✅ CORRECT: Worker Thread isolates CPU work
const worker = new Worker('./ar-compiler-core.js');
worker.postMessage({ photo });
// Main thread continues, worker does heavy lifting
```

### Why pg-boss Instead of Redis?

For 10-80 AR/day workload:
- **pg-boss**: Uses existing PostgreSQL, simpler stack, sufficient performance
- **Redis**: Overkill, extra container, network latency, more complexity

**Decision**: Start with pg-boss, migrate to Redis only if >500 AR/day

### Why Separate Database?

**Isolation Benefits:**
- Main e-commerce DB never affected by AR compilation
- AR failures don't impact product catalog
- Independent scaling (AR → more CPU, Main → more storage)
- Clear data ownership (eventual consistency via webhooks)

---

## 🚨 Production Checklist

Before deploying to production:

- [ ] Load test: 10 concurrent compilations
- [ ] Verify backend responds <100ms during AR compilation
- [ ] Test demo auto-cleanup (24h expiration)
- [ ] Test webhook retry logic (simulate backend downtime)
- [ ] Test AR viewer on iPhone, Android, Desktop
- [ ] Migrate existing production AR projects to ar-db
- [ ] Setup monitoring alerts (compilation failures, webhook errors)
- [ ] Configure Nginx reverse proxy
- [ ] Test rollback plan (disable AR-service, backend still works)

---

## 📞 Support

**Created**: [Current Date]  
**Status**: Phase 1 Implementation (60% complete)  
**Blocker**: None (foundational structure complete, ready for routes + testing)  

**Next Session**: Complete remaining 40% (routes, Docker-compose, testing)
