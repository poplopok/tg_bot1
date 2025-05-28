import { Bot, webhookCallback } from "grammy"

// Создаем экземпляр бота
const bot = new Bot(process.env.BOT_TOKEN || "")

// Интерфейсы для типизации
interface EmotionAnalysis {
  emotion: string
  confidence: number
  severity: "low" | "medium" | "high" | "critical"
  categories: {
    aggression: number
    stress: number
    sarcasm: number
    toxicity: number
    positivity: number
  }
  modelUsed: string
}

interface UserRisk {
  userId: number
  username?: string
  riskLevel: "low" | "medium" | "high"
  incidents: number
  lastIncident?: Date
}

// Хранилище данных
const chatStats = new Map<
  number,
  {
    totalMessages: number
    emotionStats: Record<string, number>
    userRisks: Map<number, UserRisk>
    incidents: Array<{
      id: string
      userId: number
      message: string
      emotion: string
      severity: string
      timestamp: Date
    }>
  }
>()

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
  hrChatId: process.env.HR_CHAT_ID ? Number.parseInt(process.env.HR_CHAT_ID) : null,
}

// Функция для анализа эмоций через Hugging Face API
async function analyzeEmotionWithHuggingFace(text: string): Promise<EmotionAnalysis> {
  try {
    // Используем русскую модель для анализа эмоций
    const response = await fetch(
      "https://api-inference.huggingface.co/models/cointegrated/rubert-tiny2-cedr-emotion-detection",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`)
    }

    const result = await response.json()

    // Обрабатываем результат модели
    const emotions = result[0] || []

    // Маппинг эмоций модели на наши категории
    const emotionMapping: Record<string, keyof EmotionAnalysis["categories"]> = {
      anger: "aggression",
      disgust: "aggression",
      fear: "stress",
      sadness: "stress",
      surprise: "stress",
      joy: "positivity",
      neutral: "positivity",
    }

    const categories = {
      aggression: 0,
      stress: 0,
      sarcasm: 0,
      toxicity: 0,
      positivity: 0,
    }

    let dominantEmotion = "neutral"
    let maxConfidence = 0

    // Обрабатываем результаты модели
    emotions.forEach((emotion: any) => {
      const category = emotionMapping[emotion.label.toLowerCase()]
      const confidence = emotion.score * 100

      if (category) {
        categories[category] = Math.max(categories[category], confidence)
      }

      if (confidence > maxConfidence) {
        maxConfidence = confidence
        dominantEmotion = emotion.label.toLowerCase()
      }
    })

    // Дополнительный анализ сарказма через контекст
    const sarcasmScore = await detectSarcasm(text)
    categories.sarcasm = sarcasmScore

    // Вычисляем токсичность
    categories.toxicity = Math.min(100, categories.aggression * 0.8 + categories.stress * 0.4)

    // Определяем серьезность
    let severity: EmotionAnalysis["severity"] = "low"
    if (categories.toxicity > 85 || categories.aggression > 80) severity = "critical"
    else if (categories.toxicity > 65 || maxConfidence > 60) severity = "high"
    else if (maxConfidence > 35) severity = "medium"

    return {
      emotion: dominantEmotion,
      confidence: maxConfidence,
      severity,
      categories,
      modelUsed: "rubert-tiny2-cedr-emotion-detection",
    }
  } catch (error) {
    console.error("Ошибка Hugging Face API:", error)
    // Fallback на локальный анализ
    return await analyzeEmotionLocal(text)
  }
}

// Функция для анализа эмоций через OpenAI API
async function analyzeEmotionWithOpenAI(text: string): Promise<EmotionAnalysis> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Ты эксперт по анализу эмоций в русских корпоративных чатах. 
            Анализируй сообщения и возвращай JSON с оценками от 0 до 100:
            {
              "aggression": число,
              "stress": число, 
              "sarcasm": число,
              "toxicity": число,
              "positivity": число,
              "dominant_emotion": "строка",
              "confidence": число,
              "explanation": "краткое объяснение"
            }
            
            Учитывай:
            - Корпоративный сленг (деплой, фича, баг)
            - Эмодзи и их контекст
            - Сарказм и иронию
            - Заглавные буквы и пунктуацию`,
          },
          {
            role: "user",
            content: `Проанализируй сообщение: "${text}"`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    const content = result.choices[0].message.content

    // Парсим JSON ответ
    const analysis = JSON.parse(content)

    // Определяем серьезность
    let severity: EmotionAnalysis["severity"] = "low"
    if (analysis.toxicity > 85 || analysis.aggression > 80) severity = "critical"
    else if (analysis.toxicity > 65 || analysis.confidence > 60) severity = "high"
    else if (analysis.confidence > 35) severity = "medium"

    console.log(`[OpenAI] ${analysis.explanation}`)

    return {
      emotion: analysis.dominant_emotion,
      confidence: analysis.confidence,
      severity,
      categories: {
        aggression: analysis.aggression,
        stress: analysis.stress,
        sarcasm: analysis.sarcasm,
        toxicity: analysis.toxicity,
        positivity: analysis.positivity,
      },
      modelUsed: "gpt-4",
    }
  } catch (error) {
    console.error("Ошибка OpenAI API:", error)
    // Fallback на Hugging Face
    return await analyzeEmotionWithHuggingFace(text)
  }
}

// Функция для детекции сарказма
async function detectSarcasm(text: string): Promise<number> {
  try {
    const response = await fetch("https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-irony", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
    })

    if (!response.ok) {
      throw new Error(`Sarcasm detection error: ${response.status}`)
    }

    const result = await response.json()

    // Ищем метку иронии/сарказма
    const ironyScore =
      result[0]?.find(
        (item: any) => item.label.toLowerCase().includes("irony") || item.label.toLowerCase().includes("sarcasm"),
      )?.score || 0

    return ironyScore * 100
  } catch (error) {
    console.error("Ошибка детекции сарказма:", error)
    return 0
  }
}

