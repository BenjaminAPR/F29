import type { SupabaseClient } from '@supabase/supabase-js'
import {
  aggregateBucketsFromTipoSummaries,
  aggregateOfficialLinesFromTipoSummaries,
  tipoSummariesFromRpcRows,
  type F29BucketSummary,
  type OfficialLineSummary,
  type TipoDocSummary,
} from '@/lib/f29/summaries'
import type { PeriodDocFilters } from '@/lib/dashboard/periodDocumentFilters'

export type PeriodSummaryRpcData = {
  totalRows: number
  validatedCount: number
  pendingCount: number
  excludedCount: number
  sumNetoValidated: number
  sumIvaValidated: number
  sumTotalValidated: number
}

export type PeriodAggregatesRpcOk = {
  ok: true
  summary: PeriodSummaryRpcData
  byTipo: TipoDocSummary[]
  byBucket: F29BucketSummary[]
  byOfficialLine: OfficialLineSummary[]
}

export type PeriodAggregatesRpcResult = PeriodAggregatesRpcOk | { ok: false; error: string }

function rpcPayload(companyId: string, period: string, filters: PeriodDocFilters) {
  return {
    p_company_id: companyId,
    p_period: period,
    p_tipo_doc: filters.tipoDoc ?? null,
    p_source_type: filters.sourceType ?? null,
    p_review_status: filters.reviewStatus ?? null,
    p_search: filters.search ?? null,
  }
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0
  return 0
}

/**
 * Totales y agregados por tipo en Postgres (RLS), sin tope de filas en la app.
 */
export async function fetchDocumentPeriodAggregatesRpc(
  supabase: SupabaseClient,
  args: { companyId: string; period: string; filters: PeriodDocFilters }
): Promise<PeriodAggregatesRpcResult> {
  const payload = rpcPayload(args.companyId, args.period, args.filters)
  const [sumRes, tipoRes] = await Promise.all([
    supabase.rpc('document_period_summary', payload),
    supabase.rpc('document_period_by_tipo_validated', payload),
  ])
  if (sumRes.error) return { ok: false, error: sumRes.error.message }
  if (tipoRes.error) return { ok: false, error: tipoRes.error.message }

  const raw = sumRes.data
  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row || typeof row !== 'object') {
    return { ok: false, error: 'Respuesta vacía de document_period_summary' }
  }

  const r = row as Record<string, unknown>
  const summary: PeriodSummaryRpcData = {
    totalRows: num(r.total_rows),
    validatedCount: num(r.validated_count),
    pendingCount: num(r.pending_count),
    excludedCount: num(r.excluded_count),
    sumNetoValidated: num(r.sum_neto_validated),
    sumIvaValidated: num(r.sum_iva_validated),
    sumTotalValidated: num(r.sum_total_validated),
  }

  const tipoRaw = tipoRes.data
  const tipoRows = tipoSummariesFromRpcRows(
    Array.isArray(tipoRaw) ? tipoRaw : []
  )
  return {
    ok: true,
    summary,
    byTipo: tipoRows,
    byBucket: aggregateBucketsFromTipoSummaries(tipoRows),
    byOfficialLine: aggregateOfficialLinesFromTipoSummaries(tipoRows),
  }
}
