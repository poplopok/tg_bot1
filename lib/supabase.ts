import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Клиент для фронтенда (с анонимным ключом)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Клиент для серверных операций (с service role ключом)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Типы для TypeScript
export interface Chat {
  id: number
  title: string | null
  type: string
  member_count: number
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface User {
  id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  is_bot: boolean
  language_code: string | null
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  chat_id: number | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  message_id: number
  chat_id: number
  user_id: number
  text: string
  created_at: string
}

export interface EmotionAnalysis {
  id: string
  message_id: string
  emotion: string
  confidence: number
  severity: "low" | "medium" | "high" | "critical"
  aggression_score: number
  stress_score: number
  sarcasm_score: number
  toxicity_score: number
  positivity_score: number
  model_used: string
  created_at: string
}

export interface Incident {
  id: string
  chat_id: number
  user_id: number
  message_id: string
  emotion_analysis_id: string
  severity: "low" | "medium" | "high" | "critical"
  status: "open" | "resolved" | "escalated"
  resolved_by: number | null
  resolved_at: string | null
  notes: string | null
  created_at: string
}

export interface UserStats {
  id: string
  user_id: number
  chat_id: number
  total_messages: number
  incident_count: number
  risk_level: "low" | "medium" | "high"
  last_incident_at: string | null
  avg_positivity: number
  avg_toxicity: number
  updated_at: string
}

export interface ModerationSettings {
  id: string
  chat_id: number
  aggression_threshold: number
  stress_threshold: number
  sarcasm_threshold: number
  toxicity_threshold: number
  auto_block: boolean
  notify_hr: boolean
  hr_chat_id: number | null
  created_at: string
  updated_at: string
}
