import { NextResponse } from 'next/server'
import { 
  getAllProxies, 
  getActiveProxies, 
  createProxy 
} from '@/lib/db'
import { 
  generateSecret, 
  generateFakeTLSSecret, 
  isValidIP, 
  isValidPort,
  generateProxyLink,
  generateWebLink
} from '@/lib/proxy-manager'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    
    const proxies = activeOnly ? getActiveProxies() : getAllProxies()
    
    // Добавляем ссылки к каждому прокси
    const proxiesWithLinks = proxies.map(proxy => ({
      ...proxy,
      tg_link: generateProxyLink(proxy),
      web_link: generateWebLink(proxy)
    }))
    
    return NextResponse.json({ success: true, data: proxiesWithLinks })
  } catch (error) {
    console.error('Error fetching proxies:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении списка прокси' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, server_ip, port = 443, secret, use_fake_tls = true, domain = 'google.com' } = body

    // Валидация
    if (!name || !server_ip) {
      return NextResponse.json(
        { success: false, error: 'Имя и IP адрес сервера обязательны' },
        { status: 400 }
      )
    }

    if (!isValidIP(server_ip)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат IP адреса' },
        { status: 400 }
      )
    }

    if (!isValidPort(port)) {
      return NextResponse.json(
        { success: false, error: 'Порт должен быть числом от 1 до 65535' },
        { status: 400 }
      )
    }

    // Генерируем секрет если не передан
    const proxySecret = secret || (use_fake_tls ? generateFakeTLSSecret(domain) : generateSecret())

    const proxy = createProxy({
      name,
      server_ip,
      port,
      secret: proxySecret
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        ...proxy,
        tg_link: generateProxyLink(proxy),
        web_link: generateWebLink(proxy)
      }
    })
  } catch (error) {
    console.error('Error creating proxy:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании прокси' },
      { status: 500 }
    )
  }
}
