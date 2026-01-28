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
