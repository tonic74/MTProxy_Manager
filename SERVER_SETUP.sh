#!/bin/bash

# Скрипт полной настройки сервера для MTProxy Manager
# Использование: bash SERVER_SETUP.sh

set -e

echo "=== MTProxy Manager - Полная установка ==="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Конфигурация (заполните перед запуском)
BOT_TOKEN="8780642333:AAHxevHHibY7ufkRfMQ4r9Dmx14qphyqnXE"
PANEL_URL=""  # Заполнится после деплоя Vercel
API_SECRET="AcKx5ZzCotRghOYnl7p1W2DwEFyPrU8T"
ADMIN_TELEGRAM_ID=""  # Ваш Telegram ID (получите через @userinfobot)

# Проверка root прав
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Пожалуйста, запустите скрипт с правами root (sudo)${NC}"
  exit 1
fi

echo -e "${YELLOW}Шаг 1/6: Обновление системы${NC}"
apt update && apt upgrade -y
apt install -y curl wget git nano htop ufw

echo -e "${GREEN}✓ Система обновлена${NC}"
echo ""

echo -e "${YELLOW}Шаг 2/6: Установка Docker${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✓ Docker установлен${NC}"
else
    echo -e "${GREEN}✓ Docker уже установлен${NC}"
fi
echo ""

echo -e "${YELLOW}Шаг 3/6: Настройка Firewall${NC}"
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 443/tcp
echo -e "${GREEN}✓ Firewall настроен${NC}"
echo ""

echo -e "${YELLOW}Шаг 4/6: Установка MTProxy${NC}"

# Создание директории
mkdir -p /opt/mtproxy
cd /opt/mtproxy

# Генерация Fake TLS секрета
DOMAIN="google.com"
RANDOM_PART=$(openssl rand -hex 16)
DOMAIN_HEX=$(echo -n "$DOMAIN" | xxd -p)
SECRET="dd${RANDOM_PART}${DOMAIN_HEX}"

# Получение внешнего IP
EXTERNAL_IP=$(curl -s ifconfig.me)

echo "IP: $EXTERNAL_IP"
echo "Секрет: $SECRET"

# Создание docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'

services:
  mtproxy:
    image: ghcr.io/wukko/mtproxy-docker:latest
    container_name: mtproxy
    restart: unless-stopped
    ports:
      - "443:443"
    environment:
      - SECRET=${SECRET}
      - FAKE_TLS_DOMAIN=${DOMAIN}
    volumes:
      - ./data:/data
EOF

# Создание директории для данных
mkdir -p data

# Запуск контейнера
docker-compose up -d

# Проверка статуса
sleep 5
if docker ps | grep -q mtproxy; then
    echo -e "${GREEN}✓ MTProxy запущен${NC}"
    
    # Сохранение конфигурации
    cat > proxy-config.txt << EOF
IP: ${EXTERNAL_IP}
Port: 443
Secret: ${SECRET}
TG Link: tg://proxy?server=${EXTERNAL_IP}&port=443&secret=${SECRET}
Web Link: https://t.me/proxy?server=${EXTERNAL_IP}&port=443&secret=${SECRET}
EOF
    
    echo ""
    echo -e "${GREEN}=== Данные прокси ===${NC}"
    cat proxy-config.txt
    echo ""
else
    echo -e "${RED}✗ Ошибка запуска MTProxy${NC}"
    docker-compose logs
    exit 1
fi

echo -e "${YELLOW}Шаг 5/6: Установка Node.js${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✓ Node.js установлен${NC}"
else
    echo -e "${GREEN}✓ Node.js уже установлен${NC}"
fi
echo ""

echo -e "${YELLOW}Шаг 6/6: Настройка Telegram бота${NC}"

# Проверка обязательных параметров
if [ -z "$PANEL_URL" ]; then
    echo -e "${RED}✗ PANEL_URL не задан!${NC}"
    echo "Пожалуйста, отредактируйте скрипт и укажите URL панели Vercel"
    echo "Затем запустите настройку бота вручную:"
    echo "  bash /opt/telegram-bot/setup-bot.sh"
    exit 1
fi

if [ -z "$ADMIN_TELEGRAM_ID" ]; then
    echo -e "${YELLOW}⚠ ADMIN_TELEGRAM_ID не задан${NC}"
    echo "Получите ваш Telegram ID через @userinfobot и добавьте в скрипт"
fi

# Создание директории для бота
mkdir -p /opt/telegram-bot
cd /opt/telegram-bot

# Скачивание скрипта бота
curl -sSL https://raw.githubusercontent.com/tonic74/MTProxy_Manager/main/server-scripts/telegram-bot.js -o bot.js

# Установка зависимостей
npm init -y
npm install telegraf

# Создание .env файла
cat > .env << EOF
BOT_TOKEN=${BOT_TOKEN}
ADMIN_API_URL=${PANEL_URL}
ADMIN_IDS=${ADMIN_TELEGRAM_ID}
EOF

# Создание systemd сервиса
cat > /etc/systemd/system/telegram-bot.service << EOF
[Unit]
Description=MTProxy Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/telegram-bot
ExecStart=/usr/bin/node bot.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Запуск бота
systemctl daemon-reload
systemctl enable telegram-bot
systemctl start telegram-bot

sleep 2
if systemctl is-active --quiet telegram-bot; then
    echo -e "${GREEN}✓ Telegram бот запущен${NC}"
else
    echo -e "${RED}✗ Ошибка запуска бота${NC}"
    journalctl -u telegram-bot -n 20
fi

echo ""
echo -e "${GREEN}=== Установка завершена! ===${NC}"
echo ""
echo "Следующие шаги:"
echo "1. Добавьте прокси в веб-панель: ${PANEL_URL}"
echo "2. Используйте данные из /opt/mtproxy/proxy-config.txt"
echo "3. Проверьте бота в Telegram"
echo ""
echo "Полезные команды:"
echo "  docker logs mtproxy -f          # Логи прокси"
echo "  systemctl status telegram-bot   # Статус бота"
echo "  journalctl -u telegram-bot -f   # Логи бота"
echo ""
