"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bot, Brain, CheckCircle, AlertTriangle } from "lucide-react"

interface TestResult {
  success: boolean
  text: string
  result: any
  hasHuggingFaceKey: boolean
  modelUsed: string
  error?: string
}

export default function TestEmotions() {
  const [testText, setTestText] = useState("дебил")
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const testCases = [
    "дебил",
    "Ты что, дурак?!",
    "Это отличная работа, спасибо!",
    "Я не успеваю к дедлайну, у меня паника!",
    "Да, конечно, отличная идея... 🙄",
    "ТЫ ЧТО ТВОРИШЬ?! НЕМЕДЛЕННО ПРЕКРАТИ!!!",
    "Спасибо за помощь, очень ценю! 👍",
    "Нормально, работаем дальше.",
  ]

  const testEmotion = async (text: string, model: "advanced" | "local" = "advanced") => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        text,
        result: null,
        hasHuggingFaceKey: false,
        modelUsed: model,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Тестирование анализа эмоций</h1>
          </div>
          <p className="text-gray-600">Проверьте работу продвинутого NLP анализа эмоций с множественными моделями</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Панель тестирования */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>Тестирование</span>
              </CardTitle>
              <CardDescription>Введите текст для анализа эмоций</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Текст для анализа:</label>
                <Textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Введите текст для анализа..."
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={() => testEmotion(testText, "advanced")} disabled={loading}>
                  {loading ? "Анализируем..." : "Продвинутый анализ"}
                </Button>
                <Button variant="outline" onClick={() => testEmotion(testText, "local")} disabled={loading}>
                  Локальный анализ
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Быстрые тесты:</p>
                <div className="grid grid-cols-2 gap-2">
                  {testCases.map((testCase, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTestText(testCase)
                        testEmotion(testCase, "advanced")
                      }}
                      disabled={loading}
                    >
                      {testCase.length > 20 ? `${testCase.substring(0, 20)}...` : testCase}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Результаты */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Результаты анализа</span>
              </CardTitle>
              <CardDescription>Детальные результаты NLP анализа</CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Выберите текст для анализа</p>
                </div>
              ) : result.success ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={result.hasHuggingFaceKey ? "default" : "secondary"}>
                      {result.hasHuggingFaceKey ? "Hugging Face ✓" : "Локальный анализ"}
                    </Badge>
                    <Badge variant="outline">{result.modelUsed}</Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Анализируемый текст:</p>
                    <p className="p-2 bg-gray-100 rounded italic">"{result.text}"</p>
                  </div>

                  <Tabs defaultValue="emotion" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="emotion">Эмоции</TabsTrigger>
                      <TabsTrigger value="nlp">NLP</TabsTrigger>
                      <TabsTrigger value="debug">Отладка</TabsTrigger>
                    </TabsList>

                    <TabsContent value="emotion" className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Доминирующая эмоция:</span>
                          <Badge
                            variant={
                              result.result.sentiment?.emotion === "aggression"
                                ? "destructive"
                                : result.result.sentiment?.emotion === "positivity"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {result.result.sentiment?.emotion} ({result.result.sentiment?.confidence?.toFixed(1)}%)
                          </Badge>
                        </div>

                        {result.result.sentiment?.categories && (
                          <div className="space-y-2">
                            <p className="font-medium">Детальный анализ:</p>
                            {Object.entries(result.result.sentiment.categories).map(([emotion, value]) => (
                              <div key={emotion} className="flex items-center justify-between">
                                <span className="text-sm capitalize">{emotion}:</span>
                                <div className="flex items-center space-x-2">
                                  <Progress value={value as number} className="w-20" />
                                  <span className="text-sm font-medium w-8">{value}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="nlp" className="space-y-4">
                      {result.result.correctedText !== result.result.originalText && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Исправленный текст:</p>
                          <p className="p-2 bg-blue-50 rounded">{result.result.correctedText}</p>
                        </div>
                      )}

                      {result.result.normalizedText !== result.result.correctedText && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Нормализованный текст:</p>
                          <p className="p-2 bg-green-50 rounded">{result.result.normalizedText}</p>
                        </div>
                      )}

                      {result.result.slangDetected?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Обнаруженный сленг:</p>
                          <div className="flex flex-wrap gap-1">
                            {result.result.slangDetected.map((slang: string, index: number) => (
                              <Badge key={index} variant="outline">
                                {slang}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.result.errorsFixed?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Исправленные ошибки:</p>
                          <div className="flex flex-wrap gap-1">
                            {result.result.errorsFixed.map((error: string, index: number) => (
                              <Badge key={index} variant="outline">
                                {error}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Использованные модели:</p>
                        <div className="flex flex-wrap gap-1">
                          {result.result.modelUsed?.map((model: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {model}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="debug" className="space-y-4">
                      {result.result.foundWords && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Найденные ключевые слова:</p>
                          <div className="flex flex-wrap gap-1">
                            {result.result.foundWords.map((word: string, index: number) => (
                              <Badge key={index} variant="outline">
                                {word}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.result.analysisDetails && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Детали анализа:</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Восклицания: {result.result.analysisDetails.exclamationCount}</div>
                            <div>КАПС: {result.result.analysisDetails.upperCaseRatio}%</div>
                            <div>Длина: {result.result.analysisDetails.textLength} символов</div>
                            <div>Слов: {result.result.analysisDetails.wordsCount}</div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Полный результат:</p>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600">Ошибка анализа</p>
                  <p className="text-sm text-gray-500">{result.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Системная информация */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Системная информация</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Модель анализа:</p>
                <p>{process.env.EMOTION_MODEL || "advanced"}</p>
              </div>
              <div>
                <p className="font-medium">Hugging Face API:</p>
                <p>{result?.hasHuggingFaceKey ? "✅ Подключен" : "❌ Не настроен"}</p>
              </div>
              <div>
                <p className="font-medium">Тестовое слово:</p>
                <p>дебил (должно быть агрессией)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
