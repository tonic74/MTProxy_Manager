import { NextResponse } from 'next/server'
import { getProxyStats } from '@/lib/proxy-manager'
import { getLogs, initializeDatabase } from '@/lib/db'

export async function GET() {
  try {
    await initializeDatabase()
    const stats = await getProxyStats()
    const recentLogs = await getLogs(10)

    return NextResponse.json({ 
      success: true, 
      data: {
        proxies: stats,
        recent_logs: recentLogs
      }
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении статистики' },
      { status: 500 }
    )
  }
}
