-- Дополнительные таблицы для NLP анализа в Supabase

-- Таблица для хранения результатов NLP анализа
CREATE TABLE IF NOT EXISTS nlp_analysis (
  id BIGSERIAL PRIMARY KEY,
  original_text TEXT NOT NULL,
  corrected_text TEXT,
  normalized_text TEXT,
  detected_language TEXT DEFAULT 'ru',
  slang_detected JSONB DEFAULT '[]',
  errors_fixed JSONB DEFAULT '[]',
  sentiment_result JSONB NOT NULL,
  models_used JSONB DEFAULT '[]',
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для базы данных сленга
CREATE TABLE IF NOT EXISTS slang_database (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  slang_term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  confidence_score REAL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для статистики ошибок
CREATE TABLE IF NOT EXISTS error_statistics (
  id BIGSERIAL PRIMARY KEY,
  error_type TEXT NOT NULL,
  original_word TEXT NOT NULL,
  corrected_word TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для языковой статистики
CREATE TABLE IF NOT EXISTS language_statistics (
  id BIGSERIAL PRIMARY KEY,
  detected_language TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  message_count INTEGER DEFAULT 1,
  chat_id BIGINT,
  date_detected DATE DEFAULT CURRENT_DATE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_nlp_analysis_created_at ON nlp_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_nlp_analysis_detected_language ON nlp_analysis(detected_language);
CREATE INDEX IF NOT EXISTS idx_nlp_analysis_sentiment ON nlp_analysis USING GIN(sentiment_result);

CREATE INDEX IF NOT EXISTS idx_slang_database_category ON slang_database(category);
CREATE INDEX IF NOT EXISTS idx_slang_database_slang_term ON slang_database(slang_term);
CREATE INDEX IF NOT EXISTS idx_slang_database_usage_count ON slang_database(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_error_statistics_error_type ON error_statistics(error_type);
CREATE INDEX IF NOT EXISTS idx_error_statistics_frequency ON error_statistics(frequency DESC);

CREATE INDEX IF NOT EXISTS idx_language_statistics_language ON language_statistics(detected_language);
CREATE INDEX IF NOT EXISTS idx_language_statistics_date ON language_statistics(date_detected);

-- Включаем Row Level Security
ALTER TABLE nlp_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE slang_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_statistics ENABLE ROW LEVEL SECURITY;

-- Создаем политики доступа
CREATE POLICY "Allow all operations on nlp_analysis" ON nlp_analysis
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on slang_database" ON slang_database
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on error_statistics" ON error_statistics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on language_statistics" ON language_statistics
  FOR ALL USING (true) WITH CHECK (true);

-- Заполняем базу данных сленга
INSERT INTO slang_database (category, slang_term, normalized_term) VALUES
-- IT сленг
('it', 'ботать', 'работать'),
('it', 'кодить', 'программировать'),
('it', 'пушить', 'отправлять'),
('it', 'пулить', 'получать'),
('it', 'мерджить', 'объединять'),
('it', 'коммитить', 'сохранять'),
('it', 'деплоить', 'развертывать'),
('it', 'билдить', 'собирать'),
('it', 'тестить', 'тестировать'),
('it', 'дебажить', 'отлаживать'),
('it', 'рефакторить', 'переписывать'),
('it', 'ревьюить', 'проверять'),
('it', 'апрувить', 'одобрять'),
('it', 'реджектить', 'отклонять'),
('it', 'фиксить', 'исправлять'),
('it', 'брейкать', 'ломать'),
('it', 'крашить', 'падать'),
('it', 'лагать', 'тормозить'),
('it', 'фризить', 'зависать'),
('it', 'глючить', 'работать неправильно'),

-- Общий сленг
('general', 'норм', 'нормально'),
('general', 'окей', 'хорошо'),
('general', 'ок', 'хорошо'),
('general', 'кул', 'круто'),
('general', 'супер', 'отлично'),
('general', 'топ', 'отлично'),
('general', 'огонь', 'отлично'),
('general', 'бомба', 'отлично'),
('general', 'кайф', 'удовольствие'),
('general', 'прикол', 'интересно'),
('general', 'жесть', 'сильно'),
('general', 'капец', 'очень'),
('general', 'пипец', 'очень'),
('general', 'ваще', 'вообще'),
('general', 'щас', 'сейчас'),
('general', 'чё', 'что'),
('general', 'чо', 'что'),
('general', 'шо', 'что'),

-- Корпоративный сленг
('corporate', 'митинг', 'встреча'),
('corporate', 'колл', 'звонок'),
('corporate', 'зум', 'видеоконференция'),
('corporate', 'слак', 'мессенджер'),
('corporate', 'телега', 'телеграм'),
('corporate', 'мейл', 'электронная почта'),
('corporate', 'дедлайн', 'срок'),
('corporate', 'фидбек', 'обратная связь'),
('corporate', 'ревью', 'обзор'),
('corporate', 'апдейт', 'обновление'),

-- Эмоциональные выражения
('emotional', 'бесит', 'раздражает'),
('emotional', 'достал', 'надоел'),
('emotional', 'задолбал', 'надоел'),
('emotional', 'заколебал', 'надоел'),
('emotional', 'замучил', 'утомил'),
('emotional', 'достало', 'надоело'),
('emotional', 'надоело', 'утомило'),
('emotional', 'устал', 'утомился'),
('emotional', 'выматывает', 'утомляет'),
('emotional', 'напрягает', 'беспокоит'),
('emotional', 'стрессует', 'вызывает стресс'),
('emotional', 'парит', 'беспокоит'),
('emotional', 'грузит', 'давит'),
('emotional', 'давит', 'угнетает'),
('emotional', 'душит', 'угнетает'),
('emotional', 'убивает', 'расстраивает'),
('emotional', 'добивает', 'расстраивает');

-- Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для автоматического обновления updated_at в slang_database
CREATE TRIGGER update_slang_database_updated_at 
    BEFORE UPDATE ON slang_database 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Создаем представление для статистики NLP
CREATE OR REPLACE VIEW nlp_statistics AS
SELECT 
    DATE(created_at) as analysis_date,
    detected_language,
    COUNT(*) as total_analyses,
    AVG((sentiment_result->>'confidence')::float) as avg_confidence,
    COUNT(CASE WHEN jsonb_array_length(slang_detected) > 0 THEN 1 END) as messages_with_slang,
    COUNT(CASE WHEN jsonb_array_length(errors_fixed) > 0 THEN 1 END) as messages_with_errors,
    AVG(processing_time_ms) as avg_processing_time
FROM nlp_analysis
GROUP BY DATE(created_at), detected_language
ORDER BY analysis_date DESC, detected_language;

-- Проверяем что данные вставились
SELECT 'nlp_analysis' as table_name, count(*) as count FROM nlp_analysis
UNION ALL
SELECT 'slang_database' as table_name, count(*) as count FROM slang_database
UNION ALL
SELECT 'error_statistics' as table_name, count(*) as count FROM error_statistics
UNION ALL
SELECT 'language_statistics' as table_name, count(*) as count FROM language_statistics;
