import { NextResponse } from 'next/server'
import { getLogs, initializeDatabase } from '@/lib/db'

export async function GET(request: Request) {
  try {
    await initializeDatabase()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    
    const logs = await getLogs(Math.min(limit, 1000))

    return NextResponse.json({ 
      success: true, 
      data: logs
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении логов' },
      { status: 500 }
    )
  }
}
