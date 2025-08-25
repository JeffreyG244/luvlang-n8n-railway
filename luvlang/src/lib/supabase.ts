import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tzskjzkolyiwhijslqmq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6c2tqemtvbHlpd2hpanNscW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2ODQ5MDUsImV4cCI6MjA0NzI2MDkwNX0.rtKfyy7RZrMIQN8ZqUYZEywxelKOLPdE8iLxurcXgOo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string | null
          last_name: string | null
          bio: string | null
          age: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name?: string | null
          last_name?: string | null
          bio?: string | null
          age?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          bio?: string | null
          age?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}