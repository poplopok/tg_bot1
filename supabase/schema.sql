-- Создание таблиц для EmoBot

-- Таблица чатов
CREATE TABLE IF NOT EXISTS chats (
  id BIGINT PRIMARY KEY,
  title TEXT,
  type TEXT NOT NULL,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  is_bot BOOLEAN DEFAULT false,
  language_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица команд/отделов
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  chat_id BIGINT REFERENCES chats(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id INTEGER NOT NULL,
  chat_id BIGINT NOT NULL REFERENCES chats(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, message_id)
);

-- Таблица анализа эмоций
CREATE TABLE IF NOT EXISTS emotion_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id),
  emotion TEXT NOT NULL,
  confidence REAL NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  aggression_score REAL NOT NULL DEFAULT 0,
  stress_score REAL NOT NULL DEFAULT 0,
  sarcasm_score REAL NOT NULL DEFAULT 0,
  toxicity_score REAL NOT NULL DEFAULT 0,
  positivity_score REAL NOT NULL DEFAULT 0,
  model_used TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица инцидентов
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL REFERENCES chats(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  message_id UUID NOT NULL REFERENCES messages(id),
  emotion_analysis_id UUID NOT NULL REFERENCES emotion_analyses(id),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated')),
  resolved_by BIGINT REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица статистики пользователей
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id),
  chat_id BIGINT NOT NULL REFERENCES chats(id),
  total_messages INTEGER DEFAULT 0,
  incident_count INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  last_incident_at TIMESTAMP WITH TIME ZONE,
  avg_positivity REAL DEFAULT 0,
  avg_toxicity REAL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chat_id)
);

-- Таблица настроек модерации
CREATE TABLE IF NOT EXISTS moderation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL REFERENCES chats(id) UNIQUE,
  aggression_threshold REAL DEFAULT 75,
  stress_threshold REAL DEFAULT 80,
  sarcasm_threshold REAL DEFAULT 70,
  toxicity_threshold REAL DEFAULT 85,
  auto_block BOOLEAN DEFAULT false,
  notify_hr BOOLEAN DEFAULT true,
  hr_chat_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_emotion_analyses_created_at ON emotion_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_chat_id ON incidents(chat_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_user_stats_risk_level ON user_stats(risk_level);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moderation_settings_updated_at BEFORE UPDATE ON moderation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для автоматического обновления статистики пользователей
CREATE OR REPLACE FUNCTION update_user_stats_on_analysis()
RETURNS TRIGGER AS $$
DECLARE
  msg_record RECORD;
  current_stats RECORD;
BEGIN
  -- Получаем информацию о сообщении
  SELECT chat_id, user_id INTO msg_record
  FROM messages WHERE id = NEW.message_id;
  
  -- Получаем текущую статистику пользователя
  SELECT * INTO current_stats
  FROM user_stats 
  WHERE user_id = msg_record.user_id AND chat_id = msg_record.chat_id;
  
  IF current_stats IS NULL THEN
    -- Создаем новую запись статистики
    INSERT INTO user_stats (
      user_id, chat_id, total_messages, avg_positivity, avg_toxicity
    ) VALUES (
      msg_record.user_id, 
      msg_record.chat_id, 
      1, 
      NEW.positivity_score, 
      NEW.toxicity_score
    );
  ELSE
    -- Обновляем существующую статистику
    UPDATE user_stats SET
      total_messages = current_stats.total_messages + 1,
      avg_positivity = (current_stats.avg_positivity * current_stats.total_messages + NEW.positivity_score) / (current_stats.total_messages + 1),
      avg_toxicity = (current_stats.avg_toxicity * current_stats.total_messages + NEW.toxicity_score) / (current_stats.total_messages + 1),
      updated_at = NOW()
    WHERE user_id = msg_record.user_id AND chat_id = msg_record.chat_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для обновления статистики при добавлении анализа эмоций
CREATE TRIGGER update_user_stats_trigger 
  AFTER INSERT ON emotion_analyses
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_analysis();

-- Функция для обновления уровня риска пользователя при создании инцидента
CREATE OR REPLACE FUNCTION update_user_risk_on_incident()
RETURNS TRIGGER AS $$
DECLARE
  incident_count INTEGER;
BEGIN
  -- Подсчитываем количество инцидентов пользователя в чате
  SELECT COUNT(*) INTO incident_count
  FROM incidents 
  WHERE user_id = NEW.user_id AND chat_id = NEW.chat_id;
  
  -- Обновляем статистику и уровень риска
  UPDATE user_stats SET
    incident_count = incident_count,
    last_incident_at = NEW.created_at,
    risk_level = CASE 
      WHEN incident_count >= 5 THEN 'high'
      WHEN incident_count >= 2 THEN 'medium'
      ELSE 'low'
    END,
    updated_at = NOW()
  WHERE user_id = NEW.user_id AND chat_id = NEW.chat_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для обновления уровня риска при создании инцидента
CREATE TRIGGER update_user_risk_trigger 
  AFTER INSERT ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_user_risk_on_incident();

-- RLS (Row Level Security) политики
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_settings ENABLE ROW LEVEL SECURITY;

-- Политики для сервисной роли (полный доступ)
CREATE POLICY "Service role can do everything" ON chats FOR ALL USING (true);
CREATE POLICY "Service role can do everything" ON users FOR ALL USING (true);
CREATE POLICY "Service role can do everything" ON teams FOR ALL USING (true);
CREATE POLICY "Service role can do everything" ON messages FOR ALL USING (true);
CREATE POLICY "Service role can do everything" ON emotion_analyses FOR ALL USING (true);
CREATE POLICY "Service role can do everything" ON incidents FOR ALL USING (true);
CREATE POLICY "Service role can do everything" ON user_stats FOR ALL USING (true);
CREATE POLICY "Service role can do everything" ON moderation_settings FOR ALL USING (true);
