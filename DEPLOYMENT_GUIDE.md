# 🚀 РУКОВОДСТВО по развертыванию PhotoBooksGallery на BEGET VPS

## 📋 ЧТО У НАС ГОТОВО:
✅ Production build создан (папка `/dist/`)
✅ Конфигурация production.env готова  
✅ SEO оптимизация завершена
✅ Логотип добавлен

## 🔧 ЧТО ПОНАДОБИТСЯ ДЛЯ СЕРВЕРА:

### Технические требования:
- **Node.js** версии 18+ (для запуска сайта)
- **PostgreSQL** (база данных)  
- **Nginx** (веб-сервер для работы с доменом)
- **PM2** (для автозапуска сайта)
- **Certbot** (для SSL сертификата)

### Файлы для загрузки на сервер:
- `/dist/` - собранный сайт
- `/server/` - серверная часть  
- `/shared/` - общие файлы
- `/migrations/` - структура базы данных
- `package.json` - список зависимостей
- `production.env` → переименовать в `.env`

## 🩺 Health & Мониторинг

После деплоя доступен endpoint `/api/health` (агрегированная проверка: статус БД, git commit, uptime, кол-во миграций, таблиц).  
Используйте для быстрой диагностики.

Сравнение двух билдов: сохраните предыдущий `deploy-manifest.json` (локально или на сервере) и выполните:
```
node scripts/diff-manifests.mjs old-manifest.json deploy-manifest.json
```

Partial deploy (ускоренный):
```
ONLY=server bash scripts/deploy-release.sh   # Только backend/логика
ONLY=public bash scripts/deploy-release.sh   # Только статика/клиент
ONLY=migrations bash scripts/deploy-release.sh # Только миграции
ONLY=code bash scripts/deploy-release.sh     # Код + dist без public отдельно
```

## 🎯 СЛЕДУЮЩИЕ ШАГИ:

1. **Настроить домен** в панели BEGET
2. **Подключиться к VPS** по SSH  
3. **Установить необходимое ПО**
4. **Создать базу данных**
5. **Загрузить файлы сайта**
6. **Запустить сайт**
7. **Установить SSL сертификат**

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ:

- В файле `production.env` нужно будет заменить:
  - `SUPER_SECURE_PASSWORD_HERE` → на реальный пароль БД
  - `your-super-secret-session-key` → на случайную строку
  
- После загрузки на сервер файл `production.env` переименовать в `.env`

**Готовы перейти к настройке домена на BEGET?** 🚀

---
### 🔄 Быстрый деплой и откаты (обновление)
Для безопасных релизов используйте новый расширенный подход (zero-downtime + rollback):

1. Локально:
  - `npm run build`
  - `node scripts/generate-manifest.mjs`
  - `./scripts/deploy-release.sh`
2. На сервере релиз кладётся в `/var/www/photobooksgallery/releases/release-<timestamp>` и затем симлинк `current` переключается.
3. Откат: `./scripts/rollback-release.sh`

Подробнее см. `DEPLOYMENT_ADVANCED.md`.
