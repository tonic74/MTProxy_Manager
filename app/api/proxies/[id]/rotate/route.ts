import { NextResponse } from 'next/server'
import { rotateSecret, generateProxyLink, generateWebLink } from '@/lib/proxy-manager'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const proxyId = parseInt(id)
    
    if (isNaN(proxyId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID прокси' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { use_fake_tls = true, domain = 'google.com' } = body

    const proxy = await rotateSecret(proxyId, use_fake_tls, domain)
    
    if (!proxy) {
      return NextResponse.json(
        { success: false, error: 'Прокси не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Секрет успешно обновлен',
      data: {
        ...proxy,
        tg_link: generateProxyLink(proxy),
        web_link: generateWebLink(proxy)
      }
    })
  } catch (error) {
    console.error('Error rotating secret:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при ротации секрета' },
      { status: 500 }
    )
  }
}
