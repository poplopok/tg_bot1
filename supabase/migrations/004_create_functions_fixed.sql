-- Исправленная версия функций и триггеров для автоматизации
-- Выполните ПОСЛЕ заполнения данных

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at в slang_database
DROP TRIGGER IF EXISTS update_slang_database_updated_at ON slang_database;
CREATE TRIGGER update_slang_database_updated_at 
    BEFORE UPDATE ON slang_database 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Триггер для автоматического обновления updated_at в risk_users
DROP TRIGGER IF EXISTS update_risk_users_updated_at ON risk_users;
CREATE TRIGGER update_risk_users_updated_at 
    BEFORE UPDATE ON risk_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для получения статистики сленга (исправлено)
CREATE OR REPLACE FUNCTION get_slang_statistics()
RETURNS TABLE (
    category TEXT,
    total_terms BIGINT,
    avg_usage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.category,
        COUNT(*) as total_terms,
        COALESCE(AVG(s.usage_count), 0) as avg_usage
    FROM slang_database s
    GROUP BY s.category
    ORDER BY total_terms DESC;
END;
$$ LANGUAGE plpgsql;

-- Функция для поиска сленга
CREATE OR REPLACE FUNCTION search_slang(search_term TEXT)
RETURNS TABLE (
    id BIGINT,
    category TEXT,
    slang_term TEXT,
    normalized_term TEXT,
    usage_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.category,
        s.slang_term,
        s.normalized_term,
        s.usage_count
    FROM slang_database s
    WHERE s.slang_term ILIKE '%' || search_term || '%'
       OR s.normalized_term ILIKE '%' || search_term || '%'
    ORDER BY s.usage_count DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Создаем представление для статистики NLP
CREATE OR REPLACE VIEW nlp_statistics AS
SELECT 
    DATE(created_at) as analysis_date,
    detected_language,
    COUNT(*) as total_analyses,
    COALESCE(AVG((sentiment_result->>'confidence')::float), 0) as avg_confidence,
    COUNT(CASE WHEN jsonb_array_length(slang_detected) > 0 THEN 1 END) as messages_with_slang,
    COUNT(CASE WHEN jsonb_array_length(errors_fixed) > 0 THEN 1 END) as messages_with_errors,
    COALESCE(AVG(processing_time_ms), 0) as avg_processing_time
FROM nlp_analysis
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), detected_language
ORDER BY analysis_date DESC, detected_language;

-- Создаем представление для топ сленга (исправлено)
CREATE OR REPLACE VIEW top_slang_usage AS
SELECT 
    category,
    slang_term,
    normalized_term,
    usage_count,
    confidence_score,
    updated_at AS last_activity
FROM slang_database
ORDER BY usage_count DESC, category
LIMIT 100;

-- Создаем представление для статистики эмоций
CREATE OR REPLACE VIEW emotion_statistics AS
SELECT 
    emotion,
    COUNT(*) as total_count,
    COALESCE(AVG(confidence), 0) as avg_confidence,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count,
    COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_count,
    COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_count
FROM messages
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY emotion
ORDER BY total_count DESC;
