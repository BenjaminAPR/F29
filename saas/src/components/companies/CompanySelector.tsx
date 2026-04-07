'use client'

import { prettyPrintNormalizedRut } from '@/lib/rut-chile'
import { ChevronDown } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

export type CompanyOption = {
  id: string
  rut: string
  razon_social: string
}

type Props = {
  companies: CompanyOption[]
}

export function CompanySelector({ companies }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const match = pathname.match(/^\/([^/]+)\/dashboard/)
  const currentId = match?.[1] ?? ''

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-2">
      <label
        htmlFor="company-select"
        className="sr-only"
      >
        Empresa activa
      </label>
      <div className="relative min-w-0 flex-1">
        <select
          id="company-select"
          className="h-10 w-full min-w-0 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          value={
            currentId && companies.some((c) => c.id === currentId)
              ? currentId
              : ''
          }
          onChange={(e) => {
            const id = e.target.value
            if (!id) return
            router.push(`/${id}/dashboard`)
          }}
        >
          <option value="">Elegir empresa…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razon_social} · {prettyPrintNormalizedRut(c.rut) ?? c.rut}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>
    </div>
  )
}
