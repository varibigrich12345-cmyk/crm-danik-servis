import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useRequests, useResolveRequest } from '@/hooks/useRequests'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  RefreshCw,
  Loader2,
  Check,
  X,
  UserPlus,
  Edit3,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  MessageSquare,
  ClipboardList,
  Pencil,
  ShieldCheck,
} from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import type { Request, RequestStatus, RequestType } from '@/types/database'
import { QualityControlTab } from '@/components/admin/QualityControlTab'

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  none: { label: 'Нет', color: 'bg-gray-100 text-gray-800', icon: null },
  pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Одобрен', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: 'Отклонён', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
}

const TYPE_CONFIG: Record<RequestType, { label: string; icon: React.ReactNode }> = {
  delegation: { label: 'Делегирование', icon: <UserPlus className="h-4 w-4 text-blue-500" /> },
  correction: { label: 'Корректировка', icon: <Edit3 className="h-4 w-4 text-orange-500" /> },
}

type StatusFilter = 'all' | RequestStatus
type TypeFilter = 'all' | RequestType
type TabType = 'requests' | 'quality'

export function RequestsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [adminComment, setAdminComment] = useState('')

  // Вкладка из URL или по умолчанию "requests"
  const activeTab = (searchParams.get('tab') as TabType) || 'requests'
  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab })
  }

  // Получаем все запросы (без фильтра статуса, фильтруем на клиенте)
  const { data: requests = [], isLoading, refetch, isRefetching } = useRequests(undefined, true)
  const resolveRequestMutation = useResolveRequest()

  // Фильтрация запросов
  const filteredRequests = useMemo(() => {
    let result = requests

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter)
    }

    // Фильтр по типу
    if (typeFilter !== 'all') {
      result = result.filter((r) => r.type === typeFilter)
    }

    // Поиск
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.claim?.number?.toLowerCase().includes(searchLower) ||
          r.requested_by_name?.toLowerCase().includes(searchLower) ||
          r.admin_comment?.toLowerCase().includes(searchLower)
      )
    }

    return result
  }, [requests, statusFilter, typeFilter, search])

  // Количество по статусам
  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    }
  }, [requests])

  const handleResolve = (requestId: string, status: 'approved' | 'rejected') => {
    if (profile?.id) {
      resolveRequestMutation.mutate(
        {
          requestId,
          status,
          resolvedBy: profile.id,
        },
        {
          onSuccess: () => {
            setRejectingId(null)
            setAdminComment('')
          },
        }
      )
    }
  }

  const handleViewClaim = (claimId: string) => {
    navigate(`/?claim=${claimId}`)
  }

  const handleEditClaim = (claimId: string) => {
    navigate(`/?claim=${claimId}`)
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Админ-панель</h1>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex border-b mb-6">
        <button
          className={cn(
            'px-4 py-2 font-medium text-sm border-b-2 transition-colors -mb-px',
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('requests')}
        >
          <ClipboardList className="h-4 w-4 inline mr-2" />
          Запросы мастеров
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              {requests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          className={cn(
            'px-4 py-2 font-medium text-sm border-b-2 transition-colors -mb-px',
            activeTab === 'quality'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('quality')}
        >
          <ShieldCheck className="h-4 w-4 inline mr-2" />
          Контроль качества
        </button>
      </div>

      {/* Контент вкладки "Контроль качества" */}
      {activeTab === 'quality' && <QualityControlTab />}

      {/* Контент вкладки "Запросы мастеров" */}
      {activeTab === 'requests' && (
        <>
      {/* Фильтры по статусу */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          Все ({counts.all})
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('pending')}
          className={statusFilter !== 'pending' && counts.pending > 0 ? 'border-yellow-500' : ''}
        >
          <Clock className="h-4 w-4 mr-2" />
          Ожидают ({counts.pending})
        </Button>
        <Button
          variant={statusFilter === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('approved')}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Одобрены ({counts.approved})
        </Button>
        <Button
          variant={statusFilter === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('rejected')}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Отклонены ({counts.rejected})
        </Button>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру заявки, мастеру..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            Все типы
          </Button>
          <Button
            variant={typeFilter === 'delegation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('delegation')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Делегирование
          </Button>
          <Button
            variant={typeFilter === 'correction' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('correction')}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Корректировка
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

      {/* Контент */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search || statusFilter !== 'all' || typeFilter !== 'all'
            ? 'Ничего не найдено'
            : 'Нет запросов'}
        </div>
      ) : (
        <>
          {/* Таблица - Desktop */}
          <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Тип</th>
                    <th className="text-left p-3 font-medium">Заявка</th>
                    <th className="text-left p-3 font-medium">Мастер</th>
                    <th className="text-left p-3 font-medium">Комментарий</th>
                    <th className="text-left p-3 font-medium">Статус</th>
                    <th className="text-left p-3 font-medium">Дата</th>
                    <th className="text-right p-3 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      onResolve={handleResolve}
                      onViewClaim={handleViewClaim}
                      onEditClaim={handleEditClaim}
                      isResolving={resolveRequestMutation.isPending}
                      rejectingId={rejectingId}
                      setRejectingId={setRejectingId}
                      adminComment={adminComment}
                      setAdminComment={setAdminComment}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Карточки - Mobile */}
          <div className="md:hidden space-y-3">
            {filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onResolve={handleResolve}
                onViewClaim={handleViewClaim}
                onEditClaim={handleEditClaim}
                isResolving={resolveRequestMutation.isPending}
                rejectingId={rejectingId}
                setRejectingId={setRejectingId}
                adminComment={adminComment}
                setAdminComment={setAdminComment}
              />
            ))}
          </div>
        </>
      )}
        </>
      )}
    </div>
  )
}

