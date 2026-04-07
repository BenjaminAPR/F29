import type { PeriodDocFilters } from '@/lib/dashboard/periodDocumentFilters'

export function FilterPreserveFields({ filters }: { filters: PeriodDocFilters }) {
  if (
    !filters.tipoDoc &&
    !filters.sourceType &&
    !filters.reviewStatus &&
    !filters.search
  ) {
    return null
  }
  return (
    <>
      {filters.tipoDoc ? (
        <input type="hidden" name="ret_tipo" value={filters.tipoDoc} />
      ) : null}
      {filters.sourceType ? (
        <input type="hidden" name="ret_origen" value={filters.sourceType} />
      ) : null}
      {filters.reviewStatus ? (
        <input type="hidden" name="ret_estado" value={filters.reviewStatus} />
      ) : null}
      {filters.search ? (
        <input type="hidden" name="ret_q" value={filters.search} />
      ) : null}
    </>
  )
}
