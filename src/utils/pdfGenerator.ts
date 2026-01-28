import pdfMake from 'pdfmake/build/pdfmake'
import type { Claim, Complaint, Work, Part } from '@/types/database'
import { imageToBase64 } from './imageToBase64'

// Инициализация шрифтов pdfmake (встроенная поддержка кириллицы)
// Для Vite используем динамический импорт
let fontsInitialized = false

const initializeFonts = async () => {
  if (fontsInitialized) return
  
  try {
    // @ts-ignore - vfs_fonts может быть CommonJS модулем
    const pdfFonts = await import('pdfmake/build/vfs_fonts')
    if (pdfFonts.default) {
      pdfMake.vfs = pdfFonts.default.pdfMake?.vfs || pdfFonts.default
    } else {
      pdfMake.vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts
    }
    fontsInitialized = true
  } catch (error) {
    console.error('Ошибка загрузки шрифтов pdfmake:', error)
    // Fallback: используем пустой VFS (шрифты могут не работать)
    pdfMake.vfs = {}
  }
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

// Загрузка логотипа в base64 с использованием Canvas API
const loadLogo = async (): Promise<string | null> => {
  try {
    // Пробуем разные варианты пути к логотипу
    const logoPaths = ['/logo.png', '/logo.png.png']
    
    for (const path of logoPaths) {
      try {
        const base64 = await imageToBase64(path)
        // Проверяем, что получили валидный dataURL
        if (base64 && base64.startsWith('data:image/')) {
          return base64
        }
      } catch (error) {
        // Пробуем следующий путь
        continue
      }
    }
    
    return null
  } catch (error) {
    console.warn('Не удалось загрузить логотип для PDF:', error)
    return null
  }
}

// Создание шапки документа с логотипом
const createHeader = async (title: string, date: string) => {
  let logoBase64: string | null = null
  
  try {
    logoBase64 = await loadLogo()
  } catch (error) {
    console.warn('Ошибка при загрузке логотипа, PDF будет сгенерирован без логотипа:', error)
  }
  
  const headerContent: any[] = [
    {
      columns: [
        // Логотип слева (только если успешно загружен)
        logoBase64 && logoBase64.startsWith('data:image/')
          ? {
              image: logoBase64,
              width: 80,
              height: 80,
              margin: [0, 0, 10, 0],
            }
          : { width: 0 },
        // Реквизиты справа
        {
          stack: [
            { text: COMPANY_INFO.name, fontSize: 10, bold: true },
            { text: `ИНН: ${COMPANY_INFO.inn}`, fontSize: 9 },
            { text: `Адрес: ${COMPANY_INFO.address}`, fontSize: 9 },
            { text: `Тел: ${COMPANY_INFO.phone}`, fontSize: 9 },
          ],
          width: '*',
        },
      ],
      margin: [0, 0, 0, 10],
    },
    // Разделительная линия
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: '#000000',
        },
      ],
      margin: [0, 5, 0, 10],
    },
    // Заголовок документа
    {
      text: title,
      style: 'documentTitle',
      alignment: 'center',
      margin: [0, 0, 0, 5],
    },
    {
      text: `от ${date}`,
      fontSize: 10,
      alignment: 'center',
      margin: [0, 0, 0, 15],
    },
  ]

  return headerContent
}

