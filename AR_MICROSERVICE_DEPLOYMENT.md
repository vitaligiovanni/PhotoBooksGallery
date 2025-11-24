# 🚀 AR Microservice - Deployment Guide

## 📋 Overview

This guide covers deploying the AR Microservice architecture that solves the **database blocking issue** by isolating CPU-intensive MindAR compilation in a separate service with Worker Threads.

### Problem Solved:
- ❌ **Before**: MindAR blocks Node.js event loop for 120 seconds → Database lockup, CRM panel freeze
- ✅ **After**: MindAR runs in Worker Thread in separate microservice → Backend ALWAYS responsive

---

## 🏗️ Architecture

```
┌─────────────┐
│  Frontend   │ (Next.js, port 3000)
│  (Next.js)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Nginx    │ (Reverse Proxy, port 80/443)
│   Proxy     │ - /api/ar/* → Backend → AR-service
└──────┬──────┘ - /ar/view/* → AR-service (direct)
       │         - /objects/ar-storage/* → Static files
       ├──────────────────────┬────────────────────┐
       ▼                      ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Backend   │      │ AR-Service  │      │  Static     │
│  (Express)  │      │  (Express)  │      │   Files     │
│  port 5002  │      │  port 5000  │      │             │
└──────┬──────┘      └──────┬──────┘      └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│   Main DB   │      │   AR DB     │
│ PostgreSQL  │      │ PostgreSQL  │
│  port 5433  │      │  port 5434  │
└─────────────┘      └─────────────┘
```

### Key Features:
- **Separate AR Database** - No impact on main e-commerce database
- **Worker Threads** - MindAR compilation doesn't block event loop
- **pg-boss Queue** - PostgreSQL-based job queue (NO Redis!)
- **Webhooks** - Backend ↔ AR-service communication
- **Unified Domain** - Single domain for user (photobooksgallery.am)

---

## 📦 Installation

### 1. Prerequisites

**Required:**
- Node.js >= 18.0.0
- Docker & Docker Compose
- PostgreSQL 15 (via Docker)
- Git

**System Requirements:**
- CPU: 4+ cores (for concurrent AR compilations)
- RAM: 8GB minimum, 16GB recommended
- Disk: 50GB minimum (for AR storage)

### 2. Clone and Setup

```powershell
# Clone repository
git clone https://github.com/your-repo/photobooksgallery.git
cd photobooksgallery

# Install AR Service dependencies
cd ar-service
npm install

# Configure environment
Copy-Item .env.example .env
# Edit .env with your configuration
```

### 3. Environment Configuration

**ar-service/.env**:
```env
# AR Database (SEPARATE from main!)
AR_DATABASE_URL=postgresql://photobooks:SecurePassword2025@ar-db:5432/ar_db

# Backend URL (for webhooks)
BACKEND_URL=http://backend:5002
BACKEND_WEBHOOK_SECRET=ar-webhook-secret-2025

# Frontend URL (for QR codes)
FRONTEND_URL=https://photobooksgallery.am

# Storage Paths
AR_STORAGE_PATH=/app/storage/ar-storage
SHARED_UPLOADS_PATH=/app/storage/uploads

# Demo Cleanup (2 AM daily)
DEMO_CLEANUP_SCHEDULE=0 2 * * *

# Feature Flags
AR_ENABLE_BORDER_ENHANCER=true

# Port
PORT=5000
NODE_ENV=production
```

**backend/.env** (add AR integration):
```env
# Existing backend variables...

# AR Microservice Integration
AR_SERVICE_URL=http://ar-service:5000
AR_WEBHOOK_SECRET=ar-webhook-secret-2025
```

---

## 🐳 Docker Deployment

### Option A: Full Stack (Recommended for Production)

```powershell
# Start all services (frontend, backend, AR, databases, nginx)
docker-compose -f docker-compose.ar-microservice.yml up -d --build

# Check status
docker-compose -f docker-compose.ar-microservice.yml ps

# View logs
docker-compose -f docker-compose.ar-microservice.yml logs -f ar-service
```

