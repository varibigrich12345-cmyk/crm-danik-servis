-- Таблица запросов на делегирование и корректировку
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('delegation', 'correction')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  comment TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_requests_claim_id ON requests(claim_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_requested_by ON requests(requested_by);

-- Добавить поле allow_edit в claims (если не существует)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS allow_edit BOOLEAN DEFAULT FALSE;

-- RLS политики
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Все авторизованные пользователи могут видеть запросы
CREATE POLICY "Users can view requests" ON requests
  FOR SELECT TO authenticated USING (true);

-- Пользователи могут создавать свои запросы
CREATE POLICY "Users can create own requests" ON requests
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Только админы могут обновлять запросы (одобрять/отклонять)
CREATE POLICY "Admins can update requests" ON requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
