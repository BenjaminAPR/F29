import { createCompany } from '@/app/actions/companies'
import { CompanyFormSubmit } from '@/components/companies/CompanyFormSubmit'
import { CompanyListItem } from '@/components/companies/CompanyListItem'
import { RutInput } from '@/components/companies/RutInput'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const OK_MESSAGES: Record<string, string> = {
  created: 'Empresa dada de alta correctamente.',
  updated: 'Razón social actualizada.',
  deleted: 'Empresa eliminada (y sus documentos asociados).',
}

type Props = {
  searchParams: Promise<{ e?: string; ok?: string }>
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { e, ok } = await searchParams
  const okMessage =
    ok && !e && OK_MESSAGES[ok] ? OK_MESSAGES[ok] : null
  const supabase = await createClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('id, rut, razon_social, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-700/90">
          Espacio de trabajo
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Empresas
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          Cada empresa (RUT) tiene sus propios documentos y totales. Solo tú ves
          las que creas (
          <code className="rounded-md bg-slate-200/60 px-1.5 py-0.5 text-xs font-mono text-slate-800">
            created_by
          </code>
          ).
        </p>
      </header>

      {e ? (
        <div
          className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-sm"
          role="alert"
        >
          {safeDecode(e)}
        </div>
      ) : null}

      {okMessage ? (
        <div
          className="flex flex-col gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p>{okMessage}</p>
          <Link
            href="/companies"
            className="shrink-0 text-sm font-semibold text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:text-emerald-900"
          >
            Ocultar
          </Link>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Nueva empresa
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Agrega un RUT y la razón social para empezar a cargar documentos.
        </p>
        <form
          action={createCompany}
          className="mt-6 grid gap-5 sm:grid-cols-2"
        >
          <label className="block sm:col-span-1">
            <span className="text-sm font-medium text-slate-700">RUT</span>
            <RutInput
              required
              placeholder="12.345.678-9"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 font-mono text-slate-900 shadow-inner transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Formato con puntos y guion; se valida el DV y se guarda canónico (ej.{' '}
              <span className="font-mono text-slate-600">12345678-9</span>).
            </p>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Razón social
            </span>
            <input
              name="razon_social"
              required
              placeholder="Nombre legal de la empresa"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-slate-900 shadow-inner transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </label>
          <div className="sm:col-span-2">
            <CompanyFormSubmit />
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Tus empresas
        </h2>
        <ul className="mt-4 space-y-3">
          {(companies ?? []).length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center text-sm text-slate-500">
              Aún no hay empresas. Completa el formulario de arriba.
            </li>
          ) : (
            companies?.map((c) => (
              <CompanyListItem key={c.id} company={c} />
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
