import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Claim, Complaint, Work, Part } from '@/types/database'

// Инициализация шрифта для кириллицы
const initCyrillicFont = (doc: jsPDF) => {
  // ВАЖНО: Для полной поддержки кириллицы нужно:
  // 1. Добавить Roboto или DejaVu Sans шрифт в base64
  // 2. Использовать addRobotoFont из './fonts/roboto'
  //
  // Временное решение: используем Helvetica (ограниченная поддержка кириллицы)
  // Для продакшена обязательно добавьте кастомный шрифт!
  
  // Если шрифт Roboto добавлен, раскомментируйте:
  // import { addRobotoFont } from './fonts/roboto'
  // return addRobotoFont(doc)
  
  doc.setFont('helvetica')
  return doc
}

// Реквизиты компании
const COMPANY_INFO = {
  name: 'ООО «СЕРВИСТРАНСАВТО»',
  inn: '7723905004',
  address: 'Московская обл., г. Люберцы, ул. Южная, д. 30 стр. 1',
  phone: '8(929)774-88-66',
  email: 'danik.servis@mail.ru',
  bank: 'ООО «Банк Точка»',
  bik: '044525104',
  account: '40702810020000175765',
  director: 'Абдурашидов Д.А.',
}

// Форматирование даты
const formatDate = (dateString: string | null): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Форматирование суммы
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
  }).format(price)
}

// Генерация PDF для заявки (статус НЕ "Выполнено")
export const generateClaimPDF = (claim: Claim, preview: boolean = true): void => {
  const doc = new jsPDF('p', 'mm', 'a4')
  initCyrillicFont(doc)
  let yPos = 20

  // Заголовок
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`ЗАЯВКА №${claim.number}`, 105, yPos, { align: 'center' })
  yPos += 10

  // Дата создания
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Дата создания: ${formatDate(claim.created_at)}`, 20, yPos)
  yPos += 8

  // Реквизиты компании
  doc.setFontSize(9)
  doc.text(COMPANY_INFO.name, 20, yPos)
  yPos += 5
  doc.text(`ИНН: ${COMPANY_INFO.inn}`, 20, yPos)
  yPos += 5
  doc.text(`Адрес: ${COMPANY_INFO.address}`, 20, yPos)
  yPos += 5
  doc.text(`Телефон: ${COMPANY_INFO.phone}`, 20, yPos)
  yPos += 10

  // Данные клиента
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Данные клиента:', 20, yPos)
  yPos += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`ФИО: ${claim.client_fio}`, 20, yPos)
  yPos += 5
  if (claim.client_company) {
    doc.text(`Компания: ${claim.client_company}`, 20, yPos)
    yPos += 5
  }
  doc.text(`Телефон: ${claim.phone}`, 20, yPos)
  yPos += 8

  // Данные автомобиля
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Данные автомобиля:', 20, yPos)
  yPos += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Марка: ${claim.car_brand}`, 20, yPos)
  yPos += 5
  doc.text(`Госномер: ${claim.car_number}`, 20, yPos)
  yPos += 5
  if (claim.vin) {
    doc.text(`VIN: ${claim.vin}`, 20, yPos)
    yPos += 5
  }
  doc.text(`Пробег: ${claim.mileage.toLocaleString('ru-RU')} км`, 20, yPos)
  yPos += 10

  // Таблица "Заявленные работы" (Жалобы)
  if (claim.complaints && claim.complaints.length > 0) {
    const complaintsData = claim.complaints.map((complaint: Complaint, index: number) => [
      (index + 1).toString(),
      complaint.name || '',
      complaint.side || '',
      complaint.position || '',
      complaint.quantity.toString(),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['№', 'Описание жалобы', 'Сторона', 'Позиция', 'Кол-во']],
      body: complaintsData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    })
    yPos = ((doc as any).lastAutoTable?.finalY || yPos) + 10
  }

  // Таблица "Согласованные работы"
  if (claim.works && claim.works.length > 0) {
    const worksData = claim.works.map((work: Work, index: number) => [
      (index + 1).toString(),
      work.name || '',
      work.side || '',
      work.position || '',
      work.quantity.toString(),
      formatPrice(work.price || 0),
      formatPrice((work.quantity || 1) * (work.price || 0)),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['№', 'Наименование работы', 'Сторона', 'Позиция', 'Кол-во', 'Цена', 'Сумма']],
      body: worksData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    })
    yPos = ((doc as any).lastAutoTable?.finalY || yPos) + 10
  }

  // Таблица "Запчасти"
  if (claim.parts && claim.parts.length > 0) {
    const partsData = claim.parts.map((part: Part, index: number) => [
      (index + 1).toString(),
      part.article || '',
      part.name || '',
      part.side || '',
      part.position || '',
      part.quantity.toString(),
      formatPrice(part.price || 0),
      formatPrice((part.quantity || 1) * (part.price || 0)),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['№', 'Артикул', 'Наименование', 'Сторона', 'Позиция', 'Кол-во', 'Цена', 'Сумма']],
      body: partsData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    })
    yPos = ((doc as any).lastAutoTable?.finalY || yPos) + 10
  }

  // Подпись клиента
  yPos = Math.max(yPos, 250)
  doc.setFontSize(10)
  doc.text('Подпись клиента: _________________', 20, yPos)
  yPos += 5
  doc.text(`Дата: ${formatDate(new Date().toISOString())}`, 20, yPos)

  // Предпросмотр или скачивание
  if (preview) {
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')
    // Освобождаем память после загрузки
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100)
  } else {
    doc.save(`Заявка_${claim.number}.pdf`)
  }
}

