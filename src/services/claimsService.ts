import { supabase } from '@/lib/supabase'
import type { Claim } from '@/types/database'

// Сервис для работы с заявками
// Вся логика работы с БД здесь, компоненты только вызывают эти функции

export const claimsService = {
  // Получить все заявки
  async getAll() {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Получить заявку по ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  // Создать заявку
  async create(claim: Partial<Claim>) {
    const { data, error } = await supabase
      .from('claims')
      .insert(claim)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Обновить заявку
  async update(id: string, updates: Partial<Claim>) {
    const { data, error } = await supabase
      .from('claims')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

