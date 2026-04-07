# MTProxy Manager

Система управления MTProto прокси серверами для Telegram с веб-панелью и Telegram ботом.

## Возможности

- 🌐 Веб-панель администратора (Next.js + shadcn/ui)
- 🤖 Telegram бот для распространения прокси
- 🔄 Автоматическая ротация секретов
- 🔐 Fake TLS маскировка трафика
- 📊 Мониторинг и статистика
- 🗄️ SQLite база данных

## Быстрый старт

Полная документация находится в папке `docs/`:
- [БЫСТРЫЙ_СТАРТ.md](docs/БЫСТРЫЙ_СТАРТ.md) - установка за 15 минут
- [РУКОВОДСТВО_ИСПОЛНИТЕЛЯ.md](docs/РУКОВОДСТВО_ИСПОЛНИТЕЛЯ.md) - детальное руководство

## Деплой на Vercel

### 1. Подготовка

Создайте аккаунт на [vercel.com](https://vercel.com) (можно через GitHub)

### 2. Импорт проекта

1. Нажмите "Add New Project" в Vercel
2. Импортируйте этот репозиторий
3. Настройте переменные окружения (см. ниже)
4. Нажмите "Deploy"

### 3. Переменные окружения

В настройках проекта Vercel добавьте:

```
API_SECRET=ваш_случайный_ключ_минимум_32_символа
ADMIN_PASSWORD=ваш_надежный_пароль
DATABASE_PATH=./data/proxy.db
```

**Генерация API_SECRET:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

## Установка на сервер

### Требования

- VPS сервер (Ubuntu 20.04+)
- 1 vCPU, 1GB RAM минимум
- Открытый порт 443

### Автоматическая установка

```bash
# Подключитесь к серверу
ssh root@YOUR_SERVER_IP

# Скачайте и запустите установщик
curl -sSL https://raw.githubusercontent.com/tonic74/MTProxy_Manager/main/server-scripts/setup-mtproxy.sh -o setup.sh
chmod +x setup.sh
sudo ./setup.sh
```

Скрипт установит:
- Docker и Docker Compose
- MTProxy контейнер
- Сгенерирует секрет и ссылки

### Настройка Telegram бота

После установки MTProxy:

```bash
# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

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
BOT_TOKEN=ваш_токен_от_botfather
ADMIN_API_URL=https://ваша-панель.vercel.app
ADMIN_IDS=ваш_telegram_id
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
systemctl status telegram-bot
```

## Использование

### Веб-панель

1. Откройте URL вашего Vercel проекта
2. Нажмите "Добавить прокси"
3. Введите данные с сервера (IP, порт, секрет)
4. Скопируйте ссылку для подключения

### Telegram бот

Команды:
- `/start` - начало работы
- `/proxies` - список всех прокси
- `/active` - активные прокси
- `/stats` - статистика
- `/rotate_all` - ротация всех секретов

## Структура проекта

```
.
├── app/                    # Next.js приложение
│   ├── api/               # API routes
│   └── page.tsx           # Главная страница
├── components/            # React компоненты
├── lib/                   # Утилиты и логика
│   ├── db.ts             # SQLite база данных
│   └── proxy-manager.ts  # Управление прокси
├── server-scripts/        # Скрипты для сервера
│   ├── setup-mtproxy.sh  # Установщик MTProxy
│   ├── telegram-bot.js   # Telegram бот
│   └── rotate-secret.sh  # Ротация секретов
└── docs/                  # Документация
```

## Технологии

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **Proxy**: MTProxy (Docker)
- **Bot**: Telegraf
- **Hosting**: Vercel (панель), VPS (прокси + бот)

## Безопасность

- ⚠️ Никогда не коммитьте `.env` файлы
- ⚠️ Используйте надежные пароли и API ключи
- ⚠️ Ограничьте доступ к серверу через firewall
- ⚠️ Регулярно обновляйте Docker образы

## Поддержка

При проблемах смотрите:
- [docs/РУКОВОДСТВО_ИСПОЛНИТЕЛЯ.md](docs/РУКОВОДСТВО_ИСПОЛНИТЕЛЯ.md) - раздел "Решение типичных проблем"
- GitHub Issues

## Лицензия

MIT
