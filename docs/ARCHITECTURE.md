# Архитектура проекта

## Структура папок
src/
├── components/     # UI компоненты
│   ├── ui/        # Базовые компоненты (button, input)
│   ├── claims/    # Компоненты заявок
│   └── layout/    # Layout компоненты
├── hooks/         # React хуки
├── lib/           # Утилиты и конфигурации
├── pages/         # Страницы приложения
├── types/         # TypeScript типы
└── services/      # API сервисы (создать)

## Поток данных
User → Component → Hook → Supabase → Database

## Ключевые файлы
- useAuth.ts - авторизация (НЕ ТРОГАТЬ без необходимости)
- supabase.ts - клиент Supabase
- App.tsx - роутинг

