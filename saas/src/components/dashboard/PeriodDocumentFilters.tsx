import type { PeriodDocFilters } from '@/lib/dashboard/periodDocumentFilters'
import Link from 'next/link'

type Props = {
  companyId: string
  period: string
  filters: PeriodDocFilters
  tiposEnPeriodo: string[]
}

export function PeriodDocumentFilters({
  companyId,
  period,
  filters,
  tiposEnPeriodo,
}: Props) {
  const basePath = `/${companyId}/dashboard`
  const clearHref = `${basePath}?period=${encodeURIComponent(period)}`

  return (
    <form
      method="GET"
      action={basePath}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:flex-row sm:flex-wrap sm:items-end"
    >
      <input type="hidden" name="period" value={period} />

      <label className="block min-w-[6rem] flex-1 sm:max-w-[8rem]">
        <span className="text-xs font-medium text-slate-600">Tipo DTE</span>
        <select
          name="tipo"
          defaultValue={filters.tipoDoc ?? ''}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="">Todos</option>
          {tiposEnPeriodo.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block min-w-[6rem] flex-1 sm:max-w-[9rem]">
        <span className="text-xs font-medium text-slate-600">Origen</span>
        <select
          name="origen"
          defaultValue={filters.sourceType ?? ''}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="">Todos</option>
          <option value="CSV">CSV</option>
          <option value="PDF">PDF / IA</option>
        </select>
      </label>

      <label className="block min-w-[7rem] flex-1 sm:max-w-[10rem]">
        <span className="text-xs font-medium text-slate-600">Revisión</span>
        <select
          name="estado"
          defaultValue={filters.reviewStatus ?? ''}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="">Todos</option>
          <option value="validated">Validado</option>
          <option value="pending">Pendiente</option>
          <option value="excluded">Excluido</option>
        </select>
      </label>

      <label className="block min-w-[8rem] flex-[2] sm:max-w-[14rem]">
        <span className="text-xs font-medium text-slate-600">
          RUT o folio (contiene)
        </span>
        <input
          name="q"
          type="search"
          defaultValue={filters.search ?? ''}
          placeholder="Ej. 76123 o 1234"
          autoComplete="off"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-600/25 hover:bg-sky-500"
        >
          Aplicar
        </button>
        <Link
          href={clearHref}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Limpiar
        </Link>
      </div>
    </form>
  )
}