// Компонент строки таблицы
interface RequestRowProps {
  request: Request
  onResolve: (id: string, status: 'approved' | 'rejected') => void
  onViewClaim: (claimId: string) => void
  onEditClaim: (claimId: string) => void
  isResolving: boolean
  rejectingId: string | null
  setRejectingId: (id: string | null) => void
  adminComment: string
  setAdminComment: (comment: string) => void
}

function RequestRow({
  request,
  onResolve,
  onViewClaim,
  onEditClaim,
  isResolving,
  rejectingId,
  setRejectingId,
}: RequestRowProps) {
  const typeConfig = TYPE_CONFIG[request.type]
  const statusConfig = STATUS_CONFIG[request.status]

  return (
    <tr className="border-t hover:bg-muted/30 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-2">
          {typeConfig.icon}
          <span className="text-sm">{typeConfig.label}</span>
        </div>
      </td>
      <td className="p-3">
        <button
          className="text-primary hover:underline font-medium"
          onClick={() => onViewClaim(request.claim_id)}
        >
          {request.claim?.number || 'N/A'}
        </button>
      </td>
      <td className="p-3 text-sm">{request.requested_by_name}</td>
      <td className="p-3">
        {request.admin_comment ? (
          <div className="flex items-start gap-1 text-sm text-muted-foreground max-w-xs">
            <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="truncate">{request.admin_comment}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            statusConfig.color
          )}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {formatDateTime(request.created_at)}
      </td>
      <td className="p-3">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewClaim(request.claim_id)}
            title="Просмотреть заявку"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditClaim(request.claim_id)}
            title="Редактировать заявку"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {request.status === 'pending' && (
            <>
              {rejectingId === request.id ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onResolve(request.id, 'rejected')}
                    disabled={isResolving}
                  >
                    {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Отклонить'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectingId(null)}
                  >
                    Отмена
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectingId(request.id)}
                    disabled={isResolving}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onResolve(request.id, 'approved')}
                    disabled={isResolving}
                  >
                    {isResolving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Одобрить
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// Компонент карточки для мобильных
interface RequestCardProps {
  request: Request
  onResolve: (id: string, status: 'approved' | 'rejected') => void
  onViewClaim: (claimId: string) => void
  onEditClaim: (claimId: string) => void
  isResolving: boolean
  rejectingId: string | null
  setRejectingId: (id: string | null) => void
  adminComment: string
  setAdminComment: (comment: string) => void
}

function RequestCard({
  request,
  onResolve,
  onViewClaim,
  onEditClaim,
  isResolving,
  rejectingId,
  setRejectingId,
}: RequestCardProps) {
  const typeConfig = TYPE_CONFIG[request.type]
  const statusConfig = STATUS_CONFIG[request.status]

  return (
    <div className="bg-card rounded-lg border p-4">
      {/* Шапка */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {typeConfig.icon}
          <span className="font-medium">{typeConfig.label}</span>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            statusConfig.color
          )}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </div>

      {/* Информация */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Заявка:</span>
          <button
            className="text-primary hover:underline font-medium"
            onClick={() => onViewClaim(request.claim_id)}
          >
            {request.claim?.number || 'N/A'}
          </button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Мастер:</span>
          <span>{request.requested_by_name}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Дата:</span>
          <span>{formatDateTime(request.created_at)}</span>
        </div>
        {request.admin_comment && (
          <div className="text-sm">
            <span className="text-muted-foreground">Комментарий: </span>
            <span>{request.admin_comment}</span>
          </div>
        )}
      </div>

      {/* Действия */}
      {request.status === 'pending' && (
        <div className="flex gap-2 pt-3 border-t">
          {rejectingId === request.id ? (
            <>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => onResolve(request.id, 'rejected')}
                disabled={isResolving}
              >
                {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Подтвердить отклонение'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectingId(null)}
              >
                Отмена
              </Button>
            </>
          ) : (
            <>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setRejectingId(request.id)}
                disabled={isResolving}
              >
                <X className="h-4 w-4 mr-2" />
                Отклонить
              </Button>
              <Button
                className="flex-1"
                onClick={() => onResolve(request.id, 'approved')}
                disabled={isResolving}
              >
                {isResolving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Одобрить
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Кнопки для обработанных запросов */}
      {request.status !== 'pending' && (
        <div className="pt-3 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onViewClaim(request.claim_id)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Просмотр
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onEditClaim(request.claim_id)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Редактировать
          </Button>
        </div>
      )}

      {/* Кнопка редактирования для ожидающих запросов */}
      {request.status === 'pending' && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onEditClaim(request.claim_id)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Редактировать заявку
          </Button>
        </div>
      )}
    </div>
  )
}
