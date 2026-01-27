export const ERROR_MESSAGES = {
  auth: {
    loginFailed: (details: string) => `Ошибка входа: ${details}`,
    registrationFailed: (details: string) => `Ошибка регистрации: ${details}`,
    enterFullName: 'Введите ФИО',
    genericError: 'Произошла ошибка',
    profileNotLoaded: 'Профиль не загружен. Попробуйте перезайти в систему.',
  },

  validation: {
    enterClientName: 'Введите ФИО клиента',
    enterPhone: 'Введите телефон',
    enterCarNumber: 'Введите госномер',
    enterCarBrand: 'Введите марку авто',
    enterMileage: 'Введите пробег',
    mileageNegative: 'Пробег не может быть отрицательным',
    vinLength: 'VIN должен содержать 17 символов',
  },

  claims: {
    saveFailed: (details: string) => `Ошибка сохранения: ${details}`,
    unknownError: 'Неизвестная ошибка',
  },

  system: {
    missingEnvVars: 'Missing Supabase environment variables',
    somethingWentWrong: 'Что-то пошло не так',
  },
} as const

const SUPABASE_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Неверный email или пароль',
  'JWT expired': 'Сессия истекла',
  'Email not confirmed': 'Email не подтверждён',
  'User already registered': 'Пользователь уже зарегистрирован',
  'Password should be at least 6 characters': 'Пароль должен содержать минимум 6 символов',
  'Email rate limit exceeded': 'Слишком много попыток. Попробуйте позже',
  'User not found': 'Пользователь не найден',
  'New password should be different from the old password': 'Новый пароль должен отличаться от старого',
}

export function translateError(message: string): string {
  return SUPABASE_ERROR_MAP[message] ?? message
}
