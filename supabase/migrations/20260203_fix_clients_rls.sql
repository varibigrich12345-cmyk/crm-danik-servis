-- Исправление RLS политик для таблицы clients
-- Мастера должны иметь доступ к чтению клиентов для автокомплита

-- Проверяем что RLS включен
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON clients;
DROP POLICY IF EXISTS "clients_select_policy" ON clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON clients;
DROP POLICY IF EXISTS "clients_update_policy" ON clients;

-- Создаём новые политики: ВСЕ авторизованные пользователи (включая мастеров) могут работать с клиентами
CREATE POLICY "All authenticated can view clients"
    ON clients FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "All authenticated can insert clients"
    ON clients FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "All authenticated can update clients"
    ON clients FOR UPDATE
    TO authenticated
    USING (true);
