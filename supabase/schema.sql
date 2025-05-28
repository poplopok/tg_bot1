-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица чатов
CREATE TABLE IF NOT EXISTS chats (
    id BIGINT PRIMARY KEY,
    title TEXT,
    type TEXT NOT NULL DEFAULT 'group',
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    chat_id BIGINT REFERENCES chats(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id INTEGER NOT NULL,
    chat_id BIGINT NOT NULL REFERENCES chats(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chat_id, message_id)
);

-- Таблица анализа эмоций
CREATE TABLE IF NOT EXISTS emotion_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    emotion TEXT NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    aggression_score DECIMAL(5,2) DEFAULT 0,
    stress_score DECIMAL(5,2) DEFAULT 0,
    sarcasm_score DECIMAL(5,2) DEFAULT 0,
    toxicity_score DECIMAL(5,2) DEFAULT 0,
    positivity_score DECIMAL(5,2) DEFAULT 0,
    model_used TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица инцидентов
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES users(id),
    chat_id BIGINT NOT NULL REFERENCES chats(id),
    total_messages INTEGER DEFAULT 0,
    incident_count INTEGER DEFAULT 0,
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    last_incident_at TIMESTAMP WITH TIME ZONE,
    avg_positivity DECIMAL(5,2) DEFAULT 0,
    avg_toxicity DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_id)
);

-- Таблица настроек модерации
CREATE TABLE IF NOT EXISTS moderation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id BIGINT NOT NULL REFERENCES chats(id) UNIQUE,
    aggression_threshold DECIMAL(5,2) DEFAULT 75,
    stress_threshold DECIMAL(5,2) DEFAULT 80,
    sarcasm_threshold DECIMAL(5,2) DEFAULT 70,
    toxicity_threshold DECIMAL(5,2) DEFAULT 85,
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
CREATE INDEX IF NOT EXISTS idx_emotion_analyses_message_id ON emotion_analyses(message_id);
CREATE INDEX IF NOT EXISTS idx_emotion_analyses_emotion ON emotion_analyses(emotion);
CREATE INDEX IF NOT EXISTS idx_emotion_analyses_severity ON emotion_analyses(severity);
CREATE INDEX IF NOT EXISTS idx_emotion_analyses_created_at ON emotion_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_chat_id ON incidents(chat_id);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_chat ON user_stats(user_id, chat_id);
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
CREATE OR REPLACE FUNCTION update_user_stats_on_incident()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем статистику при создании инцидента
    INSERT INTO user_stats (user_id, chat_id, incident_count, last_incident_at)
    VALUES (NEW.user_id, NEW.chat_id, 1, NEW.created_at)
    ON CONFLICT (user_id, chat_id)
    DO UPDATE SET
        incident_count = user_stats.incident_count + 1,
        last_incident_at = NEW.created_at,
        risk_level = CASE
            WHEN user_stats.incident_count + 1 >= 5 THEN 'high'
            WHEN user_stats.incident_count + 1 >= 2 THEN 'medium'
            ELSE 'low'
        END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для обновления статистики при инцидентах
CREATE TRIGGER update_user_stats_on_incident_trigger
    AFTER INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_incident();

-- Функция для обновления статистики сообщений
CREATE OR REPLACE FUNCTION update_user_stats_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем счетчик сообщений
    INSERT INTO user_stats (user_id, chat_id, total_messages)
    VALUES (NEW.user_id, NEW.chat_id, 1)
    ON CONFLICT (user_id, chat_id)
    DO UPDATE SET
        total_messages = user_stats.total_messages + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для обновления статистики сообщений
CREATE TRIGGER update_user_stats_on_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_on_message();

