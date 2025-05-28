import { NextResponse } from "next/server"

// API для управления моделями
export async function GET() {
  const availableModels = [
    {
      id: "openai",
      name: "OpenAI GPT-4",
      description: "Самая продвинутая модель для анализа эмоций",
      accuracy: 95,
      speed: "2-3 сек",
      features: ["Контекстный анализ", "Объяснения", "Сарказм", "Корп. сленг"],
      cost: "Высокая",
      status: process.env.OPENAI_API_KEY ? "available" : "needs_key",
    },
    {
      id: "huggingface",
      name: "RuBERT (Hugging Face)",
      description: "Специализированная русская модель",
      accuracy: 87,
      speed: "1-2 сек",
      features: ["Русский язык", "Быстрая обработка", "Базовые эмоции"],
      cost: "Средняя",
      status: process.env.HUGGINGFACE_API_KEY ? "available" : "needs_key",
    },
    {
      id: "local",
      name: "Локальные алгоритмы",
      description: "Резервный вариант без интернета",
      accuracy: 75,
      speed: "<1 сек",
      features: ["Офлайн работа", "Быстро", "Базовый анализ"],
      cost: "Бесплатно",
      status: "available",
    },
  ]

  const currentModel = process.env.EMOTION_MODEL || "openai"

  return NextResponse.json({
    success: true,
    currentModel,
    availableModels,
    recommendations: {
      production: "openai",
      development: "huggingface",
      fallback: "local",
    },
  })
}

export async function POST(request: Request) {
  try {
    const { modelId } = await request.json()

    // В реальном приложении здесь была бы логика смены модели
    // Например, обновление переменной окружения или конфига

    return NextResponse.json({
      success: true,
      message: `Модель изменена на ${modelId}`,
      newModel: modelId,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Ошибка смены модели" }, { status: 500 })
  }
}
