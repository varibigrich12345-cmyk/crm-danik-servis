import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface Client {
  id: string
  name: string
  phone: string | null
  company: string | null
  email: string | null
  created_at: string
  updated_at: string
}

/**
 * Поиск клиентов по имени или телефону
 */
export const useSearchClients = (search: string) => {
  return useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      if (!search || search.length < 3) {
        return []
      }

      const searchLower = search.toLowerCase().trim()

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%${searchLower}%,phone.ilike.%${searchLower}%`)
        .order('name', { ascending: true })
        .limit(20)

      if (error) {
        console.error('Ошибка поиска клиентов:', error)
        return []
      }

      return (data || []) as Client[]
    },
    enabled: search.length >= 3,
    staleTime: 1000 * 60,
  })
}

/**
 * Создание нового клиента в справочнике
 */
export const useCreateClient = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (client: {
      name: string
      phone: string | null
      company: string | null
      email?: string | null
    }) => {
      const { data, error } = await (supabase
        .from('clients') as any)
        .insert({
          name: client.name,
          phone: client.phone || null,
          company: client.company || null,
          email: client.email || null,
        })
        .select()
        .single()

      if (error) {
        console.error('Ошибка создания клиента:', error)
        throw error
      }

      return data as Client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Клиент добавлен в справочник')
    },
    onError: (error: any) => {
      toast.error('Ошибка: ' + (error.message || 'Неизвестная ошибка'))
    },
  })
}
