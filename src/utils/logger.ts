// Логгер для отладки - легко включить/выключить

const isDev = import.meta.env.DEV

export const logger = {
  info: (message: string, data?: any) => {
    if (isDev) console.log(`[INFO] ${message}`, data || '')
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '')
  },
  
  warn: (message: string, data?: any) => {
    if (isDev) console.warn(`[WARN] ${message}`, data || '')
  },
  
  auth: (message: string, data?: any) => {
    if (isDev) console.log(`[AUTH] ${message}`, data || '')
  }
}

