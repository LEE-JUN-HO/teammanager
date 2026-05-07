import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL  as string
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.error('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 없습니다.')
}

export const supabase = createClient(url ?? '', key ?? '')
