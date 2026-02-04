import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Search,
  RefreshCw,
  Users,
  Loader2,
  X,
  Save,
  Pencil,
  Trash2,
  Phone,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Client } from '@/hooks/useClients'

export function ClientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Запрос клиентов
  const { data: clients, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clients-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('fio', { ascending: true })

      if (error) throw error
      return data as Client[]
    },
  })

  // Фильтрация по поиску
  const filteredClients = clients?.filter(client => {
    if (!search.trim()) return true
    const searchLower = search.toLowerCase()
    return (
      client.fio.toLowerCase().includes(searchLower) ||
      (client.phones?.some(p => p.toLowerCase().includes(searchLower))) ||
      (client.company?.toLowerCase().includes(searchLower))
    )
  })

  // Мутация удаления
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-all'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Клиент удалён')
      setDeleteConfirm(null)
    },
    onError: (error: any) => {
      toast.error('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'))
    },
  })

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setShowDialog(true)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingClient(null)
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Клиенты</h1>
        <Button onClick={() => setShowDialog(true)} className="hidden md:flex">
          <Plus className="h-4 w-4 mr-2" />
          Добавить клиента
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {/* Поиск */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, телефону, компании..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Обновить */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
        </Button>
      </div>

      {/* Список клиентов */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredClients?.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Клиентов не найдено</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'Попробуйте изменить параметры поиска' : 'Добавьте первого клиента'}
          </p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить клиента
          </Button>
        </div>
      ) : (
        <>
          {/* Таблица на десктопе */}
          <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">ФИО</th>
                  <th className="text-left p-3 font-medium">Телефоны</th>
                  <th className="text-left p-3 font-medium">Компания</th>
                  <th className="text-right p-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients?.map((client) => (
                  <tr
                    key={client.id}
                    className="border-t hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3 font-medium">{client.fio}</td>
                    <td className="p-3 text-sm">{client.phones?.join(', ') || '—'}</td>
                    <td className="p-3 text-sm">{client.company || '—'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {deleteConfirm === client.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(client.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Да
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirm(null)}
                            >
                              Нет
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(client.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Карточки на мобильных */}
          <div className="md:hidden space-y-3">
            {filteredClients?.map((client) => (
              <div
                key={client.id}
                className="bg-card rounded-lg border p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-lg">{client.fio}</div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(client)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {deleteConfirm === client.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(client.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Да
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Нет
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(client.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {client.phones?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{client.phones.join(', ')}</span>
                    </div>
                  )}
                  {client.company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{client.company}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB на мобильных */}
      <button
        className="fab md:hidden"
        onClick={() => setShowDialog(true)}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Диалог создания/редактирования клиента */}
      {showDialog && (
        <ClientFormDialog
          client={editingClient}
          onClose={handleCloseDialog}
          onSaved={() => {
            handleCloseDialog()
            refetch()
            queryClient.invalidateQueries({ queryKey: ['clients'] })
          }}
        />
      )}
    </div>
  )
}

interface ClientFormDialogProps {
  client: Client | null
  onClose: () => void
  onSaved: () => void
}

function ClientFormDialog({ client, onClose, onSaved }: ClientFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fio: client?.fio || '',
    phone: client?.phones?.[0] || '',
    company: client?.company || '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const isEditing = !!client

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    if (!formData.fio.trim()) {
      newErrors.fio = 'ФИО обязательно для заполнения'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      if (isEditing && client) {
        const { error } = await (supabase
          .from('clients') as any)
          .update({
            fio: formData.fio.trim(),
            phones: formData.phone.trim() ? [formData.phone.trim()] : [],
            company: formData.company.trim() || null,
          })
          .eq('id', client.id)

        if (error) throw error
        toast.success('Клиент обновлён')
      } else {
        const { error } = await (supabase
          .from('clients') as any)
          .insert({
            fio: formData.fio.trim(),
            phones: formData.phone.trim() ? [formData.phone.trim()] : [],
            company: formData.company.trim() || null,
          })

        if (error) throw error
        toast.success('Клиент добавлен')
      }
      onSaved()
    } catch (error: any) {
      console.error('Error saving client:', error)
      toast.error('Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background md:bg-black/50 md:flex md:items-center md:justify-center">
      <div className="h-full md:h-auto md:max-h-[90vh] w-full md:max-w-lg md:rounded-lg bg-background overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card shrink-0">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Редактировать клиента' : 'Новый клиент'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fio">ФИО *</Label>
              <Input
                id="fio"
                placeholder="Иванов Иван Иванович"
                value={formData.fio}
                onChange={(e) => setFormData({ ...formData, fio: e.target.value })}
              />
              {errors.fio && <p className="text-sm text-destructive">{errors.fio}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+7 (900) 123-45-67"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Компания</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company"
                  placeholder="ООО Название"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-card shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
