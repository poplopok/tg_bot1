import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { Message, Incident, RiskUser, ChatStat } from "@/lib/supabase"

// Функция для обновления статистики в Supabase
export async function updateGlobalStats(data: {
  chatId: number
  chatTitle?: string
  userId: number
  username?: string
  emotion: string
  analysis: any
  isIncident?: boolean
}) {
  try {
    // 1. Сохраняем сообщение
    const messageData: Message = {
      chat_id: data.chatId,
      chat_title: data.chatTitle,
      user_id: data.userId,
      username: data.username,
      message_text: data.analysis.originalMessage || "Сообщение скрыто",
      emotion: data.emotion,
      confidence: data.analysis.confidence || 0,
      severity: data.analysis.severity || "low",
      categories: data.analysis.categories || {
        aggression: 0,
        stress: 0,
        sarcasm: 0,
        toxicity: 0,
        positivity: 0,
      },
      model_used: data.analysis.modelUsed || "local",
    }

    const { error: messageError } = await supabase.from("messages").insert([messageData])

    if (messageError) {
      console.error("Ошибка сохранения сообщения:", messageError)
    }

    // 2. Обновляем статистику чата
    const { data: existingChatStat } = await supabase
      .from("chat_stats")
      .select("*")
      .eq("chat_id", data.chatId)
      .single()

    if (existingChatStat) {
      // Обновляем существующую статистику
      const newEmotionStats = { ...existingChatStat.emotion_stats }
      newEmotionStats[data.emotion] = (newEmotionStats[data.emotion] || 0) + 1

      await supabase
        .from("chat_stats")
        .update({
          total_messages: existingChatStat.total_messages + 1,
          emotion_stats: newEmotionStats,
          last_activity: new Date().toISOString(),
        })
        .eq("chat_id", data.chatId)
    } else {
      // Создаем новую статистику
      const newChatStat: ChatStat = {
        chat_id: data.chatId,
        chat_title: data.chatTitle,
        total_messages: 1,
        emotion_stats: { [data.emotion]: 1 },
      }

      await supabase.from("chat_stats").insert([newChatStat])
    }

    // 3. Сохраняем инцидент если есть
    if (data.isIncident) {
      const incidentData: Incident = {
        chat_id: data.chatId,
        chat_title: data.chatTitle,
        user_id: data.userId,
        username: data.username,
        message_text: data.analysis.originalMessage || "Сообщение скрыто",
        emotion: data.emotion,
        severity: data.analysis.severity || "medium",
        categories: data.analysis.categories || {
          aggression: 0,
          stress: 0,
          sarcasm: 0,
          toxicity: 0,
          positivity: 0,
        },
      }

      const { error: incidentError } = await supabase.from("incidents").insert([incidentData])

      if (incidentError) {
        console.error("Ошибка сохранения инцидента:", incidentError)
      }

      // 4. Обновляем пользователя группы риска
      const { data: existingRiskUser } = await supabase
        .from("risk_users")
        .select("*")
        .eq("user_id", data.userId)
        .single()

      if (existingRiskUser) {
        const newIncidentsCount = existingRiskUser.incidents_count + 1
        let newRiskLevel = existingRiskUser.risk_level

        if (newIncidentsCount >= 5) newRiskLevel = "high"
        else if (newIncidentsCount >= 2) newRiskLevel = "medium"

        await supabase
          .from("risk_users")
          .update({
            incidents_count: newIncidentsCount,
            risk_level: newRiskLevel,
            last_incident: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", data.userId)
      } else {
        const newRiskUser: RiskUser = {
          user_id: data.userId,
          username: data.username,
          team: data.chatTitle,
          risk_level: "low",
          incidents_count: 1,
          last_incident: new Date().toISOString(),
        }

        await supabase.from("risk_users").insert([newRiskUser])
      }
    }
  } catch (error) {
    console.error("Ошибка обновления статистики:", error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "7d"

    // Вычисляем дату начала периода
    const startDate = new Date()
    if (period === "7d") startDate.setDate(startDate.getDate() - 7)
    else if (period === "30d") startDate.setDate(startDate.getDate() - 30)
    else startDate.setDate(startDate.getDate() - 7)

    // 1. Получаем общую статистику
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .gte("created_at", startDate.toISOString())

    const { data: incidents } = await supabase
      .from("incidents")
      .select("*")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(10)

    const { data: chatStats } = await supabase.from("chat_stats").select("*")

    const { data: riskUsers } = await supabase
      .from("risk_users")
      .select("*")
      .neq("risk_level", "low")

    // 2. Вычисляем метрики
    const totalChats = new Set(messages?.map((m) => m.chat_id) || []).size
    const totalMessages = messages?.length || 0
    const totalUsers = new Set(messages?.map((m) => m.user_id) || []).size

    // 3. Распределение эмоций
    const emotionCounts: Record<string, number> = {}
    messages?.forEach((message) => {
      emotionCounts[message.emotion] = (emotionCounts[message.emotion] || 0) + 1
    })

    const totalEmotions = Object.values(emotionCounts).reduce((a, b) => a + b, 0)
    const emotionDistribution: Record<string, number> = {}
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      emotionDistribution[emotion] = totalEmotions > 0 ? Math.round((count / totalEmotions) * 100) : 0
    })

    // 4. Статистика команд
    const teamStats = chatStats?.map((chat) => ({
      name: chat.chat_title || `Чат ${chat.chat_id}`,
      members: 0, // Можно вычислить из уникальных пользователей
      emotionScore: 70, // Можно вычислить на основе эмоций
      trend: "stable" as const,
      incidents: incidents?.filter((i) => i.chat_id === chat.chat_id).length || 0,
    })) || []

    const responseData = {
      totalChats,
      totalMessages,
      totalUsers,
      emotionDistribution,
      incidents: incidents?.map((incident) => ({
        id: incident.id?.toString() || "",
        chatTitle: incident.chat_title || `Чат ${incident.chat_id}`,
        username: incident.username || `User ${incident.user_id}`,
        message: incident.message_text,
        emotion: incident.emotion,
        severity: incident.severity,
        timestamp: incident.created_at || new Date().toISOString(),
        categories: incident.categories,
      })) || [],
      teamStats,
      riskUsers: riskUsers?.map((user) => ({
        userId: user.user_id,
        username: user.username || `User ${user.user_id}`,
        team: user.team || "Неизвестно",
        riskLevel: user.risk_level,
        incidents: user.incidents_count,
      })) || [],
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      period,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Ошибка получения статистики:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка получения данных из базы",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case "update_stats":
        await updateGlobalStats(data)
        return NextResponse.json({ success: true, message: "Статистика обновлена" })

      case "resolve_incident":
        const { error } = await supabase
          .from("incidents")
          .update({ resolved: true })
          .eq("id", data.incidentId)

        if (error) {
          throw error
        }

        return NextResponse.json({ success: true, message: "Инцидент отмечен как решенный" })

      case "reset_stats":
        // Очищаем все таблицы (только для тестирования!)
        await supabase.from("messages").delete().neq("id", 0)
        await supabase.from("incidents").delete().neq("id", 0)
        await supabase.from("risk_users").delete().neq("user_id", 0)
        await supabase.from("chat_stats").delete().neq("chat_id", 0)

        return NextResponse.json({ success: true, message: "Статистика сброшена" })

      default:
        return NextResponse.json({ success: false, error: "Неизвестное действие" }, { status: 400 })
    }
  } catch (error) {
    console.error("Ошибка API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка обработки запроса",
      },
      { status: 500 },
    )
  }
}
