-- Добавление колонки verified во все справочники
-- Для отслеживания проверенных администратором записей

-- Справочник жалоб
ALTER TABLE complaint_dictionary
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Справочник работ
ALTER TABLE work_dictionary
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Справочник запчастей
ALTER TABLE part_dictionary
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Справочник марок авто
ALTER TABLE car_brand_dictionary
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Помечаем все существующие записи как проверенные
UPDATE complaint_dictionary SET verified = true WHERE verified IS NULL;
UPDATE work_dictionary SET verified = true WHERE verified IS NULL;
UPDATE part_dictionary SET verified = true WHERE verified IS NULL;
UPDATE car_brand_dictionary SET verified = true WHERE verified IS NULL;

-- Комментарии к колонкам
COMMENT ON COLUMN complaint_dictionary.verified IS 'Запись проверена администратором';
COMMENT ON COLUMN work_dictionary.verified IS 'Запись проверена администратором';
COMMENT ON COLUMN part_dictionary.verified IS 'Запись проверена администратором';
COMMENT ON COLUMN car_brand_dictionary.verified IS 'Запись проверена администратором';
