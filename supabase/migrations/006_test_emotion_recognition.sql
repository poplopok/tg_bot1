-- Тестирование распознавания эмоций
-- Вставляем тестовые данные и проверяем работу системы

-- 1. Вставляем тестовые сообщения
INSERT INTO messages (chat_id, chat_title, user_id, username, message_text, emotion, confidence, severity, categories, model_used)
VALUES
(123456789, 'Тестовый чат', 111111, 'test_user1', 'Это отличная новость! Я очень рад за вас!', 'positivity', 85.5, 'low', '{"aggression": 0, "stress": 5, "sarcasm": 0, "toxicity": 0, "positivity": 85}', 'local'),
(123456789, 'Тестовый чат', 222222, 'test_user2', 'Меня это очень раздражает! Сколько можно это терпеть?!', 'aggression', 78.2, 'high', '{"aggression": 78, "stress": 45, "sarcasm": 10, "toxicity": 65, "positivity": 0}', 'local'),
(123456789, 'Тестовый чат', 333333, 'test_user3', 'Да, конечно, отличная идея... 🙄', 'sarcasm', 65.8, 'medium', '{"aggression": 15, "stress": 10, "sarcasm": 65, "toxicity": 25, "positivity": 0}', 'local'),
(123456789, 'Тестовый чат', 444444, 'test_user4', 'Я не успеваю закончить к дедлайну, у меня паника!', 'stress', 82.3, 'high', '{"aggression": 10, "stress": 82, "sarcasm": 0, "toxicity": 15, "positivity": 0}', 'local'),
(123456789, 'Тестовый чат', 555555, 'test_user5', 'Нормально, работаем дальше.', 'neutral', 60.0, 'low', '{"aggression": 0, "stress": 10, "sarcasm": 0, "toxicity": 0, "positivity": 20}', 'local');

-- 2. Вставляем тестовые инциденты
INSERT INTO incidents (chat_id, chat_title, user_id, username, message_text, emotion, severity, categories)
VALUES
(123456789, 'Тестовый чат', 222222, 'test_user2', 'Меня это очень раздражает! Сколько можно это терпеть?!', 'aggression', 'high', '{"aggression": 78, "stress": 45, "sarcasm": 10, "toxicity": 65, "positivity": 0}'),
(123456789, 'Тестовый чат', 444444, 'test_user4', 'Я не успеваю закончить к дедлайну, у меня паника!', 'stress', 'high', '{"aggression": 10, "stress": 82, "sarcasm": 0, "toxicity": 15, "positivity": 0}');

-- 3. Вставляем тестовые данные пользователей группы риска
INSERT INTO risk_users (user_id, username, team, risk_level, incidents_count, last_incident)
VALUES
(222222, 'test_user2', 'Тестовый чат', 'medium', 1, NOW()),
(444444, 'test_user4', 'Тестовый чат', 'medium', 1, NOW());

-- 4. Вставляем тестовую статистику чата
INSERT INTO chat_stats (chat_id, chat_title, total_messages, emotion_stats, last_activity)
VALUES
(123456789, 'Тестовый чат', 5, '{"positivity": 1, "aggression": 1, "sarcasm": 1, "stress": 1, "neutral": 1}', NOW());

-- 5. Вставляем тестовые данные NLP анализа
INSERT INTO nlp_analysis (original_text, corrected_text, normalized_text, detected_language, slang_detected, errors_fixed, sentiment_result, models_used, processing_time_ms)
VALUES
('Это отличная новость! Я очень рад за вас!', 'Это отличная новость! Я очень рад за вас!', 'Это отличная новость! Я очень рад за вас!', 'ru', '[]', '[]', '{"emotion": "positivity", "confidence": 85.5, "categories": {"aggression": 0, "stress": 5, "sarcasm": 0, "toxicity": 0, "positivity": 85}}', '["local"]', 120),
('Меня это очень раздражает! Сколько можно это терпеть?!', 'Меня это очень раздражает! Сколько можно это терпеть?!', 'Меня это очень раздражает! Сколько можно это терпеть?!', 'ru', '[]', '[]', '{"emotion": "aggression", "confidence": 78.2, "categories": {"aggression": 78, "stress": 45, "sarcasm": 10, "toxicity": 65, "positivity": 0}}', '["local"]', 115),
('Да, конечно, отличная идея... 🙄', 'Да, конечно, отличная идея...', 'Да, конечно, отличная идея...', 'ru', '[]', '[]', '{"emotion": "sarcasm", "confidence": 65.8, "categories": {"aggression": 15, "stress": 10, "sarcasm": 65, "toxicity": 25, "positivity": 0}}', '["local"]', 105),
('Я не успеваю закончить к дедлайну, у меня паника!', 'Я не успеваю закончить к сроку, у меня паника!', 'Я не успеваю закончить к сроку, у меня паника!', 'ru', '["дедлайну (corporate)"]', '[]', '{"emotion": "stress", "confidence": 82.3, "categories": {"aggression": 10, "stress": 82, "sarcasm": 0, "toxicity": 15, "positivity": 0}}', '["local", "slang-database"]', 130),
('Нормально, работаем дальше.', 'Нормально, работаем дальше.', 'Хорошо, работаем дальше.', 'ru', '["норм (general)"]', '[]', '{"emotion": "neutral", "confidence": 60.0, "categories": {"aggression": 0, "stress": 10, "sarcasm": 0, "toxicity": 0, "positivity": 20}}', '["local", "slang-database"]', 100);

-- 6. Обновляем счетчики использования сленга
UPDATE slang_database SET usage_count = usage_count + 1 WHERE slang_term = 'дедлайн';
UPDATE slang_database SET usage_count = usage_count + 1 WHERE slang_term = 'норм';

-- 7. Проверяем результаты
SELECT 'Тестовые данные успешно добавлены!' as message;

-- 8. Проверяем распределение эмоций
SELECT emotion, COUNT(*) as count, AVG(confidence) as avg_confidence
FROM messages
GROUP BY emotion
ORDER BY count DESC;

-- 9. Проверяем инциденты
SELECT emotion, severity, COUNT(*) as count
FROM incidents
GROUP BY emotion, severity
ORDER BY count DESC;

-- 10. Проверяем обнаруженный сленг
SELECT original_text, normalized_text, slang_detected
FROM nlp_analysis
WHERE jsonb_array_length(slang_detected) > 0;

-- 11. Проверяем статистику чата
SELECT chat_title, total_messages, emotion_stats
FROM chat_stats;

-- 12. Проверяем пользователей группы риска
SELECT username, risk_level, incidents_count
FROM risk_users
ORDER BY incidents_count DESC;
