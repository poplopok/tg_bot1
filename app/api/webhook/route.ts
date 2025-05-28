import { Bot, webhookCallback } from "grammy"
import {
  upsertChat,
  upsertUser,
  saveMessage,
  saveEmotionAnalysis,
  createIncident,
  getModerationSettings,
  getChatStats,
} from "@/lib/database"

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
            }`,
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
    const analysis = JSON.parse(content)

    let severity: EmotionAnalysis["severity"] = "low"
    if (analysis.toxicity > 85 || analysis.aggression > 80) severity = "critical"
    else if (analysis.toxicity > 65 || analysis.confidence > 60) severity = "high"
    else if (analysis.confidence > 35) severity = "medium"

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
    return await analyzeEmotionLocal(text)
  }
}

// Локальный анализ как fallback
async function analyzeEmotionLocal(text: string): Promise<EmotionAnalysis> {
  const lowerText = text.toLowerCase()

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

// Главная функция анализа
async function analyzeEmotion(text: string): Promise<EmotionAnalysis> {
  const modelPreference = process.env.EMOTION_MODEL || "openai"

  console.log(`[АНАЛИЗ] Текст: "${text.substring(0, 50)}..." | Модель: ${modelPreference}`)

  if (modelPreference === "openai") {
    return await analyzeEmotionWithOpenAI(text)
  } else {
    return await analyzeEmotionLocal(text)
  }
}

// Функция для отправки уведомления HR
async function notifyHR(chatId: number, incident: any) {
  const settings = await getModerationSettings(chatId)
  if (!settings?.notify_hr || !settings.hr_chat_id) return

  const message = `🚨 *Инцидент в корпоративном чате*

📍 *Чат:* ${chatId}
👤 *Пользователь:* @${incident.username || "неизвестен"}
⚠️ *Тип:* ${incident.emotion}
📊 *Серьезность:* ${incident.severity}
📝 *Сообщение:* "${incident.message}"

*Детальный анализ:*
• Агрессия: ${incident.categories.aggression}%
• Стресс: ${incident.categories.stress}%
• Токсичность: ${incident.categories.toxicity}%

🕐 *Время:* ${new Date().toLocaleString("ru-RU")}`

  try {
    await bot.api.sendMessage(settings.hr_chat_id, message, {
      parse_mode: "Markdown",
    })
  } catch (error) {
    console.error("Ошибка отправки уведомления HR:", error)
  }
}

// Команды бота
bot.command("start", async (ctx) => {
  const welcomeMessage = `🤖 *EmoBot - Анализатор эмоций*

Привет! Я бот для анализа эмоций в корпоративных чатах с использованием ИИ.

*Мои возможности:*
• 🧠 Анализ эмоций через GPT-4
• ⚠️ Обнаружение конфликтов и стресса
• 🛡️ Модерация токсичного контента
• 📈 Статистика по команде

*Команды:*
/stats - Статистика чата
/help - Помощь

Добавьте меня в групповой чат для начала работы!`

  await ctx.reply(welcomeMessage, { parse_mode: "Markdown" })
})

// В команде /stats заменяем логику на использование новой функции
bot.command("stats", async (ctx) => {
  const chatId = ctx.chat?.id
  if (!chatId) return

  try {
    const stats = await getChatStats(chatId, 7)

    if (stats.totalAnalyses === 0) {
      await ctx.reply("📊 Статистика пока не собрана. Отправьте несколько сообщений в чат.")
      return
    }

    const emotionPercentages = Object.entries(stats.emotionDistribution)
      .map(([emotion, percentage]) => ({ emotion, percentage }))
      .sort((a, b) => b.percentage - a.percentage)

    const statsMessage = `📊 *Статистика чата (7 дней)*

📝 *Проанализировано сообщений:* ${stats.totalAnalyses}
⚠️ *Открытых инцидентов:* ${stats.openIncidents}
😊 *Средняя позитивность:* ${stats.avgPositivity}%
☠️ *Средняя токсичность:* ${stats.avgToxicity}%

