#!/bin/bash

# Скрипт установки MTProto Proxy на сервере
# Запустите: chmod +x setup-mtproxy.sh && sudo ./setup-mtproxy.sh

set -e

echo "=== Установка MTProto Proxy ==="

# Проверка root прав
if [ "$EUID" -ne 0 ]; then
  echo "Пожалуйста, запустите скрипт с правами root (sudo)"
  exit 1
fi

# Установка Docker если не установлен
if ! command -v docker &> /dev/null; then
    echo "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "Docker установлен"
fi

# Установка Docker Compose если не установлен
if ! command -v docker-compose &> /dev/null; then
    echo "Установка Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose установлен"
fi

# Создание директории для MTProxy
MTPROXY_DIR="/opt/mtproxy"
mkdir -p $MTPROXY_DIR
cd $MTPROXY_DIR

# Генерация случайного секрета (32 hex символа)
generate_secret() {
    openssl rand -hex 16
}

# Генерация Fake TLS секрета
generate_faketls_secret() {
    local domain=${1:-google.com}
    local random_part=$(openssl rand -hex 16)
    local domain_hex=$(echo -n "$domain" | xxd -p)
    echo "dd${random_part}${domain_hex}"
}

# Запрос параметров
read -p "Использовать Fake TLS (рекомендуется)? [Y/n]: " use_faketls
use_faketls=${use_faketls:-Y}

if [[ $use_faketls =~ ^[Yy]$ ]]; then
    read -p "Домен для маскировки [google.com]: " domain
    domain=${domain:-google.com}
    SECRET=$(generate_faketls_secret $domain)
    echo "Генерация Fake TLS секрета для домена: $domain"
else
    SECRET=$(generate_secret)
    echo "Генерация стандартного секрета"
fi

read -p "Порт для прокси [443]: " port
port=${port:-443}

# Получение внешнего IP
EXTERNAL_IP=$(curl -s ifconfig.me)

echo ""
echo "=== Параметры прокси ==="
echo "IP: $EXTERNAL_IP"
echo "Порт: $port"
echo "Секрет: $SECRET"
echo ""

# Создание docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'

services:
  mtproxy:
    image: telegrammessenger/proxy:latest
    container_name: mtproxy
    restart: unless-stopped
    ports:
      - "${port}:443"
    environment:
      - SECRET=${SECRET}
    volumes:
      - ./data:/data
EOF

# Создание директории для данных
mkdir -p data

# Запуск контейнера
echo "Запуск MTProxy..."
docker-compose up -d

# Проверка статуса
sleep 3
if docker ps | grep -q mtproxy; then
    echo ""
    echo "=== MTProxy успешно запущен! ==="
    echo ""
    echo "Ссылка для подключения:"
    echo "tg://proxy?server=${EXTERNAL_IP}&port=${port}&secret=${SECRET}"
    echo ""
    echo "Web ссылка:"
    echo "https://t.me/proxy?server=${EXTERNAL_IP}&port=${port}&secret=${SECRET}"
    echo ""
    echo "Сохраните эти данные для добавления в админ-панель!"
    
    # Сохранение конфигурации
    cat > proxy-config.txt << EOF
IP: ${EXTERNAL_IP}
Port: ${port}
Secret: ${SECRET}
TG Link: tg://proxy?server=${EXTERNAL_IP}&port=${port}&secret=${SECRET}
Web Link: https://t.me/proxy?server=${EXTERNAL_IP}&port=${port}&secret=${SECRET}
EOF
    echo ""
    echo "Конфигурация сохранена в: $MTPROXY_DIR/proxy-config.txt"
else
    echo "Ошибка запуска MTProxy. Проверьте логи: docker-compose logs"
    exit 1
fi
