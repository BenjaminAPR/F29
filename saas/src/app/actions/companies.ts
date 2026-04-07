'use server'

import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { isValidChileRutDv, parseChileRut } from '@/lib/rut-chile'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const Schema = z.object({
  razon_social: z.string().trim().min(2, 'Razón social requerida'),
})

function errRedirect(msg: string): never {
  redirect(`/companies?e=${encodeURIComponent(msg)}`)
}

export async function createCompany(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect('/setup')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const rutRaw = String(formData.get('rut') ?? '')
  const parsedRut = parseChileRut(rutRaw)
  if (!parsedRut) {
    errRedirect(
      'RUT inválido. Usa solo números y dígito verificador (ej. 12.345.678-9).'
    )
  }
  if (!isValidChileRutDv(parsedRut)) {
    errRedirect('El dígito verificador del RUT no es correcto.')
  }

  const parsed = Schema.safeParse({
    razon_social: formData.get('razon_social'),
  })

  if (!parsed.success) {
    errRedirect(parsed.error.issues.map((i) => i.message).join('; '))
  }

  const { razon_social } = parsed.data

  const { error } = await supabase.from('companies').insert({
    rut: parsedRut.normalized,
    razon_social,
    created_by: user.id,
  })

  if (error) {
    const dup =
      error.code === '23505' ||
      /duplicate key|unique constraint/i.test(error.message ?? '')
    if (dup) {
      errRedirect(
        'Ya tienes una empresa registrada con ese RUT. Si antes usaste otro formato (con/sin puntos), ahora se guarda unificado: revisa la lista.'
      )
    }
    errRedirect(error.message)
  }

  revalidateCompanies()
  redirect('/companies?ok=created')
}

const CompanyIdSchema = z.object({
  companyId: z.string().uuid('Identificador de empresa inválido'),
})

function revalidateCompanies() {
  revalidatePath('/companies')
  revalidatePath('/companies', 'layout')
}

export async function updateCompanyRazon(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect('/setup')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const idParsed = CompanyIdSchema.safeParse({
    companyId: formData.get('companyId'),
  })
  if (!idParsed.success) {
    errRedirect(idParsed.error.issues.map((i) => i.message).join('; '))
  }

  const parsed = Schema.safeParse({
    razon_social: formData.get('razon_social'),
  })
  if (!parsed.success) {
    errRedirect(parsed.error.issues.map((i) => i.message).join('; '))
  }

  const companyId = idParsed.data.companyId
  const { razon_social } = parsed.data

  const { data: updated, error } = await supabase
    .from('companies')
    .update({ razon_social })
    .eq('id', companyId)
    .eq('created_by', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    errRedirect(error.message)
  }
  if (!updated) {
    errRedirect('No se encontró la empresa o no tienes permiso para editarla.')
  }

  revalidateCompanies()
  revalidatePath(`/${companyId}/dashboard`, 'page')
  redirect('/companies?ok=updated')
}

export async function deleteCompany(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect('/setup')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const idParsed = CompanyIdSchema.safeParse({
    companyId: formData.get('companyId'),
  })
  if (!idParsed.success) {
    errRedirect(idParsed.error.issues.map((i) => i.message).join('; '))
  }

  const companyId = idParsed.data.companyId

  const { data: removed, error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId)
    .eq('created_by', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    errRedirect(error.message)
  }
  if (!removed) {
    errRedirect('No se encontró la empresa o no tienes permiso para eliminarla.')
  }

  revalidateCompanies()
  redirect('/companies?ok=deleted')
}
