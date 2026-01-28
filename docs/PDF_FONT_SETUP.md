# Настройка шрифта для PDF с поддержкой кириллицы

## Проблема
По умолчанию jsPDF использует шрифт Helvetica, который не поддерживает кириллицу. В PDF будут отображаться кракозябры вместо русских букв.

## Решение

### Вариант 1: Использовать Roboto (рекомендуется)

1. **Скачайте шрифт Roboto-Regular.ttf**
   - Перейдите на https://fonts.google.com/specimen/Roboto
   - Скачайте Roboto-Regular.ttf

2. **Конвертируйте в base64**
   - Используйте https://base64.guru/converter/encode/file
   - Или используйте команду: `base64 -i Roboto-Regular.ttf -o roboto_base64.txt`

3. **Добавьте в проект**
   - Откройте `src/utils/fonts/roboto.ts`
   - Замените пустую строку `robotoBase64 = ''` на полученный base64

4. **Обновите pdfGenerator.ts**
   - Раскомментируйте импорт: `import { addRobotoFont } from './fonts/roboto'`
   - В функции `initCyrillicFont` замените `doc.setFont('helvetica')` на `return addRobotoFont(doc)`

### Вариант 2: Использовать DejaVu Sans (лучшая поддержка кириллицы)

1. **Скачайте DejaVu Sans**
   - https://github.com/ttf2pdf/fonts/tree/master/DejaVuSans
   - Скачайте DejaVuSans.ttf

2. **Конвертируйте в base64** (аналогично варианту 1)

3. **Создайте файл `src/utils/fonts/dejavu.ts`**
   ```typescript
   export const dejavuBase64 = 'ВАШ_BASE64_ЗДЕСЬ'
   
   export const addDejaVuFont = (doc: jsPDF) => {
     doc.addFileToVFS('DejaVuSans.ttf', dejavuBase64)
     doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal')
     doc.setFont('DejaVu')
     return doc
   }
   ```

4. **Используйте в pdfGenerator.ts**

### Вариант 3: Использовать готовое решение

Используйте библиотеку `jspdf-customfonts-support`:
```bash
npm install jspdf-customfonts-support
```

Или готовые шрифты из:
- https://github.com/nicktompson/jspdf-fonts

## Проверка

После добавления шрифта:
1. Сгенерируйте PDF
2. Проверьте, что кириллица отображается корректно
3. Убедитесь, что все символы (включая кавычки «») отображаются правильно

## Примечание

Текущая реализация использует Helvetica как временное решение. Для продакшена **обязательно** добавьте кастомный шрифт с поддержкой кириллицы!
