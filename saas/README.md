# F29 Micro‑SaaS (Next.js App Router)

Multi‑tenancy: un usuario (contador) gestiona varias **empresas** (`companies`). Cada empresa tiene **documentos** con montos independientes.

**Visión, fases y backlog:** [ROADMAP.md](./ROADMAP.md).

## Requisitos

- Node 20+
- Proyecto Supabase (free) + SQL `supabase/schema_multitenant.sql`
- Si la base ya existía sin columna `period` en `documents`, ejecuta `supabase/migrations/0002_documents_period.sql`
- Para revisión humana (`review_status` / `review_note`), ejecuta `supabase/migrations/0003_documents_review.sql`
- Para sumas y agregados del dashboard sin tope de 2000 filas (`document_period_summary` / `document_period_by_tipo_validated`), ejecuta `supabase/migrations/0004_document_period_aggregates.sql`
- **Vertex AI** (recomendado en GCP): `GOOGLE_CLOUD_PROJECT`, `VERTEX_LOCATION` (ej. `us-central1`); credencial por **ADC** (Cloud Run asigna service account; local: `gcloud auth application-default login`). Opcional: `VERTEX_GEMINI_MODEL`.
- **Google AI Studio** (dev): `GEMINI_API_KEY` solo si no definís `GOOGLE_CLOUD_PROJECT`

## Configuración

1. Copia `.env.local.example` → `.env.local`
2. Pega URL y anon key de Supabase
3. Para PDF/imagen: Vertex (`GOOGLE_CLOUD_PROJECT` + ADC) o `GEMINI_API_KEY` (ver `.env.local.example`)

```bash
npm install
npm run dev
```

## Rutas

- `/login` — email + password (Supabase Auth)
- `/companies` — alta y listado de empresas
- `/[companyId]/dashboard` — período (YYYY-MM), carga CSV/PDF, totales del mes, eliminar filas

## API

- `POST /api/process-upload` — `companyId`, `file`, opcional `period` (YYYY-MM; default mes actual)

## Deploy

- **Vercel / sin GCP**: `NEXT_PUBLIC_SUPABASE_*` + `GEMINI_API_KEY` (Vertex en Vercel requiere service account vía JSON y `GOOGLE_APPLICATION_CREDENTIALS`, más engorroso).
- **Cloud Run (recomendado con Vertex)**: imagen Docker (`saas/Dockerfile`, salida `standalone`). En runtime: `GOOGLE_CLOUD_PROJECT`, `VERTEX_LOCATION`, `NEXT_PUBLIC_SUPABASE_*`. La cuenta de servicio **del servicio Cloud Run** necesita **Vertex AI User** (`roles/aiplatform.user`).

**GCP desde cero (proyecto, APIs, IAM, secretos, Supabase):** [docs/GCP_SETUP.md](./docs/GCP_SETUP.md).  
*Última verificación de pipeline: 2026-04-02.*

### GitHub → Cloud Run (recomendado: Cloud Build en GCP)

No usamos GitHub Actions con `GCP_SA_KEY`: el **activador de Cloud Build** enlaza tu repo y ejecuta el **`cloudbuild.yaml`** de la raíz (build del `Dockerfile` en `saas/`).

1. Pasos y permisos: [docs/GCP_SETUP.md](./docs/GCP_SETUP.md).
2. En el **activador**, definí sustituciones `_NEXT_PUBLIC_SUPABASE_URL` y `_NEXT_PUBLIC_SUPABASE_ANON_KEY` (no van como secretos de GitHub Actions para este flujo).
3. Cada push a la rama configurada compila y despliega; el historial está en **Cloud Build**.

## Seguridad

RLS en Postgres asegura que cada usuario solo ve empresas `created_by = auth.uid()` y documentos ligados a esas empresas.