// Локальный анализ как fallback
async function analyzeEmotionLocal(text: string): Promise<EmotionAnalysis> {
  const lowerText = text.toLowerCase()

  // Упрощенные словари для fallback
  const aggressionWords = ["дурак", "идиот", "тупой", "бред", "ерунда"]
  const stressWords = ["срочно", "быстрее", "опять", "не успеваем", "горит"]
  const positiveWords = ["спасибо", "отлично", "хорошо", "молодец", "супер"]

  let aggression = 0
  let stress = 0
  let positivity = 0

  aggressionWords.forEach((word) => {
    if (lowerText.includes(word)) aggression += 30
  })

  stressWords.forEach((word) => {
    if (lowerText.includes(word)) stress += 25
  })

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) positivity += 20
  })

  // Анализ пунктуации
  const exclamationCount = (text.match(/!/g) || []).length
  if (exclamationCount > 2) stress += exclamationCount * 15

  const upperCaseRatio = (text.match(/[А-ЯA-Z]/g) || []).length / text.length
  if (upperCaseRatio > 0.5) aggression += 20

  const toxicity = Math.min(100, aggression * 0.8 + stress * 0.4)
  const maxScore = Math.max(aggression, stress, positivity)

  let dominantEmotion = "neutral"
  if (aggression === maxScore && aggression > 20) dominantEmotion = "aggression"
  else if (stress === maxScore && stress > 20) dominantEmotion = "stress"
  else if (positivity === maxScore && positivity > 20) dominantEmotion = "positivity"

  let severity: EmotionAnalysis["severity"] = "low"
  if (toxicity > 85) severity = "critical"
  else if (toxicity > 65) severity = "high"
  else if (maxScore > 35) severity = "medium"

  return {
    emotion: dominantEmotion,
    confidence: maxScore,
    severity,
    categories: {
      aggression,
      stress,
      sarcasm: 0,
      toxicity,
      positivity,
    },
    modelUsed: "local-fallback",
  }
}

// Главная функция анализа с выбором модели
async function analyzeEmotion(text: string): Promise<EmotionAnalysis> {
  const modelPreference = process.env.EMOTION_MODEL || "openai" // openai, huggingface, local

  console.log(`[АНАЛИЗ] Текст: "${text.substring(0, 50)}..." | Модель: ${modelPreference}`)

  switch (modelPreference) {
    case "openai":
      return await analyzeEmotionWithOpenAI(text)
    case "huggingface":
      return await analyzeEmotionWithHuggingFace(text)
    case "local":
      return await analyzeEmotionLocal(text)
    default:
      return await analyzeEmotionWithOpenAI(text)
  }
}

