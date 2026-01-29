import type { Claim } from '@/types/database'

const statusLabelsRu: Record<string, string> = {
  draft: 'Черновик',
  agreed: 'Согласовано',
  in_progress: 'В работе',
  completed: 'Выполнено',
}

/**
 * Экспорт заявок в CSV
 */
export function exportClaimsToCSV(claims: Claim[], filename?: string) {
  const headers = [
    '№ Заявки',
    'Дата создания',
    'Клиент',
    'Компания',
    'Телефон',
    'Марка авто',
    'Госномер',
    'VIN',
    'Пробег',
    'Статус',
    'Сумма работ',
    'Сумма запчастей',
    'Итого',
  ]

  const rows = claims.map(claim => {
    const worksTotal = claim.works?.reduce((sum, w) => sum + (w.price * w.quantity), 0) || 0
    const partsTotal = claim.parts?.reduce((sum, p) => sum + (p.price * p.quantity), 0) || 0
    const total = worksTotal + partsTotal

    return [
      claim.number,
      formatDateForCSV(claim.created_at),
      claim.client_fio,
      claim.client_company || '',
      claim.phone || '',
      claim.car_brand,
      claim.car_number,
      claim.vin || '',
      claim.mileage?.toString() || '',
      statusLabelsRu[claim.status] || claim.status,
      worksTotal.toFixed(2),
      partsTotal.toFixed(2),
      total.toFixed(2),
    ]
  })

  // BOM для корректной кириллицы в Excel
  const BOM = '\uFEFF'
  const csvContent = BOM + [
    headers.join(';'),
    ...rows.map(row => row.map(escapeCSV).join(';'))
  ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `claims_${formatDateForFilename(new Date())}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCSV(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDateForCSV(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}
