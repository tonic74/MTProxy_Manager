'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Log {
  id: number
  action: string
  details: string | null
  created_at: string
}

interface LogsPanelProps {
  logs: Log[]
  isLoading: boolean
}

const actionLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  proxy_created: { label: 'Создание', variant: 'default' },
  proxy_updated: { label: 'Обновление', variant: 'secondary' },
  proxy_deleted: { label: 'Удаление', variant: 'destructive' },
  secret_rotated: { label: 'Ротация', variant: 'outline' },
  bulk_rotation: { label: 'Массовая ротация', variant: 'outline' },
  admin_added: { label: 'Админ добавлен', variant: 'default' },
  admin_removed: { label: 'Админ удален', variant: 'destructive' },
}

export function LogsPanel({ logs, isLoading }: LogsPanelProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionBadge = (action: string) => {
    const config = actionLabels[action] || { label: action, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Последние действия</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Нет записей
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="shrink-0 mt-0.5">
                    {getActionBadge(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{log.details || '-'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
