import { supabaseAdmin } from "./supabase"
import type { Chat, User, Message, EmotionAnalysis, Incident, ModerationSettings } from "./supabase"

// Функции для работы с чатами
export async function upsertChat(chatData: Partial<Chat>) {
  const { data, error } = await supabaseAdmin.from("chats").upsert(chatData, { onConflict: "id" }).select().single()

  if (error) throw error
  return data
}

export async function getActiveChats() {
  const { data, error } = await supabaseAdmin.from("chats").select("*").eq("is_active", true)

  if (error) throw error
  return data
}

// Функции для работы с пользователями
export async function upsertUser(userData: Partial<User>) {
  const { data, error } = await supabaseAdmin.from("users").upsert(userData, { onConflict: "id" }).select().single()

  if (error) throw error
  return data
}

export async function getUserStats(userId: number, chatId: number) {
  const { data, error } = await supabaseAdmin
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .eq("chat_id", chatId)
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data
}

// Функции для работы с сообщениями
export async function saveMessage(messageData: Omit<Message, "id" | "created_at">) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .upsert(messageData, { onConflict: "chat_id,message_id" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Функции для работы с анализом эмоций
export async function saveEmotionAnalysis(analysisData: Omit<EmotionAnalysis, "id" | "created_at">) {
  const { data, error } = await supabaseAdmin.from("emotion_analyses").insert(analysisData).select().single()

  if (error) throw error
  return data
}

// Функции для работы с инцидентами
export async function createIncident(incidentData: Omit<Incident, "id" | "created_at">) {
  const { data, error } = await supabaseAdmin.from("incidents").insert(incidentData).select().single()

  if (error) throw error
  return data
}

export async function getRecentIncidents(limit = 10) {
  const { data, error } = await supabaseAdmin
    .from("incidents")
    .select(`
      *,
      chats(title),
      users(username, first_name),
      messages(text),
      emotion_analyses(emotion, confidence, toxicity_score, model_used)
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getIncidentsByChat(chatId: number, limit = 50) {
  const { data, error } = await supabaseAdmin
    .from("incidents")
    .select(`
      *,
      users(username, first_name),
      messages(text),
      emotion_analyses(emotion, confidence, toxicity_score)
    `)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// Функции для получения статистики
export async function getDashboardStats() {
  // Общая статистика
  const [chatsResult, usersResult, messagesResult, incidentsResult] = await Promise.all([
    supabaseAdmin.from("chats").select("id", { count: "exact" }).eq("is_active", true),
    supabaseAdmin.from("users").select("id", { count: "exact" }),
    supabaseAdmin.from("messages").select("id", { count: "exact" }),
    supabaseAdmin.from("incidents").select("id", { count: "exact" }).eq("status", "open"),
  ])

  // Статистика эмоций за последние 24 часа
  const { data: emotionStats, error: emotionError } = await supabaseAdmin
    .from("emotion_analyses")
    .select("emotion, positivity_score, toxicity_score, aggression_score, stress_score, sarcasm_score")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (emotionError) throw emotionError

  // Подсчет распределения эмоций
  const emotionDistribution =
    emotionStats?.reduce(
      (acc, analysis) => {
        // Определяем доминирующую эмоцию
        const scores = {
          positivity: analysis.positivity_score,
          aggression: analysis.aggression_score,
          stress: analysis.stress_score,
          sarcasm: analysis.sarcasm_score,
          neutral:
            100 -
            Math.max(
              analysis.positivity_score,
              analysis.aggression_score,
              analysis.stress_score,
              analysis.sarcasm_score,
            ),
        }

        const dominantEmotion = Object.entries(scores).reduce((a, b) =>
          scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b,
        )[0]

        acc[dominantEmotion] = (acc[dominantEmotion] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ) || {}

  // Конвертируем в проценты
  const totalAnalyses = emotionStats?.length || 1
  Object.keys(emotionDistribution).forEach((emotion) => {
    emotionDistribution[emotion] = Math.round((emotionDistribution[emotion] / totalAnalyses) * 100)
  })

  return {
    totalChats: chatsResult.count || 0,
    totalUsers: usersResult.count || 0,
    totalMessages: messagesResult.count || 0,
    openIncidents: incidentsResult.count || 0,
    emotionDistribution,
  }
}

export async function getTeamStats() {
  const { data, error } = await supabaseAdmin
    .from("chats")
    .select(`
      id,
      title,
      member_count,
      user_stats(
        incident_count,
        avg_positivity,
        avg_toxicity,
        risk_level
      )
    `)
    .eq("is_active", true)

  if (error) throw error

  return (
    data?.map((chat) => {
      const stats = chat.user_stats || []
      const avgEmotionScore =
        stats.length > 0 ? Math.round(stats.reduce((sum, stat) => sum + stat.avg_positivity, 0) / stats.length) : 0

      const totalIncidents = stats.reduce((sum, stat) => sum + stat.incident_count, 0)

      return {
        name: chat.title || `Чат ${chat.id}`,
        members: chat.member_count,
        emotionScore: avgEmotionScore,
        trend: avgEmotionScore > 70 ? "up" : avgEmotionScore < 50 ? "down" : "stable",
        incidents: totalIncidents,
      }
    }) || []
  )
}

export async function getRiskUsers() {
  const { data, error } = await supabaseAdmin
    .from("user_stats")
    .select(`
      user_id,
      incident_count,
      risk_level,
      users(username, first_name),
      chats(title)
    `)
    .in("risk_level", ["medium", "high"])
    .order("incident_count", { ascending: false })
    .limit(10)

  if (error) throw error

  return (
    data?.map((stat) => ({
      userId: stat.user_id,
      username: stat.users?.username || stat.users?.first_name || `User ${stat.user_id}`,
      team: stat.chats?.title || "Неизвестно",
      riskLevel: stat.risk_level,
      incidents: stat.incident_count,
    })) || []
  )
}

// Функция для получения статистики чата
export async function getChatStats(chatId: number, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [messagesResult, emotionResult, incidentsResult] = await Promise.all([
    supabaseAdmin.from("messages").select("id", { count: "exact" }).eq("chat_id", chatId).gte("created_at", startDate),

    supabaseAdmin
      .from("emotion_analyses")
      .select(`
        emotion,
        positivity_score,
        toxicity_score,
        aggression_score,
        stress_score,
        sarcasm_score,
        messages!inner(chat_id)
      `)
      .eq("messages.chat_id", chatId)
      .gte("created_at", startDate),

    supabaseAdmin.from("incidents").select("id", { count: "exact" }).eq("chat_id", chatId).eq("status", "open"),
  ])

  const totalMessages = messagesResult.count || 0
  const emotionAnalyses = emotionResult.data || []
  const openIncidents = incidentsResult.count || 0

  // Подсчитываем распределение эмоций
  const emotionDistribution = emotionAnalyses.reduce(
    (acc, analysis) => {
      acc[analysis.emotion] = (acc[analysis.emotion] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Конвертируем в проценты
  Object.keys(emotionDistribution).forEach((emotion) => {
    emotionDistribution[emotion] = Math.round((emotionDistribution[emotion] / emotionAnalyses.length) * 100)
  })

  // Средние показатели
  const avgPositivity =
    emotionAnalyses.length > 0
      ? emotionAnalyses.reduce((sum, a) => sum + a.positivity_score, 0) / emotionAnalyses.length
      : 0

  const avgToxicity =
    emotionAnalyses.length > 0
      ? emotionAnalyses.reduce((sum, a) => sum + a.toxicity_score, 0) / emotionAnalyses.length
      : 0

  return {
    totalMessages,
    totalAnalyses: emotionAnalyses.length,
    openIncidents,
    emotionDistribution,
    avgPositivity: Math.round(avgPositivity),
    avgToxicity: Math.round(avgToxicity),
  }
}

// Функции для настроек модерации
export async function getModerationSettings(chatId: number) {
  const { data, error } = await supabaseAdmin.from("moderation_settings").select("*").eq("chat_id", chatId).single()

  if (error && error.code !== "PGRST116") throw error
  return data
}

export async function upsertModerationSettings(settings: Partial<ModerationSettings>) {
  const { data, error } = await supabaseAdmin
    .from("moderation_settings")
    .upsert(settings, { onConflict: "chat_id" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Функция для получения детальной статистики по периоду
export async function getDetailedStats(period = "7d") {
  const days = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 7
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [incidents, emotionStats] = await Promise.all([
    getRecentIncidents(50),
    supabaseAdmin.from("emotion_analyses").select("*").gte("created_at", startDate),
  ])

  return {
    incidents: incidents || [],
    emotionStats: emotionStats.data || [],
    period,
    generatedAt: new Date().toISOString(),
  }
}
