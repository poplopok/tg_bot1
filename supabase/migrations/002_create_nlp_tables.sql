-- Создание таблиц для продвинутого NLP анализа
-- Выполните ПОСЛЕ создания базовых таблиц

-- 1. Таблица для результатов NLP анализа
CREATE TABLE IF NOT EXISTS nlp_analysis (
  id BIGSERIAL PRIMARY KEY,
  original_text TEXT NOT NULL,
  corrected_text TEXT,
  normalized_text TEXT,
  detected_language TEXT DEFAULT 'ru',
  slang_detected JSONB DEFAULT '[]',
  errors_fixed JSONB DEFAULT '[]',
  sentiment_result JSONB NOT NULL DEFAULT '{}',
  models_used JSONB DEFAULT '[]',
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица для базы данных сленга
CREATE TABLE IF NOT EXISTS slang_database (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  slang_term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  confidence_score REAL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(category, slang_term)
);

-- 3. Таблица для статистики ошибок
CREATE TABLE IF NOT EXISTS error_statistics (
  id BIGSERIAL PRIMARY KEY,
  error_type TEXT NOT NULL,
  original_word TEXT NOT NULL,
  corrected_word TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(original_word, corrected_word)
);

-- 4. Таблица для языковой статистики
CREATE TABLE IF NOT EXISTS language_statistics (
  id BIGSERIAL PRIMARY KEY,
  detected_language TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  message_count INTEGER DEFAULT 1,
  chat_id BIGINT,
  date_detected DATE DEFAULT CURRENT_DATE,
  UNIQUE(detected_language, chat_id, date_detected)
);

-- Создаем индексы
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
