-- Исправление RLS политик для таблицы claims
-- Мастера должны видеть ВСЕ заявки (для возможности запроса делегирования)

-- Удаляем старые политики для claims (если есть)
DROP POLICY IF EXISTS "Users can view own claims" ON claims;
DROP POLICY IF EXISTS "Users can view assigned claims" ON claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON claims;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON claims;
DROP POLICY IF EXISTS "claims_select_policy" ON claims;

-- Создаём новую политику: все авторизованные пользователи могут читать все заявки
CREATE POLICY "All authenticated users can view all claims"
ON claims
FOR SELECT
TO authenticated
USING (true);

-- Политика на создание: авторизованные пользователи могут создавать заявки
DROP POLICY IF EXISTS "Users can create claims" ON claims;
DROP POLICY IF EXISTS "claims_insert_policy" ON claims;

CREATE POLICY "Authenticated users can create claims"
ON claims
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Политика на обновление:
-- 1. Админы могут редактировать все
-- 2. Мастера могут редактировать назначенные на них заявки
DROP POLICY IF EXISTS "Users can update own claims" ON claims;
DROP POLICY IF EXISTS "Admins can update all claims" ON claims;
DROP POLICY IF EXISTS "claims_update_policy" ON claims;

CREATE POLICY "Users can update claims"
ON claims
FOR UPDATE
TO authenticated
USING (
  -- Админы могут редактировать всё
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR
  -- Мастера могут редактировать назначенные на них заявки
  assigned_master_id = auth.uid()
);

-- Политика на удаление: только админы
DROP POLICY IF EXISTS "Admins can delete claims" ON claims;
DROP POLICY IF EXISTS "claims_delete_policy" ON claims;

CREATE POLICY "Only admins can delete claims"
ON claims
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
