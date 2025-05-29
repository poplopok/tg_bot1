"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Bot, MessageSquare, Users, Activity, Settings, ExternalLink, RefreshCw } from 'lucide-react'

interface BotStats {
  totalChats: number
  totalMessages: number
  totalUsers: number
  emotionDistribution: Record<string, number>
  incidents: Array<{
    id: string
    chatTitle: string
    username: string
    message: string
    emotion: string
    severity: string
    timestamp: string
    categories: {
      aggression: number
      stress: number
      sarcasm: number
      toxicity: number
      positivity: number
    }
  }>
  teamStats: Array<{
    name: string
    members: number
    emotionScore: number
    trend: string
    incidents: number
  }>
  riskUsers: Array<{
    userId: number
    username: string
    team: string
    riskLevel: string
    incidents: number
  }>
}

export default function BotDashboard() {
  const [stats, setStats] = useState<BotStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    fetchStats()
    // Обновляем статистику каждые 30 секунд
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetStats = async () => {
    try {
      const response = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_stats" }),
      })
      const result = await response.json()
      if (result.success) {
        await fetchStats()
      }
    } catch (error) {
      console.error("Ошибка сброса статистики:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Ошибка загрузки данных</p>
          <Button onClick={fetchStats} className="mt-4">
            Попробовать снова
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">EmoBot Dashboard</h1>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Активен в {stats.totalChats} чатах
            </Badge>
            {lastUpdate && (
              <Badge variant="outline" className="text-xs">
                Обновлено: {lastUpdate.toLocaleTimeString("ru-RU")}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={fetchStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
            <Button variant="outline" size="sm" onClick={resetStats}>
              Сбросить статистику
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Настройки
            </Button>
            <Button size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Открыть бота
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активных чатов</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalChats}</div>
              <p className="text-xs text-muted-foreground">Корпоративные группы</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Сообщений обработано</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Всего проанализировано</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Пользователей</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Активных сотрудников</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Инциденты</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.incidents.length}</div>
              <p className="text-xs text-muted-foreground">Требуют внимания</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="incidents">Инциденты</TabsTrigger>
            <TabsTrigger value="teams">Команды</TabsTrigger>
            <TabsTrigger value="setup">Настройка</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Emotion Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Распределение эмоций</CardTitle>
                  <CardDescription>Анализ тональности сообщений</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(stats.emotionDistribution).map(([emotion, percentage]) => {
                    const emoji =
                      emotion === "positivity"
                        ? "😊"
                        : emotion === "neutral"
                          ? "😐"
                          : emotion === "aggression"
                            ? "😡"
                            : emotion === "stress"
                              ? "😰"
                              : "😏"

                    return (
                      <div key={emotion} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{emoji}</span>
                          <span className="text-sm capitalize">{emotion}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{percentage}%</span>
                          <Progress value={percentage} className="w-20" />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Recent Incidents */}
              <Card>
                <CardHeader>
                  <CardTitle>Последние инциденты</CardTitle>
                  <CardDescription>Требуют внимания HR</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.incidents.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Инцидентов пока нет</p>
                        <p className="text-xs">Это хорошо! 😊</p>
                      </div>
                    ) : (
                      stats.incidents.slice(0, 3).map((incident) => (
                        <div key={incident.id} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {incident.emotion === "aggression"
                                ? "Агрессия"
                                : incident.emotion === "stress"
                                  ? "Стресс"
                                  : incident.emotion === "sarcasm"
                                    ? "Сарказм"
                                    : incident.emotion}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {incident.chatTitle} • @{incident.username} •{" "}
                              {new Date(incident.timestamp).toLocaleString("ru-RU")}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">"{incident.message.substring(0, 50)}..."</p>
                          </div>
                          <Badge variant={incident.severity === "critical" ? "destructive" : "secondary"}>
                            {incident.severity}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Все инциденты</CardTitle>
                <CardDescription>Полный журнал нарушений</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.incidents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Инцидентов не зарегистрировано</h3>
                      <p>Отличная работа! Атмосфера в командах позитивная.</p>
                    </div>
                  ) : (
                    stats.incidents.map((incident) => (
                      <div key={incident.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Badge variant={incident.severity === "critical" ? "destructive" : "secondary"}>
                              {incident.emotion}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {incident.chatTitle} • @{incident.username} •{" "}
                              {new Date(incident.timestamp).toLocaleString("ru-RU")}
                            </span>
                          </div>
                          <Badge variant="outline">{incident.severity}</Badge>
                        </div>
                        <p className="text-sm bg-gray-50 p-3 rounded italic">"{incident.message}"</p>
                        <div className="flex space-x-2 mt-3">
                          <Button size="sm" variant="outline">
                            Связаться с HR
                          </Button>
                          <Button size="sm" variant="outline">
                            Отметить как решено
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Статистика по командам</CardTitle>
                <CardDescription>Эмоциональный климат в отделах</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.teamStats.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Команды пока не добавлены</h3>
                      <p>Добавьте бота в групповые чаты для начала мониторинга.</p>
                    </div>
                  ) : (
                    stats.teamStats.map((team) => (
                      <div key={team.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <div>
                            <p className="font-medium">{team.name}</p>
                            <p className="text-xs text-muted-foreground">{team.members} сотрудников</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Progress value={team.emotionScore} className="w-24" />
                          <span className="text-sm font-medium w-8">{team.emotionScore}%</span>
                          <Badge
                            variant={
                              team.trend === "up" ? "default" : team.trend === "down" ? "destructive" : "secondary"
                            }
                          >
                            {team.trend === "up" ? "↗" : team.trend === "down" ? "↘" : "→"}
                          </Badge>
                          {team.incidents > 0 && <Badge variant="destructive">{team.incidents}</Badge>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Инструкция по настройке</CardTitle>
                  <CardDescription>Как подключить бота к корпоративным чатам</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Найдите бота</p>
                        <p className="text-sm text-muted-foreground">Найдите @emo_analyzer_bot в Telegram</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Добавьте в группу</p>
                        <p className="text-sm text-muted-foreground">Добавьте бота в корпоративный чат</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Дайте права администратора</p>
                        <p className="text-sm text-muted-foreground">Для модерации сообщений</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                        4
                      </div>
                      <div>
                        <p className="font-medium">Начните общение</p>
                        <p className="text-sm text-muted-foreground">Бот автоматически начнет анализ</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Команды бота</CardTitle>
                  <CardDescription>Основные команды для работы</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">/start</code>
                    <p className="text-sm text-muted-foreground">Запуск и приветствие</p>
                  </div>

                  <div className="space-y-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">/stats</code>
                    <p className="text-sm text-muted-foreground">Статистика эмоций в чате</p>
                  </div>

                  <div className="space-y-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">/report</code>
                    <p className="text-sm text-muted-foreground">Детальный отчет по команде</p>
                  </div>

                  <div className="space-y-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">/settings</code>
                    <p className="text-sm text-muted-foreground">Настройки (только админы)</p>
                  </div>

                  <div className="space-y-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">/help</code>
                    <p className="text-sm text-muted-foreground">Справка по командам</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
