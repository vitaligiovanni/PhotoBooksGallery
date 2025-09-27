# Git-Based Deployment для Beget

Простое руководство по настройке автоматического Git-деплоя для обновления сайта на сервере Beget.

## 🚀 Быстрый старт

### 1. Создание удалённого репозитория

**На GitHub:**
1. Идите на https://github.com/new
2. Введите название: `photobooksgallery` 
3. Сделайте репозиторий приватным (рекомендуется)
4. Нажмите "Create repository"
5. Скопируйте URL репозитория (например: `https://github.com/username/photobooksgallery.git`)

**На GitLab:**
1. Идите на https://gitlab.com/projects/new
2. Аналогично создайте проект

### 2. Настройка локального репозитория

В PowerShell (в корне проекта):
```powershell
# Добавляем remote репозиторий
git remote add origin https://github.com/ваш-username/photobooksgallery.git

# Первый push (загружаем весь проект)
git add .
git commit -m "Initial commit - PhotoBooks Gallery project"
git push -u origin main
```

### 3. Настройка сервера (ОДИН РАЗ)

```bash
# Подключаемся к серверу
ssh root@82.202.129.237

# Переходим в директорию сайта
cd /var/www/photobooksgallery

# Делаем бэкап текущей версии
tar -czf ../photobooksgallery-backup-$(date +%Y%m%d).tar.gz .

# Очищаем директорию для Git
rm -rf * .* 2>/dev/null || true

# Клонируем репозиторий
git clone https://github.com/ваш-username/photobooksgallery.git .

# Делаем deploy скрипт исполняемым
chmod +x deploy-git.sh

# Создаём папку для данных (uploads)
mkdir -p /var/www/photobooksgallery-data/uploads
ln -sf /var/www/photobooksgallery-data/uploads uploads

# Первый деплой
bash deploy-git.sh
```

## 📦 Ежедневное использование

После настройки, обновление сайта делается ОДНОЙ командой:

```powershell
# В PowerShell на локальной машине:
./scripts/git-deploy.ps1 -Message "Исправлены баннеры"
```

Эта команда:
1. ✅ Соберёт проект локально
2. ✅ Добавит все изменения в Git  
3. ✅ Сделает коммит с вашим сообщением
4. ✅ Отправит изменения на GitHub/GitLab
5. ✅ Автоматически обновит сервер
6. ✅ Перезапустит приложение
7. ✅ Проверит что сайт работает

## 🛠 Дополнительные команды

### Деплой без сборки (если dist уже готов)
```powershell
./scripts/git-deploy.ps1 -SkipBuild -Message "Обновление документации"
```

### Принудительный push (без изменений)
```powershell
./scripts/git-deploy.ps1 -Force -Message "Перезапуск сервера"
```

### Просмотр статуса на сервере
```bash
ssh root@82.202.129.237 'cd /var/www/photobooksgallery && git log --oneline -5'
```

### Откат к предыдущей версии (на сервере)
```bash
ssh root@82.202.129.237 'cd /var/www/photobooksgallery && git reset --hard HEAD~1 && bash deploy-git.sh'
```

## 🔧 Настройка окружения

### Переменные окружения (.env)
Создайте на сервере файл `/var/www/photobooksgallery/.env.production`:
```bash
# На сервере
nano /var/www/photobooksgallery/.env.production
```

В скрипте `deploy-git.sh` добавьте копирование:
```bash
# После git pull, добавьте:
if [[ -f ".env.production" ]]; then
    cp .env.production .env
fi
```

## 📁 Структура файлов

```
photobooksgallery/
├── .git/                    # Git репозиторий
├── .gitignore              # Исключения из Git
├── deploy-git.sh           # Скрипт деплоя на сервере
├── scripts/
│   └── git-deploy.ps1      # Команда деплоя с локальной машины
├── client/                 # Frontend код
├── server/                 # Backend код
├── migrations/             # SQL миграции
├── uploads -> /var/www/photobooksgallery-data/uploads  # Symlink
└── backups/               # Автоматические бэкапы
```

## ❗ Важные моменты

### Что НЕ попадает в Git
- `node_modules/` — будет установлен на сервере
- `dist/` — будет собран на сервере
- `.env` — конфигурация окружения
- `uploads/` — файлы пользователей
- Временные файлы и логи

### Безопасность
- Используйте приватный репозиторий для коммерческого проекта
- `.env` файлы не попадают в Git
- Автоматические бэкапы создаются перед каждым обновлением

### Автоматические бэкапы
Перед каждым обновлением создаётся бэкап в `/var/www/photobooksgallery/backups/`

## 🆘 Восстановление при проблемах

### Если что-то пошло не так
```bash
# На сервере - восстановление из последнего бэкапа
cd /var/www/photobooksgallery/backups
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz -C ../
pm2 restart photobooksgallery
```

### Логи деплоя
```bash
# Просмотр логов деплоя
tail -f /var/www/photobooksgallery/deploy.log
```

### PM2 логи приложения
```bash
pm2 logs photobooksgallery --lines 50
```

## 🎯 Преимущества Git-деплоя

✅ **Простота**: Одна команда для обновления  
✅ **Безопасность**: Автоматические бэкапы  
✅ **Отслеживание**: История всех изменений  
✅ **Откат**: Легко вернуться к предыдущей версии  
✅ **Частичность**: Обновляются только изменённые файлы  
✅ **Скорость**: Быстрое обновление через Git  

---

**Готово!** Теперь у вас настроен профессиональный Git-based деплой. 🚀