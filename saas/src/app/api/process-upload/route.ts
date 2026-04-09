import { NextResponse } from 'next/server'
import { extractInvoiceWithGemini } from '@/lib/gemini/extractDocument'
import { CorruptedFileError, UnsupportedFileTypeError } from '@/lib/errors'
import { parseRcvCsv } from '@/lib/rcv/parseRcvCsv'
import { assertTipoDteSii, SiiValidationError } from '@/lib/sii/tipoDocumento'
import { documentDedupKey } from '@/lib/documents/dedupKey'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { normalizePeriod } from '@/lib/period'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/uploadLimits'

export const runtime = 'nodejs'

function extFromName(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Supabase no configurado. Crea saas/.env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (ver /setup).',
          code: 'MISSING_SUPABASE',
        },
        { status: 503 }
      )
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const form = await request.formData()
    const companyIdRaw = form.get('companyId')
    const file = form.get('file')
    const period = normalizePeriod(
      typeof form.get('period') === 'string'
        ? (form.get('period') as string)
        : undefined
    )

    if (typeof companyIdRaw !== 'string' || !companyIdRaw) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `Archivo demasiado grande (máximo ${MAX_UPLOAD_MB} MB).`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 413 }
      )
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyIdRaw)
      .eq('created_by', user.id)
      .maybeSingle()

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Empresa no encontrada o sin permiso' },
        { status: 403 }
      )
    }

    const name = file.name || 'upload'
    const ext = extFromName(name)
    const mime = file.type || 'application/octet-stream'
    const buf = Buffer.from(await file.arrayBuffer())

    if (ext === 'csv' || mime === 'text/csv' || mime === 'application/csv') {
      const text = buf.toString('utf8')
      let parsed
      try {
        parsed = parseRcvCsv(text, name)
      } catch (e) {
        if (e instanceof CorruptedFileError) {
          return NextResponse.json(
            { error: e.message, code: 'CORRUPTED_CSV' },
            { status: 422 }
          )
        }
        throw e
      }

      if (parsed.rows.length === 0) {
        return NextResponse.json(
          {
            error: 'No se importó ninguna fila válida',
            warnings: parsed.warnings,
            skippedLines: parsed.skippedLines,
          },
          { status: 422 }
        )
      }

      // Persistimos el batch RCV y las filas para conciliación (si las tablas existen).
      let rcvBatchId: string | null = null
      try {
        const { data: batch, error: batchErr } = await supabase
          .from('rcv_import_batches')
          .insert({
            company_id: companyIdRaw,
            period,
            filename: name,
            source_type: 'CSV',
            warnings: parsed.warnings,
            skipped_lines: parsed.skippedLines,
            imported_rows: parsed.rows.length,
            created_by: user.id,
          })
          .select('id')
          .maybeSingle()
        if (!batchErr && batch?.id) {
          rcvBatchId = String(batch.id)
          const rcvRows = parsed.rows.map((r) => ({
            batch_id: rcvBatchId,
            company_id: companyIdRaw,
            period,
            tipo_doc: r.tipo_doc,
            rut_emisor: r.rut_emisor ?? null,
            folio: r.folio ?? null,
            monto_neto: r.monto_neto,
            iva: r.iva,
            total: r.total,
            fecha: r.fecha ?? null,
            dedup_key: documentDedupKey({
              tipo_doc: r.tipo_doc,
              rut_emisor: r.rut_emisor ?? null,
              folio: r.folio ?? null,
              total: r.total,
              fecha: r.fecha ?? null,
            }),
            raw_json: r.metadata_json,
            created_by: user.id,
          }))
          await supabase.from('rcv_rows').insert(rcvRows)
        }
      } catch {
        // Si no existen tablas (migración 0006), no bloqueamos la carga de documentos.
        rcvBatchId = null
      }

      const rows = parsed.rows.map((r) => ({
        company_id: companyIdRaw,
        period,
        tipo_doc: r.tipo_doc,
        rut_emisor: r.rut_emisor ?? null,
        folio: r.folio ?? null,
        monto_neto: r.monto_neto,
        iva: r.iva,
        total: r.total,
        fecha: r.fecha ?? null,
        source_type: 'CSV' as const,
        review_status: 'validated' as const,
        dedup_key: documentDedupKey({
          tipo_doc: r.tipo_doc,
          rut_emisor: r.rut_emisor ?? null,
          folio: r.folio ?? null,
          total: r.total,
          fecha: r.fecha ?? null,
        }),
        metadata_json: rcvBatchId
          ? { ...r.metadata_json, rcv_batch_id: rcvBatchId }
          : r.metadata_json,
        created_by: user.id,
      }))

      const { error: insertError } = await supabase.from('documents').insert(rows)
      if (insertError) {
        return NextResponse.json(
          { error: insertError.message, code: 'DB_INSERT' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        ok: true,
        source: 'CSV',
        inserted: rows.length,
        skippedLines: parsed.skippedLines,
        warnings: parsed.warnings,
      })
    }

    const pdfOrImage =
      ext === 'pdf' ||
      mime === 'application/pdf' ||
      ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ||
      mime.startsWith('image/')

    if (!pdfOrImage) {
      throw new UnsupportedFileTypeError(mime, ext)
    }

    const gcpProject =
      process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCP_PROJECT ?? ''
    const vertexLocation =
      process.env.VERTEX_LOCATION ??
      process.env.GOOGLE_CLOUD_REGION ??
      'us-central1'
    const apiKey = process.env.GEMINI_API_KEY

    if (!gcpProject && !apiKey) {
      return NextResponse.json(
        {
          error:
            'IA no configurada: definí GOOGLE_CLOUD_PROJECT + Vertex (ADC en Cloud Run) o GEMINI_API_KEY para desarrollo.',
          code: 'MISSING_AI',
        },
        { status: 503 }
      )
    }

    const mimeForGemini =
      mime && mime !== 'application/octet-stream'
        ? mime
        : ext === 'pdf'
          ? 'application/pdf'
          : ext === 'png'
            ? 'image/png'
            : 'image/jpeg'

    const model =
      process.env.VERTEX_GEMINI_MODEL ??
      process.env.GEMINI_MODEL ??
      'gemini-1.5-flash'

    const extracted = await extractInvoiceWithGemini({
      buffer: buf,
      mimeType: mimeForGemini,
      model,
      ...(gcpProject
        ? { vertex: { project: gcpProject, location: vertexLocation } }
        : { apiKey: apiKey! }),
    })

    let tipoDoc = extracted.tipo_doc?.trim() ?? null
    const meta: Record<string, unknown> = {
      gemini: extracted,
      filename: name,
      ai_provider: gcpProject ? 'vertex' : 'gemini_api',
    }

    if (tipoDoc) {
      try {
        assertTipoDteSii(tipoDoc)
      } catch (e) {
        if (e instanceof SiiValidationError) {
          meta.sii_validation_error = e.message
          tipoDoc = null
        } else {
          throw e
        }
      }
    }

    if (!tipoDoc) {
      return NextResponse.json(
        {
          error:
            'No se pudo determinar un tipo DTE válido (33, 39, etc.). Revise el documento o el resultado de IA.',
          extraction: extracted,
        },
        { status: 422 }
      )
    }

    const neto = extracted.neto ?? 0
    const iva = extracted.iva ?? 0
    const total = extracted.total ?? neto + iva

    const doc = {
      company_id: companyIdRaw,
      period,
      tipo_doc: tipoDoc,
      rut_emisor: extracted.rut_emisor ?? null,
      folio: extracted.folio ?? null,
      monto_neto: neto,
      iva,
      total,
      fecha: null as string | null,
      source_type: 'PDF' as const,
      review_status: 'pending' as const,
      dedup_key: documentDedupKey({
        tipo_doc: tipoDoc,
        rut_emisor: extracted.rut_emisor ?? null,
        folio: extracted.folio ?? null,
        total,
        fecha: null,
      }),
      metadata_json: meta,
      created_by: user.id,
    }

    const { error: insErr } = await supabase.from('documents').insert(doc)
    if (insErr) {
      return NextResponse.json(
        { error: insErr.message, code: 'DB_INSERT' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      source: 'PDF',
      inserted: 1,
      reviewStatus: 'pending',
      extraction: extracted,
    })
  } catch (e) {
    if (e instanceof UnsupportedFileTypeError) {
      return NextResponse.json(
        { error: e.message, code: 'UNSUPPORTED_TYPE' },
        { status: 415 }
      )
    }
    const message = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: message, code: 'INTERNAL' }, { status: 500 })
  }
}
