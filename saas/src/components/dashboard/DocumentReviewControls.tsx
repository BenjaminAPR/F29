import { updateDocumentReview } from '@/app/actions/documents'
import { FilterPreserveFields } from '@/components/dashboard/FilterPreserveFields'
import type { PeriodDocFilters } from '@/lib/dashboard/periodDocumentFilters'
import { type ReviewStatus, reviewStatusLabel } from '@/lib/documents/reviewStatus'

type Props = {
  documentId: string
  companyId: string
  period: string
  status: ReviewStatus
  preserveFilters?: PeriodDocFilters
}

export function DocumentReviewControls({
  documentId,
  companyId,
  period,
  status,
  preserveFilters,
}: Props) {
  const hidden = (
    <>
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="period" value={period} />
      {preserveFilters ? (
        <FilterPreserveFields filters={preserveFilters} />
      ) : null}
    </>
  )

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {(status === 'pending' || status === 'excluded') ? (
        <form action={updateDocumentReview} className="inline">
          {hidden}
          <input type="hidden" name="reviewStatus" value="validated" />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-500"
            title="Incluir en totales del período"
          >
            Validar
          </button>
        </form>
      ) : null}

      {status === 'validated' ? (
        <form action={updateDocumentReview} className="inline">
          {hidden}
          <input type="hidden" name="reviewStatus" value="pending" />
          <button
            type="submit"
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            title="Marcar pendiente de revisión"
          >
            Pendiente
          </button>
        </form>
      ) : null}

      {(status === 'pending' || status === 'validated') ? (
        <form
          action={updateDocumentReview}
          className="inline-flex max-w-[9rem] items-center gap-0.5"
        >
          {hidden}
          <input type="hidden" name="reviewStatus" value="excluded" />
          <input
            name="reviewNote"
            maxLength={500}
            className="min-w-0 flex-1 rounded border border-slate-200 px-1 py-0.5 text-[10px] text-slate-800"
            placeholder="motivo"
            aria-label="Motivo de exclusión (opcional)"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
            title="Quitar de los totales del período"
          >
            Excluir
          </button>
        </form>
      ) : null}
    </div>
  )
}

export function ReviewStatusBadge({
  status,
  note,
}: {
  status: ReviewStatus
  note: string | null
}) {
  const styles: Record<ReviewStatus, string> = {
    pending:
      'border-amber-200 bg-amber-50 text-amber-950',
    validated:
      'border-emerald-200 bg-emerald-50 text-emerald-950',
    excluded: 'border-slate-200 bg-slate-100 text-slate-700',
  }

  return (
    <span
      className={`inline-block max-w-[7rem] truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}
      title={
        note && status === 'excluded'
          ? `${reviewStatusLabel(status)}: ${note}`
          : reviewStatusLabel(status)
      }
    >
      {reviewStatusLabel(status)}
    </span>
  )
}
