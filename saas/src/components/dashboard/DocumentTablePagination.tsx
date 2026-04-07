import {
  DOCUMENT_PAGE_SIZE,
  dashboardListPath,
  type PeriodDocFilters,
} from '@/lib/dashboard/periodDocumentFilters'
import Link from 'next/link'

type Props = {
  companyId: string
  period: string
  filters: PeriodDocFilters
  totalCount: number
  page: number
}

export function DocumentTablePagination({
  companyId,
  period,
  filters,
  totalCount,
  page,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / DOCUMENT_PAGE_SIZE))
  if (totalPages <= 1) return null

  const from = (page - 1) * DOCUMENT_PAGE_SIZE + 1
  const to = Math.min(page * DOCUMENT_PAGE_SIZE, totalCount)

  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-xs">
        Mostrando{' '}
        <strong className="text-slate-800">
          {from}–{to}
        </strong>{' '}
        de <strong className="text-slate-800">{totalCount}</strong>
      </p>
      <nav className="flex flex-wrap items-center gap-1" aria-label="Paginación">
        {page > 1 ? (
          <Link
            href={dashboardListPath(companyId, period, filters, page - 1)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Anterior
          </Link>
        ) : (
          <span className="rounded-lg border border-transparent px-2.5 py-1.5 text-xs text-slate-400">
            Anterior
          </span>
        )}
        <span className="px-2 text-xs text-slate-500">
          Página {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={dashboardListPath(companyId, period, filters, page + 1)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Siguiente
          </Link>
        ) : (
          <span className="rounded-lg border border-transparent px-2.5 py-1.5 text-xs text-slate-400">
            Siguiente
          </span>
        )}
      </nav>
    </div>
  )
}
