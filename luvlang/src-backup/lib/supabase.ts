import { createClient } from '@supabase/supabase-js'

// Hardcoded for free Netlify plan (anon key is safe to expose)
const supabaseUrl = 'https://tzskjzkolyiwhijslqmq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6c2tqemtvbHlpd2hpanNscW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NTY3ODAsImV4cCI6MjA2NDIzMjc4MH0.EvlZrWKZVsUks6VArpizk98kmOc8nVS7vvjUbd4ThMw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export type { User } from '@supabase/supabase-js'
