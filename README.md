# CRM DANIK-SERVIS

CRM система для управления заявками автосервиса.

## Технологии

- React 18 + TypeScript
- Vite + PWA
- Tailwind CSS + shadcn/ui
- Supabase (база данных + авторизация)
- React Query
- React Hook Form + Zod

## Установка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build
```

## Настройка

1. Скопируйте `.env.example` в `.env`
2. Заполните переменные окружения:
   - `VITE_SUPABASE_URL` - URL вашего Supabase проекта
   - `VITE_SUPABASE_ANON_KEY` - Публичный ключ Supabase

## Деплой на VPS

```bash
# Сборка
npm run build

# Копирование на сервер
scp -r dist/* root@your-server:/var/www/crm/

# Настройка nginx (см. nginx.conf)
```

## Функционал

- ✅ Авторизация (admin / master)
- ✅ Список заявок с фильтрацией
- ✅ Создание и редактирование заявок
- ✅ Жалобы, работы, запчасти
- ✅ Статусы заявок
- ✅ PWA (оффлайн режим)
- ✅ CSV экспорт заявок (общий список и детальный для 1С)
- ✅ Справочник клиентов с поиском
- ✅ Справочник запчастей (413 позиций)
- ✅ Справочник работ (404 позиции)
- ✅ Отправка PDF в WhatsApp/Telegram
- ⏳ Автокомплит запчастей
- ⏳ Telegram бот для уведомлений

## Структура проекта

```
src/
├── components/     # React компоненты
│   ├── ui/        # Базовые UI компоненты
│   ├── claims/    # Компоненты заявок
│   └── layout/    # Лейаут и навигация
├── pages/         # Страницы
├── hooks/         # React хуки
├── lib/           # Утилиты и конфигурация
├── types/         # TypeScript типы
└── stores/        # Состояние (если нужно)
```

## Лицензия

MIT
