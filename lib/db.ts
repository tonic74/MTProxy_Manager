import { sql } from '@vercel/postgres'

export interface Proxy {
  id: number
  name: string
  server_ip: string
  port: number
  secret: string
  status: 'active' | 'inactive' | 'rotating'
  created_at: string
  updated_at: string
  last_rotated_at: string | null
  connection_count: number
}

export interface Setting {
  key: string
  value: string
  updated_at: string
}

export interface Log {
  id: number
  action: string
  details: string | null
  created_at: string
}

export interface Admin {
  id: number
  telegram_id: string
  username: string | null
  created_at: string
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS proxies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        server_ip TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 443,
        secret TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_rotated_at TIMESTAMP,
        connection_count INTEGER DEFAULT 0
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        telegram_id TEXT UNIQUE NOT NULL,
        username TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
  } catch (error) {
    console.error('Database initialization error:', error)
  }
}

// Proxies
export async function getAllProxies(): Promise<Proxy[]> {
  const { rows } = await sql`SELECT * FROM proxies ORDER BY created_at DESC`
  return rows as Proxy[]
}

export async function getActiveProxies(): Promise<Proxy[]> {
  const { rows } = await sql`SELECT * FROM proxies WHERE status = 'active' ORDER BY created_at DESC`
  return rows as Proxy[]
}

export async function getProxyById(id: number): Promise<Proxy | undefined> {
  const { rows } = await sql`SELECT * FROM proxies WHERE id = ${id}`
  return rows[0] as Proxy | undefined
}

export async function createProxy(data: { name: string; server_ip: string; port: number; secret: string }): Promise<Proxy> {
  const { rows } = await sql`
    INSERT INTO proxies (name, server_ip, port, secret) 
    VALUES (${data.name}, ${data.server_ip}, ${data.port}, ${data.secret})
    RETURNING *
  `
  await addLog('proxy_created', `Создан прокси: ${data.name}`)
  return rows[0] as Proxy
}

export async function updateProxy(id: number, data: Partial<{ name: string; server_ip: string; port: number; secret: string; status: string }>): Promise<Proxy | undefined> {
  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`)
    values.push(data.name)
  }
  if (data.server_ip !== undefined) {
    updates.push(`server_ip = $${paramIndex++}`)
    values.push(data.server_ip)
  }
  if (data.port !== undefined) {
    updates.push(`port = $${paramIndex++}`)
    values.push(data.port)
  }
  if (data.secret !== undefined) {
    updates.push(`secret = $${paramIndex++}`)
    values.push(data.secret)
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`)
    values.push(data.status)
  }

  if (updates.length === 0) return getProxyById(id)

  updates.push(`updated_at = NOW()`)
  values.push(id)

  const query = `UPDATE proxies SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`
  const { rows } = await sql.query(query, values)
  
  await addLog('proxy_updated', `Обновлен прокси ID: ${id}`)
  return rows[0] as Proxy | undefined
}

export async function deleteProxy(id: number): Promise<boolean> {
  const proxy = await getProxyById(id)
  if (!proxy) return false
  
  await sql`DELETE FROM proxies WHERE id = ${id}`
  await addLog('proxy_deleted', `Удален прокси: ${proxy.name}`)
  return true
}

export async function rotateProxySecret(id: number, newSecret: string): Promise<Proxy | undefined> {
  const { rows } = await sql`
    UPDATE proxies 
    SET secret = ${newSecret}, last_rotated_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  await addLog('secret_rotated', `Ротация секрета для прокси ID: ${id}`)
  return rows[0] as Proxy | undefined
}

// Settings
export async function getSetting(key: string): Promise<string | undefined> {
  const { rows } = await sql`SELECT value FROM settings WHERE key = ${key}`
  return rows[0]?.value
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT(key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `
}

export async function getAllSettings(): Promise<Setting[]> {
  const { rows } = await sql`SELECT * FROM settings`
  return rows as Setting[]
}

// Logs
export async function addLog(action: string, details?: string): Promise<void> {
  await sql`INSERT INTO logs (action, details) VALUES (${action}, ${details || null})`
}

export async function getLogs(limit: number = 100): Promise<Log[]> {
  const { rows } = await sql`SELECT * FROM logs ORDER BY created_at DESC LIMIT ${limit}`
  return rows as Log[]
}

// Admins
export async function isAdmin(telegramId: string): Promise<boolean> {
  const { rows } = await sql`SELECT id FROM admins WHERE telegram_id = ${telegramId}`
  return rows.length > 0
}

export async function addAdmin(telegramId: string, username?: string): Promise<void> {
  await sql`
    INSERT INTO admins (telegram_id, username) VALUES (${telegramId}, ${username || null})
    ON CONFLICT(telegram_id) DO NOTHING
  `
  await addLog('admin_added', `Добавлен админ: ${telegramId}`)
}

export async function removeAdmin(telegramId: string): Promise<void> {
  await sql`DELETE FROM admins WHERE telegram_id = ${telegramId}`
  await addLog('admin_removed', `Удален админ: ${telegramId}`)
}

export async function getAllAdmins(): Promise<Admin[]> {
  const { rows } = await sql`SELECT * FROM admins ORDER BY created_at DESC`
  return rows as Admin[]
}
