import { bucketForTipoDoc } from '@/lib/f29/dteBuckets'
import {
  officialLineDefOrFallback,
  officialRefIdForBucket,
} from '@/lib/f29/officialLines'

export type MoneyAgg = {
  count: number
  neto: number
  iva: number
  total: number
}

function emptyAgg(): MoneyAgg {
  return { count: 0, neto: 0, iva: 0, total: 0 }
}

type Row = {
  review_status: string
  tipo_doc: string
  monto_neto: number
  iva: number
  total: number
}

export type TipoDocSummary = {
  tipoDte: string
} & MoneyAgg

export type F29BucketSummary = {
  bucketId: string
  label: string
  f29Hint: string
} & MoneyAgg

export type OfficialLineSummary = {
  lineRefId: string
  title: string
  practitionerNote: string
} & MoneyAgg

/** Solo filas con review_status === 'validated'. */
export function summarizeValidatedByTipoDoc(rows: Row[]): TipoDocSummary[] {
  const map = new Map<string, MoneyAgg>()
  for (const r of rows) {
    if (r.review_status !== 'validated') continue
    const tipo = r.tipo_doc.trim() || '—'
    const cur = map.get(tipo) ?? emptyAgg()
    cur.count += 1
    cur.neto += r.monto_neto
    cur.iva += r.iva
    cur.total += r.total
    map.set(tipo, cur)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true }))
    .map(([tipoDte, v]) => ({ tipoDte, ...v }))
}

/** Solo validados; agrupa por bucket F29 (beta). */
export function summarizeValidatedByF29Bucket(rows: Row[]): F29BucketSummary[] {
  const map = new Map<
    string,
    MoneyAgg & { label: string; f29Hint: string }
  >()
  for (const r of rows) {
    if (r.review_status !== 'validated') continue
    const b = bucketForTipoDoc(r.tipo_doc)
    const cur =
      map.get(b.bucketId) ??
      {
        ...emptyAgg(),
        label: b.label,
        f29Hint: b.f29Hint,
      }
    cur.count += 1
    cur.neto += r.monto_neto
    cur.iva += r.iva
    cur.total += r.total
    cur.label = b.label
    cur.f29Hint = b.f29Hint
    map.set(b.bucketId, cur)
  }
  return [...map.entries()]
    .sort((a, b) => a[1].label.localeCompare(b[1].label, 'es'))
    .map(([bucketId, v]) => ({
      bucketId,
      label: v.label,
      f29Hint: v.f29Hint,
      count: v.count,
      neto: v.neto,
      iva: v.iva,
      total: v.total,
    }))
}

/** Solo validados; agrupa por línea de referencia F29 (catálogo versionado). */
export function summarizeValidatedByOfficialLine(rows: Row[]): OfficialLineSummary[] {
  const map = new Map<string, MoneyAgg>()
  for (const r of rows) {
    if (r.review_status !== 'validated') continue
    const b = bucketForTipoDoc(r.tipo_doc)
    const lineRefId = officialRefIdForBucket(b.bucketId)
    const cur = map.get(lineRefId) ?? emptyAgg()
    cur.count += 1
    cur.neto += r.monto_neto
    cur.iva += r.iva
    cur.total += r.total
    map.set(lineRefId, cur)
  }
  return [...map.entries()]
    .map(([lineRefId, agg]) => {
      const def = officialLineDefOrFallback(lineRefId)
      return {
        lineRefId,
        title: def.title,
        practitionerNote: def.practitionerNote,
        ...agg,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
}

function numFromRpc(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0
  return 0
}

/** Filas devueltas por `document_period_by_tipo_validated` (PostgREST snake_case). */
export function tipoSummariesFromRpcRows(
  rows: Array<{
    tipo_doc: string
    doc_count?: unknown
    sum_neto?: unknown
    sum_iva?: unknown
    sum_total?: unknown
  }>
): TipoDocSummary[] {
  return rows.map((r) => ({
    tipoDte: (r.tipo_doc ?? '').trim() || '—',
    count: numFromRpc(r.doc_count),
    neto: numFromRpc(r.sum_neto),
    iva: numFromRpc(r.sum_iva),
    total: numFromRpc(r.sum_total),
  }))
}

/** A partir de totales por tipo (p. ej. RPC), arma buckets F29 sin recorrer cada documento. */
export function aggregateBucketsFromTipoSummaries(
  rows: TipoDocSummary[]
): F29BucketSummary[] {
  const map = new Map<
    string,
    MoneyAgg & { label: string; f29Hint: string }
  >()
  for (const t of rows) {
    const b = bucketForTipoDoc(t.tipoDte)
    const cur =
      map.get(b.bucketId) ??
      {
        ...emptyAgg(),
        label: b.label,
        f29Hint: b.f29Hint,
      }
    cur.count += t.count
    cur.neto += t.neto
    cur.iva += t.iva
    cur.total += t.total
    cur.label = b.label
    cur.f29Hint = b.f29Hint
    map.set(b.bucketId, cur)
  }
  return [...map.entries()]
    .sort((a, b) => a[1].label.localeCompare(b[1].label, 'es'))
    .map(([bucketId, v]) => ({
      bucketId,
      label: v.label,
      f29Hint: v.f29Hint,
      count: v.count,
      neto: v.neto,
      iva: v.iva,
      total: v.total,
    }))
}

export function aggregateOfficialLinesFromTipoSummaries(
  rows: TipoDocSummary[]
): OfficialLineSummary[] {
  const map = new Map<string, MoneyAgg>()
  for (const t of rows) {
    const b = bucketForTipoDoc(t.tipoDte)
    const lineRefId = officialRefIdForBucket(b.bucketId)
    const cur = map.get(lineRefId) ?? emptyAgg()
    cur.count += t.count
    cur.neto += t.neto
    cur.iva += t.iva
    cur.total += t.total
    map.set(lineRefId, cur)
  }
  return [...map.entries()]
    .map(([lineRefId, agg]) => {
      const def = officialLineDefOrFallback(lineRefId)
      return {
        lineRefId,
        title: def.title,
        practitionerNote: def.practitionerNote,
        ...agg,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
}
