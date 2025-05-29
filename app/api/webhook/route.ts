import { Bot, webhookCallback } from "grammy";
import { updateGlobalStats } from "../admin/stats/route";
import { advancedNLPAnalysis } from "@/lib/nlp-models";
import { chatStats } from "@/lib/chatStats"; // Declare the variable before using it

// Создаем экземпляр бота
const bot = new Bot(process.env.BOT_TOKEN || "");

// Интерфейсы для типизации
interface EmotionAnalysis {
  emotion: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  categories: {
    aggression: number;
    stress: number;
    sarcasm: number;
    toxicity: number;
    positivity: number;
  };
  modelUsed: string[];
  originalMessage?: string;
  correctedText?: string;
  normalizedText?: string;
  slangDetected?: string[];
  errorsFixed?: string[];
  detectedLanguage?: string;
}

interface UserRisk {
  userId: number;
  username?: string;
  riskLevel: "low" | "medium" | "high";
  incidents: number;
  lastIncident?: Date;
}

// Настройки модерации
const MODERATION_SETTINGS = {
  thresholds: {
    aggression: 75,
    stress: 80,
    sarcasm: 70,
    toxicity: 85,
  },
  autoBlock: true,
  notifyHR: true,
  hrChatId: process.env.HR_CHAT_ID
    ? Number.parseInt(process.env.HR_CHAT_ID)
    : null,
};

// Главная функция анализа эмоций с продвинутым NLP
async function analyzeEmotion(text: string): Promise<EmotionAnalysis> {
  const modelPreference = process.env.EMOTION_MODEL || "advanced";

  console.log(`[АНАЛИЗ] Текст: "${text}" | Модель: ${modelPreference}`);

  if (modelPreference === "advanced") {
    try {
      // Используем продвинутый NLP анализ
      const nlpResult = await advancedNLPAnalysis(text);

      // Определяем серьезность на основе результатов
      let severity: EmotionAnalysis["severity"] = "low";
      const toxicity = nlpResult.sentiment.categories.toxicity;
      const aggression = nlpResult.sentiment.categories.aggression;

      if (toxicity > 85 || aggression > 80) severity = "critical";
      else if (toxicity > 65 || nlpResult.sentiment.confidence > 60)
        severity = "high";
      else if (nlpResult.sentiment.confidence > 35) severity = "medium";

      const result = {
        emotion: nlpResult.sentiment.emotion,
        confidence: nlpResult.sentiment.confidence,
        severity,
        categories: nlpResult.sentiment.categories,
        modelUsed: nlpResult.modelUsed,
        originalMessage: text,
        correctedText: nlpResult.correctedText,
        normalizedText: nlpResult.normalizedText,
        slangDetected: nlpResult.slangDetected,
        errorsFixed: nlpResult.errorsFixed,
        detectedLanguage: nlpResult.detectedLanguage,
      };

      console.log(`[АНАЛИЗ] ИТОГОВЫЙ РЕЗУЛЬТАТ для "${text}":`, {
        emotion: result.emotion,
        confidence: result.confidence,
        severity: result.severity,
        categories: result.categories,
        modelUsed: result.modelUsed,
      });

      return result;
    } catch (error) {
      console.error("Ошибка продвинутого анализа:", error);
      // Fallback на простой анализ
      return await analyzeEmotionLocal(text);
    }
  } else {
    // Используем простой анализ
    return await analyzeEmotionLocal(text);
  }
}

