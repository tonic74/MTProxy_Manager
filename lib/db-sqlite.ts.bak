import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'proxy.db')

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    // Убедимся, что директория существует
    const fs = require('fs')
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initializeDatabase(db)
  }
  return db
}

function initializeDatabase(database: Database.Database) {
  // Таблица прокси серверов
  database.exec(`
    CREATE TABLE IF NOT EXISTS proxies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      server_ip TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 443,
      secret TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_rotated_at TEXT,
      connection_count INTEGER DEFAULT 0
    )
  `)

  // Таблица настроек
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Таблица логов операций
  database.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Таблица администраторов (для Telegram бота)
  database.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE NOT NULL,
      username TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

// Типы данных
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

// Функции для работы с прокси
export function getAllProxies(): Proxy[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM proxies ORDER BY created_at DESC').all() as Proxy[]
}

export function getActiveProxies(): Proxy[] {
  const db = getDatabase()
  return db.prepare("SELECT * FROM proxies WHERE status = 'active' ORDER BY created_at DESC").all() as Proxy[]
}

export function getProxyById(id: number): Proxy | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM proxies WHERE id = ?').get(id) as Proxy | undefined
}

export function createProxy(data: { name: string; server_ip: string; port: number; secret: string }): Proxy {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO proxies (name, server_ip, port, secret) 
    VALUES (?, ?, ?, ?)
  `)
  const result = stmt.run(data.name, data.server_ip, data.port, data.secret)
  addLog('proxy_created', `Создан прокси: ${data.name}`)
  return getProxyById(result.lastInsertRowid as number)!
}

export function updateProxy(id: number, data: Partial<{ name: string; server_ip: string; port: number; secret: string; status: string }>): Proxy | undefined {
  const db = getDatabase()
  const proxy = getProxyById(id)
  if (!proxy) return undefined

  const updates: string[] = []
  const values: (string | number)[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name)
  }
  if (data.server_ip !== undefined) {
    updates.push('server_ip = ?')
    values.push(data.server_ip)
  }
  if (data.port !== undefined) {
    updates.push('port = ?')
    values.push(data.port)
  }
  if (data.secret !== undefined) {
    updates.push('secret = ?')
    values.push(data.secret)
  }
  if (data.status !== undefined) {
    updates.push('status = ?')
    values.push(data.status)
  }

  if (updates.length === 0) return proxy

  updates.push("updated_at = datetime('now')")
  values.push(id)

  db.prepare(`UPDATE proxies SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  addLog('proxy_updated', `Обновлен прокси ID: ${id}`)
  return getProxyById(id)
}

export function deleteProxy(id: number): boolean {
  const db = getDatabase()
  const proxy = getProxyById(id)
  if (!proxy) return false
  
  db.prepare('DELETE FROM proxies WHERE id = ?').run(id)
  addLog('proxy_deleted', `Удален прокси: ${proxy.name}`)
  return true
}

export function rotateProxySecret(id: number, newSecret: string): Proxy | undefined {
  const db = getDatabase()
  db.prepare(`
    UPDATE proxies 
    SET secret = ?, last_rotated_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(newSecret, id)
  addLog('secret_rotated', `Ротация секрета для прокси ID: ${id}`)
  return getProxyById(id)
}

// Функции для настроек
export function getSetting(key: string): string | undefined {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run(key, value, value)
}

export function getAllSettings(): Setting[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM settings').all() as Setting[]
}

// Функции для логов
export function addLog(action: string, details?: string): void {
  const db = getDatabase()
  db.prepare('INSERT INTO logs (action, details) VALUES (?, ?)').run(action, details || null)
}

export function getLogs(limit: number = 100): Log[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?').all(limit) as Log[]
}

// Функции для администраторов
export function isAdmin(telegramId: string): boolean {
  const db = getDatabase()
  const row = db.prepare('SELECT id FROM admins WHERE telegram_id = ?').get(telegramId)
  return !!row
}

export function addAdmin(telegramId: string, username?: string): void {
  const db = getDatabase()
  db.prepare('INSERT OR IGNORE INTO admins (telegram_id, username) VALUES (?, ?)').run(telegramId, username || null)
  addLog('admin_added', `Добавлен админ: ${telegramId}`)
}

export function removeAdmin(telegramId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM admins WHERE telegram_id = ?').run(telegramId)
  addLog('admin_removed', `Удален админ: ${telegramId}`)
}

export function getAllAdmins(): Admin[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM admins ORDER BY created_at DESC').all() as Admin[]
}
