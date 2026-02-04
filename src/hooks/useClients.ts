import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface Client {
  id: string
  fio: string
  phones: string[]
  company: string | null
  inn: string | null
  telegram_chat_id: string | null
  created_at: string
  updated_at: string
}

// Нормализация телефона - оставляем только цифры
const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '')
}

/**
 * Поиск клиентов по ФИО или телефону
 */
export const useSearchClients = (search: string) => {
  return useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      if (!search || search.length < 3) {
        return []
      }

      const searchLower = search.toLowerCase().trim()
      const searchDigits = normalizePhone(search)

      console.log('Поиск клиентов:', { search, searchLower, searchDigits })

      // Получаем всех клиентов для поиска по ФИО и телефону
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('fio', { ascending: true })
        .limit(200)

      if (error) {
        console.error('Ошибка поиска клиентов:', error.message, error.code, error.details)
        if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy')) {
          console.error('RLS ошибка: у пользователя нет доступа к таблице clients. Проверьте RLS политики.')
        }
        return []
      }

      const allClients = (data || []) as Client[]
      console.log('Всего клиентов в базе:', allClients.length)

      // Фильтруем по ФИО ИЛИ по телефону
      const results = allClients.filter(client => {
        // Поиск по ФИО
        const fioMatch = client.fio?.toLowerCase().includes(searchLower)

        // Поиск по телефону (нормализованному)
        const phoneMatch = searchDigits.length >= 3 && client.phones?.some(phone => {
          const normalizedPhone = normalizePhone(phone)
          return normalizedPhone.includes(searchDigits)
        })

        // Поиск по компании
        const companyMatch = client.company?.toLowerCase().includes(searchLower)

        return fioMatch || phoneMatch || companyMatch
      })

      console.log('Найдено клиентов:', results.length)
      return results.slice(0, 20)
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
      fio: string
      phones: string[]
      company: string | null
    }) => {
      const { data, error } = await (supabase
        .from('clients') as any)
        .insert({
          fio: client.fio,
          phones: client.phones,
          company: client.company || null,
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
