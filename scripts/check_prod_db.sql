-- Скрипт проверки PROD базы (mchhjqmgdhtzrpcevgdp)
-- Запустить в Supabase Dashboard -> SQL Editor

-- 1. Проверка таблицы requests
SELECT 'requests' as table_name,
       CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'requests')
            THEN '✅ EXISTS' ELSE '❌ NOT EXISTS' END as status;

-- 2. Проверка колонки allow_edit в claims
SELECT 'claims.allow_edit' as column_name,
       CASE WHEN EXISTS (
         SELECT FROM information_schema.columns
         WHERE table_name = 'claims' AND column_name = 'allow_edit'
       ) THEN '✅ EXISTS' ELSE '❌ NOT EXISTS' END as status;

-- 3. Проверка колонки verified в справочниках
SELECT 'work_dictionary.verified' as column_name,
       CASE WHEN EXISTS (
         SELECT FROM information_schema.columns
         WHERE table_name = 'work_dictionary' AND column_name = 'verified'
       ) THEN '✅ EXISTS' ELSE '❌ NOT EXISTS' END as status;

SELECT 'part_dictionary.verified' as column_name,
       CASE WHEN EXISTS (
         SELECT FROM information_schema.columns
         WHERE table_name = 'part_dictionary' AND column_name = 'verified'
       ) THEN '✅ EXISTS' ELSE '❌ NOT EXISTS' END as status;

-- 4. Проверка таблицы client_references
SELECT 'client_references' as table_name,
       CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'client_references')
            THEN '✅ EXISTS' ELSE '❌ NOT EXISTS' END as status;

-- 5. Проверка RLS политик
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('claims', 'clients', 'requests', 'work_dictionary', 'part_dictionary')
ORDER BY tablename, policyname;

-- 6. Количество записей в основных таблицах
SELECT 'claims' as table_name, COUNT(*) as count FROM claims
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'work_dictionary', COUNT(*) FROM work_dictionary
UNION ALL
SELECT 'part_dictionary', COUNT(*) FROM part_dictionary;
