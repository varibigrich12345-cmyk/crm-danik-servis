import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Client, Claim } from '@/types/database'

// Интерфейсы для дублей
export interface PhoneDuplicate {
  phone: string
  clients: Client[]
}

export interface FioDuplicate {
  normalizedFio: string
  clients: Client[]
}

export interface CarNumberDuplicate {
  carNumber: string
  claims: Array<{
    claim: Claim
    clientFio: string
  }>
}

export interface ValidationIssue {
  type: 'phone' | 'car_number' | 'vin'
  entityType: 'client' | 'claim'
  entityId: string
  value: string
  message: string
  claim?: Claim
  client?: Client
}

// Нормализация телефона - оставляем только цифры
const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '')
}

// Нормализация ФИО - убираем лишние пробелы, приводим к нижнему регистру
const normalizeFio = (fio: string): string => {
  return fio.toLowerCase().trim().replace(/\s+/g, ' ')
}

// Расстояние Левенштейна для поиска похожих строк
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // замена
          matrix[i][j - 1] + 1,     // вставка
          matrix[i - 1][j] + 1      // удаление
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// Валидация телефона (формат +7XXXXXXXXXX)
export const validatePhone = (phone: string): boolean => {
  const normalized = normalizePhone(phone)
  // 11 цифр, начинается с 7 или 8
  return /^[78]\d{10}$/.test(normalized)
}

// Валидация госномера (русские буквы + цифры)
export const validateCarNumber = (carNumber: string): boolean => {
  // Российский формат: А123АА77 или А123АА777
  const normalized = carNumber.toUpperCase().replace(/\s/g, '')
  return /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/.test(normalized)
}

// Валидация VIN (17 символов, латиница + цифры, без I, O, Q)
export const validateVin = (vin: string): boolean => {
  if (!vin) return true // VIN необязателен
  const normalized = vin.toUpperCase().replace(/\s/g, '')
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)
}

// Форматирование телефона
export const formatPhone = (phone: string): string => {
  const digits = normalizePhone(phone)
  if (digits.length === 11) {
    // Преобразуем 8 в +7
    const normalized = digits.startsWith('8') ? '7' + digits.slice(1) : digits
    return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9)}`
  }
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`
  }
  return phone
}

/**
 * Хук для контроля качества данных
 */
export const useQualityControl = () => {
  return useQuery({
    queryKey: ['quality-control'],
    queryFn: async () => {
      // Получаем всех клиентов
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientsError) throw clientsError

      // Получаем все заявки
      const { data: claims, error: claimsError } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false })

      if (claimsError) throw claimsError

      const allClients = (clients || []) as Client[]
      const allClaims = (claims || []) as Claim[]

      // 1. Поиск дублей по телефону
      const phoneMap = new Map<string, Client[]>()
      for (const client of allClients) {
        for (const phone of client.phones || []) {
          const normalized = normalizePhone(phone)
          if (normalized.length >= 10) {
            const existing = phoneMap.get(normalized) || []
            existing.push(client)
            phoneMap.set(normalized, existing)
          }
        }
      }
      const phoneDuplicates: PhoneDuplicate[] = []
      phoneMap.forEach((clients, phone) => {
        if (clients.length > 1) {
          // Убираем дубли одного и того же клиента
          const uniqueClients = clients.filter((c, i, arr) =>
            arr.findIndex(x => x.id === c.id) === i
          )
          if (uniqueClients.length > 1) {
            phoneDuplicates.push({ phone, clients: uniqueClients })
          }
        }
      })

      // 2. Поиск похожих ФИО (разница <= 3 символа)
      const fioDuplicates: FioDuplicate[] = []
      const processedFioPairs = new Set<string>()

      for (let i = 0; i < allClients.length; i++) {
        for (let j = i + 1; j < allClients.length; j++) {
          const fio1 = normalizeFio(allClients[i].fio)
          const fio2 = normalizeFio(allClients[j].fio)

          // Пропускаем если ФИО совпадают полностью (это может быть нормально)
          if (fio1 === fio2) continue

          // Проверяем расстояние Левенштейна (до 3 символов разницы)
          const distance = levenshteinDistance(fio1, fio2)
          if (distance > 0 && distance <= 3) {
            const pairKey = [allClients[i].id, allClients[j].id].sort().join('-')
            if (!processedFioPairs.has(pairKey)) {
              processedFioPairs.add(pairKey)

              // Проверяем есть ли уже группа с одним из этих ФИО
              let found = false
              for (const dup of fioDuplicates) {
                if (dup.clients.some(c => c.id === allClients[i].id || c.id === allClients[j].id)) {
                  if (!dup.clients.find(c => c.id === allClients[i].id)) {
                    dup.clients.push(allClients[i])
                  }
                  if (!dup.clients.find(c => c.id === allClients[j].id)) {
                    dup.clients.push(allClients[j])
                  }
                  found = true
                  break
                }
              }

              if (!found) {
                fioDuplicates.push({
                  normalizedFio: fio1,
                  clients: [allClients[i], allClients[j]]
                })
              }
            }
          }
        }
      }

      // 3. Заявки с одинаковым госномером но разными клиентами
      const carNumberMap = new Map<string, Array<{ claim: Claim; clientFio: string }>>()
      for (const claim of allClaims) {
        const normalized = claim.car_number.toUpperCase().replace(/\s/g, '')
        if (normalized) {
          const existing = carNumberMap.get(normalized) || []
          existing.push({ claim, clientFio: claim.client_fio })
          carNumberMap.set(normalized, existing)
        }
      }
      const carNumberDuplicates: CarNumberDuplicate[] = []
      carNumberMap.forEach((claims, carNumber) => {
        // Проверяем есть ли разные клиенты
        const uniqueClients = new Set(claims.map(c => c.clientFio.toLowerCase().trim()))
        if (uniqueClients.size > 1) {
          carNumberDuplicates.push({ carNumber, claims })
        }
      })

      // 4. Валидация данных
      const validationIssues: ValidationIssue[] = []

      // Валидация клиентов
      for (const client of allClients) {
        for (const phone of client.phones || []) {
          if (!validatePhone(phone)) {
            validationIssues.push({
              type: 'phone',
              entityType: 'client',
              entityId: client.id,
              value: phone,
              message: `Неверный формат телефона: ${phone}`,
              client
            })
          }
        }
      }

      // Валидация заявок
      for (const claim of allClaims) {
        // Проверка телефона
        if (claim.phone && !validatePhone(claim.phone)) {
          validationIssues.push({
            type: 'phone',
            entityType: 'claim',
            entityId: claim.id,
            value: claim.phone,
            message: `Неверный формат телефона: ${claim.phone}`,
            claim
          })
        }

        // Проверка госномера
        if (claim.car_number && !validateCarNumber(claim.car_number)) {
          validationIssues.push({
            type: 'car_number',
            entityType: 'claim',
            entityId: claim.id,
            value: claim.car_number,
            message: `Неверный формат госномера: ${claim.car_number}`,
            claim
          })
        }

        // Проверка VIN
        if (claim.vin && !validateVin(claim.vin)) {
          validationIssues.push({
            type: 'vin',
            entityType: 'claim',
            entityId: claim.id,
            value: claim.vin,
            message: `Неверный формат VIN: ${claim.vin}`,
            claim
          })
        }
      }

      return {
        phoneDuplicates,
        fioDuplicates,
        carNumberDuplicates,
        validationIssues,
        totalClients: allClients.length,
        totalClaims: allClaims.length
      }
    },
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