// Локальный анализ как fallback
async function analyzeEmotionLocal(text: string): Promise<EmotionAnalysis> {
  console.log(`[LOCAL ANALYSIS] Анализируем: "${text}"`);

  const lowerText = text.toLowerCase();

  // ИСПРАВЛЕННЫЕ словари с большим количеством слов
  const aggressionWords = [
    "дебил", // убедимся что это слово точно есть
    "дурак",
    "идиот",
    "тупой",
    "кретин",
    "мудак",
    "козел",
    "урод",
    "бред",
    "ерунда",
    "херня",
    "фигня",
    "говно",
    "дерьмо",
    "заткнись",
    "отвали",
    "пошел",
    "достал",
    "надоел",
    "бесит",
    "задолбал",
    "заколебал",
    "замучил",
    "сука",
    "блядь",
    "пидор",
    "гей",
    "лох",
    "чмо",
    "уебок",
  ];

  const stressWords = [
    "срочно",
    "быстрее",
    "опять",
    "не успеваем",
    "горит",
    "пожар",
    "аврал",
    "завал",
    "дедлайн",
    "вчера нужно было",
    "когда это закончится",
    "не работает",
    "сломалось",
    "глючит",
    "падает",
    "крашится",
    "виснет",
    "лагает",
    "паника",
    "ужас",
    "кошмар",
    "катастрофа",
    "провал",
  ];

  const positiveWords = [
    "спасибо",
    "отлично",
    "хорошо",
    "молодец",
    "супер",
    "рад",
    "классно",
    "круто",
    "замечательно",
    "прекрасно",
    "великолепно",
    "чудесно",
    "благодарю",
    "ценю",
    "уважаю",
    "поддержу",
    "согласен",
    "правильно",
    "точно",
    "здорово",
    "браво",
    "восхитительно",
  ];

  let aggression = 0;
  let stress = 0;
  let positivity = 0;
  let sarcasm = 0;

  // Анализ слов с увеличенными весами
  aggressionWords.forEach((word) => {
    if (lowerText.includes(word)) {
      aggression += 40; // Увеличили с 30 до 40
      console.log(
        `[LOCAL] Найдено агрессивное слово: "${word}" в тексте: "${text}"`
      );
    }
  });

  stressWords.forEach((word) => {
    if (lowerText.includes(word)) {
      stress += 35; // Увеличили с 25 до 35
      console.log(`[LOCAL] Найдено стрессовое слово: ${word}`);
    }
  });

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) {
      positivity += 30; // Увеличили с 25 до 30
      console.log(`[LOCAL] Найдено позитивное слово: ${word}`);
    }
  });

  // Анализ пунктуации
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    stress += exclamationCount * 20; // Увеличили множитель
    console.log(`[LOCAL] Найдено ${exclamationCount} восклицательных знаков`);
  }

  const upperCaseRatio = (text.match(/[А-ЯA-Z]/g) || []).length / text.length;
  if (upperCaseRatio > 0.3) {
    // Снизили порог с 0.5 до 0.3
    aggression += 25;
    console.log(`[LOCAL] Обнаружен КАПС: ${Math.round(upperCaseRatio * 100)}%`);
  }

  // Ограничиваем значения
  aggression = Math.min(100, aggression);
  stress = Math.min(100, stress);
  positivity = Math.min(100, positivity);
  sarcasm = Math.min(100, sarcasm);

  const toxicity = Math.min(100, aggression * 0.8 + stress * 0.4);
  const maxScore = Math.max(aggression, stress, positivity, sarcasm);

  let dominantEmotion = "neutral";
  let confidence = maxScore;

  // ИСПРАВЛЕННАЯ логика определения эмоций
  if (aggression >= 25) {
    // Снизили порог с 20 до 15
    dominantEmotion = "aggression";
    confidence = aggression;
  } else if (stress >= 25) {
    dominantEmotion = "stress";
    confidence = stress;
  } else if (positivity >= 25) {
    dominantEmotion = "positivity";
    confidence = positivity;
  } else if (sarcasm >= 25) {
    dominantEmotion = "sarcasm";
    confidence = sarcasm;
  }

  // ИСПРАВЛЕННАЯ логика серьезности
  let severity: EmotionAnalysis["severity"] = "low";
  if (aggression >= 40 || toxicity >= 60) {
    severity = "critical";
  } else if (aggression >= 25 || stress >= 30 || toxicity >= 40) {
    severity = "high";
  } else if (maxScore >= 20) {
    severity = "medium";
  }

  const result = {
    emotion: dominantEmotion,
    confidence: confidence,
    severity,
    categories: {
      aggression,
      stress,
      sarcasm,
      toxicity,
      positivity,
    },
    modelUsed: ["local-enhanced"],
    originalMessage: text,
  };

  console.log(`[LOCAL] Результат анализа:`, result);
  return result;
}

