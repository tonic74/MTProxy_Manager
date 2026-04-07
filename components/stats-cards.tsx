'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Server, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface ProxyStats {
  total: number
  active: number
  inactive: number
  rotating: number
  lastRotation: string | null
}

interface StatsCardsProps {
  stats: ProxyStats | null
  isLoading: boolean
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда'
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const cards = [
    {
      title: 'Всего прокси',
      value: stats?.total ?? 0,
      icon: Server,
      className: 'bg-primary/10 text-primary',
    },
    {
      title: 'Активных',
      value: stats?.active ?? 0,
      icon: CheckCircle,
      className: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      title: 'Неактивных',
      value: stats?.inactive ?? 0,
      icon: XCircle,
      className: 'bg-zinc-500/10 text-zinc-600',
    },
    {
      title: 'Последняя ротация',
      value: formatDate(stats?.lastRotation ?? null),
      icon: RefreshCw,
      className: 'bg-amber-500/10 text-amber-600',
      isText: true,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-full p-2 ${card.className}`}>
              <card.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <div className={`${card.isText ? 'text-lg' : 'text-3xl'} font-bold`}>
                {card.value}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
