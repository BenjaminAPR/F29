import type { SupabaseClient } from '@supabase/supabase-js'

export type RcvReconciliation = {
  period: string
  rcv_rows_count: number
  docs_csv_count: number
  docs_validated_count: number
  rcv_sum_neto: number
  rcv_sum_iva: number
  rcv_sum_total: number
  docs_csv_sum_neto: number
  docs_csv_sum_iva: number
  docs_csv_sum_total: number
  missing_in_docs: number
  extra_in_docs: number
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0
  return 0
}

export async function fetchRcvPeriodReconciliation(
  supabase: SupabaseClient,
  args: { companyId: string; period: string }
): Promise<{ ok: true; data: RcvReconciliation } | { ok: false; error: string }> {
  const res = await supabase.rpc('rcv_period_reconciliation', {
    p_company_id: args.companyId,
    p_period: args.period,
  })
  if (res.error) return { ok: false, error: res.error.message }
  const raw = res.data
  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row || typeof row !== 'object') {
    return { ok: false, error: 'Respuesta vacía de rcv_period_reconciliation' }
  }
  const r = row as Record<string, unknown>
  return {
    ok: true,
    data: {
      period: String(r.period ?? args.period),
      rcv_rows_count: num(r.rcv_rows_count),
      docs_csv_count: num(r.docs_csv_count),
      docs_validated_count: num(r.docs_validated_count),
      rcv_sum_neto: num(r.rcv_sum_neto),
      rcv_sum_iva: num(r.rcv_sum_iva),
      rcv_sum_total: num(r.rcv_sum_total),
      docs_csv_sum_neto: num(r.docs_csv_sum_neto),
      docs_csv_sum_iva: num(r.docs_csv_sum_iva),
      docs_csv_sum_total: num(r.docs_csv_sum_total),
      missing_in_docs: num(r.missing_in_docs),
      extra_in_docs: num(r.extra_in_docs),
    },
  }
}

