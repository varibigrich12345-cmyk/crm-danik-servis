import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Форматирование телефона
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`
  }
  if (cleaned.length === 10) {
    return `+7 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`
  }
  return phone
}

// Нормализация госномера (кириллица ↔ латиница)
const cyrToLat: Record<string, string> = {
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H',
  'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'У': 'Y', 'Х': 'X',
}

const latToCyr: Record<string, string> = {
  'A': 'А', 'B': 'В', 'E': 'Е', 'K': 'К', 'M': 'М', 'H': 'Н',
  'O': 'О', 'P': 'Р', 'C': 'С', 'T': 'Т', 'Y': 'У', 'X': 'Х',
}

export function normalizeCarNumber(number: string): string {
  return number
    .toUpperCase()
    .split('')
    .map(char => latToCyr[char] || char)
    .join('')
}

export function carNumberToSearchVariants(number: string): string[] {
  const upper = number.toUpperCase()
  const cyr = upper.split('').map(c => latToCyr[c] || c).join('')
  const lat = upper.split('').map(c => cyrToLat[c] || c).join('')
  return [...new Set([upper, cyr, lat])]
}

// Форматирование даты
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Форматирование цены
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

// Названия статусов
export const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  agreed: 'Согласовано',
  in_progress: 'В работе',
  completed: 'Выполнено',
}

// Цвета статусов
export const statusColors: Record<string, string> = {
  draft: 'status-draft',
  agreed: 'status-agreed',
  in_progress: 'status-in-progress',
  completed: 'status-completed',
}
