# 🔐 КАК ДОБАВИТЬ СЕКРЕТЫ НА GITHUB

## 📺 Видео-инструкция (пошагово с картинками)

---

## Шаг 1: Открой свой репозиторий на GitHub

1. Зайди на GitHub: **https://github.com**
2. Войди в свой аккаунт (если не залогинен)
3. Открой репозиторий: **https://github.com/vitaligiovanni/PhotoBooksGallery**

```
┌─────────────────────────────────────────────────────────┐
│ GitHub                                    🔍 Search      │
│                                                          │
│  vitaligiovanni / PhotoBooksGallery                     │
│  ├── Code                                                │
│  ├── Issues                                              │
│  ├── Pull requests                                       │
│  ├── Actions                                             │
│  ├── Projects                                            │
│  └── Settings  ← ЭТО СЮДА!                              │
└─────────────────────────────────────────────────────────┘
```

---

## Шаг 2: Открой Settings (Настройки)

В верхнем меню репозитория нажми на **Settings** (⚙️ Настройки)

**ВАЖНО:** Если не видишь Settings — значит у тебя нет прав администратора. Попроси владельца репозитория добавить тебя с правами Admin.

```
URL должен стать таким:
https://github.com/vitaligiovanni/PhotoBooksGallery/settings
```

---

## Шаг 3: Найди раздел "Secrets and variables"

В левом меню Settings найди раздел **"Secrets and variables"** и нажми на стрелочку ▼

```
┌─────────────────────────────────────────┐
│ Settings                                │
│                                         │
│ General                                 │
│ Access                                  │
│   ├── Collaborators                    │
│   └── Moderation options               │
│                                         │
│ Code and automation                     │
│   ├── Branches                         │
│   ├── Tags                             │
│   ├── Actions                          │
│   ├── Webhooks                         │
│   ├── Environments                     │
│   ├── Codespaces                       │
│   ├── Pages                            │
│                                         │
│ Security                                │
│   ├── Code security and analysis       │
│   ├── Deploy keys                      │
│   └── Secrets and variables ◀── СЮДА! │
│         ▼                               │
│         ├── Actions ◀── И СЮДА!       │
│         ├── Codespaces                 │
│         └── Dependabot                 │
└─────────────────────────────────────────┘
```

---

## Шаг 4: Открой "Actions" внутри "Secrets and variables"

Нажми на **"Actions"** (это подраздел внутри "Secrets and variables")

```
URL должен стать:
https://github.com/vitaligiovanni/PhotoBooksGallery/settings/secrets/actions
```

Ты увидишь страницу с заголовком:
```
Actions secrets and variables
Repository secrets / New repository secret
```

---

## Шаг 5: Добавь первый секрет

Нажми зелёную кнопку **"New repository secret"**

```
┌─────────────────────────────────────────────────────┐
│ Actions secrets and variables                       │
│                                                     │
│ Repository secrets                                  │
│                                                     │
│ [🔒 New repository secret] ◀── НАЖМИ СЮДА!        │
│                                                     │
│ No secrets yet. Secrets are encrypted...           │
└─────────────────────────────────────────────────────┘
```

---

## Шаг 6: Заполни форму для ПЕРВОГО секрета

Откроется форма с двумя полями:

### 6.1 В поле **Name** (имя секрета) введи:
```
SSH_PRIVATE_KEY
```

### 6.2 В поле **Secret** (значение) вставь содержимое твоего SSH ключа

**Как получить SSH ключ:**

#### На Windows (PowerShell):
```powershell
# Показать содержимое ключа
cat ~/.ssh/id_rsa

# Если ключа нет - создай:
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
# Просто нажимай Enter на все вопросы
```