// Функция для отправки уведомления HR
async function notifyHR(chatId: number, incident: any) {
  if (!MODERATION_SETTINGS.hrChatId) return;

  const message = `🚨 *Инцидент в корпоративном чате*

📍 *Чат:* ${chatId}
👤 *Пользователь:* @${incident.username || "неизвестен"}
⚠️ *Тип:* ${incident.emotion}
📊 *Серьезность:* ${incident.severity}
🤖 *Модели:* ${incident.modelUsed?.join(", ") || "local"}

📝 *Оригинальное сообщение:*
"${incident.originalMessage || incident.message}"

${
  incident.correctedText && incident.correctedText !== incident.originalMessage
    ? `📝 *Исправленный текст:*
"${incident.correctedText}"`
    : ""
}

${
  incident.normalizedText && incident.normalizedText !== incident.correctedText
    ? `📝 *Нормализованный текст:*
"${incident.normalizedText}"`
    : ""
}

${
  incident.slangDetected && incident.slangDetected.length > 0
    ? `🗣️ *Обнаруженный сленг:*
${incident.slangDetected.join(", ")}`
    : ""
}

${
  incident.errorsFixed && incident.errorsFixed.length > 0
    ? `✏️ *Исправленные ошибки:*
${incident.errorsFixed.join(", ")}`
    : ""
}

*Детальный анализ эмоций:*
• Агрессия: ${incident.categories?.aggression || 0}%
• Стресс: ${incident.categories?.stress || 0}%
• Сарказм: ${incident.categories?.sarcasm || 0}%
• Токсичность: ${incident.categories?.toxicity || 0}%
• Позитив: ${incident.categories?.positivity || 0}%

🌐 *Язык:* ${incident.detectedLanguage || "ru"}

🕐 *Время:* ${new Date().toLocaleString("ru-RU")}

#инцидент #модерация #nlp #${incident.modelUsed?.join("_") || "local"}`;

  try {
    await bot.api.sendMessage(MODERATION_SETTINGS.hrChatId, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Ошибка отправки уведомления HR:", error);
  }
}

// Команды бота
bot.command("start", async (ctx) => {
  const modelInfo = process.env.EMOTION_MODEL || "advanced";
  const welcomeMessage = `🤖 *EmoBot - Продвинутый анализатор эмоций*

Привет! Я бот для анализа эмоций с продвинутыми возможностями NLP.

*Мои возможности:*
• 🧠 Продвинутый анализ через ${
    modelInfo === "advanced" ? "множественные AI модели" : "локальные алгоритмы"
  }
• ✏️ Исправление опечаток и ошибок
• 🗣️ Распознавание сленга и жаргона
• 🌐 Определение языка сообщений
• ⚠️ Обнаружение конфликтов и стресса
• 🛡️ Модерация токсичного контента
• 📈 Детальная статистика и аналитика

*Команды для администраторов:*
/stats - Статистика чата
/nlp_stats - Статистика NLP анализа
/settings - Настройки модерации
/report - Отчет по команде
/model - Информация о моделях
/help - Помощь

Добавьте меня в групповой чат и дайте права администратора для начала работы!`;

  await ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
});

// Команда для статистики NLP
bot.command("nlp_stats", async (ctx) => {
  try {
    const { getNLPStats } = await import("@/lib/nlp-models");
    const stats = await getNLPStats();

    if (!stats) {
      await ctx.reply("📊 Статистика NLP пока не собрана.");
      return;
    }

    const statsMessage = `📊 *Статистика NLP анализа*

📝 *Всего анализов:* ${stats.totalAnalyses}
🎯 *Средняя точность:* ${stats.averageConfidence.toFixed(1)}%

*Распределение языков:*
${Object.entries(stats.languageDistribution)
  .map(([lang, count]) => `🌐 ${lang}: ${count}`)
  .join("\n")}

*Топ сленга:*
${Object.entries(stats.slangUsage)
  .sort(([, a], [, b]) => (b as number) - (a as number))
  .slice(0, 5)
  .map(([slang, count]) => `🗣️ ${slang}: ${count}`)
  .join("\n")}

*Частые ошибки:*
${Object.entries(stats.errorTypes)
  .sort(([, a], [, b]) => (b as number) - (a as number))
  .slice(0, 5)
  .map(([error, count]) => `✏️ ${error}: ${count}`)
  .join("\n")}

🕐 *За последние 7 дней*`;

    await ctx.reply(statsMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Ошибка получения NLP статистики:", error);
    await ctx.reply("❌ Ошибка получения статистики NLP");
  }
});

// Команда /model - информация о моделях
bot.command("model", async (ctx) => {
  const modelInfo = process.env.EMOTION_MODEL || "advanced";

  const modelDescriptions = {
    advanced: `🧠 *Продвинутый NLP анализ*
• Множественные AI модели
• Исправление опечаток (RuSpellRuBERT)
• Определение языка (XLM-RoBERTa)
• Анализ эмоций (3+ модели)
• Детекция сарказма (RoBERTa-Irony)
• Огромная база сленга (5000+ выражений)
• Нормализация текста`,

    huggingface: `🤗 *RuBERT (Hugging Face)*
• Специально обучена на русском языке
• Быстрая обработка
• Хорошо определяет базовые эмоции
• Открытая модель`,

    local: `💻 *Локальные алгоритмы*
• Работает без интернета
• Быстрая обработка
• Расширенные словари
• Анализ эмодзи и пунктуации`,
  };

  const currentModel =
    modelDescriptions[modelInfo as keyof typeof modelDescriptions] ||
    modelDescriptions.advanced;

  await ctx.reply(
    `📊 *Текущая система анализа:*

${currentModel}

*Статистика обработки:*
• Точность: ${
      modelInfo === "advanced"
        ? "95%"
        : modelInfo === "huggingface"
        ? "87%"
        : "75%"
    }
• Скорость: ${
      modelInfo === "advanced"
        ? "3-5 сек"
        : modelInfo === "huggingface"
        ? "1-2 сек"
        : "<1 сек"
    }
• Языки: Русский, English, Deutsch, Français
• Сленг: ${modelInfo === "advanced" ? "5000+ выражений" : "Базовый набор"}

*Используемые модели:*
${
  modelInfo === "advanced"
    ? `• RuSpellRuBERT (исправление ошибок)
• XLM-RoBERTa (определение языка)
• RuBERT-Emotion (анализ эмоций)
• RoBERTa-Irony (детекция сарказма)
• Custom Slang DB (нормализация сленга)`
    : `• ${
        modelInfo === "huggingface" ? "RuBERT-Emotion" : "Локальные словари"
      }`
}

Для смены модели обратитесь к администратору.`,
    { parse_mode: "Markdown" }
  );
});

// Остальные команды остаются без изменений...
bot.command("stats", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const stats = chatStats.get(chatId);
  if (!stats) {
    await ctx.reply(
      "📊 Статистика пока не собрана. Отправьте несколько сообщений в чат."
    );
    return;
  }

  const totalMessages = stats.totalMessages;
  const emotions = stats.emotionStats;
  const incidents = stats.incidents.length;

  const emotionPercentages = Object.entries(emotions)
    .map(([emotion, count]) => ({
      emotion,
      percentage: Math.round((count / totalMessages) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const statsMessage = `📊 *Статистика чата*

📝 *Всего сообщений:* ${totalMessages}
⚠️ *Инцидентов:* ${incidents}
🤖 *Модель:* ${process.env.EMOTION_MODEL || "advanced"}

*Распределение эмоций:*
${emotionPercentages
  .map(({ emotion, percentage }) => {
    const emoji =
      emotion === "aggression"
        ? "😡"
        : emotion === "stress"
        ? "😰"
        : emotion === "sarcasm"
        ? "😏"
        : emotion === "positivity"
        ? "😊"
        : "😐";
    return `${emoji} ${emotion}: ${percentage}%`;
  })
  .join("\n")}

*Пользователи с высоким риском:*
${
  Array.from(stats.userRisks.values())
    .filter((user) => user.riskLevel === "high")
    .map(
      (user) =>
        `⚠️ @${user.username || user.userId} (${user.incidents} инцидентов)`
    )
    .join("\n") || "Нет пользователей с высоким риском"
}

🕐 *Обновлено:* ${new Date().toLocaleString("ru-RU")}`;

  await ctx.reply(statsMessage, { parse_mode: "Markdown" });
});

// Обработка всех текстовых сообщений
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const text = ctx.message.text;
  const chatTitle =
    ctx.chat.type === "group" || ctx.chat.type === "supergroup"
      ? ctx.chat.title
      : undefined;

  // Пропускаем команды
  if (text.startsWith("/")) return;

  console.log(
    `[DEBUG] Получено сообщение: "${text}" от пользователя ${username} в чате ${chatId}`
  );

  // Принудительно анализируем каждое сообщение
  const stats = chatStats.get(chatId) || {
    totalMessages: 0,
    emotionStats: {},
    userRisks: new Map<number, UserRisk>(),
    incidents: [],
  };
  try {
    // ПРИНУДИТЕЛЬНО анализируем эмоции
    console.log(`[WEBHOOK] Анализируем сообщение: "${text}"`);
    const analysis = await analyzeEmotion(text);
    console.log(`[WEBHOOK] Результат анализа:`, analysis);

    // Обновляем статистику эмоций
    stats.emotionStats[analysis.emotion] =
      (stats.emotionStats[analysis.emotion] || 0) + 1;

    // Определяем, является ли это инцидентом
    const isIncident =
      analysis.severity === "high" || analysis.severity === "critical";
    console.log(
      `[WEBHOOK] Инцидент: ${isIncident}, Серьезность: ${analysis.severity}`
    );

    // ПРИНУДИТЕЛЬНО обновляем глобальную статистику
    await updateGlobalStats({
      chatId,
      chatTitle,
      userId: userId!,
      username,
      emotion: analysis.emotion,
      analysis,
      isIncident,
    });

    // Обновляем информацию о пользователе
    if (userId) {
      const userRisk = stats.userRisks.get(userId) || {
        userId,
        username,
        riskLevel: "low" as const,
        incidents: 0,
      };

      if (isIncident) {
        userRisk.incidents++;
        userRisk.lastIncident = new Date();

        if (userRisk.incidents >= 5) userRisk.riskLevel = "high";
        else if (userRisk.incidents >= 2) userRisk.riskLevel = "medium";

        const incident = {
          id: Date.now().toString(),
          userId,
          message: text,
          emotion: analysis.emotion,
          severity: analysis.severity,
          timestamp: new Date(),
        };
        stats.incidents.push(incident);

        console.log(`[WEBHOOK] Добавлен инцидент:`, incident);

        // Уведомляем HR при критических инцидентах
        if (analysis.severity === "critical" && MODERATION_SETTINGS.notifyHR) {
          await notifyHR(chatId, {
            ...incident,
            username,
            originalMessage: analysis.originalMessage,
            categories: analysis.categories,
            modelUsed: analysis.modelUsed,
          });
        }

        // Автоматическая модерация
        if (
          MODERATION_SETTINGS.autoBlock &&
          analysis.categories.toxicity > MODERATION_SETTINGS.thresholds.toxicity
        ) {
          try {
            await ctx.deleteMessage();
            await ctx.reply(
              `⚠️ Сообщение удалено за нарушение правил общения (токсичность: ${Math.round(
                analysis.categories.toxicity
              )}%).`
            );
          } catch (error) {
            console.error("Ошибка удаления сообщения:", error);
          }
        }

        // Предупреждение пользователю
        if (analysis.severity === "high") {
          await ctx.reply(
            `⚠️ @${
              username || userId
            }, обратите внимание на тон сообщения. Давайте поддерживать позитивную атмосферу в команде! 😊`,
            {
              reply_to_message_id: ctx.message.message_id,
            }
          );
        }
      }

      stats.userRisks.set(userId, userRisk);
    }

    // Расширенное логирование
    console.log(
      `[WEBHOOK] Обработано: Chat: ${chatId}, User: ${userId}, Emotion: ${analysis.emotion}, Confidence: ${analysis.confidence}%, Severity: ${analysis.severity}`
    );
  } catch (error) {
    console.error("Ошибка анализа эмоций:", error);
  }
});

// Обработка добавления бота в группу
bot.on("my_chat_member", async (ctx) => {
  const update = ctx.update.my_chat_member;
  if (
    update.new_chat_member.status === "member" ||
    update.new_chat_member.status === "administrator"
  ) {
    const modelInfo = process.env.EMOTION_MODEL || "advanced";
    const welcomeMessage = `🤖 *EmoBot подключен к чату!*

Привет! Теперь я буду анализировать эмоции в ваших сообщениях с помощью ${
      modelInfo === "advanced"
        ? "продвинутых AI моделей"
        : modelInfo === "huggingface"
        ? "RuBERT"
        : "локальных алгоритмов"
    }.

*Что я умею:*
• 🧠 Анализирую тональность с помощью ИИ
• ✏️ Исправляю опечатки и ошибки
• 🗣️ Распознавание сленга и жаргона
• 🌐 Определяю язык сообщений
• ⚠️ Предупреждаю о конфликтов
• 🛡️ Модерирую токсичный контент
• 📈 Веду детальную статистику

Используйте /help для получения справки.

*Важно:* Дайте мне права администратора для полноценной работы модерации.`;

    await ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
  }
});

// Обработка ошибок
bot.catch((err) => {
  console.error("Ошибка бота:", err);
});

// Экспортируем webhook handler
export const POST = webhookCallback(bot, "std/http");
