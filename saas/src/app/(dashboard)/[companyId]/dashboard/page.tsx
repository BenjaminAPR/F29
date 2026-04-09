import { DashboardUploader } from '@/app/(dashboard)/[companyId]/dashboard/DashboardUploader'
import {
  DocumentReviewControls,
  ReviewStatusBadge,
} from '@/components/dashboard/DocumentReviewControls'
import { DocumentDeleteForm } from '@/components/dashboard/DocumentDeleteForm'
import { ExportPeriodCsvButton } from '@/components/dashboard/ExportPeriodCsvButton'
import { ExportPeriodXlsxButton } from '@/components/dashboard/ExportPeriodXlsxButton'
import { DocumentTablePagination } from '@/components/dashboard/DocumentTablePagination'
import { PeriodAggregatesPanel } from '@/components/dashboard/PeriodAggregatesPanel'
import { PeriodDocumentFilters } from '@/components/dashboard/PeriodDocumentFilters'
import { PeriodPicker } from '@/components/dashboard/PeriodPicker'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { normalizePeriod } from '@/lib/period'
import { coerceReviewStatus } from '@/lib/documents/reviewStatus'
import { fetchDocumentPeriodAggregatesRpc } from '@/lib/dashboard/documentPeriodAggregateRpc'
import { fetchRcvPeriodReconciliation } from '@/lib/dashboard/rcvReconciliationRpc'
import {
  DOCUMENT_PAGE_SIZE,
  SUMMARY_FETCH_CAP,
  applyPeriodDocFilters,
  filtersActive,
  parsePeriodDocFilters,
} from '@/lib/dashboard/periodDocumentFilters'
import {
  summarizeValidatedByF29Bucket,
  summarizeValidatedByOfficialLine,
  summarizeValidatedByTipoDoc,
} from '@/lib/f29/summaries'
import { prettyPrintNormalizedRut } from '@/lib/rut-chile'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

type Props = {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{
    period?: string
    e?: string
    page?: string
    tipo?: string
    origen?: string
    estado?: string
    q?: string
  }>
}

