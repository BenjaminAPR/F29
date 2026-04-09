import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import {
  filtersToReturnSearchParams,
  parsePeriodDocFilters,
} from '@/lib/dashboard/periodDocumentFilters'
import { normalizePeriod } from '@/lib/period'

type Props = {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{
    period?: string
    version?: string
    line?: string
    page?: string
    tipo?: string
    origen?: string
    estado?: string
    q?: string
  }>
}

const PAGE_SIZE = 50

export default async function F29OfficialPage({ params, searchParams }: Props) {
  const { companyId } = await params
  const sp = await searchParams

  if (!isSupabaseConfigured()) notFound()

  const period = normalizePeriod(sp.period)
  const version = (sp.version ?? process.env.F29_OFFICIAL_VERSION ?? '2026-01-cl')
    .trim()
    .slice(0, 40)

  const { page: pageNum, filters } = parsePeriodDocFilters(sp)
  const from = (pageNum - 1) * PAGE_SIZE

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: company } = await supabase
    .from('companies')
    .select('id, rut, razon_social')
    .eq('id', companyId)
    .eq('created_by', user.id)
    .maybeSingle()
  if (!company) notFound()

  const payloadBase = {
    p_company_id: companyId,
    p_period: period,
    p_version_id: version,
    p_source_type: filters.sourceType ?? null,
    p_search: filters.search ?? null,
  }

  const [{ data: lines, error: linesErr }, lineDocsRes, lineCountRes] =
    await Promise.all([
      supabase.rpc('f29_official_period_lines', payloadBase),
      sp.line
        ? supabase.rpc('f29_official_line_documents', {
            ...payloadBase,
            p_line_code: sp.line,
            p_limit: PAGE_SIZE,
            p_offset: from,
          })
        : Promise.resolve({ data: null, error: null } as any),
      sp.line
        ? supabase.rpc('f29_official_line_document_count', {
            ...payloadBase,
            p_line_code: sp.line,
          })
        : Promise.resolve({ data: null, error: null } as any),
    ])

  const lineDocs = lineDocsRes?.data ?? null
  const lineDocsErr = lineDocsRes?.error ?? null
  const lineCount = typeof lineCountRes?.data === 'number' ? lineCountRes.data : 0

  const backQs = filtersToReturnSearchParams(period, filters).toString()
  const backHref = `/${companyId}/dashboard?${backQs}`

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            F29 oficial · {company.razon_social}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Período{' '}
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              {period}
            </span>{' '}
            · versión{' '}
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              {version}
            </span>
          </p>
        </div>
        <Link
          href={backHref}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          Volver al dashboard
        </Link>
      </div>

      {linesErr ? (
        <p
          className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          Error RPC F29 oficial: {linesErr.message}. Ejecutá en Supabase{' '}
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

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Líneas (solo validados)
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Click en una línea para ver documentos.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm text-slate-800">
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
              {(lines as any[] | null | undefined)?.length ? (
                (lines as any[]).map((r) => {
                  const lineCode = String(r.line_code)
                  const qs = new URLSearchParams({
                    period,
                    version,
                    line: lineCode,
                    ...(filters.sourceType ? { origen: filters.sourceType } : {}),
                    ...(filters.search ? { q: filters.search } : {}),
                  })
                  const href = `/${companyId}/dashboard/f29-official?${qs.toString()}`
                  const active = sp.line === lineCode
                  return (
                    <tr
                      key={lineCode}
                      className={[
                        'border-b border-slate-50 last:border-0',
                        active ? 'bg-sky-50/60' : '',
                      ].join(' ')}
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={href}
                          className="block rounded-md px-1.5 py-1 transition hover:bg-slate-100"
                        >
                          <div className="font-medium text-slate-900">
                            {r.title}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                            {lineCode}
                          </div>
                        </Link>
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
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    Sin líneas (¿sin documentos validados o sin mapeo?).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {sp.line ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                  Documentos en línea{' '}
                  <span className="rounded bg-slate-100 px-1 font-mono text-[11px]">
                    {sp.line}
                  </span>
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {lineCount.toLocaleString('es-CL')} documento(s) · página{' '}
                  {pageNum}.
                </p>
              </div>
            </div>
            {lineDocsErr ? (
              <p className="mt-2 text-xs text-amber-900">
                Error RPC documentos: {lineDocsErr.message}
              </p>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm text-slate-800">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">RUT</th>
                  <th className="px-3 py-2">Folio</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                  <th className="px-3 py-2 text-right">IVA</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(lineDocs as any[] | null | undefined)?.length ? (
                  (lineDocs as any[]).map((d) => (
                    <tr
                      key={String(d.id)}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {d.tipo_doc}
                      </td>
                      <td className="px-3 py-2 text-xs">{d.source_type}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {d.rut_emisor ?? '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {d.folio ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(d.monto_neto ?? 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(d.iva ?? 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(d.total ?? 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-3 py-2 text-xs">{d.fecha ?? '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-slate-500"
                    >
                      Sin documentos para esta línea con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-600 sm:px-5">
            <span>
              Mostrando {Math.min(PAGE_SIZE, Math.max(0, lineCount - from))} de{' '}
              {lineCount.toLocaleString('es-CL')}
            </span>
            <div className="flex items-center gap-2">
              {pageNum > 1 ? (
                <Link
                  href={`/${companyId}/dashboard/f29-official?${new URLSearchParams({
                    period,
                    version,
                    line: sp.line,
                    page: String(pageNum - 1),
                    ...(filters.sourceType ? { origen: filters.sourceType } : {}),
                    ...(filters.search ? { q: filters.search } : {}),
                  }).toString()}`}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm transition hover:bg-slate-50"
                >
                  ← Anterior
                </Link>
              ) : (
                <span />
              )}
              {from + PAGE_SIZE < lineCount ? (
                <Link
                  href={`/${companyId}/dashboard/f29-official?${new URLSearchParams({
                    period,
                    version,
                    line: sp.line,
                    page: String(pageNum + 1),
                    ...(filters.sourceType ? { origen: filters.sourceType } : {}),
                    ...(filters.search ? { q: filters.search } : {}),
                  }).toString()}`}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm transition hover:bg-slate-50"
                >
                  Siguiente →
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