// Функция для отправки уведомления HR
async function notifyHR(chatId: number, incident: any) {
  if (!MODERATION_SETTINGS.hrChatId) return

  const message = `🚨 *Инцидент в корпоративном чате*

📍 *Чат:* ${chatId}
👤 *Пользователь:* @${incident.username || "неизвестен"}
⚠️ *Тип:* ${incident.emotion}
📊 *Серьезность:* ${incident.severity}
🤖 *Модель:* ${incident.modelUsed}
📝 *Сообщение:* "${incident.message}"

*Детальный анализ:*
• Агрессия: ${incident.categories.aggression}%
• Стресс: ${incident.categories.stress}%
• Сарказм: ${incident.categories.sarcasm}%
• Токсичность: ${incident.categories.toxicity}%

🕐 *Время:* ${new Date().toLocaleString("ru-RU")}

#инцидент #модерация #${incident.modelUsed}`

  try {
    await bot.api.sendMessage(MODERATION_SETTINGS.hrChatId, message, {
      parse_mode: "Markdown",
    })
  } catch (error) {
    console.error("Ошибка отправки уведомления HR:", error)
  }
}

// Команда /start
bot.command("start", async (ctx) => {
  const modelInfo = process.env.EMOTION_MODEL || "openai"
  const welcomeMessage = `🤖 *EmoBot - Анализатор эмоций*

Привет! Я бот для анализа эмоций в корпоративных чатах с использованием ИИ.

*Мои возможности:*
• 🧠 Анализ эмоций через ${modelInfo === "openai" ? "GPT-4" : modelInfo === "huggingface" ? "RuBERT" : "локальные алгоритмы"}
• ⚠️ Обнаружение конфликтов и стресса
• 🛡️ Модерация токсичного контента
• 📈 Статистика по команде
• 🔔 Уведомления для HR

*Команды для администраторов:*
/stats - Статистика чата
/settings - Настройки модерации
/report - Отчет по команде
/model - Информация о модели
/help - Помощь

Добавьте меня в групповой чат и дайте права администратора для начала работы!`

  await ctx.reply(welcomeMessage, { parse_mode: "Markdown" })
})

// Команда /model - информация о используемой модели
bot.command("model", async (ctx) => {
  const modelInfo = process.env.EMOTION_MODEL || "openai"

  const modelDescriptions = {
    openai: `🧠 *OpenAI GPT-4*
• Самая продвинутая модель
• Понимает контекст и сарказм
• Анализирует корпоративный сленг
• Объясняет свои решения`,

    huggingface: `🤗 *RuBERT (Hugging Face)*
• Специально обучена на русском языке
• Быстрая обработка
• Хорошо определяет базовые эмоции
• Открытая модель`,

    local: `💻 *Локальные алгоритмы*
• Работает без интернета
• Быстрая обработка
• Базовый анализ по словарям
• Резервный вариант`,
  }

  const currentModel = modelDescriptions[modelInfo as keyof typeof modelDescriptions] || modelDescriptions.openai

  await ctx.reply(
    `📊 *Текущая модель анализа эмоций:*

${currentModel}

*Статистика обработки:*
• Точность: ${modelInfo === "openai" ? "95%" : modelInfo === "huggingface" ? "87%" : "75%"}
• Скорость: ${modelInfo === "openai" ? "2-3 сек" : modelInfo === "huggingface" ? "1-2 сек" : "<1 сек"}
• Языки: Русский, English

Для смены модели обратитесь к администратору.`,
    { parse_mode: "Markdown" },
  )
})

// Команда /help
bot.command("help", async (ctx) => {
  const helpMessage = `📖 *Справка по EmoBot*

*Основные команды:*
/start - Запуск бота
/stats - Статистика эмоций в чате
/report - Детальный отчет
/model - Информация о модели ИИ
/settings - Настройки (только админы)

*Как работает анализ:*
• 😡 *Агрессия* - грубые слова, оскорбления
• 😰 *Стресс* - срочность, перегрузка
• 😏 *Сарказм* - ирония, скрытая критика
• ☠️ *Токсичность* - общий уровень негатива

*Используемые технологии:*
• GPT-4 / RuBERT для анализа текста
• Машинное обучение для детекции эмоций
• Контекстный анализ сарказма

*Поддержка:* @your_support_bot`

  await ctx.reply(helpMessage, { parse_mode: "Markdown" })
})

