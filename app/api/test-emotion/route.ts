import { NextRequest, NextResponse } from "next/server"
import { advancedNLPAnalysis } from "@/lib/nlp-models"

// API endpoint для тестирования анализа эмоций
export async function POST(request: NextRequest) {
  try {
    const { text, model } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Текст не предоставлен" }, { status: 400 })
    }

    console.log(`[TEST API] Тестируем текст: "${text}" с моделью: ${model || "advanced"}`)

    let result

    if (model === "local" || !process.env.HUGGINGFACE_API_KEY) {
      // Тестируем локальный анализ
      result = await testLocalAnalysis(text)
    } else {
      // Тестируем продвинутый анализ
      result = await advancedNLPAnalysis(text)
    }

    return NextResponse.json({
      success: true,
      text,
      result,
      hasHuggingFaceKey: !!process.env.HUGGINGFACE_API_KEY,
      modelUsed: model || "advanced",
    })
  } catch (error) {
    console.error("Ошибка тестирования эмоций:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 },
    )
  }
}

// Локальная функция анализа для тестирования
async function testLocalAnalysis(text: string) {
  console.log(`[TEST LOCAL] Анализируем: "${text}"`)

  const lowerText = text.toLowerCase()

  // РАСШИРЕННЫЙ словарь агрессивных слов
  const aggressionWords = [
    "дебил",
    "дурак",
    "идиот",
    "тупой",
    "кретин",
    "мудак",
    "козел",
    "урод",
    "бред",
    "ерунда",
    "херня",
    "фигня",
    "говно",
    "дерьмо",
    "заткнись",
    "отвали",
    "пошел",
    "достал",
    "надоел",
    "бесит",
    "задолбал",
    "заколебал",
    "замучил",
    "сука",
    "блядь",
    "пидор",
    "гей",
    "лох",
    "чмо",
    "уебок",
  ]

  const stressWords = [
    "срочно",
    "быстрее",
    "опять",
    "не успеваем",
    "горит",
    "пожар",
    "аврал",
    "завал",
    "дедлайн",
    "вчера нужно было",
    "когда это закончится",
    "не работает",
    "сломалось",
    "глючит",
    "падает",
    "крашится",
    "виснет",
    "лагает",
    "паника",
    "ужас",
    "кошмар",
    "катастрофа",
    "провал",
  ]

  const positiveWords = [
    "спасибо",
    "отлично",
    "хорошо",
    "молодец",
    "супер",
    "рад",
    "классно",
    "круто",
    "замечательно",
    "прекрасно",
    "великолепно",
    "чудесно",
    "благодарю",
    "ценю",
    "уважаю",
    "поддержу",
    "согласен",
    "правильно",
    "точно",
    "здорово",
    "браво",
    "восхитительно",
  ]

  let aggression = 0
  let stress = 0
  let positivity = 0
  let sarcasm = 0

  const foundWords: string[] = []

  // Анализ агрессивных слов
  aggressionWords.forEach((word) => {
    if (lowerText.includes(word)) {
      aggression += 45 // Увеличили вес
      foundWords.push(`АГРЕССИЯ: "${word}"`)
      console.log(`[TEST LOCAL] Найдено агрессивное слово: "${word}"`)
    }
  })

  // Анализ стрессовых слов
  stressWords.forEach((word) => {
    if (lowerText.includes(word)) {
      stress += 35
      foundWords.push(`СТРЕСС: "${word}"`)
      console.log(`[TEST LOCAL] Найдено стрессовое слово: "${word}"`)
    }
  })

  // Анализ позитивных слов
  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) {
      positivity += 30
      foundWords.push(`ПОЗИТИВ: "${word}"`)
      console.log(`[TEST LOCAL] Найдено позитивное слово: "${word}"`)
    }
  })

  // Анализ пунктуации
  const exclamationCount = (text.match(/!/g) || []).length
  if (exclamationCount > 1) {
    stress += exclamationCount * 15
    foundWords.push(`ВОСКЛИЦАНИЯ: ${exclamationCount}`)
  }

  // Анализ капса
  const upperCaseRatio = (text.match(/[А-ЯA-Z]/g) || []).length / text.length
  if (upperCaseRatio > 0.3) {
    aggression += 25
    foundWords.push(`КАПС: ${Math.round(upperCaseRatio * 100)}%`)
  }

  // Ограничиваем значения
  aggression = Math.min(100, aggression)
  stress = Math.min(100, stress)
  positivity = Math.min(100, positivity)
  sarcasm = Math.min(100, sarcasm)

  const toxicity = Math.min(100, aggression * 0.8 + stress * 0.4)
  const maxScore = Math.max(aggression, stress, positivity, sarcasm)

  let dominantEmotion = "neutral"
  let confidence = maxScore

  // Определение доминирующей эмоции
  if (aggression >= 20) {
    dominantEmotion = "aggression"
    confidence = aggression
  } else if (stress >= 20) {
    dominantEmotion = "stress"
    confidence = stress
  } else if (positivity >= 20) {
    dominantEmotion = "positivity"
    confidence = positivity
  } else if (sarcasm >= 20) {
    dominantEmotion = "sarcasm"
    confidence = sarcasm
  }

  // Определение серьезности
  let severity = "low"
  if (aggression >= 40 || toxicity >= 60) {
    severity = "critical"
  } else if (aggression >= 25 || stress >= 30 || toxicity >= 40) {
    severity = "high"
  } else if (maxScore >= 20) {
    severity = "medium"
  }

  const result = {
    originalText: text,
    correctedText: text,
    normalizedText: text,
    detectedLanguage: "ru",
    slangDetected: [],
    errorsFixed: [],
    sentiment: {
      emotion: dominantEmotion,
      confidence: confidence,
      categories: {
        aggression,
        stress,
        sarcasm,
        toxicity,
        positivity,
      },
    },
    modelUsed: ["local-test"],
    foundWords, // Добавляем найденные слова для отладки
    analysisDetails: {
      exclamationCount,
      upperCaseRatio: Math.round(upperCaseRatio * 100),
      textLength: text.length,
      wordsCount: text.split(/\s+/).length,
    },
  }

  console.log(`[TEST LOCAL] Результат для "${text}":`, result)
  return result
}

// GET endpoint для быстрого тестирования
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get("text") || "дебил"

  return POST(
    new NextRequest(request.url, {
      method: "POST",
      body: JSON.stringify({ text, model: "local" }),
    }),
  )
}
