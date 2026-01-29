import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  RefreshCw,
  FileText,
  Loader2,
  Download,
} from 'lucide-react'
import { cn, formatDate, statusLabels, statusColors, carNumberToSearchVariants } from '@/lib/utils'
import type { Claim } from '@/types/database'
import { ClaimFormDialog } from '@/components/claims/ClaimFormDialog'
import { exportClaimsToCSV, exportSingleClaimToCSV } from '@/utils/csvExport'

export function ClaimsPage() {
  const { profile, isAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [showMyOnly, setShowMyOnly] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showNewClaimDialog, setShowNewClaimDialog] = useState(false)
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null)

  // Запрос заявок (мастер видит ВСЕ заявки)
  const { data: claims, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['claims', showMyOnly, statusFilter, profile?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false })

      // Фильтр "Мои/Все" работает только для админа
      if (isAdmin && showMyOnly) {
        query = query.eq('assigned_master_id', profile?.id || '')
      }

      // Фильтр по статусу
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Claim[]
    },
    enabled: !!profile?.id,
  })

  // Фильтрация по поиску (госномер)
  const filteredClaims = claims?.filter(claim => {
    if (!search.trim()) return true
    const variants = carNumberToSearchVariants(search)
    return variants.some(v => 
      claim.car_number.toUpperCase().includes(v)
    )
  })

  const handleClaimClick = (claim: Claim) => {
    setEditingClaim(claim)
    setShowNewClaimDialog(true)
  }

  const handleCloseDialog = () => {
    setShowNewClaimDialog(false)
    setEditingClaim(null)
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Заявки</h1>
        <Button onClick={() => setShowNewClaimDialog(true)} className="hidden md:flex">
          <Plus className="h-4 w-4 mr-2" />
          Новая заявка
        </Button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {/* Поиск */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по госномеру..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Переключатель "Мои / Все" для админа */}
        {isAdmin && (
          <div className="flex rounded-md border overflow-hidden">
            <button
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                showMyOnly ? 'bg-primary text-white' : 'hover:bg-accent'
              )}
              onClick={() => setShowMyOnly(true)}
            >
              Мои
            </button>
            <button
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                !showMyOnly ? 'bg-primary text-white' : 'hover:bg-accent'
              )}
              onClick={() => setShowMyOnly(false)}
            >
              Все
            </button>
          </div>
        )}

        {/* Фильтр по статусу */}
        <select
          className="h-10 px-3 rounded-md border bg-background text-sm min-h-[44px] md:min-h-[40px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="agreed">Согласовано</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Выполнено</option>
        </select>

        {/* Обновить */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
        </Button>

        {/* Экспорт CSV — только для админа */}
        {isAdmin && (
          <Button
            variant="outline"
            onClick={() => { if (filteredClaims) exportClaimsToCSV(filteredClaims) }}
            disabled={!filteredClaims || filteredClaims.length === 0}
            title="Экспорт в CSV"
          >
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Экспорт</span>
          </Button>
        )}
      </div>

      {/* Список заявок */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredClaims?.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Заявок не найдено</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'Попробуйте изменить параметры поиска' : 'Создайте первую заявку'}
          </p>
          <Button onClick={() => setShowNewClaimDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Новая заявка
          </Button>
        </div>
      ) : (
        <>
          {/* Таблица на десктопе */}
          <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">№ Заявки</th>
                  <th className="text-left p-3 font-medium">Дата</th>
                  <th className="text-left p-3 font-medium">Клиент</th>
                  <th className="text-left p-3 font-medium">Авто</th>
                  <th className="text-left p-3 font-medium">Госномер</th>
                  <th className="text-left p-3 font-medium">Статус</th>
                  {isAdmin && <th className="text-center p-3 font-medium w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {filteredClaims?.map((claim) => (
                  <tr
                    key={claim.id}
                    className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handleClaimClick(claim)}
                  >
                    <td className="p-3 font-mono text-sm">{claim.number}</td>
                    <td className="p-3 text-sm">{formatDate(claim.created_at)}</td>
                    <td className="p-3">
                      <div className="font-medium">{claim.client_fio}</div>
                      {claim.client_company && (
                        <div className="text-sm text-muted-foreground">{claim.client_company}</div>
                      )}
                    </td>
                    <td className="p-3">{claim.car_brand}</td>
                    <td className="p-3 font-mono">{claim.car_number}</td>
                    <td className="p-3">
                      <span className={cn('status-badge', statusColors[claim.status])}>
                        {statusLabels[claim.status]}
                      </span>
                    </td>
                    {/* CSV — только для админа */}
                    {isAdmin && (
                      <td className="p-3 text-center">
                        <button
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="Скачать CSV"
                          onClick={(e) => {
                            e.stopPropagation()
                            exportSingleClaimToCSV(claim)
                          }}
                        >
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Карточки на мобильных */}
          <div className="md:hidden space-y-3">
            {filteredClaims?.map((claim) => (
              <div
                key={claim.id}
                className="claim-card"
                onClick={() => handleClaimClick(claim)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">{claim.number}</p>
                    <p className="font-medium">{claim.client_fio}</p>
                  </div>
                  <span className={cn('status-badge', statusColors[claim.status])}>
                    {statusLabels[claim.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{claim.car_brand}</span>
                  <span className="font-mono">{claim.car_number}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatDate(claim.created_at)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB на мобильных */}
      <button
        className="fab md:hidden"
        onClick={() => setShowNewClaimDialog(true)}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Диалог создания/редактирования заявки */}
      {showNewClaimDialog && (
        <ClaimFormDialog
          claim={editingClaim}
          onClose={handleCloseDialog}
          onSaved={() => {
            handleCloseDialog()
            refetch()
          }}
        />
      )}
    </div>
  )
}
