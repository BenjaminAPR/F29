'use server'

import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { redirect } from 'next/navigation'

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect('/setup')
  }
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
