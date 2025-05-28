import { type NextRequest, NextResponse } from "next/server"
import { getDashboardStats, getRecentIncidents, getTeamStats, getRiskUsers, getDetailedStats } from "@/lib/database"
import { supabaseAdmin } from "@/lib/supabaseAdmin" // Declare the supabaseAdmin variable

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "7d"

  try {
    // Получаем реальную статистику из базы данных
    const [dashboardStats, incidents, teamStats, riskUsers] = await Promise.all([
      getDashboardStats(),
      getRecentIncidents(10),
      getTeamStats(),
      getRiskUsers(),
    ])

    // Форматируем инциденты для фронтенда
    const formattedIncidents = incidents.map((incident) => ({
      id: incident.id,
      chatId: incident.chat_id,
      chatTitle: incident.chats?.title || `Чат ${incident.chat_id}`,
      userId: incident.user_id,
      username: incident.users?.username || incident.users?.first_name || `User ${incident.user_id}`,
      message: incident.messages?.text || "",
      emotion: incident.emotion_analyses?.emotion || "unknown",
      severity: incident.severity,
      timestamp: incident.created_at,
      confidence: incident.emotion_analyses?.confidence || 0,
      toxicity: incident.emotion_analyses?.toxicity_score || 0,
    }))

    const stats = {
      totalChats: dashboardStats.totalChats,
      totalMessages: dashboardStats.totalMessages,
      totalUsers: dashboardStats.totalUsers,
      emotionDistribution: dashboardStats.emotionDistribution,
      incidents: formattedIncidents,
      teamStats,
      riskUsers,
    }

    return NextResponse.json({
      success: true,
      data: stats,
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
    const { action, incidentId, userId } = body

    switch (action) {
      case "resolve_incident":
        const { error } = await supabaseAdmin
          .from("incidents")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            resolved_by: userId,
          })
          .eq("id", incidentId)

        if (error) throw error
        return NextResponse.json({ success: true, message: "Инцидент отмечен как решенный" })

      case "generate_report":
        const reportData = await getDetailedStats("7d")
        const report = {
          id: Date.now().toString(),
          period: "7d",
          generatedAt: new Date().toISOString(),
          summary: {
            totalIncidents: reportData.incidents.length,
            criticalIncidents: reportData.incidents.filter((i) => i.severity === "critical").length,
            improvementAreas: reportData.incidents.length > 10 ? ["Высокая конфликтность"] : [],
            recommendations: [
              "Провести тимбилдинг для команды",
              "Организовать тренинг по управлению стрессом",
              "Пересмотреть рабочую нагрузку",
            ],
          },
        }
        return NextResponse.json({ success: true, report })

      default:
        return NextResponse.json({ success: false, error: "Неизвестное действие" }, { status: 400 })
    }
  } catch (error) {
    console.error("Ошибка обработки запроса:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка обработки запроса",
      },
      { status: 500 },
    )
  }
}
