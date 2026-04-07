import { F29_OFFICIAL_REFERENCE_VERSION } from '@/lib/f29/officialReferenceVersion'

export type OfficialLineDef = {
  /** Identificador interno estable (no es el código de casilla del SII). */
  lineRefId: string
  title: string
  practitionerNote: string
}

/**
 * Conceptos habitualmente útiles al pasar compras al F29.
 * Los números de línea del formulario cambian: siempre contrastar con el instructivo vigente.
 */
export const F29_OFFICIAL_LINE_CATALOG: OfficialLineDef[] = [
  {
    lineRefId: 'ref_compras_afectas_iva',
    title: 'Compras afectas con IVA (base crédito fiscal)',
    practitionerNote:
      'Agrupa documentos con IVA recuperable típico (p. ej. facturas 33, 46; boletas 39 según caso). Casilla exacta en F29: instructivo SII del período.',
  },
  {
    lineRefId: 'ref_compras_exentas',
    title: 'Compras exentas o no afectas',
    practitionerNote:
      'Facturas/boletas exentas (34, 41, etc.). Ver líneas de exentos en formulario e instructivo.',
  },
  {
    lineRefId: 'ref_notas_credito_recibidas',
    title: 'Notas de crédito recibidas (ajustes a compras)',
    practitionerNote:
      'DTE 61 u homólogas. Revisar signo y casillas de crédito / reintegros en instructivo.',
  },
  {
    lineRefId: 'ref_notas_debito_recibidas',
    title: 'Notas de débito recibidas',
    practitionerNote:
      'DTE 56. Efecto según operación; contrastar con instructivo F29.',
  },
  {
    lineRefId: 'ref_otros_comprobantes',
    title: 'Otros comprobantes / revisión manual',
    practitionerNote:
      'Guías 52, liquidaciones 43, compra papel 45, DTE no mapeados u otros casos. Clasificar según instructivo.',
  },
]

const catalogById = new Map(
  F29_OFFICIAL_LINE_CATALOG.map((d) => [d.lineRefId, d])
)

export function officialLineDefOrFallback(lineRefId: string): OfficialLineDef {
  return (
    catalogById.get(lineRefId) ?? {
      lineRefId,
      title: 'Línea no catalogada',
      practitionerNote: 'Revisar mapeo en lib/f29/officialLines.ts.',
    }
  )
}

/**
 * Mapea el bucket DTE (beta) a una línea de referencia F29.
 */
export function officialRefIdForBucket(bucketId: string): string {
  switch (bucketId) {
    case 'factura_afecta':
    case 'boleta_afecta':
    case 'factura_compra':
      return 'ref_compras_afectas_iva'
    case 'factura_exenta':
    case 'boleta_exenta':
      return 'ref_compras_exentas'
    case 'nota_credito':
      return 'ref_notas_credito_recibidas'
    case 'nota_debito':
      return 'ref_notas_debito_recibidas'
    case 'guia_despacho':
    case 'liquidacion':
    case 'factura_compra_papel':
    default:
      return 'ref_otros_comprobantes'
  }
}

export function officialReferenceMeta() {
  return { version: F29_OFFICIAL_REFERENCE_VERSION }
}
