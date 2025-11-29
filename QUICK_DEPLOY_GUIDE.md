# 🎯 КРАТКАЯ ИНСТРУКЦИЯ: ДЕПЛОЙ ЧЕРЕЗ GITHUB

## ✅ Что сделано автоматически:

1. **Удалены все пароли из docker-compose.yml** - теперь читаются только из .env
2. **Создан GitHub Actions workflow** - автодеплой при push в main
3. **Документация готова** - GITHUB_SECRETS_SETUP.md и CHECKLIST.md
4. **.env защищён** - не попадёт в Git благодаря .gitignore

## 🚀 Что делать ПРЯМО СЕЙЧАС:

### 1️⃣ Добавь 8 секретов в GitHub (5 минут)

Зайди: https://github.com/vitaligiovanni/PhotoBooksGallery/settings/secrets/actions

Добавь эти секреты (нажимай "New repository secret" для каждого):

| Имя | Значение |
|-----|----------|
| `SSH_PRIVATE_KEY` | Содержимое `~/.ssh/id_rsa` (весь текст от BEGIN до END) |
| `SERVER_HOST` | `photobooksgallery.am` |
| `SERVER_USER` | `root` |
| `SERVER_PATH` | `/root/photobooks` |
| `POSTGRES_PASSWORD` | `gjfkldlkf9859434502fjdManjf87` |
| `AR_POSTGRES_PASSWORD` | `hjhYtjkgkfdMjhsd^jhfjdjsds` |
| `TELEGRAM_TOKEN` | `7985970901:AAH-hi9JBY56RW5IsLas9ztOsXtqgwrcCA0` |
| `TELEGRAM_CHAT_ID` | `959125046` |

### 2️⃣ Коммит и пуш (1 минута)

```bash
git add .github/workflows/deploy.yml docker-compose.yml .env.example GITHUB_SECRETS_SETUP.md CHECKLIST.md
git commit -m "feat: автодеплой через GitHub Actions с секретами"
git push origin main
```

### 3️⃣ Проверь деплой (2 минуты)

1. Зайди: https://github.com/vitaligiovanni/PhotoBooksGallery/actions
2. Увидишь запущенный workflow "🚀 Deploy to Production Server"
3. Получишь уведомление в Telegram
4. Через 2-3 минуты проверь: https://photobooksgallery.am

## 🔒 Безопасность:

✅ Пароли ТОЛЬКО в .env (локально) и GitHub Secrets (облако)
✅ .env НЕ попадёт в Git (защищён .gitignore)
✅ Нет хардкоженных паролей в коде
✅ Telegram уведомления о статусе деплоя

## ⚡ Автодеплой:

После настройки каждый `git push origin main` автоматически:
1. Упакует код в архив
2. Скопирует на сервер через SSH
3. Создаст .env на сервере
4. Пересоберёт Docker контейнеры
5. Уведомит тебя в Telegram

## 📱 Нянька (nanny.py):

```bash
python nanny.py
```

Использует .env для Telegram уведомлений.

---
**Всё готово! Добавь секреты в GitHub и пуши код! 🚀**
