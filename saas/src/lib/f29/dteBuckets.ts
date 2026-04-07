import { F29_BUCKET_MAP_VERSION } from '@/lib/f29/mapVersion'

export type F29Bucket = {
  bucketId: string
  label: string
  /** Aclaración para la UI; no sustituye el instructivo oficial del SII. */
  f29Hint: string
}

const BUCKETS: Record<string, F29Bucket> = {
  '33': {
    bucketId: 'factura_afecta',
    label: 'Factura electrónica afecta (33)',
    f29Hint:
      'Beta: compras con IVA / crédito fiscal. Verificar línea exacta en F29 según instructivo vigente.',
  },
  '34': {
    bucketId: 'factura_exenta',
    label: 'Factura electrónica exenta (34)',
    f29Hint:
      'Beta: compras exentas o no afectas. Verificar línea en formulario e instructivo.',
  },
  '39': {
    bucketId: 'boleta_afecta',
    label: 'Boleta electrónica (39)',
    f29Hint:
      'Beta: boletas con IVA. Tratamiento en F29 según caso; revisar instructivo.',
  },
  '41': {
    bucketId: 'boleta_exenta',
    label: 'Boleta exenta electrónica (41)',
    f29Hint: 'Beta: boletas exentas. Revisar instructivo F29.',
  },
  '46': {
    bucketId: 'factura_compra',
    label: 'Factura de compra electrónica (46)',
    f29Hint:
      'Beta: documento de compra. Coherencia con crédito fiscal según normativa.',
  },
  '56': {
    bucketId: 'nota_debito',
    label: 'Nota de débito electrónica (56)',
    f29Hint:
      'Beta: incrementa débitos o ajusta compras según corresponda; revisar instructivo.',
  },
  '61': {
    bucketId: 'nota_credito',
    label: 'Nota de crédito electrónica (61)',
    f29Hint:
      'Beta: reduce montos / anula parte de facturas; verificar signo y línea F29.',
  },
  '52': {
    bucketId: 'guia_despacho',
    label: 'Guía de despacho electrónica (52)',
    f29Hint: 'Beta: efectos según operación; muchas guías no van directo a IVA mensual.',
  },
  '43': {
    bucketId: 'liquidacion',
    label: 'Liquidación factura (43)',
    f29Hint: 'Beta: revisar tratamiento en compras y F29.',
  },
  '45': {
    bucketId: 'factura_compra_papel',
    label: 'Factura de compra (45)',
    f29Hint: 'Beta: similar a compras; verificar versión electrónica vs papel en instructivo.',
  },
}

export function bucketForTipoDoc(tipoDoc: string): F29Bucket {
  const k = tipoDoc.trim()
  if (BUCKETS[k]) return BUCKETS[k]
  return {
    bucketId: `dte_${k || 'sin_codigo'}`,
    label: k ? `Tipo DTE ${k}` : 'Tipo DTE (sin código)',
    f29Hint:
      'Beta: sin bucket predefinido. Clasificar manualmente según instructivo F29 vigente.',
  }
}

export function f29MapMeta() {
  return {
    version: F29_BUCKET_MAP_VERSION,
  }
}