/**
 * Объединение клиентов: переносит заявки на основного клиента и удаляет дубли
 */
export const useMergeClients = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      primaryClientId,
      duplicateClientIds
    }: {
      primaryClientId: string
      duplicateClientIds: string[]
    }) => {
      // Получаем основного клиента
      const { data: primaryClient, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', primaryClientId)
        .single()

      if (clientError) throw clientError

      const primaryClientData = primaryClient as Client

      // Получаем всех дублей
      const { data: duplicates, error: dupError } = await supabase
        .from('clients')
        .select('*')
        .in('id', duplicateClientIds)

      if (dupError) throw dupError

      const duplicatesData = (duplicates || []) as Client[]

      // Объединяем телефоны (уникальные)
      const allPhones = new Set<string>()
      for (const phone of primaryClientData.phones || []) {
        allPhones.add(normalizePhone(phone))
      }
      for (const dup of duplicatesData) {
        for (const phone of dup.phones || []) {
          allPhones.add(normalizePhone(phone))
        }
      }

      // Обновляем основного клиента с объединёнными данными
      const { error: updateError } = await (supabase
        .from('clients') as any)
        .update({
          phones: Array.from(allPhones).map(p => formatPhone(p))
        })
        .eq('id', primaryClientId)

      if (updateError) throw updateError

      // Переносим заявки на основного клиента
      const { error: claimsError } = await (supabase
        .from('claims') as any)
        .update({
          client_id: primaryClientId,
          client_fio: primaryClientData.fio,
          client_company: primaryClientData.company
        })
        .in('client_id', duplicateClientIds)

      if (claimsError) throw claimsError

      // Удаляем дубликаты
      const { error: deleteError } = await (supabase
        .from('clients') as any)
        .delete()
        .in('id', duplicateClientIds)

      if (deleteError) throw deleteError

      return {
        mergedCount: duplicateClientIds.length,
        primaryClient: primaryClientData
      }
    },
    onSuccess: (data) => {
      toast.success(`Объединено ${data.mergedCount} клиентов`)
      queryClient.invalidateQueries({ queryKey: ['quality-control'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients-all'] })
      queryClient.invalidateQueries({ queryKey: ['claims'] })
    },
    onError: (error: Error) => {
      toast.error('Ошибка объединения: ' + error.message)
    }
  })
}
