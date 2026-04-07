'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

interface Proxy {
  id: number
  name: string
  server_ip: string
  port: number
  secret: string
  status: string
}

interface AddProxyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editProxy?: Proxy | null
}

export function AddProxyDialog({ open, onOpenChange, onSuccess, editProxy }: AddProxyDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [serverIp, setServerIp] = useState('')
  const [port, setPort] = useState('443')
  const [useFakeTLS, setUseFakeTLS] = useState(true)
  const [domain, setDomain] = useState('google.com')

  const isEditing = !!editProxy

  useEffect(() => {
    if (editProxy) {
      setName(editProxy.name)
      setServerIp(editProxy.server_ip)
      setPort(editProxy.port.toString())
    } else {
      setName('')
      setServerIp('')
      setPort('443')
      setUseFakeTLS(true)
      setDomain('google.com')
    }
  }, [editProxy, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = isEditing ? `/api/proxies/${editProxy.id}` : '/api/proxies'
      const method = isEditing ? 'PATCH' : 'POST'
      
      const body = isEditing
        ? { name, server_ip: serverIp, port: parseInt(port) }
        : { name, server_ip: serverIp, port: parseInt(port), use_fake_tls: useFakeTLS, domain }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(isEditing ? 'Прокси обновлен' : 'Прокси добавлен')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch {
      toast.error('Ошибка соединения')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Редактировать прокси' : 'Добавить прокси'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Измените параметры MTProto прокси сервера'
                : 'Добавьте новый MTProto прокси сервер для распространения'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                placeholder="Germany Server 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="server_ip">IP адрес сервера</Label>
              <Input
                id="server_ip"
                placeholder="123.45.67.89"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="port">Порт</Label>
              <Input
                id="port"
                type="number"
                placeholder="443"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                min={1}
                max={65535}
                required
              />
            </div>

            {!isEditing && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="fake-tls">Fake TLS</Label>
                    <p className="text-xs text-muted-foreground">
                      Маскировка трафика под HTTPS
                    </p>
                  </div>
                  <Switch
                    id="fake-tls"
                    checked={useFakeTLS}
                    onCheckedChange={setUseFakeTLS}
                  />
                </div>

                {useFakeTLS && (
                  <div className="grid gap-2">
                    <Label htmlFor="domain">Домен для маскировки</Label>
                    <Input
                      id="domain"
                      placeholder="google.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              {isEditing ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
