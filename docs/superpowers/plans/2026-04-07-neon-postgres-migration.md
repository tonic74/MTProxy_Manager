# Neon PostgreSQL Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@vercel/postgres` with `postgres` (node-postgres) library to enable Neon PostgreSQL support, removing Vercel vendor lock-in.

**Architecture:** Swap the database client layer in `lib/db.ts` from `@vercel/postgres` tagged template API to `postgres` (postgres.js) tagged template API. All query syntax remains identical. Update dependencies, env config, and documentation.

**Tech Stack:** postgres (postgres.js v3), TypeScript, Next.js 16

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `lib/db.ts` | Replace `@vercel/postgres` import with `postgres` client |
| Modify | `package.json` | Remove `@vercel/postgres`, add `postgres` |
| Modify | `.env.example` | Add `DATABASE_URL` example |
| Modify | `README.md` | Update DB docs |
| Modify | `DEPLOYMENT_GUIDE.md` | Update deployment instructions for Neon |
| Modify | `VERCEL_DETAILED.md` | Update env var section |
| Create | `docs/superpowers/plans/` | This plan file |

---

### Task 1: Update dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove @vercel/postgres and add postgres**

Edit `package.json`:
- Remove line: `"@vercel/postgres": "^0.10.0",`
- Add line in dependencies: `"postgres": "^3.4.5",`

- [ ] **Step 2: Install dependencies**

Run: `pnpm install`
Expected: Success, no errors

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: replace @vercel/postgres with postgres (postgres.js)"
```

---

### Task 2: Migrate lib/db.ts to postgres.js

**Files:**
- Modify: `lib/db.ts`

- [ ] **Step 1: Replace import and create sql client**

Replace the top of `lib/db.ts`:

```typescript
// OLD (delete):
import { sql } from '@vercel/postgres'

// NEW (add):
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10,
  connect_timeout: 10,
})

export { sql }
```

- [ ] **Step 2: Rewrite `updateProxy` function for postgres.js compatibility**

The `updateProxy` function uses `sql.query(query, values)` which doesn't exist in postgres.js. Rewrite it:

```typescript
export async function updateProxy(id: number, data: Partial<{ name: string; server_ip: string; port: number; secret: string; status: string }>): Promise<Proxy | undefined> {
  const updates: ReturnType<typeof sql>[] = []

  if (data.name !== undefined) {
    updates.push(sql`name = ${data.name}`)
  }
  if (data.server_ip !== undefined) {
    updates.push(sql`server_ip = ${data.server_ip}`)
  }
  if (data.port !== undefined) {
    updates.push(sql`port = ${data.port}`)
  }
  if (data.secret !== undefined) {
    updates.push(sql`secret = ${data.secret}`)
  }
  if (data.status !== undefined) {
    updates.push(sql`status = ${data.status}`)
  }

  if (updates.length === 0) return getProxyById(id)

  updates.push(sql`updated_at = NOW()`)

  const { rows } = await sql`UPDATE proxies SET ${sql.join(updates, sql`, `)} WHERE id = ${id} RETURNING *`

  await addLog('proxy_updated', `Обновлен прокси ID: ${id}`)
  return rows[0] as Proxy | undefined
}
```

- [ ] **Step 3: Verify all tagged template calls are compatible**

The `postgres` library supports the same tagged template syntax:
- `` sql`SELECT * FROM table` `` ✅
- `` sql`INSERT INTO ... VALUES (${value})` `` ✅
- `` sql`UPDATE ... SET ${sql.join(updates, sql`, `)} WHERE id = ${id}` `` ✅
- `` sql`DELETE FROM ... WHERE id = ${id}` `` ✅

All queries updated. No other changes needed.

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts
git commit -m "feat(db): migrate from @vercel/postgres to postgres.js"
```

---

### Task 3: Update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Replace DATABASE_PATH with DATABASE_URL**

Replace current content with:

```
# Переменные окружения

# URL базы данных PostgreSQL (Neon, Supabase, или локальный)
# Формат: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://user:password@localhost:5432/mtproxy

# API Secret - случайная строка для защиты API
API_SECRET=your_random_secret_key_here

# Пароль администратора для доступа к панели
ADMIN_PASSWORD=your_admin_password_here
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "config: replace DATABASE_PATH with DATABASE_URL for PostgreSQL"
```

---

### Task 4: Update documentation

**Files:**
- Modify: `README.md`
- Modify: `DEPLOYMENT_GUIDE.md`
- Modify: `VERCEL_DETAILED.md`

- [ ] **Step 1: Update README.md - Технологии section**

Change:
```
- **Database**: SQLite (better-sqlite3)
```
To:
```
- **Database**: PostgreSQL (Neon)
```

- [ ] **Step 2: Update README.md - Remove SQLite from features**

Remove the line:
```
- 🗄️ SQLite база данных
```
Replace with:
```
- 🗄️ PostgreSQL база данных (Neon)
```

- [ ] **Step 3: Update README.md - Переменные окружения section**

Change `DATABASE_PATH=./data/proxy.db` to `DATABASE_URL=postgresql://...`

- [ ] **Step 4: Update DEPLOYMENT_GUIDE.md - Часть 1: Шаг 3 (Environment Variables)**

Replace `DATABASE_PATH` variable with `DATABASE_URL` and add Neon setup instructions:

```
#### Переменная 3: DATABASE_URL
- **Name**: `DATABASE_URL`
- **Value**: `postgresql://user:password@host:port/database`

Для получения DATABASE_URL:
1. Создайте проект на https://neon.tech
2. Создайте базу данных `mtproxy`
3. Скопируйте connection string из панели Neon
```

- [ ] **Step 5: Update VERCEL_DETAILED.md - Часть 3: Шаг 3.4**

Replace `DATABASE_PATH` with `DATABASE_URL` and add Neon instructions.

- [ ] **Step 6: Commit**

```bash
git add README.md DEPLOYMENT_GUIDE.md VERCEL_DETAILED.md
git commit -m "docs: update database documentation for PostgreSQL migration"
```

---

### Task 5: Verify build

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors (or same pre-existing errors as before)

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Final commit if everything is clean**

```bash
git status
git log -n 3
```

Verify all changes are committed and ready.

---

## Summary of Changes

| File | Change |
|------|--------|
| `package.json` | `@vercel/postgres` → `postgres` |
| `lib/db.ts` | Import + client initialization |
| `.env.example` | `DATABASE_PATH` → `DATABASE_URL` |
| `README.md` | DB tech update |
| `DEPLOYMENT_GUIDE.md` | Neon setup instructions |
| `VERCEL_DETAILED.md` | Env var update |

## Post-Plan: Neon Setup (for user)

After implementation, the user needs to:
1. Create account at https://neon.tech
2. Create a database project named `mtproxy`
3. Copy the connection string
4. Add `DATABASE_URL` to Vercel environment variables
