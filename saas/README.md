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

### GitHub → Cloud Run (push a `main`)

En la raíz del monorepo está [`.github/workflows/deploy-cloud-run.yml`](../.github/workflows/deploy-cloud-run.yml): al pushear a `main` (cambios bajo `saas/`) construye la imagen, la sube a **GitHub Container Registry (`ghcr.io`)** — sin **Artifact Registry** en GCP — y ejecuta `gcloud run deploy`.

1. Habilitá en GCP las APIs **Cloud Run** y **Vertex AI** (y las que indica [docs/GCP_SETUP.md](./docs/GCP_SETUP.md)); **no** hace falta Artifact Registry para este flujo.

2. Cuenta de servicio para GitHub (JSON) con roles: **Cloud Run Admin** y **Service Account User** (ya no hace falta Artifact Registry Writer).

3. Tras el **primer** push que publique el paquete Docker: en GitHub → **Packages** → `f29-saas` → **Package settings** → visibilidad **Public** (si no, Cloud Run no puede bajar la imagen sin credenciales extra).

4. En **Settings → Secrets → Actions**:

   | Secreto | Contenido |
   |--------|-----------|
   | `GCP_PROJECT_ID` | ID del proyecto GCP |
   | `GCP_REGION` | Región (ej. `us-central1`) |
   | `GCP_CLOUD_RUN_SERVICE` | Nombre del servicio (ej. `f29-saas`) |
   | `GCP_SA_KEY` | JSON de la cuenta de servicio |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL pública Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |

5. Push a `main`.

Si tu repositorio Git es **solo** el contenido de `saas/` (sin carpeta padre), mové `.github/workflows/deploy-cloud-run.yml` dentro de ese repo, quitá `working-directory: saas` y los paths `saas/**` (o cambiá a raíz del repo).

## Seguridad

RLS en Postgres asegura que cada usuario solo ve empresas `created_by = auth.uid()` y documentos ligados a esas empresas.
