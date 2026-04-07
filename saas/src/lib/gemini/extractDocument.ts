import { GoogleGenerativeAI } from '@google/generative-ai'
import { VertexAI } from '@google-cloud/vertexai'
import type { GenerateContentResponse } from '@google-cloud/vertexai'
import { z } from 'zod'

const GeminiInvoiceSchema = z.object({
  rut_emisor: z.string().nullable().optional(),
  folio: z.string().nullable().optional(),
  tipo_doc: z.string().nullable().optional(),
  neto: z.number().nullable().optional(),
  iva: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  notas: z.string().nullable().optional(),
})

export type GeminiInvoiceExtraction = z.infer<typeof GeminiInvoiceSchema>

const PROMPT = `Eres un extractor de datos tributarios Chile (DTE / facturas).
Del documento (PDF o imagen) devuelve SOLO JSON con:
{
  "rut_emisor": string | null,
  "folio": string | null,
  "tipo_doc": string | null,
  "neto": number | null,
  "iva": number | null,
  "total": number | null,
  "notas": string | null
}
Reglas:
- Montos en pesos chilenos enteros (sin decimales). Si ves separador de miles, elimínalo.
- tipo_doc: código numérico del DTE si aparece (ej. 33, 39, 61). Si no hay, null.
- rut_emisor: formato chileno si es posible (con guión).
- Si no puedes leer el documento, devuelve null en todos los campos salvo "notas" explicando por qué.
No incluyas markdown ni texto fuera del JSON.`

function toBase64(buffer: Buffer): string {
  return buffer.toString('base64')
}

function vertexResponseText(response: GenerateContentResponse): string {
  const block = response.promptFeedback?.blockReason
  if (block) {
    throw new Error(`Vertex AI bloqueó el prompt: ${block}`)
  }
  const parts = response.candidates?.[0]?.content?.parts
  if (!parts?.length) {
    throw new Error('Vertex AI devolvió candidatos vacíos (revisa cuotas o políticas).')
  }
  let t = ''
  for (const p of parts) {
    if ('text' in p && typeof (p as { text?: string }).text === 'string') {
      t += (p as { text: string }).text
    }
  }
  return t
}

function parseInvoiceJson(text: string): GeminiInvoiceExtraction {
  if (!text?.trim()) {
    return { notas: 'Respuesta vacía del modelo' }
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('El modelo devolvió JSON inválido')
  }
  const parsed = GeminiInvoiceSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`JSON no cumple esquema: ${parsed.error.message}`)
  }
  const d = parsed.data
  return {
    rut_emisor: d.rut_emisor ?? null,
    folio: d.folio ?? null,
    tipo_doc: d.tipo_doc ?? null,
    neto: d.neto != null ? Math.round(d.neto) : null,
    iva: d.iva != null ? Math.round(d.iva) : null,
    total: d.total != null ? Math.round(d.total) : null,
    notas: d.notas ?? null,
  }
}

async function extractWithVertex(params: {
  buffer: Buffer
  mimeType: string
  model: string
  project: string
  location: string
}): Promise<GeminiInvoiceExtraction> {
  const { buffer, mimeType, model: modelName, project, location } = params

  const vertexAI = new VertexAI({ project, location })
  const model = vertexAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.15,
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: PROMPT },
          {
            inlineData: {
              mimeType,
              data: toBase64(buffer),
            },
          },
        ],
      },
    ],
  })

  const text = vertexResponseText(result.response)
  return parseInvoiceJson(text)
}

async function extractWithGeminiApi(params: {
  buffer: Buffer
  mimeType: string
  model: string
  apiKey: string
}): Promise<GeminiInvoiceExtraction> {
  const { buffer, mimeType, apiKey, model: modelName } = params

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.15,
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent([
    { text: PROMPT },
    {
      inlineData: {
        mimeType,
        data: toBase64(buffer),
      },
    },
  ])

  const text = result.response.text()
  return parseInvoiceJson(text)
}

export type ExtractInvoiceParams = {
  buffer: Buffer
  mimeType: string
  /** ID modelo en Vertex o Google AI (ej. gemini-1.5-flash). */
  model?: string
  /**
   * Vertex AI (GCP): credencial vía Application Default Credentials
   * (Cloud Run, `gcloud auth application-default login`, etc.).
   */
  vertex?: { project: string; location: string }
  /** Google AI Studio (API key). Solo si no usás Vertex. */
  apiKey?: string
}

/**
 * Extrae campos con Gemini vía **Vertex AI** (recomendado en GCP) o API key (desarrollo).
 * En servidor nunca expongas credenciales al cliente.
 */
export async function extractInvoiceWithGemini(
  params: ExtractInvoiceParams
): Promise<GeminiInvoiceExtraction> {
  const model =
    params.model ??
    process.env.VERTEX_GEMINI_MODEL ??
    process.env.GEMINI_MODEL ??
    'gemini-1.5-flash'

  if (params.vertex) {
    return extractWithVertex({
      buffer: params.buffer,
      mimeType: params.mimeType,
      model,
      project: params.vertex.project,
      location: params.vertex.location,
    })
  }

  if (params.apiKey) {
    return extractWithGeminiApi({
      buffer: params.buffer,
      mimeType: params.mimeType,
      model,
      apiKey: params.apiKey,
    })
  }

  throw new Error('Falta configuración: vertex { project, location } o apiKey')
}
