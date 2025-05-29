import { Bot, webhookCallback } from "grammy"
import { updateGlobalStats } from "../admin/stats/route"

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
  originalMessage?: string
}

interface UserRisk {
  userId: number
  username?: string
  riskLevel: "low" | "medium" | "high"
  incidents: number
  lastIncident?: Date
}

// Хранилище данных для отдельных чатов
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
    const model = process.env.HUGGINGFACE_MODEL || "cointegrated/rubert-tiny2-cedr-emotion-detection"
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
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
      throw new Error(`Hugging Face API error: ${response.status}`)
    }

    const result = await response.json()
    const emotions = result[0] || []

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

    // Дополнительный анализ сарказма
    const sarcasmScore = await detectSarcasm(text)
    categories.sarcasm = sarcasmScore

    categories.toxicity = Math.min(100, categories.aggression * 0.8 + categories.stress * 0.4)

    let severity: EmotionAnalysis["severity"] = "low"
    if (categories.toxicity > 85 || categories.aggression > 80) severity = "critical"
    else if (categories.toxicity > 65 || maxConfidence > 60) severity = "high"
    else if (maxConfidence > 35) severity = "medium"

    return {
      emotion: dominantEmotion,
      confidence: maxConfidence,
      severity,
      categories,
      modelUsed: "huggingface",
      originalMessage: text,
    }
  } catch (error) {
    console.error("Ошибка Hugging Face API:", error)
    return await analyzeEmotionLocal(text)
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

  const aggressionWords = ["дурак", "идиот", "тупой", "бред", "ерунда"]
  const stressWords = ["срочно", "быстрее", "опять", "не успеваем", "горит"]
  const positiveWords = ["спасибо", "отлично", "хорошо", "молодец", "супер", "рад", "классно"]

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
    if (lowerText.includes(word)) positivity += 25
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
    originalMessage: text,
  }
}

// Главная функция анализа
async function analyzeEmotion(text: string): Promise<EmotionAnalysis> {
  const modelPreference = process.env.EMOTION_MODEL || "local"

  console.log(`[АНАЛИЗ] Текст: "${text.substring(0, 50)}..." | Модель: ${modelPreference}`)

  switch (modelPreference) {
    case "huggingface":
      return await analyzeEmotionWithHuggingFace(text)
    case "local":
      return await analyzeEmotionLocal(text)
    default:
      return await analyzeEmotionLocal(text)
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

// Команды бота (оставляем как есть)
bot.command("start", async (ctx) => {
  const modelInfo = process.env.EMOTION_MODEL || "local"
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

// Остальные команды остаются без изменений...
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
🤖 *Модель:* ${process.env.EMOTION_MODEL || "local"}

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

// Обработка всех текстовых сообщений
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id
  const userId = ctx.from?.id
  const username = ctx.from?.username
  const text = ctx.message.text
  const chatTitle = ctx.chat.type === "group" || ctx.chat.type === "supergroup" ? ctx.chat.title : undefined

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
    // Анализируем эмоции
    const analysis = await analyzeEmotion(text)

    // Обновляем статистику эмоций
    stats.emotionStats[analysis.emotion] = (stats.emotionStats[analysis.emotion] || 0) + 1

    // Определяем, является ли это инцидентом
    const isIncident = analysis.severity === "high" || analysis.severity === "critical"

    // Обновляем глобальную статистику
    updateGlobalStats({
      chatId,
      chatTitle,
      userId: userId!,
      username,
      emotion: analysis.emotion,
      analysis,
      isIncident,
    })

    // Обновляем информацию о пользователе
    if (userId) {
      const userRisk = stats.userRisks.get(userId) || {
        userId,
        username,
        riskLevel: "low" as const,
        incidents: 0,
      }

      if (isIncident) {
        userRisk.incidents++
        userRisk.lastIncident = new Date()

        if (userRisk.incidents >= 5) userRisk.riskLevel = "high"
        else if (userRisk.incidents >= 2) userRisk.riskLevel = "medium"

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
    const modelInfo = process.env.EMOTION_MODEL || "local"
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
