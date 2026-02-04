import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Search,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertTriangle,
  CheckCircle,
  Copy,
  Merge,
  Book,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type DictionaryType = 'complaint' | 'work' | 'part' | 'car_brand'

interface DictionaryItem {
  id: string
  name: string
  usage_count?: number
  default_price?: number
  article?: string
  verified?: boolean
  created_at: string
}

interface DuplicateGroup {
  items: DictionaryItem[]
  similarity: number
}

const DICTIONARY_CONFIG: Record<DictionaryType, { table: string; label: string; hasPrice: boolean; hasArticle: boolean }> = {
  complaint: { table: 'complaint_dictionary', label: 'Жалобы', hasPrice: false, hasArticle: false },
  work: { table: 'work_dictionary', label: 'Работы', hasPrice: true, hasArticle: false },
  part: { table: 'part_dictionary', label: 'Запчасти', hasPrice: true, hasArticle: true },
  car_brand: { table: 'car_brand_dictionary', label: 'Марки авто', hasPrice: false, hasArticle: false },
}

// Функция расчёта расстояния Левенштейна
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[bLower.length][aLower.length]
}

// Функция расчёта похожести (0-1)
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

// Группировка дубликатов
function findDuplicates(items: DictionaryItem[], threshold = 0.8): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  const used = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    if (used.has(items[i].id)) continue

    const group: DictionaryItem[] = [items[i]]
    used.add(items[i].id)

    for (let j = i + 1; j < items.length; j++) {
      if (used.has(items[j].id)) continue

      const sim = similarity(items[i].name, items[j].name)
      if (sim >= threshold) {
        group.push(items[j])
        used.add(items[j].id)
      }
    }

    if (group.length > 1) {
      groups.push({
        items: group,
        similarity: Math.round(similarity(group[0].name, group[1].name) * 100),
      })
    }
  }

  return groups.sort((a, b) => b.similarity - a.similarity)
}