// Генерация PDF для заказа-наряда (статус "Выполнено")
export const generateOrderPDF = (claim: Claim, preview: boolean = true): void => {
  const doc = new jsPDF('p', 'mm', 'a4')
  initCyrillicFont(doc)
  let yPos = 20

  // Заголовок
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`ЗАКАЗ-НАРЯД №${claim.number}`, 105, yPos, { align: 'center' })
  yPos += 10

  // Дата создания и выполнения
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Дата создания: ${formatDate(claim.created_at)}`, 20, yPos)
  yPos += 5
  if (claim.completed_at) {
    doc.text(`Дата выполнения: ${formatDate(claim.completed_at)}`, 20, yPos)
    yPos += 8
  } else {
    yPos += 3
  }

  // Реквизиты компании
  doc.setFontSize(9)
  doc.text(COMPANY_INFO.name, 20, yPos)
  yPos += 5
  doc.text(`ИНН: ${COMPANY_INFO.inn}`, 20, yPos)
  yPos += 5
  doc.text(`Адрес: ${COMPANY_INFO.address}`, 20, yPos)
  yPos += 5
  doc.text(`Телефон: ${COMPANY_INFO.phone}`, 20, yPos)
  yPos += 10

  // Данные клиента
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Данные клиента:', 20, yPos)
  yPos += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`ФИО: ${claim.client_fio}`, 20, yPos)
  yPos += 5
  if (claim.client_company) {
    doc.text(`Компания: ${claim.client_company}`, 20, yPos)
    yPos += 5
  }
  doc.text(`Телефон: ${claim.phone}`, 20, yPos)
  yPos += 8

  // Данные автомобиля
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Данные автомобиля:', 20, yPos)
  yPos += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Марка: ${claim.car_brand}`, 20, yPos)
  yPos += 5
  doc.text(`Госномер: ${claim.car_number}`, 20, yPos)
  yPos += 5
  if (claim.vin) {
    doc.text(`VIN: ${claim.vin}`, 20, yPos)
    yPos += 5
  }
  doc.text(`Пробег: ${claim.mileage.toLocaleString('ru-RU')} км`, 20, yPos)
  yPos += 10

  // Таблица "Заявленные работы" (Жалобы)
  if (claim.complaints && claim.complaints.length > 0) {
    const complaintsData = claim.complaints.map((complaint: Complaint, index: number) => [
      (index + 1).toString(),
      complaint.name || '',
      complaint.side || '',
      complaint.position || '',
      complaint.quantity.toString(),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['№', 'Описание жалобы', 'Сторона', 'Позиция', 'Кол-во']],
      body: complaintsData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    })
    yPos = ((doc as any).lastAutoTable?.finalY || yPos) + 10
  }

  // Таблица "Согласованные работы"
  let worksTotal = 0
  if (claim.works && claim.works.length > 0) {
    const worksData = claim.works.map((work: Work, index: number) => {
      const total = (work.quantity || 1) * (work.price || 0)
      worksTotal += total
      return [
        (index + 1).toString(),
        work.name || '',
        work.side || '',
        work.position || '',
        work.quantity.toString(),
        formatPrice(work.price || 0),
        formatPrice(total),
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['№', 'Наименование работы', 'Сторона', 'Позиция', 'Кол-во', 'Цена', 'Сумма']],
      body: worksData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    })
    yPos = ((doc as any).lastAutoTable?.finalY || yPos) + 10
  }

  // Таблица "Запчасти"
  let partsTotal = 0
  if (claim.parts && claim.parts.length > 0) {
    const partsData = claim.parts.map((part: Part, index: number) => {
      const total = (part.quantity || 1) * (part.price || 0)
      partsTotal += total
      return [
        (index + 1).toString(),
        part.article || '',
        part.name || '',
        part.side || '',
        part.position || '',
        part.quantity.toString(),
        formatPrice(part.price || 0),
        formatPrice(total),
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['№', 'Артикул', 'Наименование', 'Сторона', 'Позиция', 'Кол-во', 'Цена', 'Сумма']],
      body: partsData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    })
    yPos = ((doc as any).lastAutoTable?.finalY || yPos) + 10
  }

  // Итоговая сумма
  const totalSum = worksTotal + partsTotal
  yPos = Math.max(yPos, 230)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`ИТОГО: ${formatPrice(totalSum)}`, 150, yPos, { align: 'right' })
  yPos += 15

  // Подписи
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Исполнитель: _________________', 20, yPos)
  doc.text('Заказчик: _________________', 120, yPos)
  yPos += 5
  doc.text(`Дата: ${formatDate(new Date().toISOString())}`, 20, yPos)

  // Предпросмотр или скачивание
  if (preview) {
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')
    // Освобождаем память после загрузки
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100)
  } else {
    doc.save(`Заказ-наряд_${claim.number}.pdf`)
  }
}

// Главная функция для генерации PDF (предпросмотр)
export const generatePDF = (claim: Claim, preview: boolean = true): void => {
  if (claim.status === 'completed') {
    generateOrderPDF(claim, preview)
  } else {
    generateClaimPDF(claim, preview)
  }
}

// Функция для скачивания PDF
export const downloadPDF = (claim: Claim): void => {
  generatePDF(claim, false)
}
