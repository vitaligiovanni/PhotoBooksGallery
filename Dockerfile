# Dockerfile для PhotoBooks Gallery с поддержкой UTF-8 и армянских шрифтов
FROM node:20-bullseye-slim

# Устанавливаем локаль UTF-8
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV LANGUAGE=C.UTF-8

# Устанавливаем необходимые пакеты для шрифтов и локалей
RUN apt-get update && apt-get install -y \
    # Локали и языки
    locales \
    locales-all \
    # Шрифты
    fonts-dejavu \
    fonts-liberation \
    fonts-noto-core \
    fonts-noto-cjk \
    fonts-noto-mono \
    fonts-noto-ui-core \
    fonts-noto-extra \
    fonts-noto \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    # Системные утилиты
    curl \
    postgresql-client \
    git \
    && rm -rf /var/lib/apt/lists/*

# Создаем пользователя для безопасности
RUN groupadd -g 1001 nodejs || true && \
    useradd -s /bin/bash -u 1001 -g nodejs nextjs || true && \
    mkdir -p /home/nextjs && \
    chown -R nextjs:nodejs /home/nextjs

# Рабочая директория
WORKDIR /app

# Меняем владельца
RUN chown -R nextjs:nodejs /app
USER nextjs

# Копируем package.json и устанавливаем зависимости
COPY --chown=nextjs:nodejs package*.json ./
RUN npm config set fetch-timeout 1200000 && \
    npm config set fetch-retry-mintimeout 60000 && \
    npm config set fetch-retry-maxtimeout 300000 && \
    npm install

# Копируем исходный код
COPY --chown=nextjs:nodejs . .

# Собираем приложение
RUN npm run build

# Копируем entrypoint
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Healthcheck (ожидает ответ API)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Открываем порт
EXPOSE 3000

# Запуск через entrypoint (применяет миграции и стартует сервер)
ENTRYPOINT ["./entrypoint.sh"]
CMD [""]