-- Функция для обновления средних показателей эмоций
CREATE OR REPLACE FUNCTION update_emotion_averages()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем средние показания эмоций для пользователя
    UPDATE user_stats 
    SET 
        avg_positivity = (
            SELECT AVG(ea.positivity_score)
            FROM emotion_analyses ea
            JOIN messages m ON ea.message_id = m.id
            WHERE m.user_id = NEW.user_id AND m.chat_id = (
                SELECT chat_id FROM messages WHERE id = NEW.message_id
            )
        ),
        avg_toxicity = (
            SELECT AVG(ea.toxicity_score)
            FROM emotion_analyses ea
            JOIN messages m ON ea.message_id = m.id
            WHERE m.user_id = NEW.user_id AND m.chat_id = (
                SELECT chat_id FROM messages WHERE id = NEW.message_id
            )
        ),
        updated_at = NOW()
    WHERE user_id = NEW.user_id AND chat_id = (
        SELECT chat_id FROM messages WHERE id = NEW.message_id
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для обновления средних эмоций
CREATE TRIGGER update_emotion_averages_trigger
    AFTER INSERT ON emotion_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_emotion_averages();

-- RLS (Row Level Security) политики
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_settings ENABLE ROW LEVEL SECURITY;

-- Политики для чтения данных (для dashboard)
CREATE POLICY "Allow read access for service role" ON chats FOR SELECT USING (true);
CREATE POLICY "Allow read access for service role" ON users FOR SELECT USING (true);
CREATE POLICY "Allow read access for service role" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow read access for service role" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow read access for service role" ON emotion_analyses FOR SELECT USING (true);
CREATE POLICY "Allow read access for service role" ON incidents FOR SELECT USING (true);
CREATE POLICY "Allow read access for service role" ON user_stats FOR SELECT USING (true);
CREATE POLICY "Allow read access for service role" ON moderation_settings FOR SELECT USING (true);

-- Политики для записи данных (для бота)
CREATE POLICY "Allow insert for service role" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service role" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service role" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service role" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service role" ON emotion_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service role" ON incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service role" ON user_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service role" ON moderation_settings FOR INSERT WITH CHECK (true);

-- Политики для обновления данных
CREATE POLICY "Allow update for service role" ON chats FOR UPDATE USING (true);
CREATE POLICY "Allow update for service role" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow update for service role" ON teams FOR UPDATE USING (true);
CREATE POLICY "Allow update for service role" ON incidents FOR UPDATE USING (true);
CREATE POLICY "Allow update for service role" ON user_stats FOR UPDATE USING (true);
CREATE POLICY "Allow update for service role" ON moderation_settings FOR UPDATE USING (true);

-- Вставляем тестовые данные для демонстрации
INSERT INTO chats (id, title, type, member_count, is_active) VALUES
(-1001234567890, 'Разработка', 'supergroup', 12, true),
(-1001234567891, 'Маркетинг', 'supergroup', 8, true),
(-1001234567892, 'Продажи', 'supergroup', 15, true),
(-1001234567893, 'HR', 'supergroup', 5, true),
(-1001234567894, 'Поддержка', 'supergroup', 10, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, username, first_name, last_name, is_bot) VALUES
(123456789, 'alexey_k', 'Алексей', 'Козлов', false),
(987654321, 'maria_s', 'Мария', 'Смирнова', false),
(555666777, 'ivan_p', 'Иван', 'Петров', false),
(111222333, 'anna_v', 'Анна', 'Васильева', false),
(444555666, 'dmitry_n', 'Дмитрий', 'Николаев', false)
ON CONFLICT (id) DO NOTHING;

-- Настройки модерации по умолчанию
INSERT INTO moderation_settings (chat_id, aggression_threshold, stress_threshold, toxicity_threshold, auto_block, notify_hr, hr_chat_id) VALUES
(-1001234567890, 75, 80, 85, false, true, -1001234567893),
(-1001234567891, 70, 75, 80, false, true, -1001234567893),
(-1001234567892, 80, 85, 90, false, true, -1001234567893),
(-1001234567894, 65, 70, 75, true, true, -1001234567893)
ON CONFLICT (chat_id) DO NOTHING;