// Генерация PDF для заявки (статус НЕ "Выполнено")
export const generateClaimPDF = async (claim: Claim): Promise<Blob> => {
  await initializeFonts()
  
  // Создаем шапку с логотипом
  const header = await createHeader(
    `ЗАЯВКА №${claim.number}`,
    formatDate(claim.created_at)
  )
  
  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    content: [
      ...header,
      // Данные клиента и автомобиля в две колонки
      {
        columns: [
          // Данные клиента
          {
            stack: [
              {
                text: 'Данные клиента:',
                style: 'subheader',
                margin: [0, 0, 0, 3],
              },
              {
                text: `ФИО: ${claim.client_fio}`,
                fontSize: 10,
                margin: [0, 0, 0, 2],
              },
              ...(claim.client_company
                ? [
                    {
                      text: `Компания: ${claim.client_company}`,
                      fontSize: 10,
                      margin: [0, 0, 0, 2],
                    },
                  ]
                : []),
              {
                text: `Телефон: ${claim.phone}`,
                fontSize: 10,
              },
            ],
            width: '*',
          },
          // Данные автомобиля
          {
            stack: [
              {
                text: 'Данные автомобиля:',
                style: 'subheader',
                margin: [0, 0, 0, 3],
              },
              {
                text: `Марка: ${claim.car_brand}`,
                fontSize: 10,
                margin: [0, 0, 0, 2],
              },
              {
                text: `Госномер: ${claim.car_number}`,
                fontSize: 10,
                margin: [0, 0, 0, 2],
              },
              ...(claim.vin
                ? [
                    {
                      text: `VIN: ${claim.vin}`,
                      fontSize: 10,
                      margin: [0, 0, 0, 2],
                    },
                  ]
                : []),
              {
                text: `Пробег: ${claim.mileage.toLocaleString('ru-RU')} км`,
                fontSize: 10,
              },
            ],
            width: '*',
          },
        ],
        margin: [0, 0, 0, 8],
      },
    ],
    styles: {
      documentTitle: {
        fontSize: 16,
        bold: true,
      },
      subheader: {
        fontSize: 11,
        bold: true,
      },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
  }

  // Таблица "Заявленные работы" (Жалобы)
  if (claim.complaints && claim.complaints.length > 0) {
    const complaintsTable = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: '№', style: 'tableHeader' },
            { text: 'Описание жалобы', style: 'tableHeader' },
            { text: 'Сторона', style: 'tableHeader' },
            { text: 'Позиция', style: 'tableHeader' },
            { text: 'Кол-во', style: 'tableHeader' },
          ],
          ...claim.complaints.map((complaint: Complaint, index: number) => [
            (index + 1).toString(),
            complaint.name || '',
            complaint.side || '',
            complaint.position || '',
            complaint.quantity.toString(),
          ]),
        ],
      },
      layout: {
        defaultBorder: false,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 0, 0, 8],
    }
    docDefinition.content.push(complaintsTable)
  }

  // Таблица "Согласованные работы"
  if (claim.works && claim.works.length > 0) {
    const worksTable = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: '№', style: 'tableHeader' },
            { text: 'Наименование работы', style: 'tableHeader' },
            { text: 'Сторона', style: 'tableHeader' },
            { text: 'Позиция', style: 'tableHeader' },
            { text: 'Кол-во', style: 'tableHeader' },
            { text: 'Цена', style: 'tableHeader' },
            { text: 'Сумма', style: 'tableHeader' },
          ],
          ...claim.works.map((work: Work, index: number) => [
            (index + 1).toString(),
            work.name || '',
            work.side || '',
            work.position || '',
            work.quantity.toString(),
            formatPrice(work.price || 0),
            formatPrice((work.quantity || 1) * (work.price || 0)),
          ]),
        ],
      },
      layout: {
        defaultBorder: false,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 0, 0, 8],
    }
    docDefinition.content.push(worksTable)
  }

  // Таблица "Запчасти"
  if (claim.parts && claim.parts.length > 0) {
    const partsTable = {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: '№', style: 'tableHeader' },
            { text: 'Артикул', style: 'tableHeader' },
            { text: 'Наименование', style: 'tableHeader' },
            { text: 'Сторона', style: 'tableHeader' },
            { text: 'Позиция', style: 'tableHeader' },
            { text: 'Кол-во', style: 'tableHeader' },
            { text: 'Цена', style: 'tableHeader' },
            { text: 'Сумма', style: 'tableHeader' },
          ],
          ...claim.parts.map((part: Part, index: number) => [
            (index + 1).toString(),
            part.article || '',
            part.name || '',
            part.side || '',
            part.position || '',
            part.quantity.toString(),
            formatPrice(part.price || 0),
            formatPrice((part.quantity || 1) * (part.price || 0)),
          ]),
        ],
      },
      layout: {
        defaultBorder: false,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 0, 0, 8],
    }
    docDefinition.content.push(partsTable)
  }

  // Подпись клиента
  docDefinition.content.push({
    text: 'Подпись клиента: _________________',
    fontSize: 10,
    margin: [0, 12, 0, 3],
  })
  docDefinition.content.push({
    text: `Дата: ${formatDate(new Date().toISOString())}`,
    fontSize: 10,
  })

  // Стили для таблиц
  docDefinition.styles.tableHeader = {
    bold: true,
    fontSize: 9,
    color: 'white',
    fillColor: '#4285F4',
    alignment: 'center',
  }

  return new Promise<Blob>((resolve) => {
    const pdfDoc = pdfMake.createPdf(docDefinition)
    pdfDoc.getBlob((blob: Blob) => {
      resolve(blob)
    })
  })
}

