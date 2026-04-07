import { f29MapMeta } from '@/lib/f29/dteBuckets'
import { officialReferenceMeta } from '@/lib/f29/officialLines'
import type {
  F29BucketSummary,
  OfficialLineSummary,
  TipoDocSummary,
} from '@/lib/f29/summaries'

function fmt(n: number) {
  return n.toLocaleString('es-CL')
}

type Props = {
  byTipo: TipoDocSummary[]
  byBucket: F29BucketSummary[]
  byOfficialLine: OfficialLineSummary[]
}

export function PeriodAggregatesPanel({
  byTipo,
  byBucket,
  byOfficialLine,
}: Props) {
  if (byTipo.length === 0) return null

  const meta = f29MapMeta()
  const offMeta = officialReferenceMeta()

  return (
    <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-6">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          Por tipo DTE (solo validados)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Suma de documentos en estado validado, agrupados por código de tipo
          electrónico.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[280px] text-left text-sm text-slate-800">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">DTE</th>
                <th className="py-2 pr-3 text-right">Docs</th>
                <th className="py-2 pr-3 text-right">Neto</th>
                <th className="py-2 pr-3 text-right">IVA</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {byTipo.map((r) => (
                <tr
                  key={r.tipoDte}
                  className="border-b border-slate-50 last:border-0"
                >
                  <td className="py-2 pr-3 font-mono text-xs">{r.tipoDte}</td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {r.count}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {fmt(r.neto)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono text-xs">
                    {fmt(r.iva)}
                  </td>
                  <td className="py-2 text-right font-mono text-xs">
                    {fmt(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-200/60 bg-violet-50/30 p-5 shadow-sm ring-1 ring-violet-900/[0.06] sm:p-6">
        <h2 className="text-sm font-semibold tracking-tight text-violet-950">
          Agrupación F29 (beta)
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-violet-900/80">
          Mapa experimental <span className="font-mono">v{meta.version}</span>.
          Facilita la lectura hacia el formulario;{' '}
          <strong>no reemplaza</strong> el instructivo oficial ni el criterio
          contable.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm text-slate-800">
            <thead className="border-b border-violet-100 text-xs uppercase tracking-wide text-violet-800/80">
              <tr>
                <th className="py-2 pr-2">Grupo</th>
                <th className="py-2 pr-2 text-right">Docs</th>
                <th className="py-2 pr-2 text-right">Neto</th>
                <th className="py-2 pr-2 text-right">IVA</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {byBucket.map((r) => (
                <tr
                  key={r.bucketId}
                  className="border-b border-violet-100/80 last:border-0"
                  title={r.f29Hint}
                >
                  <td className="max-w-[12rem] py-2 pr-2 text-xs leading-snug">
                    <span className="font-medium text-slate-900">{r.label}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                      {r.bucketId}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">
                    {r.count}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">
                    {fmt(r.neto)}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">
                    {fmt(r.iva)}
                  </td>
                  <td className="py-2 text-right font-mono text-xs">
                    {fmt(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>

      <section className="rounded-2xl border border-sky-200/70 bg-sky-50/25 p-5 shadow-sm ring-1 ring-sky-900/[0.05] sm:p-6">
        <h2 className="text-sm font-semibold tracking-tight text-sky-950">
          Líneas F29 — referencia (planificación)
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-sky-950/85">
          Agrupación orientativa para trasladar montos al formulario. Versión del
          catálogo:{' '}
          <span className="font-mono">v{offMeta.version}</span>. No indica el
          número de casilla del SII: contrastar siempre con el{' '}
          <strong>instructivo oficial</strong> del período.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm text-slate-800">
            <thead className="border-b border-sky-100 text-xs uppercase tracking-wide text-sky-900/70">
              <tr>
                <th className="py-2 pr-2">Referencia</th>
                <th className="py-2 pr-2 text-right">Docs</th>
                <th className="py-2 pr-2 text-right">Neto</th>
                <th className="py-2 pr-2 text-right">IVA</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {byOfficialLine.map((r) => (
                <tr
                  key={r.lineRefId}
                  className="border-b border-sky-100/80 last:border-0"
                  title={r.practitionerNote}
                >
                  <td className="max-w-md py-2 pr-2 text-xs leading-snug">
                    <span className="font-medium text-slate-900">{r.title}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                      {r.lineRefId}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">
                    {r.count}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">
                    {fmt(r.neto)}
                  </td>
                  <td className="py-2 pr-2 text-right font-mono text-xs">
                    {fmt(r.iva)}
                  </td>
                  <td className="py-2 text-right font-mono text-xs">
                    {fmt(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
