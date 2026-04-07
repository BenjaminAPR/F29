const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidPeriod(s: string): boolean {
  return PERIOD_RE.test(s.trim())
}

/** Período actual en UTC (YYYY-MM). Para producción se puede cambiar a zona Chile. */
export function currentPeriodUtc(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function normalizePeriod(input: string | null | undefined): string {
  const p = (input ?? '').trim()
  if (isValidPeriod(p)) return p
  return currentPeriodUtc()
}
