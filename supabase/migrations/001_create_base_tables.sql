-- Создание базовых таблиц для EmoBot
-- Выполняйте по порядку в SQL Editor Supabase

-- 1. Таблица для сообщений
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  chat_title TEXT,
  user_id BIGINT NOT NULL,
  username TEXT,
  message_text TEXT NOT NULL,
  emotion TEXT NOT NULL,
  confidence REAL DEFAULT 0,
  severity TEXT DEFAULT 'low',
  categories JSONB DEFAULT '{}',
  model_used TEXT DEFAULT 'local',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица для инцидентов
CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  chat_title TEXT,
  user_id BIGINT NOT NULL,
  username TEXT,
  message_text TEXT NOT NULL,
  emotion TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  categories JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Таблица для пользователей группы риска
CREATE TABLE IF NOT EXISTS risk_users (
  user_id BIGINT PRIMARY KEY,
  username TEXT,
  team TEXT,
  risk_level TEXT DEFAULT 'low',
  incidents_count INTEGER DEFAULT 0,
  last_incident TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Таблица для статистики чатов
CREATE TABLE IF NOT EXISTS chat_stats (
  chat_id BIGINT PRIMARY KEY,
  chat_title TEXT,
  total_messages INTEGER DEFAULT 0,
  emotion_stats JSONB DEFAULT '{}',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_emotion ON messages(emotion);

CREATE INDEX IF NOT EXISTS idx_incidents_chat_id ON incidents(chat_id);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved ON incidents(resolved);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);

CREATE INDEX IF NOT EXISTS idx_risk_users_risk_level ON risk_users(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_users_incidents_count ON risk_users(incidents_count);

-- Включаем Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_stats ENABLE ROW LEVEL SECURITY;

-- Создаем политики доступа (разрешаем все операции)
CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on incidents" ON incidents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on risk_users" ON risk_users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on chat_stats" ON chat_stats
  FOR ALL USING (true) WITH CHECK (true);
