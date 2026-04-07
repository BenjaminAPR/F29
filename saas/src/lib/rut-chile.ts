/**
 * Normaliza y valida RUT chileno (personas y empresas).
 * Formato canónico guardado: "12345678-9" o "12345678-K"
 */

export type NormalizedRut = {
  /** ej. "12345678-5" */
  normalized: string
  body: string
  dv: string
}

function computeDv(body: string): string {
  let sum = 0
  let mult = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mult
    mult = mult === 7 ? 2 : mult + 1
  }
  const rem = 11 - (sum % 11)
  if (rem === 11) return '0'
  if (rem === 10) return 'K'
  return String(rem)
}

/**
 * Acepta entradas con o sin puntos/guion. Devuelve null si el formato es inválido.
 */
export function parseChileRut(raw: string): NormalizedRut | null {
  const compact = raw
    .trim()
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/-/g, '')
    .replace(/\s/g, '')

  if (compact.length < 2) return null

  const dv = compact.slice(-1)
  const body = compact.slice(0, -1)

  if (!/^\d+$/.test(body)) return null
  if (body.length < 6 || body.length > 9) return null
  if (!/^[\dK]$/.test(dv)) return null

  return {
    normalized: `${body}-${dv}`,
    body,
    dv,
  }
}

export function isValidChileRutDv(parsed: NormalizedRut): boolean {
  return computeDv(parsed.body) === parsed.dv
}

/** Puntos como separador de miles en el cuerpo del RUT (solo dígitos). */
export function formatRutBodyWithDots(bodyDigits: string): string {
  if (!bodyDigits) return ''
  return bodyDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * A partir del valor guardado (`12345678-9`) devuelve `12.345.678-9`.
 */
export function prettyPrintNormalizedRut(normalized: string): string | null {
  const p = parseChileRut(normalized)
  if (!p) return null
  return `${formatRutBodyWithDots(p.body)}-${p.dv}`
}

/**
 * Formatea lo que el usuario escribe: puntos en el cuerpo, guion antes del DV.
 * El servidor sigue aceptando el valor vía `parseChileRut`.
 */
export function formatRutInputValue(raw: string): string {
  if (!raw) return ''
  const u = raw.toUpperCase()
  const dashIdx = u.indexOf('-')

  if (dashIdx >= 0) {
    const bodyRaw = u
      .slice(0, dashIdx)
      .replace(/[^0-9]/g, '')
      .slice(0, 9)
    const dv = u
      .slice(dashIdx + 1)
      .replace(/[^0-9K]/g, '')
      .slice(0, 1)
    const pretty = formatRutBodyWithDots(bodyRaw)
    return dv ? `${pretty}-${dv}` : `${pretty}-`
  }

  const kCompact = u.replace(/[^0-9K]/g, '')
  if (kCompact.endsWith('K') && kCompact.length > 1) {
    const bodyRaw = kCompact
      .slice(0, -1)
      .replace(/[^0-9]/g, '')
      .slice(0, 9)
    const pretty = formatRutBodyWithDots(bodyRaw)
    return pretty ? `${pretty}-K` : 'K'
  }

  const digits = u.replace(/[^0-9]/g, '').slice(0, 10)
  if (!digits) return ''

  if (digits.length <= 8) {
    return formatRutBodyWithDots(digits)
  }

  if (digits.length === 9) {
    const body = digits.slice(0, 8)
    const dv = digits.slice(8)
    const parsed: NormalizedRut = {
      body,
      dv,
      normalized: `${body}-${dv}`,
    }
    if (body.length >= 6 && isValidChileRutDv(parsed)) {
      return `${formatRutBodyWithDots(body)}-${dv}`
    }
    return formatRutBodyWithDots(digits)
  }

  const body = digits.slice(0, 9)
  const dv = digits.slice(9)
  return `${formatRutBodyWithDots(body)}-${dv}`
}
