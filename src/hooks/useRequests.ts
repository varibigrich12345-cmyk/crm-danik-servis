import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Request, RequestType, RequestStatus } from '@/types/database'

/**
 * Получить все запросы (для админа)
 */
export const useRequests = (status?: RequestStatus, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['requests', status],
    queryFn: async () => {
      let query = supabase
        .from('requests')
        .select('id, claim_id, "type", status, requested_by, admin_comment, resolved_by, resolved_at, created_at')
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        // Не логируем ошибку если таблица не существует
        if (!error.message?.includes('does not exist')) {
          console.error('Ошибка загрузки запросов:', error)
        }
        return []
      }

      return (data || []).map((r: any) => ({
        ...r,
        requested_by_name: 'Мастер',
      })) as Request[]
    },
    enabled,
  })
}

/**
 * Количество pending запросов (для бейджа)
 */
export const usePendingRequestsCount = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['requests', 'pending', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (error) {
        // Не логируем ошибку если таблица не существует
        if (!error.message?.includes('does not exist')) {
          console.error('Ошибка подсчёта запросов:', error)
        }
        return 0
      }

      return count || 0
    },
    enabled,
    refetchInterval: enabled ? 30000 : false, // Обновлять каждые 30 секунд только если включено
  })
}

/**
 * Запросы по конкретной заявке
 */
export const useClaimRequests = (claimId: string | undefined) => {
  return useQuery({
    queryKey: ['requests', 'claim', claimId],
    queryFn: async () => {
      if (!claimId) return []

      const { data, error } = await supabase
        .from('requests')
        .select('id, claim_id, "type", status, requested_by, admin_comment, resolved_by, resolved_at, created_at')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки запросов заявки:', error)
        return []
      }

      return (data || []).map((r: any) => ({
        ...r,
        requested_by_name: 'Мастер',
      })) as Request[]
    },
    enabled: !!claimId,
  })
}

/**
 * Создать запрос
 */
export const useCreateRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      claimId,
      type,
      comment,
      requestedBy,
    }: {
      claimId: string
      type: RequestType
      comment?: string
      requestedBy: string
    }) => {
      const { data, error } = await (supabase
        .from('requests') as any)
        .insert({
          claim_id: claimId,
          type,
          status: 'pending',
          requested_by: requestedBy,
          admin_comment: comment || null,
        })
        .select('id, claim_id, "type", status, requested_by, admin_comment, resolved_by, resolved_at, created_at')
        .single()

      if (error) throw error
      return {
        ...data,
        requested_by_name: 'Мастер',
      } as Request
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['requests', 'claim', variables.claimId] })
      const typeLabel = variables.type === 'delegation' ? 'делегирование' : 'корректировку'
      toast.success(`Запрос на ${typeLabel} отправлен`)
    },
    onError: (error: any) => {
      toast.error('Ошибка: ' + (error.message || 'Не удалось создать запрос'))
    },
  })
}

/**
 * Одобрить/отклонить запрос (для админа)
 */
export const useResolveRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      resolvedBy,
    }: {
      requestId: string
      status: 'approved' | 'rejected'
      resolvedBy: string
    }) => {
      // Получаем запрос для определения типа и claim_id
      const { data: requestData, error: fetchError } = await supabase
        .from('requests')
        .select('id, claim_id, "type", status, requested_by, admin_comment, resolved_by, resolved_at, created_at')
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError
      const request = requestData as Request

      // Обновляем статус запроса
      const { error: updateError } = await (supabase
        .from('requests') as any)
        .update({
          status,
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // Если одобрено — выполняем действие
      if (status === 'approved') {
        if (request.type === 'delegation') {
          // Делегирование: меняем assigned_master_id
          const { error: claimError } = await (supabase
            .from('claims') as any)
            .update({
              assigned_master_id: request.requested_by,
            })
            .eq('id', request.claim_id)

          if (claimError) throw claimError
        } else if (request.type === 'correction') {
          // Корректировка: разрешаем временное редактирование
          const { error: claimError } = await (supabase
            .from('claims') as any)
            .update({
              allow_edit: true,
            })
            .eq('id', request.claim_id)

          if (claimError) throw claimError
        }
      }

      return { request, status }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      const action = result.status === 'approved' ? 'одобрен' : 'отклонён'
      toast.success(`Запрос ${action}`)
    },
    onError: (error: any) => {
      toast.error('Ошибка: ' + (error.message || 'Не удалось обработать запрос'))
    },
  })
}
