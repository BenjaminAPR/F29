'use client'

import { prettyPrintNormalizedRut } from '@/lib/rut-chile'
import { Download } from 'lucide-react'

export type CsvDocumentRow = {
  tipo_doc: string
  source_type: string
  rut_emisor: string | null
  folio: string | null
  monto_neto: number
  iva: number
  total: number
  fecha: string | null
  period: string
  review_status: string
  review_note: string | null
}

function escapeCell(s: string): string {
  if (/[;"\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function safeFilenamePart(s: string): string {
  return s.replace(/[^\w.-]+/g, '_').slice(0, 80)
}

type Props = {
  companyRut: string
  period: string
  rows: CsvDocumentRow[]
}

export function ExportPeriodCsvButton({
  companyRut,
  period,
  rows,
}: Props) {
  const disabled = rows.length === 0

  function download() {
    if (rows.length === 0) return

    const headers = [
      'tipo_doc',
      'source_type',
      'rut_emisor',
      'folio',
      'monto_neto',
      'iva',
      'total',
      'fecha',
      'period',
      'review_status',
      'review_note',
    ] as const

    const lines = [
      headers.join(';'),
      ...rows.map((r) =>
        [
          escapeCell(r.tipo_doc),
          escapeCell(r.source_type),
          escapeCell(r.rut_emisor ?? ''),
          escapeCell(r.folio ?? ''),
          String(r.monto_neto),
          String(r.iva),
          String(r.total),
          escapeCell(r.fecha ?? ''),
          escapeCell(r.period),
          escapeCell(r.review_status),
          escapeCell(r.review_note ?? ''),
        ].join(';')
      ),
    ]

    const csv = `\uFEFF${lines.join('\r\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const rutFile = safeFilenamePart(
      prettyPrintNormalizedRut(companyRut)?.replace(/\./g, '') ?? companyRut
    )
    a.href = url
    a.download = `documentos-${rutFile}-${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={download}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="size-3.5 shrink-0 opacity-80" aria-hidden />
      Exportar CSV
    </button>
  )
}
