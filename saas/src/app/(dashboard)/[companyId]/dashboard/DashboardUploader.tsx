'use client'

import { DocumentDropzone } from '@/components/uploads/DocumentDropzone'
import { useRouter } from 'next/navigation'

export function DashboardUploader({
  companyId,
  period,
}: {
  companyId: string
  period: string
}) {
  const router = useRouter()
  return (
    <DocumentDropzone
      companyId={companyId}
      period={period}
      onProcessed={() => router.refresh()}
    />
  )
}
