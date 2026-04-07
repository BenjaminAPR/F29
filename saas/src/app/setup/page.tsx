import { Building2 } from 'lucide-react'
import Link from 'next/link'

export default function SetupPage() {
  return (
    <div className="flex min-h-dvh flex-1 items-start justify-center p-6 pt-12 sm:pt-16">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
            <Building2 className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Configurar Supabase
            </h1>
            <p className="text-sm text-slate-500">
              Credenciales en <code className="text-slate-700">saas/.env.local</code>
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          La app necesita el proyecto Supabase. Crea el archivo{' '}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
            .env.local
          </code>{' '}
          dentro de{' '}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
            saas
          </code>
          .
        </p>

        <ol className="mt-6 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-slate-700 marker:font-semibold marker:text-sky-700">
          <li>
            Copia{' '}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs">
              .env.local.example
            </code>{' '}
            →{' '}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs">
              .env.local
            </code>
          </li>
          <li>
            En Supabase:{' '}
            <strong className="font-semibold text-slate-900">
              Project Settings → API
            </strong>
            , pega{' '}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs">
              URL
            </code>{' '}
            y la key{' '}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs">
              anon public
            </code>
            .
          </li>
          <li>
            Variables obligatorias:
            <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
              NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co{'\n'}
              NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
            </pre>
          </li>
          <li>
            Ejecuta el SQL en{' '}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs">
              supabase/schema_multitenant.sql
            </code>
          </li>
          <li>
            Reinicia el dev server:{' '}
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs">
              npm run dev
            </code>
          </li>
        </ol>

        <div className="mt-8 rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950">
          <p className="font-medium text-amber-900">Nota sobre el trigger SQL</p>
          <p className="mt-1.5 leading-relaxed text-amber-900/90">
            Si el error menciona{' '}
            <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">
              execute procedure
            </code>
            , prueba{' '}
            <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">
              execute function
            </code>{' '}
            (según la versión de Postgres en Supabase).
          </p>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-600/25 transition hover:bg-sky-500"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
