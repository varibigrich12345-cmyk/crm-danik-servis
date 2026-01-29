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

/**
 * Экспорт одной заявки с работами и запчастями в CSV для 1С
 */
export function exportSingleClaimToCSV(claim: Claim) {
  const lines: string[] = []

  // Секция ЗАЯВКА
  lines.push('ЗАЯВКА')
  lines.push(['Номер', claim.number].map(escapeCSV).join(';'))
  lines.push(['Дата', formatDateForCSV(claim.created_at)].map(escapeCSV).join(';'))
  lines.push(['Клиент', claim.client_fio].map(escapeCSV).join(';'))
  lines.push(['Телефон', claim.phone || ''].map(escapeCSV).join(';'))
  lines.push(['Авто', claim.car_brand].map(escapeCSV).join(';'))
  lines.push(['Госномер', claim.car_number].map(escapeCSV).join(';'))
  lines.push(['VIN', claim.vin || ''].map(escapeCSV).join(';'))
  lines.push(['Пробег', claim.mileage?.toString() || ''].map(escapeCSV).join(';'))
  lines.push('')

  // Секция РАБОТЫ
  lines.push('РАБОТЫ')
  lines.push(['Название', 'Сторона', 'Позиция', 'Кол-во', 'Цена', 'Сумма'].map(escapeCSV).join(';'))
  const worksTotal = claim.works?.reduce((sum, w) => {
    const rowSum = w.price * w.quantity
    lines.push([
      w.name,
      w.side || '',
      w.position || '',
      w.quantity.toString(),
      w.price.toFixed(2),
      rowSum.toFixed(2),
    ].map(escapeCSV).join(';'))
    return sum + rowSum
  }, 0) || 0
  lines.push('')

  // Секция ЗАПЧАСТИ
  lines.push('ЗАПЧАСТИ')
  lines.push(['Артикул', 'Название', 'Сторона', 'Позиция', 'Кол-во', 'Цена', 'Сумма'].map(escapeCSV).join(';'))
  const partsTotal = claim.parts?.reduce((sum, p) => {
    const rowSum = p.price * p.quantity
    lines.push([
      p.article || '',
      p.name,
      p.side || '',
      p.position || '',
      p.quantity.toString(),
      p.price.toFixed(2),
      rowSum.toFixed(2),
    ].map(escapeCSV).join(';'))
    return sum + rowSum
  }, 0) || 0
  lines.push('')

  // Секция ИТОГО
  lines.push('ИТОГО')
  lines.push(['Сумма работ', worksTotal.toFixed(2)].map(escapeCSV).join(';'))
  lines.push(['Сумма запчастей', partsTotal.toFixed(2)].map(escapeCSV).join(';'))
  lines.push(['Общая сумма', (worksTotal + partsTotal).toFixed(2)].map(escapeCSV).join(';'))

  // BOM для корректной кириллицы в Excel/1С
  const BOM = '\uFEFF'
  const csvContent = BOM + lines.join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `claim_${claim.number.replace(/[^a-zA-Z0-9-]/g, '_')}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
