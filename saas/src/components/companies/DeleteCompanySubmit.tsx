'use client'

import { Trash2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

export function DeleteCompanySubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="size-4 shrink-0 opacity-80" aria-hidden />
      {pending ? 'Eliminando…' : 'Eliminar'}
    </button>
  )
}