// Генерация PDF для заказа-наряда (статус "Выполнено")
export const generateOrderPDF = async (claim: Claim): Promise<Blob> => {
  await initializeFonts()
  
  // Создаем шапку с логотипом
  const header = await createHeader(
    `ЗАКАЗ-НАРЯД №${claim.number}`,
    formatDate(claim.completed_at || claim.created_at)
  )
  
  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    content: [
      ...header,
      // Данные клиента и автомобиля в две колонки
      {
        columns: [
          // Данные клиента
          {
            stack: [
              {
                text: 'Данные клиента:',
                style: 'subheader',
                margin: [0, 0, 0, 3],
              },
              {
                text: `ФИО: ${claim.client_fio}`,
                fontSize: 10,
                margin: [0, 0, 0, 2],
              },
              ...(claim.client_company
                ? [
                    {
                      text: `Компания: ${claim.client_company}`,
                      fontSize: 10,
                      margin: [0, 0, 0, 2],
                    },
                  ]
                : []),
              {
                text: `Телефон: ${claim.phone}`,
                fontSize: 10,
              },
            ],
            width: '*',
          },
          // Данные автомобиля
          {
            stack: [
              {
                text: 'Данные автомобиля:',
                style: 'subheader',
                margin: [0, 0, 0, 3],
              },
              {
                text: `Марка: ${claim.car_brand}`,
                fontSize: 10,
                margin: [0, 0, 0, 2],
              },
              {
                text: `Госномер: ${claim.car_number}`,
                fontSize: 10,
                margin: [0, 0, 0, 2],
              },
              ...(claim.vin
                ? [
                    {
                      text: `VIN: ${claim.vin}`,
                      fontSize: 10,
                      margin: [0, 0, 0, 2],
                    },
                  ]
                : []),
              {
                text: `Пробег: ${claim.mileage.toLocaleString('ru-RU')} км`,
                fontSize: 10,
              },
            ],
            width: '*',
          },
        ],
        margin: [0, 0, 0, 8],
      },
    ],
    styles: {
      documentTitle: {
        fontSize: 16,
        bold: true,
      },
      subheader: {
        fontSize: 11,
        bold: true,
      },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
  }

  // Таблица "Заявленные работы" (Жалобы)
  if (claim.complaints && claim.complaints.length > 0) {
    const complaintsTable = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: '№', style: 'tableHeader' },
            { text: 'Описание жалобы', style: 'tableHeader' },
            { text: 'Сторона', style: 'tableHeader' },
            { text: 'Позиция', style: 'tableHeader' },
            { text: 'Кол-во', style: 'tableHeader' },
          ],
          ...claim.complaints.map((complaint: Complaint, index: number) => [
            (index + 1).toString(),
            complaint.name || '',
            complaint.side || '',
            complaint.position || '',
            complaint.quantity.toString(),
          ]),
        ],
      },
      layout: {
        defaultBorder: false,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 0, 0, 8],
    }
    docDefinition.content.push(complaintsTable)
  }

  // Таблица "Согласованные работы"
  let worksTotal = 0
  if (claim.works && claim.works.length > 0) {
    const worksTable = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: '№', style: 'tableHeader' },
            { text: 'Наименование работы', style: 'tableHeader' },
            { text: 'Сторона', style: 'tableHeader' },
            { text: 'Позиция', style: 'tableHeader' },
            { text: 'Кол-во', style: 'tableHeader' },
            { text: 'Цена', style: 'tableHeader' },
            { text: 'Сумма', style: 'tableHeader' },
          ],
          ...claim.works.map((work: Work, index: number) => {
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
          }),
        ],
      },
      layout: {
        defaultBorder: false,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 0, 0, 8],
    }
    docDefinition.content.push(worksTable)
  }

  // Таблица "Запчасти"
  let partsTotal = 0
  if (claim.parts && claim.parts.length > 0) {
    const partsTable = {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: '№', style: 'tableHeader' },
            { text: 'Артикул', style: 'tableHeader' },
            { text: 'Наименование', style: 'tableHeader' },
            { text: 'Сторона', style: 'tableHeader' },
            { text: 'Позиция', style: 'tableHeader' },
            { text: 'Кол-во', style: 'tableHeader' },
            { text: 'Цена', style: 'tableHeader' },
            { text: 'Сумма', style: 'tableHeader' },
          ],
          ...claim.parts.map((part: Part, index: number) => {
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
          }),
        ],
      },
      layout: {
        defaultBorder: false,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin: [0, 0, 0, 8],
    }
    docDefinition.content.push(partsTable)
  }

  // Итоговая сумма
  const totalSum = worksTotal + partsTotal
  docDefinition.content.push({
    text: `ИТОГО: ${formatPrice(totalSum)}`,
    fontSize: 12,
    bold: true,
    alignment: 'right',
    margin: [0, 8, 0, 12],
  })

  // Подписи
  docDefinition.content.push({
    columns: [
      {
        text: 'Исполнитель: _________________',
        fontSize: 10,
      },
      {
        text: 'Заказчик: _________________',
        fontSize: 10,
      },
    ],
    margin: [0, 0, 0, 3],
  })
  docDefinition.content.push({
    text: `Дата: ${formatDate(new Date().toISOString())}`,
    fontSize: 10,
  })

  // Стили для таблиц
  docDefinition.styles.tableHeader = {
    bold: true,
    fontSize: 9,
    color: 'white',
    fillColor: '#4285F4',
    alignment: 'center',
  }

  return new Promise<Blob>((resolve) => {
    const pdfDoc = pdfMake.createPdf(docDefinition)
    pdfDoc.getBlob((blob: Blob) => {
      resolve(blob)
    })
  })
}

// Главная функция для генерации PDF (возвращает Blob)
export const generatePDF = async (claim: Claim): Promise<Blob> => {
  if (claim.status === 'completed') {
    return await generateOrderPDF(claim)
  } else {
    return await generateClaimPDF(claim)
  }
}

// Функция для скачивания PDF
export const downloadPDF = async (claim: Claim, filename?: string): Promise<void> => {
  const blob = await generatePDF(claim)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || (claim.status === 'completed' ? `Заказ-наряд_${claim.number}.pdf` : `Заявка_${claim.number}.pdf`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
