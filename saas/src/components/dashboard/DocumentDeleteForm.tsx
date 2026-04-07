import { deleteDocument } from '@/app/actions/documents'
import { FilterPreserveFields } from '@/components/dashboard/FilterPreserveFields'
import type { PeriodDocFilters } from '@/lib/dashboard/periodDocumentFilters'
import { Trash2 } from 'lucide-react'

type Props = {
  documentId: string
  companyId: string
  period: string
  preserveFilters?: PeriodDocFilters
}

export function DocumentDeleteForm({
  documentId,
  companyId,
  period,
  preserveFilters,
}: Props) {
  return (
    <form action={deleteDocument} className="inline">
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="period" value={period} />
      {preserveFilters ? (
        <FilterPreserveFields filters={preserveFilters} />
      ) : null}
      <button
        type="submit"
        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        title="Eliminar fila"
        aria-label="Eliminar documento"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  )
}
