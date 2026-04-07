export const REVIEW_STATUSES = ['pending', 'validated', 'excluded'] as const

export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export function isReviewStatus(s: string): s is ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(s)
}

export function coerceReviewStatus(
  s: string | null | undefined
): ReviewStatus {
  if (s && isReviewStatus(s)) return s
  return 'validated'
}

export function reviewStatusLabel(s: ReviewStatus): string {
  switch (s) {
    case 'pending':
      return 'Pendiente'
    case 'validated':
      return 'Validado'
    case 'excluded':
      return 'Excluido'
    default:
      return s
  }
}
