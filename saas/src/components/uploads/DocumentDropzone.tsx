'use client'

import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/uploadLimits'
import { FileUp, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

type Props = {
  companyId: string
  /** YYYY-MM período al que se asignan los documentos importados */
  period: string
  onProcessed?: () => void
}

export function DocumentDropzone({ companyId, period, onProcessed }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback(
    async (file: File) => {
      setMessage(null)
      setError(null)
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`El archivo supera ${MAX_UPLOAD_MB} MB. Reduce el tamaño o comprime el PDF.`)
        return
      }
      setBusy(true)
      try {
        const fd = new FormData()
        fd.set('companyId', companyId)
        fd.set('period', period)
        fd.set('file', file)
        const res = await fetch('/api/process-upload', {
          method: 'POST',
          body: fd,
        })
        const data = (await res.json()) as {
          ok?: boolean
          error?: string
          inserted?: number
          warnings?: string[]
          skippedLines?: number
          source?: string
          reviewStatus?: string
        }
        if (!res.ok) {
          setError(data.error ?? `Error ${res.status}`)
          return
        }
        let msg =
          `Importación OK: ${data.inserted ?? 0} documento(s).` +
          (data.skippedLines ? ` Omitidas: ${data.skippedLines}.` : '')
        if (data.source === 'PDF' || data.reviewStatus === 'pending') {
          msg +=
            ' Quedó pendiente de revisión: valida la fila en la tabla para incluirla en los totales.'
        }
        setMessage(msg)
        const warns = data.warnings
        if (warns?.length) {
          setMessage(
            (m) => `${m} Advertencias: ${warns.slice(0, 3).join(' · ')}`
          )
        }
        onProcessed?.()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fallo de red')
      } finally {
        setBusy(false)
      }
    },
    [companyId, period, onProcessed]
  )

  return (
    <div
      role="region"
      aria-label="Carga CSV o PDF"
      onDragOver={(e) => {
        e.preventDefault()
        if (!busy) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (busy) return
        const f = e.dataTransfer.files?.[0]
        if (f) void processFile(f)
      }}
      className={`rounded-2xl border-2 border-dashed p-8 text-center shadow-sm ring-1 ring-slate-900/[0.04] transition ${
        dragOver
          ? 'border-sky-500 bg-sky-50/90 shadow-sky-500/10'
          : 'border-slate-200/90 bg-white'
      } ${busy ? 'pointer-events-none opacity-70' : ''}`}
    >
      <input
        id={`drop-${companyId}`}
        type="file"
        accept=".csv,.pdf,.png,.jpg,.jpeg,.webp,text/csv,application/pdf,image/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void processFile(f)
          e.target.value = ''
        }}
      />
      <label
        htmlFor={`drop-${companyId}`}
        className="flex cursor-pointer flex-col items-center gap-3"
      >
        {busy ? (
          <Loader2 className="size-10 animate-spin text-sky-600" aria-hidden />
        ) : (
          <FileUp className="size-10 text-slate-400" aria-hidden />
        )}
        <div>
          <p className="font-medium text-slate-800">
            {busy ? 'Procesando…' : 'Arrastra CSV (RCV) o PDF / imagen'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Período:{' '}
            <span className="font-mono font-medium text-slate-700">{period}</span>
            . Máx. {MAX_UPLOAD_MB} MB por archivo. PDF/imagen vía Vertex AI (
            <code className="rounded bg-slate-100 px-1">GOOGLE_CLOUD_PROJECT</code>) o{' '}
            <code className="rounded bg-slate-100 px-1">GEMINI_API_KEY</code> en dev.
          </p>
        </div>
      </label>
      {message ? (
        <p className="mt-4 text-sm text-emerald-800" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
