import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PartDictionary {
  id: string
  name: string
  article: string | null
  default_price: number | null
}

/**
 * Поиск запчастей по названию или артикулу
 */
export const useSearchParts = (search: string) => {
  return useQuery({
    queryKey: ['parts', search],
    queryFn: async () => {
      if (!search || search.length < 2) {
        return []
      }

      const searchLower = search.toLowerCase().trim()

      const { data, error } = await supabase
        .from('part_dictionary')
        .select('id, name, article, default_price')
        .or(`name.ilike.%${searchLower}%,article.ilike.%${searchLower}%`)
        .order('name', { ascending: true })
        .limit(20)

      if (error) {
        console.error('Ошибка поиска запчастей:', error)
        return []
      }

      return (data || []) as PartDictionary[]
    },
    enabled: search.length >= 2,
    staleTime: 1000 * 60,
  })
}
