#!/bin/bash

# Stop old Python bot
pkill -f 'python.*nanny.py'

# Create systemd service
cat > /etc/systemd/system/telegram-bot.service << 'EOF'
[Unit]
Description=Advanced Telegram Monitoring Bot
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=10
Environment=TELEGRAM_TOKEN=7985970901:AAH-hi9JBY56RW5IsLas9ztOsXtqgwrcCA0
Environment=TELEGRAM_CHAT_ID=959125046
ExecStart=/usr/bin/docker exec -i photobooks_backend sh -c 'cd /app/telegram-bot && npx tsx index.ts'
ExecStop=/usr/bin/docker exec photobooks_backend pkill -f telegram-bot

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable and start service
systemctl enable telegram-bot
systemctl restart telegram-bot

# Wait and show status
sleep 5
systemctl status telegram-bot --no-pager
