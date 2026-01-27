-- ============================================
-- CRM DANIK-SERVIS - Схема базы данных
-- Версия: 1.0
-- Дата: 2026-01-27
-- ============================================

-- Включаем необходимые расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ТИПЫ И ПЕРЕЧИСЛЕНИЯ
-- ============================================

-- Роли пользователей
CREATE TYPE user_role AS ENUM ('admin', 'master');

-- Статусы заявки
CREATE TYPE claim_status AS ENUM ('draft', 'agreed', 'in_progress', 'completed');

-- Статусы запросов
CREATE TYPE request_status AS ENUM ('none', 'pending', 'approved', 'rejected');

-- ============================================
-- ТАБЛИЦЫ
-- ============================================

-- Профили пользователей
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'master',
    phone TEXT,
    telegram_chat_id BIGINT, -- для push-уведомлений
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Справочник контрагентов (клиентов)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fio TEXT NOT NULL,
    company TEXT, -- может быть пустым для частников
    phones TEXT[] NOT NULL DEFAULT '{}', -- массив телефонов (до 3)
    inn TEXT, -- ИНН для юрлиц
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Справочник автомобилей клиентов
CREATE TABLE client_vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    car_number TEXT NOT NULL, -- госномер
    car_brand TEXT NOT NULL, -- марка
    vin TEXT, -- VIN код (17 символов, опционально)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT vin_length CHECK (vin IS NULL OR LENGTH(vin) = 17)
);

-- Справочник жалоб (автоподсказки)
CREATE TABLE complaint_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0, -- для сортировки по популярности
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Справочник работ (автоподсказки)
CREATE TABLE work_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    default_price DECIMAL(10,2), -- рекомендуемая цена
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Справочник запчастей (автоподсказки)
CREATE TABLE part_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT, -- артикул
    name TEXT NOT NULL,
    default_price DECIMAL(10,2),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article, name)
);

-- Справочник марок авто
CREATE TABLE car_brand_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Справочник позиций (передний, задний и т.д.)
CREATE TABLE position_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Справочник сторон (левый, правый, центр)
CREATE TABLE side_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Основная таблица заявок
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Номер заявки (CLAIM-YYMMDD-XXX)
    number TEXT NOT NULL UNIQUE,
    
    -- Создатель и ответственный
    created_by UUID NOT NULL REFERENCES profiles(id),
    assigned_master_id UUID NOT NULL REFERENCES profiles(id),
    
    -- Данные клиента
    client_id UUID REFERENCES clients(id),
    client_fio TEXT NOT NULL,
    client_company TEXT,
    phone TEXT NOT NULL, -- основной телефон
    phones TEXT[] DEFAULT '{}', -- дополнительные телефоны
    
    -- Данные автомобиля
    vehicle_id UUID REFERENCES client_vehicles(id),
    car_number TEXT NOT NULL,
    car_brand TEXT NOT NULL,
    vin TEXT,
    mileage INTEGER NOT NULL, -- пробег в км, обязательное поле
    
    -- Жалобы, работы, запчасти (JSONB)
    complaints JSONB DEFAULT '[]'::jsonb,
    -- Формат: [{name, side, position, quantity}]
    
    works JSONB DEFAULT '[]'::jsonb,
    -- Формат: [{name, side, position, quantity, price, complaintIndex}]
    
    parts JSONB DEFAULT '[]'::jsonb,
    -- Формат: [{article, name, side, position, quantity, price}]
    
    -- Статусы
    status claim_status NOT NULL DEFAULT 'draft',
    
    -- Запрос на редактирование (после выполнения)
    edit_request_status request_status DEFAULT 'none',
    edit_requested_by UUID REFERENCES profiles(id),
    edit_request_comment TEXT,
    
    -- Запрос на смену ответственного
    responsible_request_status request_status DEFAULT 'none',
    responsible_requested_by UUID REFERENCES profiles(id),
    responsible_request_to UUID REFERENCES profiles(id), -- кому передать
    responsible_request_comment TEXT,
    
    -- Экспорт CSV
    is_exported BOOLEAN DEFAULT false,
    exported_at TIMESTAMPTZ,
    csv_data TEXT,
    
    -- Метки времени
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ, -- когда перешла в статус "Выполнено"
    
    -- Валидация VIN
    CONSTRAINT claim_vin_length CHECK (vin IS NULL OR LENGTH(vin) = 17)
);

-- История изменений заявок (логирование)
CREATE TABLE claim_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL, -- 'created', 'updated', 'status_changed', etc.
    changes JSONB, -- что изменилось
    old_values JSONB, -- старые значения
    new_values JSONB, -- новые значения
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Уведомления
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'new_claim', 'status_changed', 'edit_request', 'responsible_request'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Настройки пользователей (для оффлайн синхронизации и прочего)
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true,
    telegram_notifications BOOLEAN DEFAULT true,
    offline_data JSONB, -- кешированные данные для оффлайн
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ИНДЕКСЫ
-- ============================================

