#!/bin/bash

# Скрипт ротации секрета MTProto Proxy
# Запустите: chmod +x rotate-secret.sh && sudo ./rotate-secret.sh

set -e

MTPROXY_DIR="/opt/mtproxy"
cd $MTPROXY_DIR

# Проверка наличия docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo "Файл docker-compose.yml не найден в $MTPROXY_DIR"
    exit 1
fi

# Генерация Fake TLS секрета
generate_faketls_secret() {
    local domain=${1:-google.com}
    local random_part=$(openssl rand -hex 16)
    local domain_hex=$(echo -n "$domain" | xxd -p)
    echo "dd${random_part}${domain_hex}"
}

# Получение текущего домена из конфига (если есть)
current_domain=$(grep "FAKE_TLS_DOMAIN" docker-compose.yml 2>/dev/null | cut -d'=' -f2 || echo "google.com")

read -p "Домен для маскировки [$current_domain]: " domain
domain=${domain:-$current_domain}

# Генерация нового секрета
NEW_SECRET=$(generate_faketls_secret $domain)

echo "Новый секрет: $NEW_SECRET"

# Обновление docker-compose.yml
sed -i "s/SECRET=.*/SECRET=${NEW_SECRET}/" docker-compose.yml
sed -i "s/FAKE_TLS_DOMAIN=.*/FAKE_TLS_DOMAIN=${domain}/" docker-compose.yml

# Перезапуск контейнера
echo "Перезапуск MTProxy..."
docker-compose down
docker-compose up -d

# Получение внешнего IP
EXTERNAL_IP=$(curl -s ifconfig.me)
PORT=$(grep -oP "(\d+):443" docker-compose.yml | cut -d':' -f1)

sleep 3
if docker ps | grep -q mtproxy; then
    echo ""
    echo "=== Секрет успешно обновлен! ==="
    echo ""
    echo "Новая ссылка для подключения:"
    echo "tg://proxy?server=${EXTERNAL_IP}&port=${PORT}&secret=${NEW_SECRET}"
    echo ""
    echo "Web ссылка:"
    echo "https://t.me/proxy?server=${EXTERNAL_IP}&port=${PORT}&secret=${NEW_SECRET}"
    
    # Обновление конфигурации
    cat > proxy-config.txt << EOF
IP: ${EXTERNAL_IP}
Port: ${PORT}
Secret: ${NEW_SECRET}
TG Link: tg://proxy?server=${EXTERNAL_IP}&port=${PORT}&secret=${NEW_SECRET}
Web Link: https://t.me/proxy?server=${EXTERNAL_IP}&port=${PORT}&secret=${NEW_SECRET}
Last Rotated: $(date)
EOF
    echo ""
    echo "Конфигурация обновлена в: $MTPROXY_DIR/proxy-config.txt"
else
    echo "Ошибка перезапуска MTProxy. Проверьте логи: docker-compose logs"
    exit 1
fi
