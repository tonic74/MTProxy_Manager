import crypto from 'crypto'
import { 
  getAllProxies, 
  getActiveProxies, 
  createProxy, 
  rotateProxySecret,
  addLog,
  type Proxy 
} from './db'

// Генерация случайного секрета для MTProto прокси
export function generateSecret(): string {
  const randomBytes = crypto.randomBytes(16)
  return randomBytes.toString('hex')
}

// Генерация секрета с fake TLS (ee prefix)
export function generateFakeTLSSecret(domain: string = 'google.com'): string {
  const randomPart = crypto.randomBytes(16).toString('hex')
  const domainHex = Buffer.from(domain).toString('hex')
  return `ee${randomPart}${domainHex}`
}

// Создание tg:// ссылки для подключения
export function generateProxyLink(proxy: Proxy): string {
  return `tg://proxy?server=${proxy.server_ip}&port=${proxy.port}&secret=${proxy.secret}`
}

// Создание t.me ссылки для подключения
export function generateWebLink(proxy: Proxy): string {
  return `https://t.me/proxy?server=${proxy.server_ip}&port=${proxy.port}&secret=${proxy.secret}`
}

// Ротация секрета прокси
export async function rotateSecret(proxyId: number, useFakeTLS: boolean = true, domain: string = 'google.com'): Promise<Proxy | undefined> {
  const newSecret = useFakeTLS ? generateFakeTLSSecret(domain) : generateSecret()
  return await rotateProxySecret(proxyId, newSecret)
}

// Массовая ротация всех активных прокси
export async function rotateAllSecrets(useFakeTLS: boolean = true, domain: string = 'google.com'): Promise<number> {
  const proxies = await getActiveProxies()
  let rotatedCount = 0
  
  for (const proxy of proxies) {
    const newSecret = useFakeTLS ? generateFakeTLSSecret(domain) : generateSecret()
    await rotateProxySecret(proxy.id, newSecret)
    rotatedCount++
  }
  
  await addLog('bulk_rotation', `Массовая ротация секретов: ${rotatedCount} прокси`)
  return rotatedCount
}

// Создание нового прокси с автогенерацией секрета
export async function createNewProxy(
  name: string, 
  serverIp: string, 
  port: number = 443, 
  useFakeTLS: boolean = true,
  domain: string = 'google.com'
): Promise<Proxy> {
  const secret = useFakeTLS ? generateFakeTLSSecret(domain) : generateSecret()
  return await createProxy({ name, server_ip: serverIp, port, secret })
}

// Статистика прокси
export interface ProxyStats {
  total: number
  active: number
  inactive: number
  rotating: number
  lastRotation: string | null
}

export async function getProxyStats(): Promise<ProxyStats> {
  const proxies = await getAllProxies()
  
  let lastRotation: string | null = null
  for (const proxy of proxies) {
    if (proxy.last_rotated_at) {
      if (!lastRotation || proxy.last_rotated_at > lastRotation) {
        lastRotation = proxy.last_rotated_at
      }
    }
  }
  
  return {
    total: proxies.length,
    active: proxies.filter(p => p.status === 'active').length,
    inactive: proxies.filter(p => p.status === 'inactive').length,
    rotating: proxies.filter(p => p.status === 'rotating').length,
    lastRotation
  }
}

// Форматирование прокси для отображения в Telegram
export function formatProxyForTelegram(proxy: Proxy): string {
  const statusEmoji = proxy.status === 'active' ? '🟢' : proxy.status === 'inactive' ? '🔴' : '🟡'
  const link = generateProxyLink(proxy)
  
  return `${statusEmoji} *${proxy.name}*
📍 Сервер: \`${proxy.server_ip}:${proxy.port}\`
🔑 Секрет: \`${proxy.secret.substring(0, 8)}...\`
📅 Создан: ${new Date(proxy.created_at).toLocaleDateString('ru-RU')}
${proxy.last_rotated_at ? `🔄 Последняя ротация: ${new Date(proxy.last_rotated_at).toLocaleDateString('ru-RU')}` : ''}

[Подключиться](${link})`
}

// Валидация IP адреса
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

// Валидация порта
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

// Валидация секрета MTProto
export function isValidSecret(secret: string): boolean {
  if (secret.length < 32) return false
  if (secret.startsWith('dd') || secret.startsWith('ee')) {
    return /^[dDeE]{2}[a-fA-F0-9]{32}[a-fA-F0-9]*$/.test(secret)
  }
  return /^[a-fA-F0-9]{32}$/.test(secret)
}
