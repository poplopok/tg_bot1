// Система управления статистикой чатов в памяти

interface UserRisk {
  userId: number
  username?: string
  riskLevel: "low" | "medium" | "high"
  incidents: number
  lastIncident?: Date
}

interface Incident {
  id: string
  userId: number
  message: string
  emotion: string
  severity: string
  timestamp: Date
}

interface ChatStatistics {
  totalMessages: number
  emotionStats: Record<string, number>
  userRisks: Map<number, UserRisk>
  incidents: Incident[]
  lastActivity?: Date
}

// Глобальное хранилище статистики чатов
export const chatStats = new Map<number, ChatStatistics>()

// Функция для получения или создания статистики чата
export function getChatStats(chatId: number): ChatStatistics {
  if (!chatStats.has(chatId)) {
    chatStats.set(chatId, {
      totalMessages: 0,
      emotionStats: {},
      userRisks: new Map<number, UserRisk>(),
      incidents: [],
      lastActivity: new Date(),
    })
  }
  return chatStats.get(chatId)!
}

// Функция для обновления статистики сообщения
export function updateMessageStats(
  chatId: number,
  userId: number,
  username: string | undefined,
  emotion: string,
  isIncident = false,
  severity = "low",
  message = "",
) {
  const stats = getChatStats(chatId)

  // Обновляем общую статистику
  stats.totalMessages++
  stats.emotionStats[emotion] = (stats.emotionStats[emotion] || 0) + 1
  stats.lastActivity = new Date()

  // Обновляем информацию о пользователе
  const userRisk = stats.userRisks.get(userId) || {
    userId,
    username,
    riskLevel: "low" as const,
    incidents: 0,
  }

  if (isIncident) {
    userRisk.incidents++
    userRisk.lastIncident = new Date()

    // Обновляем уровень риска
    if (userRisk.incidents >= 5) userRisk.riskLevel = "high"
    else if (userRisk.incidents >= 2) userRisk.riskLevel = "medium"

    // Добавляем инцидент
    const incident: Incident = {
      id: Date.now().toString(),
      userId,
      message,
      emotion,
      severity,
      timestamp: new Date(),
    }
    stats.incidents.push(incident)

    // Ограничиваем количество инцидентов в памяти
    if (stats.incidents.length > 100) {
      stats.incidents = stats.incidents.slice(-50)
    }
  }

  stats.userRisks.set(userId, userRisk)
  chatStats.set(chatId, stats)

  return stats
}

// Функция для получения статистики пользователя
export function getUserRisk(chatId: number, userId: number): UserRisk | undefined {
  const stats = chatStats.get(chatId)
  return stats?.userRisks.get(userId)
}

// Функция для получения инцидентов чата
export function getChatIncidents(chatId: number): Incident[] {
  const stats = chatStats.get(chatId)
  return stats?.incidents || []
}

// Функция для очистки старых данных
export function cleanupOldData() {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  for (const [chatId, stats] of chatStats.entries()) {
    // Удаляем старые инциденты
    stats.incidents = stats.incidents.filter((incident) => incident.timestamp > oneWeekAgo)

    // Если чат неактивен больше недели, удаляем его
    if (stats.lastActivity && stats.lastActivity < oneWeekAgo) {
      chatStats.delete(chatId)
    }
  }
}

// Функция для получения общей статистики
export function getGlobalStats() {
  const totalChats = chatStats.size
  let totalMessages = 0
  const totalUsers = new Set<number>()
  let totalIncidents = 0
  const emotionDistribution: Record<string, number> = {}

  for (const stats of chatStats.values()) {
    totalMessages += stats.totalMessages
    totalIncidents += stats.incidents.length

    // Собираем уникальных пользователей
    for (const userId of stats.userRisks.keys()) {
      totalUsers.add(userId)
    }

    // Собираем статистику эмоций
    for (const [emotion, count] of Object.entries(stats.emotionStats)) {
      emotionDistribution[emotion] = (emotionDistribution[emotion] || 0) + count
    }
  }

  return {
    totalChats,
    totalMessages,
    totalUsers: totalUsers.size,
    totalIncidents,
    emotionDistribution,
  }
}

// Автоматическая очистка каждые 6 часов
if (typeof window === "undefined") {
  // Только на сервере
  setInterval(cleanupOldData, 6 * 60 * 60 * 1000)
}

// Экспорт типов для использования в других файлах
export type { UserRisk, Incident, ChatStatistics }
