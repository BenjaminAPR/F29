import type { ReviewStatus } from '@/lib/documents/reviewStatus'

export const DOCUMENT_PAGE_SIZE = 25
export const SUMMARY_FETCH_CAP = 2000

export type PeriodDocFilters = {
  tipoDoc?: string
  sourceType?: 'CSV' | 'PDF'
  reviewStatus?: ReviewStatus
  search?: string
}

function pickString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

export function sanitizeDocSearch(raw: string): string {
  return raw.replace(/[%*]/g, '').trim().slice(0, 40)
}

export function parsePeriodDocFilters(sp: {
  page?: string | string[]
  tipo?: string | string[]
  origen?: string | string[]
  estado?: string | string[]
  q?: string | string[]
}): { page: number; filters: PeriodDocFilters } {
  const pageRaw = pickString(sp.page)
  const pageNum = parseInt(pageRaw ?? '1', 10)
  const page =
    Number.isFinite(pageNum) && pageNum >= 1
      ? Math.min(pageNum, 500)
      : 1

  const filters: PeriodDocFilters = {}
  const tipo = pickString(sp.tipo)?.trim()
  if (tipo) filters.tipoDoc = tipo.slice(0, 8)

  const origen = pickString(sp.origen)
  if (origen === 'CSV' || origen === 'PDF') filters.sourceType = origen

  const estado = pickString(sp.estado)
  if (
    estado === 'pending' ||
    estado === 'validated' ||
    estado === 'excluded'
  ) {
    filters.reviewStatus = estado
  }

  const q = pickString(sp.q)
  if (q) {
    const s = sanitizeDocSearch(q)
    if (s.length > 0) filters.search = s
  }

  return { page, filters }
}

export function filtersActive(f: PeriodDocFilters): boolean {
  return Boolean(
    f.tipoDoc || f.sourceType || f.reviewStatus || f.search
  )
}

/** Querystring para conservar filtros (sin página) al volver del POST. */
export function filtersToReturnSearchParams(
  period: string,
  f: PeriodDocFilters,
  page?: number
): URLSearchParams {
  const p = new URLSearchParams()
  p.set('period', period)
  if (f.tipoDoc) p.set('tipo', f.tipoDoc)
  if (f.sourceType) p.set('origen', f.sourceType)
  if (f.reviewStatus) p.set('estado', f.reviewStatus)
  if (f.search) p.set('q', f.search)
  if (page && page > 1) p.set('page', String(page))
  return p
}

export function dashboardListPath(
  companyId: string,
  period: string,
  f: PeriodDocFilters,
  page?: number
): string {
  const qs = filtersToReturnSearchParams(period, f, page).toString()
  return `/${companyId}/dashboard?${qs}`
}

/** Lee `ret_*` del POST de documentos para redirigir manteniendo filtros. */
export function dashboardRedirectParams(
  period: string,
  formData: FormData
): URLSearchParams {
  const f: PeriodDocFilters = {}
  const tipo = formData.get('ret_tipo')?.toString()?.trim()
  if (tipo) f.tipoDoc = tipo.slice(0, 8)
  const origen = formData.get('ret_origen')?.toString()
  if (origen === 'CSV' || origen === 'PDF') f.sourceType = origen
  const estado = formData.get('ret_estado')?.toString()
  if (
    estado === 'pending' ||
    estado === 'validated' ||
    estado === 'excluded'
  ) {
    f.reviewStatus = estado
  }
  const q = formData.get('ret_q')?.toString()
  if (q) {
    const s = sanitizeDocSearch(q)
    if (s) f.search = s
  }
  return filtersToReturnSearchParams(period, f)
}

/** Encadena .eq / .or sobre un query builder de `documents`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyPeriodDocFilters(q: any, f: PeriodDocFilters) {
  let out = q
  if (f.tipoDoc) out = out.eq('tipo_doc', f.tipoDoc)
  if (f.sourceType) out = out.eq('source_type', f.sourceType)
  if (f.reviewStatus) out = out.eq('review_status', f.reviewStatus)
  if (f.search) {
    const s = f.search
    out = out.or(`rut_emisor.ilike.%${s}%,folio.ilike.%${s}%`)
  }
  return out
}