-- Заявки
CREATE INDEX idx_claims_created_by ON claims(created_by);
CREATE INDEX idx_claims_assigned_master ON claims(assigned_master_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
CREATE INDEX idx_claims_car_number ON claims(car_number);
CREATE INDEX idx_claims_client_id ON claims(client_id);

-- История
CREATE INDEX idx_claim_history_claim_id ON claim_history(claim_id);
CREATE INDEX idx_claim_history_created_at ON claim_history(created_at DESC);

-- Уведомления
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Справочники (для автоподсказок)
CREATE INDEX idx_complaint_dict_name ON complaint_dictionary(name);
CREATE INDEX idx_work_dict_name ON work_dictionary(name);
CREATE INDEX idx_part_dict_name ON part_dictionary(name);
CREATE INDEX idx_car_brand_dict_name ON car_brand_dictionary(name);

-- Клиенты и авто
CREATE INDEX idx_clients_fio ON clients(fio);
CREATE INDEX idx_client_vehicles_car_number ON client_vehicles(car_number);

-- ============================================
-- ФУНКЦИИ
-- ============================================

-- Генерация номера заявки
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    seq_num INTEGER;
    new_number TEXT;
BEGIN
    today_str := TO_CHAR(NOW(), 'YYMMDD');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(number FROM 'CLAIM-' || today_str || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM claims
    WHERE number LIKE 'CLAIM-' || today_str || '-%';
    
    new_number := 'CLAIM-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Логирование изменений заявки
CREATE OR REPLACE FUNCTION log_claim_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
    old_json JSONB;
    new_json JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO claim_history (claim_id, user_id, action, new_values)
        VALUES (NEW.id, NEW.created_by, 'created', to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        old_json := to_jsonb(OLD);
        new_json := to_jsonb(NEW);
        
        -- Определяем тип изменения
        IF OLD.status != NEW.status THEN
            INSERT INTO claim_history (claim_id, user_id, action, old_values, new_values)
            VALUES (
                NEW.id, 
                NEW.assigned_master_id, 
                'status_changed', 
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status)
            );
        ELSE
            INSERT INTO claim_history (claim_id, user_id, action, old_values, new_values)
            VALUES (NEW.id, NEW.assigned_master_id, 'updated', old_json, new_json);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Обновление счетчика использования справочников
CREATE OR REPLACE FUNCTION increment_dictionary_usage(
    dict_table TEXT,
    dict_name TEXT
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET usage_count = usage_count + 1 WHERE name = $1',
        dict_table
    ) USING dict_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ТРИГГЕРЫ
-- ============================================

-- Автоматическое обновление updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_client_vehicles_updated_at
    BEFORE UPDATE ON client_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Логирование изменений заявок
CREATE TRIGGER log_claim_changes_trigger
    AFTER INSERT OR UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION log_claim_changes();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Справочники - доступны всем авторизованным
ALTER TABLE complaint_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_brand_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_dictionary ENABLE ROW LEVEL SECURITY;

-- Политики для профилей
CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Политики для клиентов (доступны всем)
CREATE POLICY "Authenticated users can view clients"
    ON clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert clients"
    ON clients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
    ON clients FOR UPDATE TO authenticated USING (true);

-- Политики для автомобилей клиентов
CREATE POLICY "Authenticated users can view vehicles"
    ON client_vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
    ON client_vehicles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
    ON client_vehicles FOR UPDATE TO authenticated USING (true);

-- Политики для заявок
-- Админ видит все, мастер только свои
CREATE POLICY "Admin can view all claims"
    ON claims FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Master can view own claims"
    ON claims FOR SELECT
    TO authenticated
    USING (
        assigned_master_id = auth.uid()
        OR created_by = auth.uid()
    );

CREATE POLICY "Authenticated users can create claims"
    ON claims FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Master can update own claims"
    ON claims FOR UPDATE
    TO authenticated
    USING (
        assigned_master_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Политики для истории
CREATE POLICY "Users can view claim history"
    ON claim_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM claims
            WHERE claims.id = claim_history.claim_id
            AND (
                claims.assigned_master_id = auth.uid()
                OR claims.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            )
        )
    );

-- Политики для уведомлений
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Политики для настроек
CREATE POLICY "Users can manage own settings"
    ON user_settings FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Политики для справочников (доступны всем авторизованным)
CREATE POLICY "Authenticated users can view dictionaries"
    ON complaint_dictionary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dictionaries"
    ON complaint_dictionary FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update dictionaries"
    ON complaint_dictionary FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view work_dictionary"
    ON work_dictionary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert work_dictionary"
    ON work_dictionary FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update work_dictionary"
    ON work_dictionary FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view part_dictionary"
    ON part_dictionary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert part_dictionary"
    ON part_dictionary FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update part_dictionary"
    ON part_dictionary FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view car_brand_dictionary"
    ON car_brand_dictionary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert car_brand_dictionary"
    ON car_brand_dictionary FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view position_dictionary"
    ON position_dictionary FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view side_dictionary"
    ON side_dictionary FOR SELECT TO authenticated USING (true);

-- ============================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ============================================

-- Марки авто
INSERT INTO car_brand_dictionary (name) VALUES
    ('ГАЗель'),
    ('ГАЗель NEXT'),
    ('Ford Transit'),
    ('Hyundai HD78'),
    ('Peugeot Boxer'),
    ('MAN'),
    ('Mercedes-Benz Sprinter'),
    ('Volkswagen Transporter'),
    ('Volkswagen Crafter'),
    ('Renault Master'),
    ('IVECO Daily'),
    ('Fiat Ducato'),
    ('Citroën Jumper')
ON CONFLICT (name) DO NOTHING;

-- Позиции
INSERT INTO position_dictionary (name) VALUES
    ('Передний'),
    ('Задний'),
    ('Верхний'),
    ('Нижний'),
    ('Средний')
ON CONFLICT (name) DO NOTHING;

-- Стороны
INSERT INTO side_dictionary (name) VALUES
    ('Левый'),
    ('Правый'),
    ('Центральный')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- СОЗДАНИЕ ФУНКЦИИ ДЛЯ НОВОГО ПОЛЬЗОВАТЕЛЯ
-- ============================================

-- Триггер для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Новый пользователь'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'master')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер на auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
