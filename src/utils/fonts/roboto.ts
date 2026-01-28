// Roboto Regular font in base64 format for jsPDF
// 
// ИНСТРУКЦИЯ ПО ДОБАВЛЕНИЮ ШРИФТА:
// 1. Скачайте Roboto-Regular.ttf с https://fonts.google.com/specimen/Roboto
// 2. Конвертируйте в base64: https://base64.guru/converter/encode/file
// 3. Замените значение robotoBase64 ниже на полученный base64
// 4. Или используйте готовый шрифт из: https://github.com/nicktompson/jspdf-fonts
//
// Альтернатива: Используйте DejaVu Sans (лучше поддерживает кириллицу)
// Скачать: https://github.com/ttf2pdf/fonts/tree/master/DejaVuSans

export const robotoBase64 = ''

// Функция для добавления шрифта в jsPDF
export const addRobotoFont = (doc: jsPDF) => {
  if (robotoBase64) {
    doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64)
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    doc.setFont('Roboto')
  }
  return doc
}