**Services Started:**
1. `frontend` - Next.js (port 3000)
2. `backend` - Express (port 5002)
3. `ar-service` - AR Microservice (port 5000)
4. `db-main` - Main PostgreSQL (port 5433)
5. `ar-db` - AR PostgreSQL (port 5434)
6. `nginx` - Reverse Proxy (port 80)

### Option B: AR Service Only (Development)

```powershell
# Start only AR-related services
docker-compose -f docker-compose.ar-microservice.yml up -d ar-service ar-db

# Or use helper script
.\start-ar-service.ps1
```

---

## 🔄 Database Migrations

### Run Migrations

```powershell
cd ar-service
npm run migrate
```

**This creates:**
- `ar_projects` - AR project metadata
- `ar_compilation_logs` - Step-by-step compilation logs
- `ar_webhook_events` - Webhook delivery tracking

### Verify Migrations

```sql
-- Connect to ar-db
psql -h localhost -p 5434 -U photobooks -d ar_db

-- Check tables
\dt

-- Expected output:
-- ar_projects
-- ar_compilation_logs
-- ar_webhook_events
-- pgboss.* (pg-boss tables)
```

---

## 🔧 Backend Integration

### 1. Add Proxy Routes

**backend/src/routers/ar-router.ts** (NEW FILE):

```typescript
import { Router } from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const AR_SERVICE_URL = process.env.AR_SERVICE_URL || 'http://localhost:5000';

// POST /api/ar/compile - Proxy to AR-service (with JWT validation)
router.post('/compile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT
    
    // Forward to AR-service
    const response = await axios.post(`${AR_SERVICE_URL}/compile`, {
      ...req.body,
      userId // Inject userId from JWT
    }, {
      timeout: 10000 // 10s timeout (should respond instantly)
    });
    
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('[AR Proxy] Compile error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'AR service unavailable'
    });
  }
});

// GET /api/ar/status/:id - Proxy to AR-service
router.get('/status/:id', async (req, res) => {
  try {
    const response = await axios.get(`${AR_SERVICE_URL}/status/${req.params.id}`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({
      error: 'AR service unavailable'
    });
  }
});

export default router;
```

### 2. Mount Router

**backend/src/index.ts**:

```typescript
import arRouter from './routers/ar-router';

// ... existing code ...

app.use('/api/ar', arRouter);
```

### 3. Add Webhook Receiver

**backend/src/routers/webhooks.ts** (NEW FILE):

```typescript
import { Router } from 'express';
import { sendEmail } from '../services/email';

const router = Router();

// Webhook authentication
function verifyWebhookSignature(req: any) {
  const secret = req.headers['x-webhook-secret'];
  return secret === process.env.AR_WEBHOOK_SECRET;
}

// POST /webhooks/ar-service - Receive AR compilation events
router.post('/ar-service', async (req, res) => {
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  
  const { event, data } = req.body;
  
  console.log(`[Webhook] Received event: ${event}`);
  
  try {
    if (event === 'ar.compilation.complete') {
      const { projectId, viewUrl, qrCodeUrl } = data;
      console.log(`[Webhook] AR compilation complete: ${projectId}`);
      // Handle success (update order, send notification, etc.)
    }
    
    else if (event === 'ar.compilation.failed') {
      const { projectId, error } = data;
      console.error(`[Webhook] AR compilation failed: ${projectId} - ${error}`);
      // Handle failure (notify user, log error, etc.)
    }
    
    else if (event === 'ar.email.request') {
      const { projectId, userId, viewUrl } = data;
      // Send email notification
      await sendEmail({
        to: userId, // or fetch user email
        subject: 'Your AR Experience is Ready!',
        body: `View your AR: ${viewUrl}`
      });
      console.log(`[Webhook] Email sent for project: ${projectId}`);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Mount webhook router:**

```typescript
import webhookRouter from './routers/webhooks';
app.use('/webhooks', webhookRouter);
```

---

## 🧪 Testing

### 1. Health Checks

```powershell
# AR Service
curl http://localhost:5000/health

