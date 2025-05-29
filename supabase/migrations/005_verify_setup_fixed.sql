-- Исправленная проверка правильности создания всех таблиц и данных
-- Выполните для проверки что все работает

-- Проверяем количество записей в каждой таблице
SELECT 'messages' as table_name, count(*) as count FROM messages
UNION ALL
SELECT 'incidents' as table_name, count(*) as count FROM incidents
UNION ALL
SELECT 'risk_users' as table_name, count(*) as count FROM risk_users
UNION ALL
SELECT 'chat_stats' as table_name, count(*) as count FROM chat_stats
UNION ALL
SELECT 'nlp_analysis' as table_name, count(*) as count FROM nlp_analysis
UNION ALL
SELECT 'slang_database' as table_name, count(*) as count FROM slang_database
UNION ALL
SELECT 'error_statistics' as table_name, count(*) as count FROM error_statistics
UNION ALL
SELECT 'language_statistics' as table_name, count(*) as count FROM language_statistics;

-- Проверяем статистику сленга по категориям
SELECT category, COUNT(*) as total_terms FROM slang_database GROUP BY category ORDER BY total_terms DESC;

-- Проверяем несколько записей сленга
SELECT category, slang_term, normalized_term 
FROM slang_database 
WHERE category = 'it' 
LIMIT 10;

-- Проверяем что функции работают
SELECT * FROM search_slang('кодить');

-- Проверяем представления (если они уже созданы)
SELECT * FROM top_slang_usage LIMIT 10;

-- Проверяем что все индексы созданы
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('messages', 'incidents', 'risk_users', 'chat_stats', 'nlp_analysis', 'slang_database', 'error_statistics', 'language_statistics')
ORDER BY tablename, indexname;

-- Проверяем что RLS включен
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('messages', 'incidents', 'risk_users', 'chat_stats', 'nlp_analysis', 'slang_database', 'error_statistics', 'language_statistics');

-- Проверяем политики безопасности
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public';
