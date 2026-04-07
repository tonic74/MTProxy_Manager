import { NextResponse } from 'next/server'
import { getProxyStats } from '@/lib/proxy-manager'
import { getLogs } from '@/lib/db'

export async function GET() {
  try {
    const stats = getProxyStats()
    const recentLogs = getLogs(10)

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
