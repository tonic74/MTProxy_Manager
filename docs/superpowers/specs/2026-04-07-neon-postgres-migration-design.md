# Дизайн: Миграция на Neon PostgreSQL

## Проблема

Текущий код использует `@vercel/postgres`, что:
- Привязывает проект к Vercel
- Не работает локально без дополнительных настроек
- Ограничивает бесплатный тариф (256MB)

## Решение

Заменить `@vercel/postgres` на `postgres` (node-postgres) + Neon PostgreSQL.

## Архитектура

### Компоненты

1. **Neon PostgreSQL** - облачная БД (бесплатно 5GB)
2. **postgres (node-postgres)** - клиент для PostgreSQL
3. **lib/db.ts** - слой абстракции (уже есть, требует минимальных изменений)

### Изменения в коде

#### 1. Зависимости

**Удалить:**
- `@vercel/postgres`

**Добавить:**
- `postgres` (node-postgres)

#### 2. lib/db.ts

**Текущий код:**
```typescript
import { sql } from '@vercel/postgres'
```

**Новый код:**
```typescript
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
  max: 10,
})
```

Все SQL запросы остаются без изменений - синтаксис совместим.

#### 3. .env.example

Добавить:
```
DATABASE_URL=postgres://user:password@host:port/database
```

#### 4. API Routes

Без изменений - все используют `lib/db.ts`.

### Миграция данных

Не требуется - БД создается заново при деплое.

## Преимущества

- ✅ Работает и на Vercel, и локально
- ✅ 5GB бесплатно (vs 256MB у Vercel Postgres)
- ✅ Нет vendor lock-in
- ✅ Минимум изменений в коде

## Риски

- ⚠️ Нужно настроить Neon (5 минут)
- ⚠️ SSL обязателен для удаленного подключения

## План реализации

1. Удалить `@vercel/postgres` из package.json
2. Добавить `postgres` в зависимости
3. Обновить `lib/db.ts` для работы с node-postgres
4. Обновить `.env.example`
5. Обновить документацию (README, DEPLOYMENT_GUIDE)
6. Протестировать локально
7. Проверить билд
