import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Configura Supabase en saas/.env.local y abre /setup para instrucciones.'
    )
  }
  return createBrowserClient(url, key)
}
