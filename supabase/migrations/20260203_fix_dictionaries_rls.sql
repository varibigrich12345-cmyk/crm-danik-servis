-- Исправление RLS политик для справочников
-- Мастера должны иметь доступ к чтению всех справочников

-- Справочник жалоб
ALTER TABLE complaint_dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view dictionaries" ON complaint_dictionary;
DROP POLICY IF EXISTS "complaint_dictionary_select" ON complaint_dictionary;
CREATE POLICY "All can view complaint_dictionary"
    ON complaint_dictionary FOR SELECT TO authenticated USING (true);

-- Справочник работ
ALTER TABLE work_dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view work_dictionary" ON work_dictionary;
DROP POLICY IF EXISTS "work_dictionary_select" ON work_dictionary;
CREATE POLICY "All can view work_dictionary"
    ON work_dictionary FOR SELECT TO authenticated USING (true);

-- Справочник запчастей
ALTER TABLE part_dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view part_dictionary" ON part_dictionary;
DROP POLICY IF EXISTS "part_dictionary_select" ON part_dictionary;
CREATE POLICY "All can view part_dictionary"
    ON part_dictionary FOR SELECT TO authenticated USING (true);

-- Справочник марок авто
ALTER TABLE car_brand_dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view car_brand_dictionary" ON car_brand_dictionary;
DROP POLICY IF EXISTS "car_brand_dictionary_select" ON car_brand_dictionary;
CREATE POLICY "All can view car_brand_dictionary"
    ON car_brand_dictionary FOR SELECT TO authenticated USING (true);

-- Справочник позиций
ALTER TABLE position_dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view position_dictionary" ON position_dictionary;
DROP POLICY IF EXISTS "position_dictionary_select" ON position_dictionary;
CREATE POLICY "All can view position_dictionary"
    ON position_dictionary FOR SELECT TO authenticated USING (true);

-- Справочник сторон
ALTER TABLE side_dictionary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view side_dictionary" ON side_dictionary;
DROP POLICY IF EXISTS "side_dictionary_select" ON side_dictionary;
CREATE POLICY "All can view side_dictionary"
    ON side_dictionary FOR SELECT TO authenticated USING (true);
