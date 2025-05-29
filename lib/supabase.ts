import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

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
  risk_level: 'low' | 'medium' | 'high'
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
