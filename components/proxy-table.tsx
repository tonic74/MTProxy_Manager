'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, RefreshCw, Trash2, Copy, ExternalLink, Edit } from 'lucide-react'
import { toast } from 'sonner'

interface Proxy {
  id: number
  name: string
  server_ip: string
  port: number
  secret: string
  status: 'active' | 'inactive' | 'rotating'
  created_at: string
  updated_at: string
  last_rotated_at: string | null
  tg_link: string
  web_link: string
}

interface ProxyTableProps {
  proxies: Proxy[]
  onRefresh: () => void
  onEdit: (proxy: Proxy) => void
}

export function ProxyTable({ proxies, onRefresh, onEdit }: ProxyTableProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isRotating, setIsRotating] = useState<number | null>(null)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} скопирован в буфер обмена`)
  }

  const handleRotate = async (id: number) => {
    setIsRotating(id)
    try {
      const response = await fetch(`/api/proxies/${id}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_fake_tls: true }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Секрет успешно обновлен')
        onRefresh()
      } else {
        toast.error(data.error || 'Ошибка при ротации секрета')
      }
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setIsRotating(null)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/proxies/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Прокси удален')
        onRefresh()
      } else {
        toast.error(data.error || 'Ошибка при удалении')
      }
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setDeleteId(null)
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/proxies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Статус обновлен')
        onRefresh()
      } else {
        toast.error(data.error || 'Ошибка при обновлении статуса')
      }
    } catch {
      toast.error('Ошибка соединения')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-0">Активен</Badge>
      case 'inactive':
        return <Badge variant="secondary" className="bg-zinc-500/15 text-zinc-600 hover:bg-zinc-500/25 border-0">Неактивен</Badge>
      case 'rotating':
        return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-0">Ротация</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (proxies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <RefreshCw className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">Нет прокси</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Добавьте первый MTProto прокси сервер
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Имя</TableHead>
              <TableHead className="font-semibold">Сервер</TableHead>
              <TableHead className="font-semibold">Секрет</TableHead>
              <TableHead className="font-semibold">Статус</TableHead>
              <TableHead className="font-semibold">Последняя ротация</TableHead>
              <TableHead className="font-semibold text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proxies.map((proxy) => (
              <TableRow key={proxy.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{proxy.name}</TableCell>
                <TableCell>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {proxy.server_ip}:{proxy.port}
                  </code>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded max-w-[120px] truncate">
                      {proxy.secret.substring(0, 12)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(proxy.secret, 'Секрет')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(proxy.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {proxy.last_rotated_at ? formatDate(proxy.last_rotated_at) : 'Никогда'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => copyToClipboard(proxy.tg_link, 'Ссылка')}>
                        <Copy className="h-4 w-4 mr-2" />
                        Копировать ссылку
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(proxy.web_link, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Открыть в Telegram
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleRotate(proxy.id)}
                        disabled={isRotating === proxy.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRotating === proxy.id ? 'animate-spin' : ''}`} />
                        Ротация секрета
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(proxy)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(proxy.id, proxy.status === 'active' ? 'inactive' : 'active')}
                      >
                        {proxy.status === 'active' ? 'Деактивировать' : 'Активировать'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteId(proxy.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить прокси?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Прокси будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
