import { z } from 'zod'

/**
 * Tipos de documento electrónico SII (DTE) más usados en compras/ventas.
 * Lista orientativa; ampliar según normativa vigente.
 * @see Referencia general: tablas de tipos DTE en documentación del SII.
 */
export const SII_TIPOS_DTE_COMUNES = [
  '33',
  '34',
  '35',
  '38',
  '39',
  '40',
  '41',
  '43',
  '45',
  '46',
  '48',
  '50',
  '52',
  '55',
  '56',
  '61',
  '103',
  '104',
  '105',
  '106',
  '108',
  '109',
  '110',
  '901',
  '914',
] as const

export type SiiTipoDteComun = (typeof SII_TIPOS_DTE_COMUNES)[number]

const tipoSet = new Set<string>(SII_TIPOS_DTE_COMUNES)

export const TipoDocSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'tipo_doc debe ser numérico (código SII)')
  .refine((v) => tipoSet.has(v), {
    message:
      'tipo_doc no reconocido como DTE habitual SII (p.ej. 33 factura, 39 factura exenta, 61 nota crédito). Revise el valor o amplíe la lista en tipoDocumento.ts.',
  })

export function esTipoDteSiiValido(tipo: string): boolean {
  const r = TipoDocSchema.safeParse(tipo)
  return r.success
}

export function assertTipoDteSii(tipo: string): void {
  const r = TipoDocSchema.safeParse(tipo)
  if (!r.success) {
    const msg = r.error.issues.map((i) => i.message).join('; ')
    throw new SiiValidationError(msg, { tipo })
  }
}

export class SiiValidationError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, unknown>
  ) {
    super(message)
    this.name = 'SiiValidationError'
  }
}
