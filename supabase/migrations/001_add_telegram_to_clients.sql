-- Добавление поля telegram_chat_id в таблицу clients
-- Дата: 2026-02-01

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS email TEXT;

-- Индекс для поиска по телефону (для Telegram бота)
CREATE INDEX IF NOT EXISTS idx_clients_phones ON clients USING GIN (phones);

-- Комментарий
COMMENT ON COLUMN clients.telegram_chat_id IS 'ID чата в Telegram для отправки уведомлений клиенту';
