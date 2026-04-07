'use client'

import { prettyPrintNormalizedRut } from '@/lib/rut-chile'
import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { F29_OFFICIAL_REFERENCE_VERSION } from '@/lib/f29/officialReferenceVersion'
import { F29_BUCKET_MAP_VERSION } from '@/lib/f29/mapVersion'
import type {
  F29BucketSummary,
  OfficialLineSummary,
  TipoDocSummary,
} from '@/lib/f29/summaries'
import type { CsvDocumentRow } from './ExportPeriodCsvButton'

function safeFilenamePart(s: string): string {
  return s.replace(/[^\w.-]+/g, '_').slice(0, 80)
}

type Props = {
  companyRut: string
  razonSocial: string
  period: string
  rows: CsvDocumentRow[]
  totals: { neto: number; iva: number; total: number }
  tipoSummary: TipoDocSummary[]
  f29BucketSummary: F29BucketSummary[]
  officialLineSummary: OfficialLineSummary[]
}

export function ExportPeriodXlsxButton({
  companyRut,
  razonSocial,
  period,
  rows,
  totals,
  tipoSummary,
  f29BucketSummary,
  officialLineSummary,
}: Props) {
  const [busy, setBusy] = useState(false)
  const disabled = rows.length === 0 || busy

  async function download() {
    if (rows.length === 0) return
    setBusy(true)
    try {
      const XLSX = await import('xlsx')
      const prettyRut = prettyPrintNormalizedRut(companyRut) ?? companyRut

      const nVal = rows.filter((r) => r.review_status === 'validated').length
      const nPen = rows.filter((r) => r.review_status === 'pending').length
      const nExc = rows.filter((r) => r.review_status === 'excluded').length

      const resumen = [
        { Concepto: 'Razón social', Valor: razonSocial },
        { Concepto: 'RUT', Valor: prettyRut },
        { Concepto: 'Período', Valor: period },
        { Concepto: 'Documentos en listado', Valor: rows.length },
        { Concepto: 'Validados (cuentan en totales)', Valor: nVal },
        { Concepto: 'Pendientes de revisión', Valor: nPen },
        { Concepto: 'Excluidos', Valor: nExc },
        { Concepto: 'Neto (solo validados)', Valor: totals.neto },
        { Concepto: 'IVA (solo validados)', Valor: totals.iva },
        { Concepto: 'Total (solo validados)', Valor: totals.total },
        {
          Concepto: 'Mapa F29 (beta) versión',
          Valor: F29_BUCKET_MAP_VERSION,
        },
        {
          Concepto: 'Líneas F29 referencia versión',
          Valor: F29_OFFICIAL_REFERENCE_VERSION,
        },
      ]
      const wsRes = XLSX.utils.json_to_sheet(resumen)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen')

      const detail = rows.map((r) => ({
        'Tipo doc': r.tipo_doc,
        Origen: r.source_type,
        'RUT emisor': r.rut_emisor ?? '',
        Folio: r.folio ?? '',
        Neto: r.monto_neto,
        IVA: r.iva,
        Total: r.total,
        Fecha: r.fecha ?? '',
        Período: r.period,
        Revisión: r.review_status,
        'Nota revisión': r.review_note ?? '',
      }))
      const wsDet = XLSX.utils.json_to_sheet(detail)
      XLSX.utils.book_append_sheet(wb, wsDet, 'Documentos')

      if (tipoSummary.length > 0) {
        const wsTipo = XLSX.utils.json_to_sheet(
          tipoSummary.map((t) => ({
            'Tipo DTE': t.tipoDte,
            Documentos: t.count,
            Neto: t.neto,
            IVA: t.iva,
            Total: t.total,
          }))
        )
        XLSX.utils.book_append_sheet(wb, wsTipo, 'Por tipo DTE')
      }

      if (f29BucketSummary.length > 0) {
        const wsF29 = XLSX.utils.json_to_sheet(
          f29BucketSummary.map((b) => ({
            'ID grupo': b.bucketId,
            Grupo: b.label,
            'Nota F29 (beta)': b.f29Hint,
            Documentos: b.count,
            Neto: b.neto,
            IVA: b.iva,
            Total: b.total,
          }))
        )
        XLSX.utils.book_append_sheet(wb, wsF29, 'F29 beta')
      }

      if (officialLineSummary.length > 0) {
        const wsOff = XLSX.utils.json_to_sheet(
          officialLineSummary.map((o) => ({
            'ID referencia': o.lineRefId,
            Titulo: o.title,
            Nota: o.practitionerNote,
            Documentos: o.count,
            Neto: o.neto,
            IVA: o.iva,
            Total: o.total,
          }))
        )
        XLSX.utils.book_append_sheet(wb, wsOff, 'F29 lineas ref')
      }

      const rutFile = safeFilenamePart(
        prettyPrintNormalizedRut(companyRut)?.replace(/\./g, '') ?? companyRut
      )
      XLSX.writeFile(wb, `documentos-${rutFile}-${period}.xlsx`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void download()}
      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FileSpreadsheet className="size-3.5 shrink-0 opacity-80" aria-hidden />
      {busy ? 'Generando…' : 'Excel'}
    </button>
  )
}
