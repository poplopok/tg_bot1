// Тестовый файл для проверки работы NLP моделей

// Функция для тестирования локального анализа эмоций
export async function testLocalEmotionAnalysis(text: string) {
  console.log(`[ТЕСТ] Анализируем текст: "${text}"`)

  // Словари для анализа
  const aggressionWords = [
    "дурак",
    "идиот",
    "тупой",
    "бред",
    "ерунда",
    "херня",
    "фигня",
    "говно",
    "дерьмо",
    "мудак",
    "козел",
    "урод",
    "кретин",
    "дебил",
    "заткнись",
    "отвали",
    "пошел",
    "достал",
    "надоел",
    "бесит",
    "задолбал",
    "заколебал",
    "замучил",
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
  ]

  const sarcasmWords = [
    "конечно",
    "естественно",
    "разумеется",
    "само собой",
    "ага",
    "ну да",
    "отлично",
    "прекрасно",
    "замечательно",
    "великолепно",
    "чудесно",
    "супер",
  ]

  // Анализ текста
  const lowerText = text.toLowerCase()

  let aggression = 0
  let stress = 0
  let positivity = 0
  let sarcasm = 0

  // Проверяем слова из словарей
  aggressionWords.forEach((word) => {
    if (lowerText.includes(word)) {
      aggression += 30
      console.log(`[ТЕСТ] Обнаружено слово агрессии: ${word}`)
    }
  })

  stressWords.forEach((word) => {
    if (lowerText.includes(word)) {
      stress += 25
      console.log(`[ТЕСТ] Обнаружено слово стресса: ${word}`)
    }
  })

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) {
      positivity += 25
      console.log(`[ТЕСТ] Обнаружено позитивное слово: ${word}`)
    }
  })

  sarcasmWords.forEach((word) => {
    if (lowerText.includes(word)) {
      // Проверяем контекст для сарказма
      const hasNegativeContext =
        text.includes("🤡") ||
        text.includes("👏") ||
        text.includes("🙄") ||
        text.includes("...") ||
        /конечно.*👏/.test(text) ||
        /отлично.*🤡/.test(text)

      if (hasNegativeContext) {
        sarcasm += 40
        console.log(`[ТЕСТ] Обнаружен сарказм: ${word} с негативным контекстом`)
      } else {
        positivity += 15
        console.log(`[ТЕСТ] Обнаружено позитивное слово: ${word}`)
      }
    }
  })

  // Анализ пунктуации и эмодзи
  const exclamationCount = (text.match(/!/g) || []).length
  if (exclamationCount > 2) {
    stress += exclamationCount * 15
    console.log(`[ТЕСТ] Обнаружено ${exclamationCount} восклицательных знаков`)
  }

  const upperCaseRatio = (text.match(/[А-ЯA-Z]/g) || []).length / text.length
  if (upperCaseRatio > 0.5) {
    aggression += 20
    console.log(`[ТЕСТ] Обнаружен КАПС (${Math.round(upperCaseRatio * 100)}% текста)`)
  }

  // Негативные эмодзи
  const negativeEmojis = ["😡", "🤬", "😤", "💢", "👿", "😠", "🙄", "🤡", "💩", "🖕"]
  negativeEmojis.forEach((emoji) => {
    if (text.includes(emoji)) {
      if (emoji === "🤡" || emoji === "🙄") {
        sarcasm += 35
        console.log(`[ТЕСТ] Обнаружен эмодзи сарказма: ${emoji}`)
      } else {
        aggression += 25
        console.log(`[ТЕСТ] Обнаружен негативный эмодзи: ${emoji}`)
      }
    }
  })

  // Стрессовые эмодзи
  const stressEmojis = ["😰", "😱", "🤯", "😵", "🔥", "⚡", "💥", "🚨"]
  stressEmojis.forEach((emoji) => {
    if (text.includes(emoji)) {
      stress += 20
      console.log(`[ТЕСТ] Обнаружен эмодзи стресса: ${emoji}`)
    }
  })

  // Позитивные эмодзи
  const positiveEmojis = ["😊", "😄", "👍", "✅", "🎉", "💪", "❤️", "👏"]
  positiveEmojis.forEach((emoji) => {
    if (text.includes(emoji)) {
      positivity += 20
      console.log(`[ТЕСТ] Обнаружен позитивный эмодзи: ${emoji}`)
    }
  })

  // Ограничиваем значения до 100
  aggression = Math.min(100, aggression)
  stress = Math.min(100, stress)
  positivity = Math.min(100, positivity)
  sarcasm = Math.min(100, sarcasm)

  // Вычисляем токсичность
  const toxicity = Math.min(100, aggression * 0.8 + stress * 0.4)

  // Определяем доминирующую эмоцию
  const emotions = [
    { name: "aggression", value: aggression },
    { name: "stress", value: stress },
    { name: "positivity", value: positivity },
    { name: "sarcasm", value: sarcasm },
    { name: "neutral", value: 20 }, // Базовое значение для нейтральности
  ]

  // Сортируем по убыванию значения
  emotions.sort((a, b) => b.value - a.value)

  // Доминирующая эмоция - первая в отсортированном списке
  const dominantEmotion = emotions[0].value > 20 ? emotions[0].name : "neutral"
  const confidence = emotions[0].value

  // Определяем серьезность
  let severity = "low"
  if (toxicity > 85) severity = "critical"
  else if (toxicity > 65) severity = "high"
  else if (emotions[0].value > 35) severity = "medium"

  // Формируем результат
  const result = {
    emotion: dominantEmotion,
    confidence: confidence,
    severity: severity,
    categories: {
      aggression: aggression,
      stress: stress,
      sarcasm: sarcasm,
      toxicity: toxicity,
      positivity: positivity,
    },
    modelUsed: ["local-test"],
  }

  console.log("[ТЕСТ] Результат анализа:", result)
  return result
}

