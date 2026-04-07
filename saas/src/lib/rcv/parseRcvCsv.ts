import Papa from 'papaparse'
import { z } from 'zod'
import { CorruptedFileError } from '@/lib/errors'
import { assertTipoDteSii } from '@/lib/sii/tipoDocumento'

/** Fila normalizada lista para persistir (o validar antes de insert). */
export const RcvParsedRowSchema = z.object({
  tipo_doc: z.string(),
  rut_emisor: z.string().optional(),
  folio: z.string().optional(),
  monto_neto: z.number().int(),
  iva: z.number().int(),
  total: z.number().int(),
  fecha: z.string().optional(),
  metadata_json: z.record(z.string(), z.unknown()),
})

export type RcvParsedRow = z.infer<typeof RcvParsedRowSchema>

export type ParseRcvCsvResult = {
  rows: RcvParsedRow[]
  skippedLines: number
  warnings: string[]
}

/** Normaliza encabezado: minúsculas, sin tildes básicas, espacios → underscore */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

/**
 * Alias de columnas típicas RCV / compras registra (orientativo; el SII puede variar exportaciones).
 */
const HEADER_ALIASES: Record<string, keyof ParsedAliasTargets> = {
  tipo_doc: 'tipo_doc',
  tipodoc: 'tipo_doc',
  tipo_de_documento: 'tipo_doc',
  tipo: 'tipo_doc',
  dte: 'tipo_doc',
  folio: 'folio',
  nro_folio: 'folio',
  num_folio: 'folio',
  rut_emisor: 'rut_emisor',
  rut: 'rut_emisor',
  rut_proveedor: 'rut_emisor',
  rutproveedor: 'rut_emisor',
  rut_de_proveedor: 'rut_emisor',
  monto_neto: 'monto_neto',
  neto: 'monto_neto',
  monto_neto_55: 'monto_neto',
  iva: 'iva',
  monto_iva_recuperable: 'iva',
  monto_iva: 'iva',
  total: 'total',
  monto_total: 'total',
  monto_total_60: 'total',
  fecha: 'fecha',
  fecha_docto: 'fecha',
  fecha_documento: 'fecha',
}

type ParsedAliasTargets = {
  tipo_doc: string
  folio: string
  rut_emisor: string
  monto_neto: string
  iva: string
  total: string
  fecha: string
}

function pickMappedRow(
  raw: Record<string, string>,
  warnings: string[],
  lineIndex: number
): ParsedAliasTargets | null {
  const norm: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    norm[normalizeHeader(k)] = v
  }
  const targets: Partial<ParsedAliasTargets> = {}
  for (const [normKey, value] of Object.entries(norm)) {
    const target = HEADER_ALIASES[normKey]
    if (target && !targets[target] && value !== '') {
      targets[target] = value
    }
  }
  if (!targets.tipo_doc) {
    warnings.push(`Línea ${lineIndex + 1}: sin columna de tipo de documento reconocible.`)
    return null
  }
  for (const req of ['monto_neto', 'iva', 'total'] as const) {
    if (targets[req] === undefined) {
      warnings.push(`Línea ${lineIndex + 1}: falta ${req}.`)
      return null
    }
  }
  return targets as ParsedAliasTargets
}

function parseMoneyCl(raw: string): number {
  const s = raw.trim()
  if (!s) return NaN
  const neg = s.startsWith('-')
  const cleaned = s.replace(/^-/, '').replace(/\./g, '').replace(',', '.')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return NaN
  return Math.round(n) * (neg ? -1 : 1)
}

/** Devuelve YYYY-MM-DD si es posible (para columna date en Postgres). */
function parseChileDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const t = raw.trim()
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    const d = m[1].padStart(2, '0')
    const mo = m[2].padStart(2, '0')
    const y = m[3]
    return `${y}-${mo}-${d}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  return undefined
}

/**
 * Parsea CSV tipo RCV / registro de compras del SII (separador ; o , autodetectado por Papa).
 * Valida tipo_doc contra lista SII configurada.
 */
export function parseRcvCsv(content: string, filename: string): ParseRcvCsvResult {
  if (!content || content.trim().length === 0) {
    throw new CorruptedFileError(`CSV vacío: ${filename}`)
  }

  const warnings: string[] = []
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h,
  })

  if (parsed.errors?.length) {
    const fatal = parsed.errors.find(
      (e) => e.type === 'Quotes' || e.type === 'Delimiter'
    )
    if (fatal) {
      throw new CorruptedFileError(
        `CSV corrupto (${filename}): ${fatal.message} en fila ${fatal.row ?? '?'}`,
        fatal
      )
    }
  }

  const data = parsed.data ?? []
  if (data.length === 0) {
    throw new CorruptedFileError(`CSV sin filas de datos: ${filename}`)
  }

  const rows: RcvParsedRow[] = []
  let skippedLines = 0

  data.forEach((raw, idx) => {
    const mapped = pickMappedRow(raw, warnings, idx)
    if (!mapped) {
      skippedLines += 1
      return
    }

    try {
      assertTipoDteSii(mapped.tipo_doc.trim())
    } catch (e) {
      warnings.push(
        `Línea ${idx + 1}: tipo_doc "${mapped.tipo_doc}" — ${e instanceof Error ? e.message : String(e)}`
      )
      skippedLines += 1
      return
    }

    const monto_neto = parseMoneyCl(mapped.monto_neto)
    const iva = parseMoneyCl(mapped.iva)
    const total = parseMoneyCl(mapped.total)
    if ([monto_neto, iva, total].some((n) => Number.isNaN(n))) {
      warnings.push(`Línea ${idx + 1}: montos no numéricos.`)
      skippedLines += 1
      return
    }

    const rest: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      rest[k] = v
    }

    rows.push({
      tipo_doc: mapped.tipo_doc.trim(),
      rut_emisor: mapped.rut_emisor?.trim() || undefined,
      folio: mapped.folio?.trim() || undefined,
      monto_neto,
      iva,
      total,
      fecha: parseChileDate(mapped.fecha),
      metadata_json: { source: 'RCV_CSV', raw_headers: Object.keys(raw), raw_row: rest },
    })
  })

  return { rows, skippedLines, warnings }
}
