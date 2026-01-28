-- Таблица справочника клиентов для автокомплита
CREATE TABLE IF NOT EXISTS client_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по имени
CREATE INDEX IF NOT EXISTS idx_client_references_name ON client_references(name);

-- Индекс для быстрого поиска по телефону
CREATE INDEX IF NOT EXISTS idx_client_references_phone ON client_references(phone);

-- Включить расширение для триграммного поиска (если не включено)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Индекс для триграммного поиска по имени (для ILIKE '%search%')
CREATE INDEX IF NOT EXISTS idx_client_references_name_trgm ON client_references USING gin(name gin_trgm_ops);

-- RLS политики
ALTER TABLE client_references ENABLE ROW LEVEL SECURITY;

-- Разрешить всем аутентифицированным пользователям читать и создавать клиентов
CREATE POLICY "Allow all for authenticated" ON client_references 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_client_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_client_references_updated_at
    BEFORE UPDATE ON client_references
    FOR EACH ROW
    EXECUTE FUNCTION update_client_references_updated_at();
