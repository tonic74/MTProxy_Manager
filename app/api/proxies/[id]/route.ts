import { NextResponse } from 'next/server'
import { 
  getProxyById, 
  updateProxy, 
  deleteProxy,
  initializeDatabase
} from '@/lib/db'
import { 
  isValidIP, 
  isValidPort,
  generateProxyLink,
  generateWebLink
} from '@/lib/proxy-manager'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase()
    const { id } = await params
    const proxyId = parseInt(id)
    
    if (isNaN(proxyId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID прокси' },
        { status: 400 }
      )
    }

    const proxy = await getProxyById(proxyId)
    
    if (!proxy) {
      return NextResponse.json(
        { success: false, error: 'Прокси не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...proxy,
        tg_link: generateProxyLink(proxy),
        web_link: generateWebLink(proxy)
      }
    })
  } catch (error) {
    console.error('Error fetching proxy:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении прокси' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase()
    const { id } = await params
    const proxyId = parseInt(id)
    
    if (isNaN(proxyId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID прокси' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, server_ip, port, secret, status } = body

    if (server_ip && !isValidIP(server_ip)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат IP адреса' },
        { status: 400 }
      )
    }

    if (port && !isValidPort(port)) {
      return NextResponse.json(
        { success: false, error: 'Порт должен быть числом от 1 до 65535' },
        { status: 400 }
      )
    }

    if (status && !['active', 'inactive', 'rotating'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Неверный статус. Допустимые: active, inactive, rotating' },
        { status: 400 }
      )
    }

    const proxy = await updateProxy(proxyId, { name, server_ip, port, secret, status })
    
    if (!proxy) {
      return NextResponse.json(
        { success: false, error: 'Прокси не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...proxy,
        tg_link: generateProxyLink(proxy),
        web_link: generateWebLink(proxy)
      }
    })
  } catch (error) {
    console.error('Error updating proxy:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении прокси' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase()
    const { id } = await params
    const proxyId = parseInt(id)
    
    if (isNaN(proxyId)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID прокси' },
        { status: 400 }
      )
    }

    const deleted = await deleteProxy(proxyId)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Прокси не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, message: 'Прокси успешно удален' })
  } catch (error) {
    console.error('Error deleting proxy:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении прокси' },
      { status: 500 }
    )
  }
}
