'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { ProxyTable } from '@/components/proxy-table'
import { AddProxyDialog } from '@/components/add-proxy-dialog'
import { StatsCards } from '@/components/stats-cards'
import { LogsPanel } from '@/components/logs-panel'
import { Plus, RefreshCw, Shield } from 'lucide-react'
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

interface ProxyStats {
  total: number
  active: number
  inactive: number
  rotating: number
  lastRotation: string | null
}

interface Log {
  id: number
  action: string
  details: string | null
  created_at: string
}

export default function AdminPage() {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [stats, setStats] = useState<ProxyStats | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editProxy, setEditProxy] = useState<Proxy | null>(null)
  const [isRotatingAll, setIsRotatingAll] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [proxiesRes, statsRes] = await Promise.all([
        fetch('/api/proxies'),
        fetch('/api/stats'),
      ])

      const proxiesData = await proxiesRes.json()
      const statsData = await statsRes.json()

      if (proxiesData.success) {
        setProxies(proxiesData.data)
      }

      if (statsData.success) {
        setStats(statsData.data.proxies)
        setLogs(statsData.data.recent_logs)
      }
    } catch {
      toast.error('Ошибка загрузки данных')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRotateAll = async () => {
    setIsRotatingAll(true)
    try {
      const response = await fetch('/api/proxies/rotate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_fake_tls: true }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
        fetchData()
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setIsRotatingAll(false)
    }
  }

  const handleEdit = (proxy: Proxy) => {
    setEditProxy(proxy)
    setIsAddDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open) {
      setEditProxy(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">MTProxy Manager</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Управление MTProto прокси серверами
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotateAll}
              disabled={isRotatingAll || proxies.length === 0}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRotatingAll ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Ротация всех</span>
            </Button>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Добавить прокси</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 md:px-6 py-6 space-y-6">
        {/* Stats */}
        <StatsCards stats={stats} isLoading={isLoading} />

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Proxy Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Прокси серверы</CardTitle>
                    <CardDescription>
                      Список всех MTProto прокси серверов
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ProxyTable 
                  proxies={proxies} 
                  onRefresh={fetchData}
                  onEdit={handleEdit}
                />
              </CardContent>
            </Card>
          </div>

          {/* Logs Panel */}
          <div>
            <LogsPanel logs={logs} isLoading={isLoading} />
          </div>
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <AddProxyDialog
        open={isAddDialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchData}
        editProxy={editProxy}
      />
    </div>
  )
}
