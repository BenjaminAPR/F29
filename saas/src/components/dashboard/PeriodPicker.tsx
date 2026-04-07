'use client'

import { useRouter } from 'next/navigation'

type Props = {
  companyId: string
  /** YYYY-MM */
  value: string
}

export function PeriodPicker({ companyId, value }: Props) {
  const router = useRouter()
  return (
    <label className="flex flex-wrap items-center gap-2.5 text-sm">
      <span className="font-medium text-slate-600">Período</span>
      <input
        type="month"
        value={value}
        onChange={(e) => {
          const p = e.target.value
          if (p) {
            router.push(
              `/${companyId}/dashboard?period=${encodeURIComponent(p)}`
            )
          }
        }}
        className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 font-mono text-sm text-slate-900 transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        aria-label="Período tributario"
      />
    </label>
  )
}
