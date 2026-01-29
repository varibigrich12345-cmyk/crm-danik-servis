import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PartDictionary {
  id: string
  name: string
  article: string | null
  default_price: number | null
}

export interface PartsSearchResult {
  exact: PartDictionary[]
  similar: PartDictionary[]
}

/**
 * Поиск запчастей по названию или артикулу
 * Возвращает точные совпадения и похожие записи
 */
export const useSearchParts = (search: string) => {
  return useQuery({
    queryKey: ['parts', search],
    queryFn: async (): Promise<PartsSearchResult> => {
      if (!search || search.length < 2) {
        return { exact: [], similar: [] }
      }

      const searchLower = search.toLowerCase().trim()

      // Точный поиск по полной строке
      const { data: exactData, error: exactError } = await supabase
        .from('part_dictionary')
        .select('id, name, article, default_price')
        .or(`name.ilike.%${searchLower}%,article.ilike.%${searchLower}%`)
        .order('name', { ascending: true })
        .limit(10)

      if (exactError) {
        console.error('Ошибка поиска запчастей:', exactError)
        return { exact: [], similar: [] }
      }

      const exact = (exactData || []) as PartDictionary[]
      const exactIds = exact.map(p => p.id)

      // Если мало точных результатов, ищем похожие по частям слова
      let similar: PartDictionary[] = []

      if (exact.length < 5) {
        const words = searchLower.split(/\s+/).filter(w => w.length >= 2)

        if (words.length > 0) {
          // Строим OR условие для каждого слова
          const conditions = words.map(word => `name.ilike.%${word}%`).join(',')

          const { data: similarData, error: similarError } = await supabase
            .from('part_dictionary')
            .select('id, name, article, default_price')
            .or(conditions)
            .order('name', { ascending: true })
            .limit(15)

          if (!similarError && similarData) {
            // Исключаем уже найденные точные совпадения
            similar = (similarData as PartDictionary[]).filter(
              p => !exactIds.includes(p.id)
            ).slice(0, 10)
          }
        }
      }

      return { exact, similar }
    },
    enabled: search.length >= 2,
    staleTime: 1000 * 60,
  })
}