*Распределение эмоций:*
${emotionPercentages
  .map(({ emotion, percentage }) => {
    const emoji = emotion === "aggression" ? "😡" : emotion === "stress" ? "😰" : emotion === "positivity" ? "😊" : "😐"
    return `${emoji} ${emotion}: ${percentage}%`
  })
  .join("\n")}

🕐 *Обновлено:* ${new Date().toLocaleString("ru-RU")}`

    await ctx.reply(statsMessage, { parse_mode: "Markdown" })
  } catch (error) {
    console.error("Ошибка получения статистики:", error)
    await ctx.reply("❌ Ошибка получения статистики")
  }
})

// Обработка текстовых сообщений
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id
  const userId = ctx.from?.id
  const username = ctx.from?.username
  const text = ctx.message.text
  const messageId = ctx.message.message_id

  if (text.startsWith("/")) return

  try {
    // Сохраняем информацию о чате и пользователе
    await upsertChat({
      id: chatId,
      title: ctx.chat.title || null,
      type: ctx.chat.type,
      member_count: 0,
    })

    if (userId) {
      await upsertUser({
        id: userId,
        username: username || null,
        first_name: ctx.from?.first_name || null,
        last_name: ctx.from?.last_name || null,
        is_bot: ctx.from?.is_bot || false,
        language_code: ctx.from?.language_code || null,
      })
    }

    // Сохраняем сообщение
    const savedMessage = await saveMessage({
      message_id: messageId,
      chat_id: chatId,
      user_id: userId!,
      text,
    })

    // Анализируем эмоции
    const analysis = await analyzeEmotion(text)

    // Сохраняем анализ эмоций
    const savedAnalysis = await saveEmotionAnalysis({
      message_id: savedMessage.id,
      emotion: analysis.emotion,
      confidence: analysis.confidence,
      severity: analysis.severity,
      aggression_score: analysis.categories.aggression,
      stress_score: analysis.categories.stress,
      sarcasm_score: analysis.categories.sarcasm,
      toxicity_score: analysis.categories.toxicity,
      positivity_score: analysis.categories.positivity,
      model_used: analysis.modelUsed,
    })

    // Создаем инцидент если необходимо
    if (analysis.severity === "high" || analysis.severity === "critical") {
      const incident = await createIncident({
        chat_id: chatId,
        user_id: userId!,
        message_id: savedMessage.id,
        emotion_analysis_id: savedAnalysis.id,
        severity: analysis.severity,
        status: "open",
      })

      // Уведомляем HR при критических инцидентах
      if (analysis.severity === "critical") {
        await notifyHR(chatId, {
          username,
          emotion: analysis.emotion,
          severity: analysis.severity,
          message: text,
          categories: analysis.categories,
        })
      }

      // Получаем настройки модерации
      const settings = await getModerationSettings(chatId)

      // Автоматическая модерация
      if (settings?.auto_block && analysis.categories.toxicity > (settings.toxicity_threshold || 85)) {
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

    console.log(
      `[${new Date().toISOString()}] Chat: ${chatId}, User: ${userId}, Emotion: ${analysis.emotion}, Confidence: ${analysis.confidence}%, Model: ${analysis.modelUsed}`,
    )
  } catch (error) {
    console.error("Ошибка обработки сообщения:", error)
  }
})

// Обработка добавления бота в группу
bot.on("my_chat_member", async (ctx) => {
  const update = ctx.update.my_chat_member
  if (update.new_chat_member.status === "member" || update.new_chat_member.status === "administrator") {
    const welcomeMessage = `🤖 *EmoBot подключен к чату!*

Привет! Теперь я буду анализировать эмоции в ваших сообщениях с помощью ИИ.

*Что я умею:*
• 🧠 Анализирую тональность с помощью GPT-4
• ⚠️ Предупреждаю о конфликтах
• 🛡️ Модерирую токсичный контент
• 📈 Веду статистику команды

Используйте /help для получения справки.`

    await ctx.reply(welcomeMessage, { parse_mode: "Markdown" })
  }
})

bot.catch((err) => {
  console.error("Ошибка бота:", err)
})

export const POST = webhookCallback(bot, "std/http")