#### Скопируй ВЕСЬ текст от `-----BEGIN` до `-----END`:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAw8... (много строк) ...G8xVU=
-----END OPENSSH PRIVATE KEY-----
```

### 6.3 Нажми зелёную кнопку **"Add secret"**

```
┌────────────────────────────────────────────────┐
│ Actions secrets / New secret                   │
│                                                │
│ Name *                                         │
│ ┌────────────────────────────────────────────┐│
│ │ SSH_PRIVATE_KEY                            ││
│ └────────────────────────────────────────────┘│
│                                                │
│ Secret *                                       │
│ ┌────────────────────────────────────────────┐│
│ │-----BEGIN OPENSSH PRIVATE KEY-----         ││
│ │b3BlbnNzaC1rZXktdjEAAAAA...                ││
│ │-----END OPENSSH PRIVATE KEY-----           ││
│ └────────────────────────────────────────────┘│
│                                                │
│          [Add secret] ◀── НАЖМИ               │
└────────────────────────────────────────────────┘
```

---

## Шаг 7: Добавь остальные 7 секретов

Повтори Шаги 5-6 для каждого секрета. Нажимай **"New repository secret"** каждый раз.

### Секрет 2 из 8:
```
Name:   SERVER_HOST
Secret: photobooksgallery.am
```

### Секрет 3 из 8:
```
Name:   SERVER_USER
Secret: root
```
(если логинишься не под root, укажи своего пользователя)

### Секрет 4 из 8:
```
Name:   SERVER_PATH
Secret: /root/photobooks
```
(путь к проекту на сервере)

### Секрет 5 из 8:
```
Name:   POSTGRES_PASSWORD
Secret: gjfkldlkf9859434502fjdManjf87
```
(твой пароль от основной БД из .env файла)

### Секрет 6 из 8:
```
Name:   AR_POSTGRES_PASSWORD
Secret: hjhYtjkgkfdMjhsd^jhfjdjsds
```
(твой пароль от AR БД из .env файла)

### Секрет 7 из 8:
```
Name:   TELEGRAM_TOKEN
Secret: 7985970901:AAH-hi9JBY56RW5IsLas9ztOsXtqgwrcCA0
```
(твой Telegram bot token из .env файла)

### Секрет 8 из 8:
```
Name:   TELEGRAM_CHAT_ID
Secret: 959125046
```
(твой Telegram chat ID из .env файла)

---

## Шаг 8: Проверь что все 8 секретов добавлены

После добавления всех секретов ты увидишь список:

```
┌─────────────────────────────────────────────────────┐
│ Actions secrets and variables                       │
│                                                     │
│ Repository secrets                 [New repository] │
│                                                     │
│ 🔒 AR_POSTGRES_PASSWORD            Updated now     │
│ 🔒 POSTGRES_PASSWORD               Updated now     │
│ 🔒 SERVER_HOST                     Updated now     │
│ 🔒 SERVER_PATH                     Updated now     │
│ 🔒 SERVER_USER                     Updated now     │
│ 🔒 SSH_PRIVATE_KEY                 Updated now     │
│ 🔒 TELEGRAM_CHAT_ID                Updated now     │
│ 🔒 TELEGRAM_TOKEN                  Updated now     │
│                                                     │
│ ✅ Всего: 8 секретов                               │
└─────────────────────────────────────────────────────┘
```

---

## ✅ ГОТОВО!

Теперь можешь закоммитить и запушить код:

```bash
git add .github docker-compose.yml .env.example *.md
git commit -m "feat: безопасный автодеплой через GitHub Actions"
git push origin main
```

GitHub автоматически:
1. Запустит workflow деплоя
2. Использует твои секреты для подключения к серверу
3. Задеплоит код на production
4. Отправит уведомление в Telegram

---

## 🔍 Как посмотреть работу деплоя:

1. Зайди: **https://github.com/vitaligiovanni/PhotoBooksGallery/actions**
2. Увидишь список запущенных workflows
3. Нажми на последний для просмотра логов

---

## ❓ Частые вопросы:

### Q: Не вижу Settings в меню
**A:** У тебя нет прав администратора. Попроси владельца репозитория добавить тебя с правами Admin.

### Q: Где взять SSH ключ?
**A:** 
```powershell
# На Windows PowerShell:
cat ~/.ssh/id_rsa

# Если нет - создай:
ssh-keygen -t rsa -b 4096
```

### Q: Ошибка "Permission denied (publickey)"
**A:** Добавь **публичный** ключ на сервер:
```bash
# На сервере:
nano ~/.ssh/authorized_keys
# Вставь содержимое ~/.ssh/id_rsa.pub (публичный!)
```

### Q: Можно ли изменить секрет?
**A:** Да! Нажми на имя секрета → **Update** → введи новое значение → **Update secret**

### Q: Можно ли посмотреть значение секрета?
**A:** Нет! GitHub показывает только имя. Значение зашифровано и не показывается никогда.

---

## 🎯 Итого добавляется:

| № | Имя секрета | Откуда взять значение |
|---|-------------|----------------------|
| 1 | `SSH_PRIVATE_KEY` | `cat ~/.ssh/id_rsa` |
| 2 | `SERVER_HOST` | Домен сервера: `photobooksgallery.am` |
| 3 | `SERVER_USER` | Имя пользователя на сервере: `root` |
| 4 | `SERVER_PATH` | Путь к проекту: `/root/photobooks` |
| 5 | `POSTGRES_PASSWORD` | Из `.env` файла |
| 6 | `AR_POSTGRES_PASSWORD` | Из `.env` файла |
| 7 | `TELEGRAM_TOKEN` | Из `.env` файла |
| 8 | `TELEGRAM_CHAT_ID` | Из `.env` файла |

---

**Всё понятно? Если что-то непонятно - спрашивай! 🚀**
