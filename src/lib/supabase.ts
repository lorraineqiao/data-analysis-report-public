import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type UsageLog = {
  id?: string
  created_at?: string
  ip_address: string
  user_agent: string
  action_type: 'page_view' | 'data_generated'
  data_summary?: Record<string, unknown>
  request_params?: Record<string, unknown>
}
