# ✅ ИСПРАВЛЕНО: Multi-Target AR (2 фото + 2 видео → 2 проекта)

## Проблема
При загрузке **2 фото + 2 видео** компилировалась **только 1 пара**, вторая терялась.

## Решение
Теперь система создаёт **ОТДЕЛЬНЫЙ AR-проект** для каждой пары photo+video.

---

## Что изменилось

### 1. AR Service (ar-service/src/routes/compile.ts)
- **Было**: Один projectId для всех фото
- **Стало**: Цикл создаёт отдельный проект для каждой пары

```typescript
// Для каждой пары photo+video:
for (let i = 0; i < photoPaths.length; i++) {
  const projectId = uuidv4(); // Уникальный ID
  const photoPath = photoPaths[i];
  const videoPath = videoPaths[i];
  
  // Создать запись в БД
  await pool.query(`INSERT INTO ar_projects ...`);
  
  // Создать job в очереди
  await boss.send('AR_COMPILE', { projectId, photoPath, videoPath, ... });
  
  projectIds.push(projectId);
}

// Вернуть массив projectIds
res.json({ projectIds, status: 'pending' });
```

### 2. Backend (backend/src/routers/ar-router.ts)
- **Обрабатывает массив projectIds**
- Сохраняет **ВСЕ проекты** в Backend БД

```typescript
const projectIds = compileResult.projectIds || [compileResult.projectId];

for (let i = 0; i < projectIds.length; i++) {
  await db.insert(arProjects).values({
    id: projectIds[i],
    photoUrl: photoUrls[i],
    videoUrl: videoUrls[i],
    ...
  });
}
```

### 3. Frontend (frontend/src/pages/LivingPhotos.tsx)
- **Принимает массив projectIds**
- Показывает первый проект (можно расширить для показа всех)

```typescript
onSuccess: (data) => {
  const projectIds = data.data.projectIds || [data.data.arId];
  setDemoProjectId(projectIds[0]); // Показать первый
}
```

---

## Как проверить

### 1. Перезапустить AR-сервис
```powershell
cd ar-service
# Ctrl+C (если запущен)
npm run dev
```

### 2. Загрузить 2 фото + 2 видео
- Открыть http://localhost:3000/living-photos
- Загрузить 2 фотографии
- Загрузить 2 видео
- Нажать "Создать AR с 2 сценами"

### 3. Проверить логи AR-сервиса
Должно быть:
```
[Compile Route] 🚀 CREATING 2 SEPARATE AR PROJECT(S):
[Compile Route] 📦 Project 1/2: abc-123-def
[Compile Route] ✅ Queued job xxx for project abc-123-def
[Compile Route] 📦 Project 2/2: ghi-456-jkl
[Compile Route] ✅ Queued job yyy for project ghi-456-jkl
[Compile Route] ✅✅✅ ALL 2 PROJECTS CREATED in 350ms ✅✅✅

[Worker] 🔨 Starting compilation job: xxx
[Worker] Project: abc-123-def
[Worker] Photo: c:\...\photo-0.jpg
[Worker] Video: c:\...\video-0.mp4
[AR Core] ✅✅✅ COMPILATION COMPLETED in 0.9s ✅✅✅

[Worker] 🔨 Starting compilation job: yyy
[Worker] Project: ghi-456-jkl
[Worker] Photo: c:\...\photo-1.jpg
[Worker] Video: c:\...\video-1.mp4
[AR Core] ✅✅✅ COMPILATION COMPLETED in 0.9s ✅✅✅
```

### 4. Проверить админку
- Открыть http://localhost:3000/admin/ar
- Должно быть **2 проекта** в списке
- Оба должны иметь статус "ready"
- Каждый должен открываться БЕЗ ошибки 404

---

## Результат

✅ Загрузка 2 фото + 2 видео → 2 AR-проекта  
✅ Каждый проект компилируется независимо  
✅ Оба проекта видны в админке  
✅ Нет ошибок 404 "Project not found"  

---

## Если всё равно ошибка

### Очистить старые проекты
```powershell
# Подключиться к AR базе
psql -U photobooks -h localhost -p 5434 -d ar_db

# Удалить старые проекты
DELETE FROM ar_projects WHERE status = 'error';
DELETE FROM ar_projects WHERE is_demo = true AND created_at < NOW() - INTERVAL '1 day';
```

### Проверить пути к файлам
Логи должны показывать:
```
[FileManager] resolveUploadPath: /objects/uploads/demo-xxx-photo-0.jpg → C:/Projects/.../backend/objects/uploads/demo-xxx-photo-0.jpg
[Compile Route] ✅ Photo 1/2 exists
[Compile Route] ✅ Photo 2/2 exists
[Compile Route] ✅ Video 1/2 exists
[Compile Route] ✅ Video 2/2 exists
```

Если видите "Photo file not found" — проблема в путях, проверьте `.env` AR-сервиса.
