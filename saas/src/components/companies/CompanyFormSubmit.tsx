'use client'

import { useFormStatus } from 'react-dom'

export function CompanyFormSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-600/25 transition hover:bg-sky-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Guardando…' : 'Guardar empresa'}
    </button>
  )
}
