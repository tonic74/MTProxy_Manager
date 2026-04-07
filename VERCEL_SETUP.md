# Инструкция по деплою на Vercel

## Шаг 1: Создание проекта

1. Откройте [vercel.com](https://vercel.com)
2. Войдите через GitHub
3. Нажмите "Add New Project"
4. Найдите репозиторий `tonic74/MTProxy_Manager`
5. Нажмите "Import"

## Шаг 2: Настройка переменных окружения

В разделе "Environment Variables" добавьте:

### API_SECRET
```
AcKx5ZzCotRghOYnl7p1W2DwEFyPrU8T
```

### ADMIN_PASSWORD
```
<ваш_надежный_пароль>
```
Придумайте надежный пароль для входа в админ-панель.

### DATABASE_URL
```
postgresql://user:password@host:port/database
```
Создайте проект на https://neon.tech и скопируйте connection string.

## Шаг 3: Deploy

1. Нажмите "Deploy"
2. Дождитесь завершения (2-3 минуты)
3. Скопируйте URL вашего проекта (например: https://mtproxy-manager.vercel.app)

## Шаг 4: Сохраните данные

После деплоя сохраните:
- URL панели: _________________
- API_SECRET: AcKx5ZzCotRghOYnl7p1W2DwEFyPrU8T
- ADMIN_PASSWORD: _________________

Эти данные понадобятся для настройки сервера и бота.
