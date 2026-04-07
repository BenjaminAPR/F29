'use client'

import { createClient } from '@/lib/supabase/client'
import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const supabaseReady =
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    try {
      const supabase = createClient()
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/companies')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg(
          'Cuenta creada. Si Supabase pide confirmar email, revisa tu bandeja.'
        )
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Error de auth')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
            <Building2 className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              F29 Micro‑SaaS
            </h1>
            <p className="text-sm text-slate-500">Ingreso con Supabase Auth</p>
          </div>
        </div>

        {!supabaseReady ? (
          <div
            className="mb-6 rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950"
            role="alert"
          >
            <p className="font-medium">Faltan variables de Supabase</p>
            <p className="mt-1.5 leading-relaxed text-amber-900/90">
              Crea{' '}
              <code className="rounded-md bg-amber-100/80 px-1.5 py-0.5 text-xs">
                saas/.env.local
              </code>{' '}
              y reinicia el servidor.{' '}
              <Link
                href="/setup"
                className="font-semibold text-sky-800 underline decoration-sky-800/30 underline-offset-2 hover:text-sky-700"
              >
                Ver guía en /setup
              </Link>
            </p>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Contraseña
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </label>
          {msg ? (
            <p
              className={`text-sm ${msg.includes('Cuenta creada') ? 'text-emerald-700' : 'text-red-700'}`}
              role="status"
            >
              {msg}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !supabaseReady}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-600/25 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Procesando…' : mode === 'signin' ? 'Entrar' : 'Registrarse'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMsg(null)
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
          }}
          className="mt-5 w-full text-center text-sm font-medium text-slate-600 transition hover:text-sky-700"
        >
          {mode === 'signin' ? 'Crear cuenta nueva' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  )
}
