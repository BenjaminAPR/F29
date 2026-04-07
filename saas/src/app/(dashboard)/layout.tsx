import { CompanySelector } from '@/components/companies/CompanySelector'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { signOut } from '@/app/actions/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isSupabaseConfigured()) {
    redirect('/setup')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: companies } = await supabase
    .from('companies')
    .select('id, rut, razon_social')
    .order('razon_social', { ascending: true })

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/companies"
            className="flex shrink-0 items-center gap-2 rounded-lg text-slate-800 transition hover:bg-slate-100 hover:text-sky-800"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm shadow-sky-600/25">
              <Building2 className="size-[1.125rem]" aria-hidden />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              F29
            </span>
          </Link>

          <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden />

          <div className="min-w-0 flex-1">
            <CompanySelector companies={companies ?? []} />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              className="hidden max-w-[200px] truncate text-xs text-slate-500 sm:block"
              title={user.email ?? undefined}
            >
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
