'use server'

import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { isReviewStatus } from '@/lib/documents/reviewStatus'
import { dashboardRedirectParams } from '@/lib/dashboard/periodDocumentFilters'
import { normalizePeriod } from '@/lib/period'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const ReviewNoteSchema = z.string().trim().max(500)

export async function deleteDocument(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect('/setup')
  }

  const documentId = formData.get('documentId')?.toString()
  const companyId = formData.get('companyId')?.toString()
  const periodRaw = formData.get('period')?.toString()

  if (!documentId || !companyId) {
    redirect('/companies')
  }

  const period = normalizePeriod(periodRaw)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('company_id', companyId)

  if (error) {
    const qp = dashboardRedirectParams(period, formData)
    qp.set('e', error.message)
    redirect(`/${companyId}/dashboard?${qp.toString()}`)
  }

  revalidatePath(`/${companyId}/dashboard`)
  const ok = dashboardRedirectParams(period, formData)
  redirect(`/${companyId}/dashboard?${ok.toString()}`)
}

export async function updateDocumentReview(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect('/setup')
  }

  const documentId = formData.get('documentId')?.toString()
  const companyId = formData.get('companyId')?.toString()
  const periodRaw = formData.get('period')?.toString()
  const reviewStatusRaw = formData.get('reviewStatus')?.toString()
  const reviewNoteRaw = formData.get('reviewNote')

  if (!documentId || !companyId || !reviewStatusRaw || !isReviewStatus(reviewStatusRaw)) {
    redirect('/companies')
  }

  const period = normalizePeriod(periodRaw)

  let review_note: string | null = null
  if (reviewStatusRaw === 'excluded') {
    if (typeof reviewNoteRaw === 'string') {
      const n = ReviewNoteSchema.safeParse(reviewNoteRaw)
      review_note = n.success && n.data.length > 0 ? n.data : null
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('documents')
    .update({
      review_status: reviewStatusRaw,
      review_note,
    })
    .eq('id', documentId)
    .eq('company_id', companyId)

  if (error) {
    const qp = dashboardRedirectParams(period, formData)
    qp.set('e', error.message)
    redirect(`/${companyId}/dashboard?${qp.toString()}`)
  }

  revalidatePath(`/${companyId}/dashboard`)
  const ok = dashboardRedirectParams(period, formData)
  redirect(`/${companyId}/dashboard?${ok.toString()}`)
}
