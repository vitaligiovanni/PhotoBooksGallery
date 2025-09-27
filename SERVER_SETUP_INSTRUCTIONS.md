# PhotoBooksGallery - Инструкции по развертыванию на сервере

## 📦 Файлы готовы к загрузке
- `photobooksgallery-deploy.zip` (~990KB) - содержит все необходимые файлы

## 💻 Рекомендуемая ОС для VPS
**✅ У вас установлена:** Ubuntu 24.04 LTS
- Отличный выбор! Новая стабильная версия с долгосрочной поддержкой
- Все команды ниже протестированы для Ubuntu 24.04
- Поддержка до 2029 года

## 🚀 Пошаговые инструкции для развертывания

### 1. Подключение к VPS серверу  ✅ ГОТОВО
```bash
# Подключитесь к VPS через SSH (ваш IP)
ssh root@82.202.129.237
```

### 2. Установка необходимого ПО
```bash
# Обновляем систему (работает на Ubuntu/Debian)
apt update && apt upgrade -y

# Устанавливаем Node.js 20.x LTS (рекомендуется для Ubuntu 24.04)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Устанавливаем Nginx
apt install -y nginx

# Устанавливаем PostgreSQL
apt install -y postgresql postgresql-contrib

# Устанавливаем PM2 глобально
npm install -g pm2

# Устанавливаем unzip для распаковки архива
apt install -y unzip
```

### 3. Создание директории проекта
```bash
# Создаем директорию для сайта
mkdir -p /var/www/photobooksgallery
cd /var/www/photobooksgallery

# Загружаем архив (используйте WinSCP, FileZilla или scp)
# scp photobooksgallery-deploy.zip root@2.56.240.135:/var/www/photobooksgallery/

# Распаковываем архив
unzip photobooksgallery-deploy.zip

# Переименовываем production.env в .env
mv production.env .env

# Устанавливаем права доступа
chown -R www-data:www-data /var/www/photobooksgallery
chmod -R 755 /var/www/photobooksgallery
```

### 4. Установка зависимостей Node.js
```bash
# Устанавливаем зависимости
npm install --production
```

### 5. Настройка PostgreSQL
```bash
# Переключаемся на пользователя postgres
sudo -u postgres psql

-- В psql выполняем:
CREATE USER photobooksgallery_user WITH PASSWORD 'P@ssw0rd_2025!';
CREATE DATABASE photobooksgallery_db OWNER photobooksgallery_user;
GRANT ALL PRIVILEGES ON DATABASE photobooksgallery_db TO photobooksgallery_user;
\q

# Запускаем миграции (если есть)
npm run migrate
```

### 6. Настройка Nginx
```bash
# Создаем конфигурацию Nginx
nano /etc/nginx/sites-available/photobooksgallery
```

Содержимое файла конфигурации Nginx:
```nginx
server {
    listen 80;
    server_name photobooksgallery.am www.photobooksgallery.am;

    # Статические файлы
    location / {
        root /var/www/photobooksgallery/dist/public;
        try_files $uri $uri/ @nodejs;
    }

    # API и динамические запросы
    location @nodejs {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Загрузки
    location /uploads {
        root /var/www/photobooksgallery;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Активируем конфигурацию
ln -s /etc/nginx/sites-available/photobooksgallery /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию и перезапускаем Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx
```

### 7. Запуск приложения через PM2
```bash
cd /var/www/photobooksgallery

# Создаем ecosystem.config.js для PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'photobooksgallery',
    script: './dist/server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Запускаем приложение
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. Установка SSL сертификата
```bash
# Устанавливаем certbot
apt install -y snapd
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot

# Получаем SSL сертификат
certbot --nginx -d photobooksgallery.am -d www.photobooksgallery.am

# Настраиваем автообновление
certbot renew --dry-run
```

## ✅ Финальная проверка
1. Откройте https://photobooksgallery.am в браузере
2. Проверьте работу всех страниц
3. Убедитесь, что SSL сертификат установлен корректно

## 🔧 Полезные команды для управления
```bash
# Просмотр логов приложения
pm2 logs photobooksgallery

# Перезапуск приложения
pm2 restart photobooksgallery

# Просмотр статуса
pm2 status

# Перезапуск Nginx
systemctl restart nginx

# Просмотр логов Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

## 📞 Поддержка
Если возникли проблемы, проверьте:
- Логи PM2: `pm2 logs`
- Логи Nginx: `/var/log/nginx/error.log`
- Статус сервисов: `systemctl status nginx postgresql`