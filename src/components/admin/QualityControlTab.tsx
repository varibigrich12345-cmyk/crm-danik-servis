import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useQualityControl,
  useMergeClients,
  type PhoneDuplicate,
  type FioDuplicate,
  type CarNumberDuplicate,
  type ValidationIssue,
  formatPhone,
} from '@/hooks/useQualityControl'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  RefreshCw,
  Users,
  Phone,
  Car,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Merge,
  Check,
  FileText,
} from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'

type Section = 'phone' | 'fio' | 'car' | 'validation'

export function QualityControlTab() {
  const navigate = useNavigate()
  const { data, isLoading, refetch, isRefetching } = useQualityControl()
  const mergeClients = useMergeClients()
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(
    new Set(['phone', 'fio', 'car', 'validation'])
  )
  const [selectedPrimary, setSelectedPrimary] = useState<Map<string, string>>(new Map())

  const toggleSection = (section: Section) => {
    const newSet = new Set(expandedSections)
    if (newSet.has(section)) {
      newSet.delete(section)
    } else {
      newSet.add(section)
    }
    setExpandedSections(newSet)
  }

  const handleSelectPrimary = (groupKey: string, clientId: string) => {
    const newMap = new Map(selectedPrimary)
    newMap.set(groupKey, clientId)
    setSelectedPrimary(newMap)
  }

  const handleMerge = (groupKey: string, allClientIds: string[]) => {
    const primaryId = selectedPrimary.get(groupKey)
    if (!primaryId) {
      return
    }
    const duplicateIds = allClientIds.filter(id => id !== primaryId)
    mergeClients.mutate({
      primaryClientId: primaryId,
      duplicateClientIds: duplicateIds
    })
  }

  const handleViewClaim = (claimId: string) => {
    navigate(`/?claim=${claimId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Не удалось загрузить данные
      </div>
    )
  }

  const {
    phoneDuplicates,
    fioDuplicates,
    carNumberDuplicates,
    validationIssues,
    totalClients,
    totalClaims
  } = data

  const totalIssues =
    phoneDuplicates.length +
    fioDuplicates.length +
    carNumberDuplicates.length +
    validationIssues.length

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Клиентов: <span className="font-medium text-foreground">{totalClients}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Заявок: <span className="font-medium text-foreground">{totalClaims}</span>
          </div>
          {totalIssues > 0 && (
            <div className="text-sm text-orange-600 dark:text-orange-400">
              Проблем: <span className="font-medium">{totalIssues}</span>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
          Обновить
        </Button>
      </div>

      {totalIssues === 0 ? (
        <div className="text-center py-12">
          <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Проблем не найдено</h3>
          <p className="text-muted-foreground">
            Все данные в порядке
          </p>
        </div>
      ) : (
        <>
          {/* Дубли по телефону */}
          {phoneDuplicates.length > 0 && (
            <DuplicateSection
              title="Дубли по телефону"
              icon={<Phone className="h-5 w-5" />}
              count={phoneDuplicates.length}
              isExpanded={expandedSections.has('phone')}
              onToggle={() => toggleSection('phone')}
            >
              {phoneDuplicates.map((dup, idx) => (
                <PhoneDuplicateCard
                  key={`phone-${idx}`}
                  duplicate={dup}
                  groupKey={`phone-${dup.phone}`}
                  selectedPrimary={selectedPrimary.get(`phone-${dup.phone}`)}
                  onSelectPrimary={(clientId) => handleSelectPrimary(`phone-${dup.phone}`, clientId)}
                  onMerge={() => handleMerge(`phone-${dup.phone}`, dup.clients.map(c => c.id))}
                  isMerging={mergeClients.isPending}
                />
              ))}
            </DuplicateSection>
          )}

          {/* Дубли по ФИО */}
          {fioDuplicates.length > 0 && (
            <DuplicateSection
              title="Похожие ФИО"
              icon={<Users className="h-5 w-5" />}
              count={fioDuplicates.length}
              isExpanded={expandedSections.has('fio')}
              onToggle={() => toggleSection('fio')}
            >
              {fioDuplicates.map((dup, idx) => (
                <FioDuplicateCard
                  key={`fio-${idx}`}
                  duplicate={dup}
                  groupKey={`fio-${idx}`}
                  selectedPrimary={selectedPrimary.get(`fio-${idx}`)}
                  onSelectPrimary={(clientId) => handleSelectPrimary(`fio-${idx}`, clientId)}
                  onMerge={() => handleMerge(`fio-${idx}`, dup.clients.map(c => c.id))}
                  isMerging={mergeClients.isPending}
                />
              ))}
            </DuplicateSection>
          )}

          {/* Дубли по госномеру */}
          {carNumberDuplicates.length > 0 && (
            <DuplicateSection
              title="Один госномер - разные клиенты"
              icon={<Car className="h-5 w-5" />}
              count={carNumberDuplicates.length}
              isExpanded={expandedSections.has('car')}
              onToggle={() => toggleSection('car')}
            >
              {carNumberDuplicates.map((dup, idx) => (
                <CarNumberDuplicateCard
                  key={`car-${idx}`}
                  duplicate={dup}
                  onViewClaim={handleViewClaim}
                />
              ))}
            </DuplicateSection>
          )}

          {/* Ошибки валидации */}
          {validationIssues.length > 0 && (
            <DuplicateSection
              title="Ошибки валидации"
              icon={<AlertTriangle className="h-5 w-5" />}
              count={validationIssues.length}
              isExpanded={expandedSections.has('validation')}
              onToggle={() => toggleSection('validation')}
              variant="warning"
            >
              <ValidationIssuesList
                issues={validationIssues}
                onViewClaim={handleViewClaim}
              />
            </DuplicateSection>
          )}
        </>
      )}
    </div>
  )
}

// Компонент секции
interface DuplicateSectionProps {
  title: string
  icon: React.ReactNode
  count: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  variant?: 'default' | 'warning'
}

function DuplicateSection({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  children,
  variant = 'default'
}: DuplicateSectionProps) {
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <button
        className={cn(
          'w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors',
          variant === 'warning' && 'bg-orange-50 dark:bg-orange-950/20'
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            variant === 'warning'
              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400'
              : 'bg-primary/10 text-primary'
          )}>
            {icon}
          </div>
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground">{count} {count === 1 ? 'запись' : 'записей'}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

// Карточка дубля по телефону
interface PhoneDuplicateCardProps {
  duplicate: PhoneDuplicate
  groupKey: string
  selectedPrimary?: string
  onSelectPrimary: (clientId: string) => void
  onMerge: () => void
  isMerging: boolean
}

function PhoneDuplicateCard({
  duplicate,
  selectedPrimary,
  onSelectPrimary,
  onMerge,
  isMerging
}: PhoneDuplicateCardProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm">{formatPhone(duplicate.phone)}</span>
      </div>
      <div className="space-y-2 mb-3">
        {duplicate.clients.map((client) => (
          <label
            key={client.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
              selectedPrimary === client.id
                ? 'bg-primary/10 border border-primary'
                : 'hover:bg-muted'
            )}
          >
            <input
              type="radio"
              name={`primary-${duplicate.phone}`}
              checked={selectedPrimary === client.id}
              onChange={() => onSelectPrimary(client.id)}
              className="h-4 w-4"
            />
            <div className="flex-1">
              <div className="font-medium">{client.fio}</div>
              {client.company && (
                <div className="text-sm text-muted-foreground">{client.company}</div>
              )}
              <div className="text-xs text-muted-foreground">
                Создан: {formatDateTime(client.created_at)}
              </div>
            </div>
          </label>
        ))}
      </div>
      <Button
        size="sm"
        onClick={onMerge}
        disabled={!selectedPrimary || isMerging}
        className="w-full"
      >
        {isMerging ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Merge className="h-4 w-4 mr-2" />
        )}
        Объединить (оставить выбранного)
      </Button>
    </div>
  )
}

// Карточка дубля по ФИО
interface FioDuplicateCardProps {
  duplicate: FioDuplicate
  groupKey: string
  selectedPrimary?: string
  onSelectPrimary: (clientId: string) => void
  onMerge: () => void
  isMerging: boolean
}

function FioDuplicateCard({
  duplicate,
  selectedPrimary,
  onSelectPrimary,
  onMerge,
  isMerging
}: FioDuplicateCardProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Похожие ФИО</span>
      </div>
      <div className="space-y-2 mb-3">
        {duplicate.clients.map((client) => (
          <label
            key={client.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
              selectedPrimary === client.id
                ? 'bg-primary/10 border border-primary'
                : 'hover:bg-muted'
            )}
          >
            <input
              type="radio"
              name={`primary-fio-${duplicate.normalizedFio}`}
              checked={selectedPrimary === client.id}
              onChange={() => onSelectPrimary(client.id)}
              className="h-4 w-4"
            />
            <div className="flex-1">
              <div className="font-medium">{client.fio}</div>
              <div className="text-sm text-muted-foreground">
                {client.phones?.join(', ') || 'Нет телефона'}
              </div>
              {client.company && (
                <div className="text-sm text-muted-foreground">{client.company}</div>
              )}
            </div>
          </label>
        ))}
      </div>
      <Button
        size="sm"
        onClick={onMerge}
        disabled={!selectedPrimary || isMerging}
        className="w-full"
      >
        {isMerging ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Merge className="h-4 w-4 mr-2" />
        )}
        Объединить (оставить выбранного)
      </Button>
    </div>
  )
}

// Карточка дубля по госномеру
interface CarNumberDuplicateCardProps {
  duplicate: CarNumberDuplicate
  onViewClaim: (claimId: string) => void
}

function CarNumberDuplicateCard({ duplicate, onViewClaim }: CarNumberDuplicateCardProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Car className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono">{duplicate.carNumber}</span>
      </div>
      <div className="space-y-2">
        {duplicate.claims.map(({ claim, clientFio }) => (
          <div
            key={claim.id}
            className="flex items-center justify-between p-2 bg-background rounded-lg"
          >
            <div>
              <div className="font-medium">{clientFio}</div>
              <div className="text-sm text-muted-foreground">
                Заявка: {claim.number} • {claim.car_brand}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewClaim(claim.id)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        * Разные клиенты используют один госномер. Проверьте правильность данных.
      </p>
    </div>
  )
}

// Список ошибок валидации
interface ValidationIssuesListProps {
  issues: ValidationIssue[]
  onViewClaim: (claimId: string) => void
}

function ValidationIssuesList({ issues, onViewClaim }: ValidationIssuesListProps) {
  const groupedIssues = {
    phone: issues.filter(i => i.type === 'phone'),
    car_number: issues.filter(i => i.type === 'car_number'),
    vin: issues.filter(i => i.type === 'vin'),
  }

  return (
    <div className="space-y-4">
      {groupedIssues.phone.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Неверный формат телефона ({groupedIssues.phone.length})
          </h4>
          <div className="space-y-1">
            {groupedIssues.phone.slice(0, 10).map((issue, idx) => (
              <ValidationIssueRow
                key={`phone-${idx}`}
                issue={issue}
                onViewClaim={onViewClaim}
              />
            ))}
            {groupedIssues.phone.length > 10 && (
              <p className="text-xs text-muted-foreground pl-4">
                ... и ещё {groupedIssues.phone.length - 10}
              </p>
            )}
          </div>
        </div>
      )}

      {groupedIssues.car_number.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Car className="h-4 w-4" />
            Неверный формат госномера ({groupedIssues.car_number.length})
          </h4>
          <div className="space-y-1">
            {groupedIssues.car_number.slice(0, 10).map((issue, idx) => (
              <ValidationIssueRow
                key={`car-${idx}`}
                issue={issue}
                onViewClaim={onViewClaim}
              />
            ))}
            {groupedIssues.car_number.length > 10 && (
              <p className="text-xs text-muted-foreground pl-4">
                ... и ещё {groupedIssues.car_number.length - 10}
              </p>
            )}
          </div>
        </div>
      )}

      {groupedIssues.vin.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Неверный формат VIN ({groupedIssues.vin.length})
          </h4>
          <div className="space-y-1">
            {groupedIssues.vin.slice(0, 10).map((issue, idx) => (
              <ValidationIssueRow
                key={`vin-${idx}`}
                issue={issue}
                onViewClaim={onViewClaim}
              />
            ))}
            {groupedIssues.vin.length > 10 && (
              <p className="text-xs text-muted-foreground pl-4">
                ... и ещё {groupedIssues.vin.length - 10}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ValidationIssueRowProps {
  issue: ValidationIssue
  onViewClaim: (claimId: string) => void
}

function ValidationIssueRow({ issue, onViewClaim }: ValidationIssueRowProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-background rounded-lg text-sm">
      <div>
        <span className="font-mono text-orange-600 dark:text-orange-400">{issue.value}</span>
        {issue.claim && (
          <span className="text-muted-foreground ml-2">
            • {issue.claim.client_fio} • {issue.claim.number}
          </span>
        )}
        {issue.client && (
          <span className="text-muted-foreground ml-2">
            • {issue.client.fio}
          </span>
        )}
      </div>
      {issue.claim && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewClaim(issue.claim!.id)}
        >
          <FileText className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
