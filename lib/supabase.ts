import { createClient } from "@supabase/supabase-js"

// Безопасная инициализация клиента Supabase
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  // Создаем клиент только если переменные окружения доступны
  if (
    !supabaseClient &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string"
  ) {
    supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  }

  return supabaseClient
}

// Типы для TypeScript
export interface Message {
  id?: number
  chat_id: number
  chat_title?: string
  user_id: number
  username?: string
  message_text: string
  emotion: string
  confidence: number
  severity: string
  categories: {
    aggression: number
    stress: number
    sarcasm: number
    toxicity: number
    positivity: number
  }
  model_used: string
  created_at?: string
}

export interface Incident {
  id?: number
  chat_id: number
  chat_title?: string
  user_id: number
  username?: string
  message_text: string
  emotion: string
  severity: string
  categories: {
    aggression: number
    stress: number
    sarcasm: number
    toxicity: number
    positivity: number
  }
  resolved?: boolean
  created_at?: string
}

export interface RiskUser {
  user_id: number
  username?: string
  team?: string
  risk_level: "low" | "medium" | "high"
  incidents_count: number
  last_incident?: string
  updated_at?: string
}

export interface ChatStat {
  chat_id: number
  chat_title?: string
  total_messages: number
  emotion_stats: Record<string, number>
  last_activity?: string
}
