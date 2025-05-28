import { type NextRequest, NextResponse } from "next/server"

// Имитация данных (в продакшене использовать базу данных)
const mockStats = {
  totalChats: 23,
  totalMessages: 12847,
  totalUsers: 156,
  emotionDistribution: {
    positivity: 68,
    neutral: 25,
    aggression: 4,
    stress: 2,
    sarcasm: 1,
  },
  incidents: [
    {
      id: "1",
      chatId: -1001234567890,
      chatTitle: "Разработка",
      userId: 123456789,
      username: "alexey_k",
      message: "Это полный бред, кто это вообще придумал?!",
      emotion: "aggression",
      severity: "high",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      chatId: -1001234567891,
      chatTitle: "Маркетинг",
      userId: 987654321,
      username: "maria_s",
      message: "Ну конечно, отличная идея 👏",
      emotion: "sarcasm",
      severity: "medium",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ],
  teamStats: [
    { name: "Разработка", members: 12, emotionScore: 85, trend: "up", incidents: 3 },
    { name: "Маркетинг", members: 8, emotionScore: 72, trend: "down", incidents: 1 },
    { name: "Продажи", members: 15, emotionScore: 91, trend: "up", incidents: 0 },
    { name: "HR", members: 5, emotionScore: 88, trend: "stable", incidents: 0 },
    { name: "Поддержка", members: 10, emotionScore: 65, trend: "down", incidents: 2 },
  ],
  riskUsers: [
    { userId: 123456789, username: "alexey_k", team: "Разработка", riskLevel: "high", incidents: 5 },
    { userId: 555666777, username: "ivan_p", team: "Поддержка", riskLevel: "medium", incidents: 2 },
  ],
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "7d"

  // В реальном приложении здесь был бы запрос к базе данных
  // с фильтрацией по периоду

  return NextResponse.json({
    success: true,
    data: mockStats,
    period,
    generatedAt: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, chatId, userId } = body

    // Обработка административных действий
    switch (action) {
      case "resolve_incident":
        // Отметить инцидент как решенный
        return NextResponse.json({ success: true, message: "Инцидент отмечен как решенный" })

      case "warn_user":
        // Отправить предупреждение пользователю
        return NextResponse.json({ success: true, message: "Предупреждение отправлено" })

      case "generate_report":
        // Сгенерировать отчет
        const report = {
          id: Date.now().toString(),
          period: "7d",
          generatedAt: new Date().toISOString(),
          summary: {
            totalIncidents: mockStats.incidents.length,
            criticalIncidents: mockStats.incidents.filter((i) => i.severity === "critical").length,
            improvementAreas: ["Команда поддержки", "Отдел разработки"],
            recommendations: [
              "Провести тимбилдинг для команды поддержки",
              "Организовать тренинг по управлению стрессом",
              "Пересмотреть рабочую нагрузку в отделе разработки",
            ],
          },
        }
        return NextResponse.json({ success: true, report })

      default:
        return NextResponse.json({ success: false, error: "Неизвестное действие" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка обработки запроса",
      },
      { status: 500 },
    )
  }
}