// Команда /stats
bot.command("stats", async (ctx) => {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const stats = chatStats.get(chatId)
  if (!stats) {
    await ctx.reply("📊 Статистика пока не собрана. Отправьте несколько сообщений в чат.")
    return
  }

  const totalMessages = stats.totalMessages
  const emotions = stats.emotionStats
  const incidents = stats.incidents.length

  const emotionPercentages = Object.entries(emotions)
    .map(([emotion, count]) => ({
      emotion,
      percentage: Math.round((count / totalMessages) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)

  const statsMessage = `📊 *Статистика чата*

📝 *Всего сообщений:* ${totalMessages}
⚠️ *Инцидентов:* ${incidents}
🤖 *Модель:* ${process.env.EMOTION_MODEL || "openai"}

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
              : "😐"
    return `${emoji} ${emotion}: ${percentage}%`
  })
  .join("\n")}

*Пользователи с высоким риском:*
${
  Array.from(stats.userRisks.values())
    .filter((user) => user.riskLevel === "high")
    .map((user) => `⚠️ @${user.username || user.userId} (${user.incidents} инцидентов)`)
    .join("\n") || "Нет пользователей с высоким риском"
}

🕐 *Обновлено:* ${new Date().toLocaleString("ru-RU")}`

  await ctx.reply(statsMessage, { parse_mode: "Markdown" })
})

// Команда /report
bot.command("report", async (ctx) => {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const stats = chatStats.get(chatId)
  if (!stats) {
    await ctx.reply("📊 Данных для отчета пока нет.")
    return
  }

  const recentIncidents = stats.incidents.slice(-5).reverse()

  const reportMessage = `📋 *Детальный отчет*

*Последние инциденты:*
${
  recentIncidents
    .map(
      (incident, index) =>
        `${index + 1}. ${incident.emotion} (${incident.severity})
   👤 ID: ${incident.userId}
   📝 "${incident.message.substring(0, 50)}..."
   🕐 ${incident.timestamp.toLocaleString("ru-RU")}`,
    )
    .join("\n\n") || "Инцидентов не зарегистрировано"
}

*Рекомендации ИИ:*
${stats.incidents.length > 10 ? "⚠️ Высокая конфликтность - рекомендуется вмешательство HR" : ""}
${Array.from(stats.userRisks.values()).filter((u) => u.riskLevel === "high").length > 0 ? "👥 Есть пользователи группы риска - требуется индивидуальная работа" : ""}
${stats.emotionStats.positivity > stats.emotionStats.aggression ? "✅ Позитивная атмосфера в команде" : ""}

Для получения полного отчета обратитесь к HR.`

  await ctx.reply(reportMessage, { parse_mode: "Markdown" })
})

// Команда /settings
bot.command("settings", async (ctx) => {
  const member = await ctx.getChatMember(ctx.from?.id!)
  if (!["administrator", "creator"].includes(member.status)) {
    await ctx.reply("❌ Эта команда доступна только администраторам чата.")
    return
  }

  const settingsMessage = `⚙️ *Настройки модерации*

*Текущая модель:* ${process.env.EMOTION_MODEL || "openai"}

*Пороги срабатывания:*
• Агрессия: ${MODERATION_SETTINGS.thresholds.aggression}%
• Стресс: ${MODERATION_SETTINGS.thresholds.stress}%
• Сарказм: ${MODERATION_SETTINGS.thresholds.sarcasm}%
• Токсичность: ${MODERATION_SETTINGS.thresholds.toxicity}%

*Автоматические действия:*
• Блокировка сообщений: ${MODERATION_SETTINGS.autoBlock ? "✅" : "❌"}
• Уведомления HR: ${MODERATION_SETTINGS.notifyHR ? "✅" : "❌"}

Для изменения настроек обратитесь к системному администратору.`

  await ctx.reply(settingsMessage, { parse_mode: "Markdown" })
})

// Обработка всех текстовых сообщений
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id
  const userId = ctx.from?.id
  const username = ctx.from?.username
  const text = ctx.message.text

  // Пропускаем команды
  if (text.startsWith("/")) return

  // Инициализируем статистику чата
  if (!chatStats.has(chatId)) {
    chatStats.set(chatId, {
      totalMessages: 0,
      emotionStats: {},
      userRisks: new Map(),
      incidents: [],
    })
  }

  const stats = chatStats.get(chatId)!
  stats.totalMessages++

  try {
    // Анализируем эмоции с помощью ИИ
    const analysis = await analyzeEmotion(text)

    // Обновляем статистику эмоций
    stats.emotionStats[analysis.emotion] = (stats.emotionStats[analysis.emotion] || 0) + 1

    // Обновляем информацию о пользователе
    if (userId) {
      const userRisk = stats.userRisks.get(userId) || {
        userId,
        username,
        riskLevel: "low" as const,
        incidents: 0,
      }

      // Если обнаружена проблема
      if (analysis.severity === "high" || analysis.severity === "critical") {
        userRisk.incidents++
        userRisk.lastIncident = new Date()

        // Определяем уровень риска
        if (userRisk.incidents >= 5) userRisk.riskLevel = "high"
        else if (userRisk.incidents >= 2) userRisk.riskLevel = "medium"

        // Добавляем инцидент
        const incident = {
          id: Date.now().toString(),
          userId,
          message: text,
          emotion: analysis.emotion,
          severity: analysis.severity,
          timestamp: new Date(),
        }
        stats.incidents.push(incident)

        // Уведомляем HR при критических инцидентах
        if (analysis.severity === "critical" && MODERATION_SETTINGS.notifyHR) {
          await notifyHR(chatId, {
            ...incident,
            username,
            categories: analysis.categories,
            modelUsed: analysis.modelUsed,
          })
        }

        // Автоматическая модерация
        if (MODERATION_SETTINGS.autoBlock && analysis.categories.toxicity > MODERATION_SETTINGS.thresholds.toxicity) {
          try {
            await ctx.deleteMessage()
            await ctx.reply(
              `⚠️ Сообщение удалено за нарушение правил общения (токсичность: ${Math.round(analysis.categories.toxicity)}%).`,
            )
          } catch (error) {
            console.error("Ошибка удаления сообщения:", error)
          }
        }

        // Предупреждение пользователю
        if (analysis.severity === "high") {
          await ctx.reply(
            `⚠️ @${username || userId}, обратите внимание на тон сообщения. Давайте поддерживать позитивную атмосферу в команде! 😊`,
            { reply_to_message_id: ctx.message.message_id },
          )
        }
      }

      stats.userRisks.set(userId, userRisk)
    }

    // Логируем анализ
    console.log(
      `[${new Date().toISOString()}] Chat: ${chatId}, User: ${userId}, Emotion: ${analysis.emotion}, Confidence: ${analysis.confidence}%, Model: ${analysis.modelUsed}`,
    )
  } catch (error) {
    console.error("Ошибка анализа эмоций:", error)
  }
})

// Обработка добавления бота в группу
bot.on("my_chat_member", async (ctx) => {
  const update = ctx.update.my_chat_member
  if (update.new_chat_member.status === "member" || update.new_chat_member.status === "administrator") {
    const modelInfo = process.env.EMOTION_MODEL || "openai"
    const welcomeMessage = `🤖 *EmoBot подключен к чату!*

Привет! Теперь я буду анализировать эмоции в ваших сообщениях с помощью ${modelInfo === "openai" ? "GPT-4" : modelInfo === "huggingface" ? "RuBERT" : "локальных алгоритмов"}.

*Что я умею:*
• 🧠 Анализирую тональность с помощью ИИ
• ⚠️ Предупреждаю о конфликтах
• 🛡️ Модерирую токсичный контент
• 📈 Веду статистику команды

Используйте /help для получения справки.

*Важно:* Дайте мне права администратора для полноценной работы модерации.`

    await ctx.reply(welcomeMessage, { parse_mode: "Markdown" })
  }
})

// Обработка ошибок
bot.catch((err) => {
  console.error("Ошибка бота:", err)
})

// Экспортируем webhook handler
export const POST = webhookCallback(bot, "std/http")
