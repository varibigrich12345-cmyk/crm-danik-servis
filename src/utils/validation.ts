/**
 * Нормализация телефона - оставляем только цифры
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Автоформатирование телефона в формат +7 (XXX) XXX-XX-XX
 * @param phone - номер телефона для форматирования
 * @returns отформатированный номер
 */
export function formatPhoneInput(phone: string): string {
  const digits = normalizePhone(phone)

  if (digits.length === 0) return ''

  // Если начинается с 8, заменяем на 7
  let normalized = digits
  if (digits.length >= 1 && digits[0] === '8') {
    normalized = '7' + digits.slice(1)
  }

  // Форматируем +7 (XXX) XXX-XX-XX
  let result = ''
  if (normalized.length >= 1) {
    result = '+' + normalized[0]
  }
  if (normalized.length >= 2) {
    result += ' (' + normalized.slice(1, 4)
  }
  if (normalized.length >= 4) {
    result += ')'
  }
  if (normalized.length >= 5) {
    result += ' ' + normalized.slice(4, 7)
  }
  if (normalized.length >= 8) {
    result += '-' + normalized.slice(7, 9)
  }
  if (normalized.length >= 10) {
    result += '-' + normalized.slice(9, 11)
  }

  return result
}

/**
 * Валидация госномера - проверка на пустоту (обязательное поле)
 * @param carNumber - госномер для проверки
 * @returns строка с ошибкой или пустая строка
 */
export function validateCarNumber(carNumber: string): string {
  if (!carNumber || !carNumber.trim()) {
    return 'Госномер обязателен для заполнения'
  }
  return ''
}

/**
 * Проверка формата госномера (предупреждение, не блокирует сохранение)
 * @param carNumber - госномер для проверки
 * @returns строка с предупреждением или пустая строка
 */
export function warnCarNumberFormat(carNumber: string): string {
  if (!carNumber || !carNumber.trim()) {
    return ''
  }

  const normalized = carNumber.toUpperCase().replace(/\s/g, '')

  // Российский формат: буква, 3 цифры, 2 буквы, 2-3 цифры региона
  // Допустимые буквы: АВЕКМНОРСТУХ (те что есть в латинице и кириллице)
  const carNumberRegex = /^[АВЕКМНОРСТУХABEKMHOPCTYX]\d{3}[АВЕКМНОРСТУХABEKMHOPCTYX]{2}\d{2,3}$/

  if (!carNumberRegex.test(normalized)) {
    return 'Нестандартный формат госномера (ожидается А123АА77)'
  }

  return ''
}

/**
 * Валидация email адреса
 * @param email - email для проверки
 * @returns строка с ошибкой или пустая строка
 */
export function validateEmail(email: string): string {
  if (!email) {
    return 'Email обязателен для заполнения';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Некорректный формат email';
  }

  return '';
}

/**
 * Валидация телефона в российском формате +7
 * @param phone - номер телефона для проверки
 * @returns строка с ошибкой или пустая строка
 */
export function validatePhone(phone: string): string {
  if (!phone) {
    return 'Телефон обязателен для заполнения';
  }

  // Удаляем все пробелы, скобки и дефисы для проверки
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Проверяем формат +7XXXXXXXXXX (11 цифр после +)
  const phoneRegex = /^\+7\d{10}$/;
  if (!phoneRegex.test(cleaned)) {
    return 'Телефон должен быть в формате +7XXXXXXXXXX';
  }

  return '';
}

/**
 * Валидация обязательного поля
 * @param value - значение для проверки
 * @param fieldName - название поля для сообщения об ошибке
 * @returns строка с ошибкой или пустая строка
 */
export function validateRequired(value: string | null | undefined, fieldName = 'Поле'): string {
  if (value === null || value === undefined || value.trim() === '') {
    return `${fieldName} обязательно для заполнения`;
  }

  return '';
}

/**
 * Валидация VIN номера (17 символов, без I, O, Q)
 * @param vin - VIN для проверки
 * @returns строка с ошибкой или пустая строка
 */
export function validateVIN(vin: string): string {
  if (!vin) {
    return 'VIN обязателен для заполнения';
  }

  const upperVin = vin.toUpperCase();

  if (upperVin.length !== 17) {
    return 'VIN должен содержать 17 символов';
  }

  // VIN не может содержать буквы I, O, Q
  if (/[IOQ]/.test(upperVin)) {
    return 'VIN не может содержать буквы I, O, Q';
  }

  // VIN содержит только буквы A-Z (кроме I, O, Q) и цифры 0-9
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  if (!vinRegex.test(upperVin)) {
    return 'VIN может содержать только латинские буквы и цифры';
  }

  return '';
}
