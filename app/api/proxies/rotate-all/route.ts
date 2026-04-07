import { NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/db'
import { rotateAllSecrets } from '@/lib/proxy-manager'

export async function POST(request: Request) {
  try {
    await initializeDatabase()
    const body = await request.json().catch(() => ({}))
    const { use_fake_tls = true, domain = 'google.com' } = body

    const rotatedCount = await rotateAllSecrets(use_fake_tls, domain)

    return NextResponse.json({ 
      success: true, 
      message: `Секреты обновлены для ${rotatedCount} прокси`,
      rotated_count: rotatedCount
    })
  } catch (error) {
    console.error('Error rotating all secrets:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при массовой ротации секретов' },
      { status: 500 }
    )
  }
}
