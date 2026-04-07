# Команды для установки на сервер

## Ваши данные

- **Сервер IP**: 45.14.247.31
- **SSH ключ**: .ssh/123
- **Панель Vercel**: https://mt-proxy-manager-2eabgets5-990990bb-6786s-projects.vercel.app
- **Telegram ID**: 418335978
- **Токен бота**: 8780642333:AAHxevHHibY7ufkRfMQ4r9Dmx14qphyqnXE

---

## Шаг 1: Подключение к серверу

Откройте PowerShell и выполните:

```powershell
cd C:\Users\User\Desktop\Proxy_V0
ssh -i .ssh/123 root@45.14.247.31
```

Если появится вопрос "Are you sure you want to continue connecting?" - введите `yes`

---

## Шаг 2: Загрузка и запуск скрипта установки

На сервере выполните эти команды:

```bash
# Скачать скрипт
curl -sSL https://raw.githubusercontent.com/tonic74/MTProxy_Manager/main/install.sh -o install.sh

# Сделать исполняемым
chmod +x install.sh

# Запустить установку
sudo bash install.sh
```

Скрипт автоматически:
- Обновит систему
- Установит Docker
- Настроит Firewall
- Запустит MTProxy
- Установит Node.js
- Настроит Telegram бота

Процесс займет 5-10 минут.

---

## Шаг 3: Сохранение данных прокси

После завершения установки скрипт выведет данные прокси:

```
IP: 45.14.247.31
Port: 443
Secret: ddXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TG Link: tg://proxy?server=...
Web Link: https://t.me/proxy?server=...
```

**СКОПИРУЙТЕ ЭТИ ДАННЫЕ!** Они понадобятся для добавления в панель.

Также данные сохранены в файле:
```bash
cat /opt/mtproxy/proxy-config.txt
```

---

## Шаг 4: Добавление прокси в панель

1. Откройте панель: https://mt-proxy-manager-2eabgets5-990990bb-6786s-projects.vercel.app
2. Нажмите **"Добавить прокси"**
3. Заполните форму:
   - **Название**: Germany-1
   - **IP адрес**: 45.14.247.31
   - **Порт**: 443
   - **Секрет**: (из вывода скрипта, начинается с `dd`)
   - **Fake TLS домен**: google.com
4. Нажмите **"Добавить"**

---

## Шаг 5: Проверка работы

### 5.1 Проверка прокси в Telegram

1. Откройте Telegram на телефоне
2. Настройки → Данные и память → Тип соединения
3. Нажмите "Использовать прокси"
4. Нажмите "Добавить прокси"
5. Вставьте ссылку из панели
6. Проверьте статус "Подключено"

### 5.2 Проверка Telegram бота

1. Найдите вашего бота в Telegram (имя бота из @BotFather)
2. Отправьте `/start`
3. Отправьте `/proxies` - должен вернуть список
4. Отправьте `/stats` - должен показать статистику

---

## Полезные команды на сервере

```bash
# Проверка статуса прокси
docker ps | grep mtproxy
docker logs mtproxy -f

# Проверка статуса бота
systemctl status telegram-bot
journalctl -u telegram-bot -f

# Перезапуск прокси
cd /opt/mtproxy && docker-compose restart

# Перезапуск бота
systemctl restart telegram-bot

# Просмотр данных прокси
cat /opt/mtproxy/proxy-config.txt
```

---

## Решение проблем

### Прокси не запускается

```bash
docker logs mtproxy --tail 50
docker-compose -f /opt/mtproxy/docker-compose.yml up -d
```

### Бот не отвечает

```bash
journalctl -u telegram-bot -n 50
cat /opt/telegram-bot/.env
systemctl restart telegram-bot
```

### Порт 443 занят

```bash
netstat -tlnp | grep 443
# Остановите процесс, занимающий порт
```

---

## Готово!

После выполнения всех шагов у вас будет:
- ✅ Работающий MTProxy на сервере
- ✅ Telegram бот для распространения
- ✅ Веб-панель для управления

Начинайте с **Шага 1** - подключения к серверу!