export default async function CompanyDashboardPage({ params, searchParams }: Props) {
  const { companyId } = await params
  const sp = await searchParams
  const { period: periodParam, e: errParam } = sp
  const { page: pageNum, filters } = parsePeriodDocFilters(sp)

  if (!isSupabaseConfigured()) {
    redirect('/setup')
  }

  const period = normalizePeriod(periodParam)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: company, error: cErr } = await supabase
    .from('companies')
    .select('id, rut, razon_social')
    .eq('id', companyId)
    .eq('created_by', user.id)
    .maybeSingle()

  if (cErr || !company) notFound()

  const selectCols =
    'id, tipo_doc, rut_emisor, folio, monto_neto, iva, total, fecha, source_type, period, created_at, review_status, review_note'

  const from = (pageNum - 1) * DOCUMENT_PAGE_SIZE
  const to = from + DOCUMENT_PAGE_SIZE - 1

  let qPage = supabase
    .from('documents')
    .select(selectCols, { count: 'exact' })
    .eq('company_id', companyId)
    .eq('period', period)
  qPage = applyPeriodDocFilters(qPage, filters)

  let qSummary = supabase
    .from('documents')
    .select(selectCols)
    .eq('company_id', companyId)
    .eq('period', period)
  qSummary = applyPeriodDocFilters(qSummary, filters)

  const [
    rpcAgg,
    pageRes,
    summaryRes,
    tiposRes,
    f29OfficialRes,
    rcvRecon,
  ] = await Promise.all([
    fetchDocumentPeriodAggregatesRpc(supabase, {
      companyId,
      period,
      filters,
    }),
    qPage.order('created_at', { ascending: false }).range(from, to),
    qSummary.order('created_at', { ascending: false }).limit(SUMMARY_FETCH_CAP),
    supabase
      .from('documents')
      .select('tipo_doc')
      .eq('company_id', companyId)
      .eq('period', period),
    supabase.rpc('f29_official_period_lines', {
      p_company_id: companyId,
      p_period: period,
      p_version_id: process.env.F29_OFFICIAL_VERSION ?? '2026-01-cl',
      p_source_type: filters.sourceType ?? null,
      p_search: filters.search ?? null,
    }),
    fetchRcvPeriodReconciliation(supabase, { companyId, period }),
  ])

  const {
    data: docs,
    error: docsErr,
    count: filteredCount,
  } = pageRes
  const { data: summaryDocs, error: summaryErr } = summaryRes
  const { data: tipoRows } = tiposRes
  const { data: f29OfficialLines, error: f29OfficialErr } = f29OfficialRes

  const tiposEnPeriodo = [
    ...new Set(
      (tipoRows ?? [])
        .map((r) => r.tipo_doc)
        .filter((t): t is string => Boolean(t && String(t).trim()))
    ),
  ].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))

  const list = docs ?? []
  const summaryList = summaryDocs ?? []
  const totalCount = filteredCount ?? 0
  const summaryCapHit = totalCount > SUMMARY_FETCH_CAP
  const docsErrCombined = docsErr || summaryErr
  const aggregatesFromRpc = rpcAgg.ok
  const rpcAggregateHint =
    !aggregatesFromRpc && totalCount > 0 ? rpcAgg.error : null

  const f29OfficialVersion = process.env.F29_OFFICIAL_VERSION ?? '2026-01-cl'
  const f29OfficialHint =
    f29OfficialErr?.message ??
    (Array.isArray(f29OfficialLines) ? null : 'RPC f29_official_period_lines sin datos')

  const rcvHint = rcvRecon.ok ? null : rcvRecon.error

  const csvRows = summaryList.map((d) => {
    const st = coerceReviewStatus(
      (d as { review_status?: string }).review_status
    )
    return {
      tipo_doc: d.tipo_doc,
      source_type: d.source_type,
      rut_emisor: d.rut_emisor,
      folio: d.folio,
      monto_neto: Number(d.monto_neto),
      iva: Number(d.iva),
      total: Number(d.total),
      fecha: d.fecha,
      period: d.period ?? period,
      review_status: st,
      review_note: (d as { review_note?: string | null }).review_note ?? null,
    }
  })

  const validatedList = summaryList.filter(
    (d) =>
      coerceReviewStatus((d as { review_status?: string }).review_status) ===
      'validated'
  )

  const nPending = aggregatesFromRpc
    ? rpcAgg.summary.pendingCount
    : summaryList.filter(
        (d) =>
          coerceReviewStatus(
            (d as { review_status?: string }).review_status
          ) === 'pending'
      ).length

  const nExcluded = aggregatesFromRpc
    ? rpcAgg.summary.excludedCount
    : summaryList.filter(
        (d) =>
          coerceReviewStatus(
            (d as { review_status?: string }).review_status
          ) === 'excluded'
      ).length

  const totals = aggregatesFromRpc
    ? {
        neto: rpcAgg.summary.sumNetoValidated,
        iva: rpcAgg.summary.sumIvaValidated,
        total: rpcAgg.summary.sumTotalValidated,
      }
    : validatedList.reduce(
        (acc, d) => ({
          neto: acc.neto + Number(d.monto_neto),
          iva: acc.iva + Number(d.iva),
          total: acc.total + Number(d.total),
        }),
        { neto: 0, iva: 0, total: 0 }
      )

  const byTipoDoc = aggregatesFromRpc
    ? rpcAgg.byTipo
    : summarizeValidatedByTipoDoc(csvRows)
  const byF29Bucket = aggregatesFromRpc
    ? rpcAgg.byBucket
    : summarizeValidatedByF29Bucket(csvRows)
  const byOfficialLine = aggregatesFromRpc
    ? rpcAgg.byOfficialLine
    : summarizeValidatedByOfficialLine(csvRows)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {company.razon_social}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            RUT {prettyPrintNormalizedRut(company.rut) ?? company.rut} ·{' '}
            {filtersActive(filters) ? (
              <>
                <strong className="text-slate-800">{totalCount}</strong> documento(s)
                con filtros actuales en{' '}
              </>
            ) : (
              <>
                {totalCount} documento(s) en{' '}
              </>
            )}
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              {period}
            </span>
          </p>
          {totalCount > 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              {aggregatesFromRpc ? (
                <>
                  Totales y paneles (tipo DTE, F29 beta, líneas ref.) se calculan
                  en la base con los filtros actuales, sin tope de filas.
                </>
              ) : filtersActive(filters) ? (
                <>
                  Totales y paneles usan el conjunto filtrado (máx.{' '}
                  {SUMMARY_FETCH_CAP} más recientes
                  {summaryCapHit ? '; hay más filas: afiná el filtro o aplicá la migración 0004' : ''}).
                </>
              ) : (
                <>
                  Agregados desde muestra (máx. {SUMMARY_FETCH_CAP} más
                  recientes); migración{' '}
                  <code className="rounded bg-slate-100 px-1 font-mono text-[10px]">
                    0004_document_period_aggregates.sql
                  </code>{' '}
                  para sumas exactas.
                </>
              )}{' '}
              Suma de montos: solo{' '}
              <strong className="text-slate-700">validados</strong>. Pendientes:{' '}
              {nPending} · Excluidos: {nExcluded}.
            </p>
          ) : null}
        </div>
        <PeriodPicker companyId={companyId} value={period} />
      </div>

      {errParam ? (
        <p
          className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {(() => {
            try {
              return decodeURIComponent(errParam)
            } catch {
              return errParam
            }
          })()}
        </p>
      ) : null}

      {docsErrCombined ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Error al cargar documentos: {docsErrCombined.message}. Si faltan columnas,
          ejecuta en Supabase{' '}
          <code className="rounded bg-amber-100 px-1">
            supabase/migrations/0002_documents_period.sql
          </code>{' '}
          (<code className="rounded bg-amber-100 px-1">period</code>) y{' '}
          <code className="rounded bg-amber-100 px-1">
            supabase/migrations/0003_documents_review.sql
          </code>{' '}
          (<code className="rounded bg-amber-100 px-1">review_status</code>).
        </p>
      ) : null}

      {rpcAggregateHint ? (
        <p
          className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2 text-xs text-amber-950"
          role="status"
        >
          Agregados aproximados (muestra o RPC no disponible): {rpcAggregateHint}.
          En Supabase ejecutá{' '}
          <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">
            supabase/migrations/0004_document_period_aggregates.sql
          </code>{' '}
          y otorgá <code className="rounded bg-amber-100 px-1">GRANT EXECUTE</code>{' '}
          a <code className="rounded bg-amber-100 px-1">authenticated</code>.
        </p>
      ) : null}

      <DashboardUploader companyId={companyId} period={period} />

      <PeriodDocumentFilters
        companyId={companyId}
        period={period}
        filters={filters}
        tiposEnPeriodo={tiposEnPeriodo}
      />

      <PeriodAggregatesPanel
        byTipo={byTipoDoc}
        byBucket={byF29Bucket}
        byOfficialLine={byOfficialLine}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                F29 oficial (versionado)
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Agregado por línea oficial (seed) · versión{' '}
                <span className="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-800">
                  {f29OfficialVersion}
                </span>{' '}
                · solo <strong>validados</strong>.
              </p>
            </div>
            <Link
              href={`/${companyId}/dashboard/f29-official?period=${encodeURIComponent(period)}&version=${encodeURIComponent(f29OfficialVersion)}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Ver detalle
            </Link>
          </div>
          {f29OfficialHint ? (
            <p className="mt-2 text-xs text-amber-900">
              No se pudo cargar F29 oficial vía RPC: {f29OfficialHint}. Ejecutá
              en Supabase{' '}
              <code className="rounded bg-amber-100 px-1">
                supabase/migrations/0008_f29_official_catalog.sql
              </code>{' '}
              y{' '}
              <code className="rounded bg-amber-100 px-1">
                supabase/migrations/0009_f29_official_rpc.sql
              </code>
              .
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm text-slate-800">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Línea</th>
                <th className="px-3 py-2 text-right">Docs</th>
                <th className="px-3 py-2 text-right">Neto</th>
                <th className="px-3 py-2 text-right">IVA</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(f29OfficialLines as any[] | null | undefined)?.length ? (
                (f29OfficialLines as any[]).map((r) => (
                  <tr
                    key={String(r.line_code)}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">
                        {r.title}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                        {r.line_code}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {Number(r.doc_count ?? 0).toLocaleString('es-CL')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Number(r.sum_neto ?? 0).toLocaleString('es-CL')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Number(r.sum_iva ?? 0).toLocaleString('es-CL')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Number(r.sum_total ?? 0).toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    {f29OfficialHint
                      ? 'RPC no disponible.'
                      : 'Sin líneas para mostrar (¿sin documentos validados o sin mapeo?).'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Conciliación RCV (beta)
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Compara `rcv_rows` (importaciones RCV) vs documentos CSV cargados (no
            excluidos). Si aún no guardas RCV, verás 0 filas.
          </p>
          {rcvHint ? (
            <p className="mt-2 text-xs text-amber-900">
              No se pudo cargar conciliación: {rcvHint}. Ejecutá en Supabase{' '}
              <code className="rounded bg-amber-100 px-1">
                supabase/migrations/0006_rcv_imports.sql
              </code>{' '}
              y{' '}
              <code className="rounded bg-amber-100 px-1">
                supabase/migrations/0010_rcv_reconciliation_rpc.sql
              </code>
              .
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-[11px] text-slate-600">Filas RCV</div>
            <div className="mt-1 font-mono text-lg text-slate-900">
              {rcvRecon.ok ? rcvRecon.data.rcv_rows_count.toLocaleString('es-CL') : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-600">
              Neto {rcvRecon.ok ? rcvRecon.data.rcv_sum_neto.toLocaleString('es-CL') : '—'} · IVA{' '}
              {rcvRecon.ok ? rcvRecon.data.rcv_sum_iva.toLocaleString('es-CL') : '—'} · Total{' '}
              {rcvRecon.ok ? rcvRecon.data.rcv_sum_total.toLocaleString('es-CL') : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="text-[11px] text-slate-600">Docs CSV (no excluidos)</div>
            <div className="mt-1 font-mono text-lg text-slate-900">
              {rcvRecon.ok ? rcvRecon.data.docs_csv_count.toLocaleString('es-CL') : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-600">
              Neto {rcvRecon.ok ? rcvRecon.data.docs_csv_sum_neto.toLocaleString('es-CL') : '—'} · IVA{' '}
              {rcvRecon.ok ? rcvRecon.data.docs_csv_sum_iva.toLocaleString('es-CL') : '—'} · Total{' '}
              {rcvRecon.ok ? rcvRecon.data.docs_csv_sum_total.toLocaleString('es-CL') : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] text-slate-600">Faltan en docs (por dedup_key)</div>
            <div className="mt-1 font-mono text-lg text-slate-900">
              {rcvRecon.ok ? rcvRecon.data.missing_in_docs.toLocaleString('es-CL') : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] text-slate-600">Sobran en docs (por dedup_key)</div>
            <div className="mt-1 font-mono text-lg text-slate-900">
              {rcvRecon.ok ? rcvRecon.data.extra_in_docs.toLocaleString('es-CL') : '—'}
            </div>
          </div>
        </div>
      </section>

      {summaryCapHit ? (
        <p
          className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-2 text-xs text-amber-950"
          role="status"
        >
          Hay más de {SUMMARY_FETCH_CAP} documentos que coinciden con el filtro.
          {aggregatesFromRpc ? (
            <>
              {' '}
              El detalle en CSV y Excel sigue limitado a los {SUMMARY_FETCH_CAP}{' '}
              más recientes; los totales en pantalla y en la hoja Resumen son
              exactos en base de datos.
            </>
          ) : (
            <>
              {' '}
              Los totales, agregados F29 (beta) y export CSV/Excel usan solo los{' '}
              {SUMMARY_FETCH_CAP} más recientes. Aplicá la migración 0004 o
              afiná filtros para un cierre exacto.
            </>
          )}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Registro del período
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Neto / IVA / total = validados en el conjunto filtrado
              {aggregatesFromRpc
                ? ' (sumas en base de datos).'
                : ` (máx. ${SUMMARY_FETCH_CAP} filas en muestra).`}{' '}
              Tabla paginada ({DOCUMENT_PAGE_SIZE} por página).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <ExportPeriodCsvButton
              companyRut={company.rut}
              period={period}
              rows={csvRows}
            />
            <ExportPeriodXlsxButton
              companyRut={company.rut}
              razonSocial={company.razon_social}
              period={period}
              rows={csvRows}
              totals={totals}
              tipoSummary={byTipoDoc}
              f29BucketSummary={byF29Bucket}
              officialLineSummary={byOfficialLine}
            />
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              <span>
                Neto:{' '}
                <strong className="font-mono text-slate-900">
                  {totals.neto.toLocaleString('es-CL')}
                </strong>
              </span>
              <span>
                IVA:{' '}
                <strong className="font-mono text-slate-900">
                  {totals.iva.toLocaleString('es-CL')}
                </strong>
              </span>
              <span>
                Total:{' '}
                <strong className="font-mono text-slate-900">
                  {totals.total.toLocaleString('es-CL')}
                </strong>
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm text-slate-800">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">Estado</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2">RUT</th>
                <th className="px-3 py-2">Folio</th>
                <th className="px-3 py-2 text-right">Neto</th>
                <th className="px-3 py-2 text-right">IVA</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="min-w-[11rem] px-2 py-2 text-right">Revisión</th>
                <th className="w-10 px-1 py-2" aria-label="Eliminar" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    {totalCount === 0 && !filtersActive(filters) ? (
                      <>
                        Sin documentos en este período. Sube CSV o PDF o cambia
                        el mes arriba.
                      </>
                    ) : (
                      <>
                        Ningún documento coincide con los filtros o la página
                        está vacía. Probá &quot;Limpiar&quot; o otra página.
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                list.map((d) => {
                  const st = coerceReviewStatus(
                    (d as { review_status?: string }).review_status
                  )
                  const note =
                    (d as { review_note?: string | null }).review_note ?? null
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-2 py-2 align-top">
                        <ReviewStatusBadge status={st} note={note} />
                      </td>
                      <td className="px-3 py-2 font-mono">{d.tipo_doc}</td>
                      <td className="px-3 py-2">{d.source_type}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {d.rut_emisor ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono">{d.folio ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(d.monto_neto).toLocaleString('es-CL')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(d.iva).toLocaleString('es-CL')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(d.total).toLocaleString('es-CL')}
                      </td>
                      <td className="px-3 py-2">{d.fecha ?? '—'}</td>
                      <td className="px-2 py-2 align-top text-right">
                        <DocumentReviewControls
                          documentId={d.id}
                          companyId={companyId}
                          period={period}
                          status={st}
                          preserveFilters={filters}
                        />
                      </td>
                      <td className="px-1 py-2 text-center align-top">
                        <DocumentDeleteForm
                          documentId={d.id}
                          companyId={companyId}
                          period={period}
                          preserveFilters={filters}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <DocumentTablePagination
          companyId={companyId}
          period={period}
          filters={filters}
          totalCount={totalCount}
          page={pageNum}
        />
      </section>
    </div>
  )
}
