import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

export const supabase = supabaseClient