export function DictionariesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<DictionaryType>('complaint')
  const [search, setSearch] = useState('')
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [showUnverified, setShowUnverified] = useState(false)
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [mergeGroup, setMergeGroup] = useState<DuplicateGroup | null>(null)

  const config = DICTIONARY_CONFIG[activeTab]

  // Запрос данных справочника
  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dictionary', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(config.table)
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as DictionaryItem[]
    },
  })

  // Мутация удаления
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(config.table)
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary', activeTab] })
      toast.success('Запись удалена')
      setDeleteConfirm(null)
    },
    onError: (error: any) => {
      toast.error('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'))
    },
  })

  // Мутация обновления
  const updateMutation = useMutation({
    mutationFn: async (item: Partial<DictionaryItem> & { id: string }) => {
      const { id, ...updates } = item
      const { error } = await (supabase
        .from(config.table) as any)
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary', activeTab] })
      toast.success('Запись обновлена')
      setEditingItem(null)
    },
    onError: (error: any) => {
      toast.error('Ошибка обновления: ' + (error.message || 'Неизвестная ошибка'))
    },
  })

  // Мутация добавления
  const addMutation = useMutation({
    mutationFn: async (item: Omit<DictionaryItem, 'id' | 'created_at'>) => {
      const { error } = await (supabase
        .from(config.table) as any)
        .insert(item)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary', activeTab] })
      toast.success('Запись добавлена')
      setShowAddDialog(false)
    },
    onError: (error: any) => {
      toast.error('Ошибка добавления: ' + (error.message || 'Неизвестная ошибка'))
    },
  })

  // Мутация объединения (удаление дубликатов)
  const mergeMutation = useMutation({
    mutationFn: async ({ deleteIds }: { keepId: string; deleteIds: string[] }) => {
      for (const id of deleteIds) {
        const { error } = await supabase
          .from(config.table)
          .delete()
          .eq('id', id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionary', activeTab] })
      toast.success('Дубликаты объединены')
      setMergeGroup(null)
    },
    onError: (error: any) => {
      toast.error('Ошибка объединения: ' + (error.message || 'Неизвестная ошибка'))
    },
  })

  // Фильтрация
  const filteredItems = useMemo(() => {
    let result = items

    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.article && item.article.toLowerCase().includes(searchLower))
      )
    }

    if (showUnverified) {
      result = result.filter(item => !item.verified)
    }

    return result
  }, [items, search, showUnverified])

  // Поиск дубликатов
  const duplicates = useMemo(() => {
    if (!showDuplicates) return []
    return findDuplicates(items, 0.7)
  }, [items, showDuplicates])

  const handleToggleVerified = (item: DictionaryItem) => {
    updateMutation.mutate({
      id: item.id,
      verified: !item.verified,
    })
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Book className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Справочники</h1>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить
        </Button>
      </div>

      {/* Табы справочников */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(DICTIONARY_CONFIG) as DictionaryType[]).map((type) => (
          <Button
            key={type}
            variant={activeTab === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActiveTab(type)
              setSearch('')
              setShowDuplicates(false)
              setShowUnverified(false)
            }}
          >
            {DICTIONARY_CONFIG[type].label}
          </Button>
        ))}
      </div>

      {/* Фильтры */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showUnverified ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowUnverified(!showUnverified)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Непроверенные
          </Button>

          <Button
            variant={showDuplicates ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowDuplicates(!showDuplicates)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Дубликаты {duplicates.length > 0 && `(${duplicates.length})`}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
        <span>Всего: {items.length}</span>
        <span>Показано: {filteredItems.length}</span>
        <span>Непроверенных: {items.filter(i => !i.verified).length}</span>
      </div>

      {/* Режим дубликатов */}
      {showDuplicates && duplicates.length > 0 && (
        <div className="mb-6 space-y-4">
          <h3 className="font-medium text-lg">Найденные дубликаты ({duplicates.length} групп)</h3>
          {duplicates.map((group, groupIndex) => (
            <div key={groupIndex} className="border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  Похожесть: {group.similarity}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMergeGroup(group)}
                >
                  <Merge className="h-4 w-4 mr-2" />
                  Объединить
                </Button>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <span>{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Использований: {item.usage_count || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Таблица */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? 'Ничего не найдено' : 'Справочник пуст'}
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium w-8"></th>
                  <th className="text-left p-3 font-medium">Название</th>
                  {config.hasArticle && (
                    <th className="text-left p-3 font-medium">Артикул</th>
                  )}
                  {config.hasPrice && (
                    <th className="text-left p-3 font-medium">Цена</th>
                  )}
                  <th className="text-left p-3 font-medium">Исп.</th>
                  <th className="text-left p-3 font-medium">Дата</th>
                  <th className="text-right p-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-t hover:bg-muted/30 transition-colors',
                      !item.verified && 'bg-yellow-50 dark:bg-yellow-950/20'
                    )}
                  >
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleVerified(item)}
                        className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center',
                          item.verified
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-muted-foreground/50 hover:border-green-500'
                        )}
                        title={item.verified ? 'Проверено' : 'Отметить как проверенное'}
                      >
                        {item.verified && <Check className="h-3 w-3" />}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {!item.verified && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    {config.hasArticle && (
                      <td className="p-3 text-sm">{item.article || '—'}</td>
                    )}
                    {config.hasPrice && (
                      <td className="p-3 text-sm">
                        {item.default_price ? `${item.default_price} ₽` : '—'}
                      </td>
                    )}
                    <td className="p-3 text-sm text-muted-foreground">
                      {item.usage_count || 0}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {deleteConfirm === item.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMutation.mutate(item.id)}
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
                            onClick={() => setDeleteConfirm(item.id)}
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
        </div>
      )}

      {/* Диалог редактирования */}
      {editingItem && (
        <EditDialog
          item={editingItem}
          config={config}
          onClose={() => setEditingItem(null)}
          onSave={(updates) => updateMutation.mutate({ id: editingItem.id, ...updates })}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Диалог добавления */}
      {showAddDialog && (
        <AddDialog
          config={config}
          onClose={() => setShowAddDialog(false)}
          onSave={(item) => addMutation.mutate(item)}
          isLoading={addMutation.isPending}
        />
      )}

      {/* Диалог объединения дубликатов */}
      {mergeGroup && (
        <MergeDialog
          group={mergeGroup}
          onClose={() => setMergeGroup(null)}
          onMerge={(keepId) => {
            const deleteIds = mergeGroup.items
              .filter((i) => i.id !== keepId)
              .map((i) => i.id)
            mergeMutation.mutate({ keepId, deleteIds })
          }}
          isLoading={mergeMutation.isPending}
        />
      )}
    </div>
  )
}

// Диалог редактирования
interface EditDialogProps {
  item: DictionaryItem
  config: { hasPrice: boolean; hasArticle: boolean }
  onClose: () => void
  onSave: (updates: Partial<DictionaryItem>) => void
  isLoading: boolean
}

function EditDialog({ item, config, onClose, onSave, isLoading }: EditDialogProps) {
  const [name, setName] = useState(item.name)
  const [article, setArticle] = useState(item.article || '')
  const [price, setPrice] = useState(item.default_price?.toString() || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const updates: Partial<DictionaryItem> = { name: name.trim() }
    if (config.hasArticle) updates.article = article.trim() || undefined
    if (config.hasPrice) updates.default_price = parseFloat(price) || undefined

    onSave(updates)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 className="font-semibold mb-4">Редактирование записи</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Название *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название"
              required
            />
          </div>

          {config.hasArticle && (
            <div className="space-y-2">
              <Label>Артикул</Label>
              <Input
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                placeholder="Артикул"
              />
            </div>
          )}

          {config.hasPrice && (
            <div className="space-y-2">
              <Label>Цена по умолчанию</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Диалог добавления
interface AddDialogProps {
  config: { hasPrice: boolean; hasArticle: boolean }
  onClose: () => void
  onSave: (item: Omit<DictionaryItem, 'id' | 'created_at'>) => void
  isLoading: boolean
}

function AddDialog({ config, onClose, onSave, isLoading }: AddDialogProps) {
  const [name, setName] = useState('')
  const [article, setArticle] = useState('')
  const [price, setPrice] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const item: any = {
      name: name.trim(),
      verified: true,
    }
    if (config.hasArticle) item.article = article.trim() || undefined
    if (config.hasPrice) item.default_price = parseFloat(price) || undefined

    onSave(item)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-4">
        <h3 className="font-semibold mb-4">Добавить запись</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Название *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название"
              required
            />
          </div>

          {config.hasArticle && (
            <div className="space-y-2">
              <Label>Артикул</Label>
              <Input
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                placeholder="Артикул"
              />
            </div>
          )}

          {config.hasPrice && (
            <div className="space-y-2">
              <Label>Цена по умолчанию</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Добавить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Диалог объединения дубликатов
interface MergeDialogProps {
  group: DuplicateGroup
  onClose: () => void
  onMerge: (keepId: string) => void
  isLoading: boolean
}

function MergeDialog({ group, onClose, onMerge, isLoading }: MergeDialogProps) {
  const [selectedId, setSelectedId] = useState(group.items[0].id)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-lg w-full p-4">
        <h3 className="font-semibold mb-2">Объединение дубликатов</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Выберите запись, которую нужно оставить. Остальные будут удалены.
        </p>

        <div className="space-y-2 mb-4">
          {group.items.map((item) => (
            <label
              key={item.id}
              className={cn(
                'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                selectedId === item.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              )}
            >
              <input
                type="radio"
                name="merge-item"
                checked={selectedId === item.id}
                onChange={() => setSelectedId(item.id)}
                className="accent-primary"
              />
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  Использований: {item.usage_count || 0} |{' '}
                  {new Date(item.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
              {item.verified && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={() => onMerge(selectedId)}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Merge className="h-4 w-4 mr-2" />
                Объединить (удалить {group.items.length - 1})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