# Backend
curl http://localhost:5002/health

# Nginx
curl http://localhost/health
```

### 2. Test AR Compilation

```powershell
# Create test AR project
$response = Invoke-RestMethod -Uri "http://localhost:5000/compile" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{
    userId = "test-user-123"
    photoUrl = "/objects/uploads/test-photo.jpg"
    videoUrl = "/objects/uploads/test-video.mp4"
    isDemo = $true
  } | ConvertTo-Json)

$projectId = $response.projectId
Write-Host "Project ID: $projectId"

# Check status
$status = Invoke-RestMethod -Uri "http://localhost:5000/status/$projectId"
Write-Host "Status: $($status.status)"

# View AR (after compilation completes)
Start-Process "http://localhost:5000/view/$projectId"
```

### 3. Performance Test

**CRITICAL: Backend should respond <100ms even during AR compilation**

```powershell
# Start 5 concurrent AR compilations
1..5 | ForEach-Object {
  Start-Job {
    Invoke-RestMethod -Uri "http://localhost:5000/compile" `
      -Method Post `
      -ContentType "application/json" `
      -Body '{"userId":"test","photoUrl":"/uploads/test.jpg","isDemo":true}'
  }
}

# Test backend API response time
Measure-Command {
  Invoke-RestMethod -Uri "http://localhost:5002/api/products"
}

# Expected: < 100ms (NOT 50-70 seconds like before!)
```

---

## 📊 Monitoring

### Database Queries

```sql
-- Active AR compilations
SELECT id, status, created_at, 
       EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM ar_projects
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC;

-- Recent compilations (last 24h)
SELECT 
  status,
  COUNT(*) as count,
  AVG(compilation_time_ms) as avg_time_ms,
  MAX(compilation_time_ms) as max_time_ms
FROM ar_projects
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Failed compilations
SELECT id, error_message, created_at
FROM ar_projects
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 10;

-- pg-boss queue health
SELECT name, COUNT(*) as pending_jobs
FROM pgboss.job
WHERE state = 'created'
GROUP BY name;
```

### Docker Logs

```powershell
# AR Service logs
docker logs -f photobooks-ar-service

# Backend logs
docker logs -f photobooks-backend

# All services
docker-compose -f docker-compose.ar-microservice.yml logs -f
```

### Metrics to Watch

- **Backend Response Time**: Should always be <100ms (even during AR compilation)
- **AR Compilation Time**: Average 100-120 seconds per project
- **pg-boss Queue Length**: Should stay near 0 (jobs processed quickly)
- **Database Connection Pool**: AR DB pool should never exhaust (max 20)
- **Demo Cleanup**: Runs daily at 2 AM, check logs

---

## 🐛 Troubleshooting

### Issue: AR Service won't start

```powershell
# Check logs
docker logs photobooks-ar-service

# Common issues:
# 1. Database not ready
docker-compose -f docker-compose.ar-microservice.yml up -d ar-db
Start-Sleep -Seconds 10
docker-compose -f docker-compose.ar-microservice.yml restart ar-service

# 2. Missing environment variables
docker exec photobooks-ar-service env | grep AR_
```

### Issue: Compilation stuck in "pending"

```sql
-- Check pg-boss workers
SELECT * FROM pgboss.job WHERE name = 'ar-compile' AND state = 'active';

-- Restart AR service
```

```powershell
docker-compose -f docker-compose.ar-microservice.yml restart ar-service
```

### Issue: Webhook not received by backend

```powershell
# Check AR service can reach backend
docker exec photobooks-ar-service curl http://backend:5002/health

# Check webhook secret matches
docker exec photobooks-ar-service env | grep BACKEND_WEBHOOK_SECRET
docker exec photobooks-backend env | grep AR_WEBHOOK_SECRET
# Should match!
```

### Issue: "Cannot find module 'mind-ar'"

```powershell
# Rebuild AR service with dependencies
docker-compose -f docker-compose.ar-microservice.yml build --no-cache ar-service
docker-compose -f docker-compose.ar-microservice.yml up -d ar-service
```

---

## 🔄 Data Migration (Existing AR Projects)

If you have existing AR projects in main database, migrate them to ar-db:

**migration-script.sql**:

```sql
-- Connect to ar-db
\c ar_db

-- Insert existing AR projects from main database
INSERT INTO ar_projects (
  id, user_id, order_id, photo_url, video_url,
  marker_mind_url, viewer_html_url, view_url, qr_code_url,
  status, config, created_at
)
SELECT 
  id, user_id, order_id, photo_url, video_url,
  marker_mind_url, viewer_html_url, view_url, qr_code_url,
  status, config::jsonb, created_at
FROM dblink(
  'host=db-main port=5432 dbname=photobooks user=photobooks password=SecurePassword2025',
  'SELECT id, user_id, order_id, photo_url, video_url,
          marker_mind_url, viewer_html_url, view_url, qr_code_url,
          status, config::text, created_at
   FROM ar_projects
   WHERE status = ''ready'''
) AS t(
  id varchar, user_id varchar, order_id varchar, photo_url varchar, video_url varchar,
  marker_mind_url varchar, viewer_html_url varchar, view_url varchar, qr_code_url varchar,
  status varchar, config text, created_at timestamp
);
```

---

## 🚦 Production Checklist

Before going live:

- [ ] SSL certificates configured in Nginx
- [ ] Environment variables secured (no defaults!)
- [ ] Database backups configured
- [ ] Monitoring alerts setup (compilation failures, webhook errors)
- [ ] Load test: 10 concurrent AR compilations
- [ ] Verify backend responds <100ms during compilation
- [ ] Test demo auto-cleanup (24h expiration)
- [ ] Test AR viewer on iPhone, Android, Desktop
- [ ] Verify QR codes work with production URL
- [ ] Rollback plan tested (disable AR service, backend still works)
- [ ] Documentation updated for team
- [ ] Logs rotation configured

---

## 📈 Scaling

### Horizontal Scaling (Future)

When AR traffic exceeds 100/day:

1. **Multiple AR Workers**:
   ```yaml
   ar-service:
     deploy:
       replicas: 3
   ```

2. **Dedicated AR Server**:
   - Move ar-service + ar-db to separate VPS
   - Update BACKEND_URL, AR_SERVICE_URL

3. **S3 Storage**:
   - Replace shared volumes with S3
   - Update FileManager to use S3 SDK

4. **Redis Queue** (only if >500 AR/day):
   - Replace pg-boss with Redis + Bull
   - Requires Redis container

---

## 🎓 Success Metrics

**Target Performance:**
- ✅ Backend API: < 100ms response time (always)
- ✅ AR Compilation: 100-120 seconds per project
- ✅ Database: No blocking, no timeouts
- ✅ Queue: Jobs processed within 5 minutes
- ✅ Uptime: 99.9% (3-nines)

**Before vs After:**

| Metric | Before (Monolithic) | After (Microservice) |
|--------|---------------------|----------------------|
| Backend response during AR | 50-70 seconds ❌ | < 100ms ✅ |
| Database blocking | Yes (120s) ❌ | Never ✅ |
| CRM panel freezes | Yes ❌ | No ✅ |
| AR compilation time | 120s | 120s (unchanged) |
| Concurrent compilations | 1 (blocks) ❌ | 2+ (isolated) ✅ |

---

## 📞 Support

**Issues?** Check:
1. Docker logs: `docker-compose logs -f`
2. Database health: `SELECT 1` in both databases
3. Network connectivity: `docker exec ar-service ping backend`
4. Environment variables: `docker exec ar-service env`

**Need help?** Contact dev team with:
- Error logs (last 50 lines)
- Docker Compose status
- Database connection test results
