function normStr(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase() || '-'
}

function normNum(v: unknown): string {
  const n =
    typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  if (!Number.isFinite(n)) return '0'
  return String(Math.round(n))
}

function normDate(v: string | null | undefined): string {
  const s = (v ?? '').trim()
  if (!s) return '-'
  // Accept YYYY-MM-DD; anything else collapses to '-'.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return '-'
}

/**
 * Clave estable para sugerir duplicados en el mismo período/empresa.
 * No incluye company_id/period: se agregan como scope en SQL indexes/queries.
 */
export function documentDedupKey(input: {
  tipo_doc: string
  rut_emisor?: string | null
  folio?: string | null
  total?: number | string | null
  fecha?: string | null
}): string {
  return [
    normStr(input.tipo_doc),
    normStr(input.rut_emisor),
    normStr(input.folio),
    normNum(input.total ?? 0),
    normDate(input.fecha ?? null),
  ].join('|')
}

