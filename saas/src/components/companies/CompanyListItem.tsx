'use client'

import { deleteCompany, updateCompanyRazon } from '@/app/actions/companies'
import { prettyPrintNormalizedRut } from '@/lib/rut-chile'
import { ArrowRight, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { CompanyUpdateSubmit } from './CompanyUpdateSubmit'
import { DeleteCompanySubmit } from './DeleteCompanySubmit'

export type CompanyListRow = {
  id: string
  rut: string
  razon_social: string
}

export function CompanyListItem({ company: c }: { company: CompanyListRow }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <li className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-5 shadow-sm ring-1 ring-sky-900/[0.06] sm:p-6">
        <form action={updateCompanyRazon} className="space-y-4">
          <input type="hidden" name="companyId" value={c.id} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="block min-w-0 flex-1">
              <span className="text-sm font-medium text-slate-700">
                Razón social
              </span>
              <input
                name="razon_social"
                required
                defaultValue={c.razon_social}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-inner transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
            <p className="shrink-0 text-sm text-slate-600">
              RUT{' '}
              <span className="font-mono font-medium text-slate-800">
                {prettyPrintNormalizedRut(c.rut) ?? c.rut}
              </span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                El RUT no se puede cambiar
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CompanyUpdateSubmit />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="group flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300/90 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{c.razon_social}</p>
        <p className="mt-0.5 font-mono text-sm text-slate-500">
          {prettyPrintNormalizedRut(c.rut) ?? c.rut}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Pencil className="size-4 opacity-70" aria-hidden />
          Editar
        </button>
        <form
          action={deleteCompany}
          onSubmit={(e) => {
            if (
              !confirm(
                `¿Eliminar "${c.razon_social}" y todos sus documentos? No se puede deshacer.`
              )
            ) {
              e.preventDefault()
            }
          }}
          className="inline"
        >
          <input type="hidden" name="companyId" value={c.id} />
          <DeleteCompanySubmit />
        </form>
        <Link
          href={`/${c.id}/dashboard`}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-600/25 transition hover:bg-sky-500 active:scale-[0.99] sm:px-5"
        >
          Dashboard
          <ArrowRight className="size-4 opacity-90" aria-hidden />
        </Link>
      </div>
    </li>
  )
}
