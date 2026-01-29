import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Request, RequestType, RequestStatus } from '@/types/database'

/**
 * Получить все запросы (для админа)
 */
export const useRequests = (status?: RequestStatus) => {
  return useQuery({
    queryKey: ['requests', status],
    queryFn: async () => {
      let query = supabase
        .from('requests')
        .select(`
          *,
          claim:claims(id, number, client_fio, car_number),
          requester:profiles!requested_by(full_name)
        `)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Ошибка загрузки запросов:', error)
        return []
      }

      return (data || []).map((r: any) => ({
        ...r,
        requested_by_name: r.requester?.full_name || 'Неизвестно',
      })) as Request[]
    },
  })
}

/**
 * Количество pending запросов (для бейджа)
 */
export const usePendingRequestsCount = () => {
  return useQuery({
    queryKey: ['requests', 'pending', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (error) {
        console.error('Ошибка подсчёта запросов:', error)
        return 0
      }

      return count || 0
    },
    refetchInterval: 30000, // Обновлять каждые 30 секунд
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
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки запросов заявки:', error)
        return []
      }

      return (data || []) as Request[]
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
          comment: comment || null,
        })
        .select()
        .single()

      if (error) throw error
      return data as Request
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
        .select('*')
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