// Функция для тестирования обнаружения сленга
export function testSlangDetection(text: string) {
  console.log(`[ТЕСТ] Ищем сленг в тексте: "${text}"`)

  // Мини-словарь сленга для теста
  const slangDictionary = {
    норм: { category: "general", normalized: "нормально" },
    ок: { category: "general", normalized: "хорошо" },
    кодить: { category: "it", normalized: "программировать" },
    дедлайн: { category: "corporate", normalized: "срок" },
    митинг: { category: "corporate", normalized: "встреча" },
    бесит: { category: "emotional", normalized: "раздражает" },
    фича: { category: "it", normalized: "функция" },
    баг: { category: "it", normalized: "ошибка" },
    фидбек: { category: "corporate", normalized: "обратная связь" },
    апдейт: { category: "corporate", normalized: "обновление" },
  }

  const lowerText = text.toLowerCase()
  const words = lowerText.split(/\s+/)
  const slangDetected = []

  // Ищем сленг в тексте
  for (const word of words) {
    const cleanWord = word.replace(/[.,!?;:()]/g, "")
    if (slangDictionary[cleanWord]) {
      const slang = slangDictionary[cleanWord]
      slangDetected.push(`${cleanWord} (${slang.category})`)
      console.log(`[ТЕСТ] Обнаружен сленг: ${cleanWord} -> ${slang.normalized} (${slang.category})`)
    }
  }

  // Нормализуем текст (заменяем сленг на нормальные слова)
  let normalizedText = lowerText
  for (const [slang, info] of Object.entries(slangDictionary)) {
    const regex = new RegExp(`\\b${slang}\\b`, "gi")
    normalizedText = normalizedText.replace(regex, info.normalized)
  }

  return {
    originalText: text,
    normalizedText: normalizedText,
    slangDetected: slangDetected,
    slangCount: slangDetected.length,
  }
}

// Примеры использования
export function runTests() {
  console.log("=== ТЕСТИРОВАНИЕ АНАЛИЗА ЭМОЦИЙ ===")

  const testCases = [
    "Это отличная новость! Я очень рад за вас!",
    "Меня это очень бесит! Сколько можно это терпеть?!",
    "Да, конечно, отличная идея... 🙄",
    "Я не успеваю закончить к дедлайну, у меня паника!",
    "Нормально, работаем дальше.",
    "ТЫ ЧТО ТВОРИШЬ?! НЕМЕДЛЕННО ПРЕКРАТИ!!!",
    "Спасибо за помощь, очень ценю! 👍",
    "Ну да, конечно, ты как всегда прав... 🤡",
  ]

  for (const testCase of testCases) {
    console.log("\n-----------------------------------")
    const emotionResult = testLocalEmotionAnalysis(testCase)
    const slangResult = testSlangDetection(testCase)
    console.log("-----------------------------------\n")
  }

  console.log("=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===")
}
