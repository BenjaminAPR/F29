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

### GitHub → Cloud Run (push a `main`)

En la raíz del monorepo está [`.github/workflows/deploy-cloud-run.yml`](../.github/workflows/deploy-cloud-run.yml): al pushear a `main` (con cambios bajo `saas/`) construye la imagen, la sube a **Artifact Registry** y ejecuta `gcloud run deploy`.

1. En GCP, creá un repositorio Docker en Artifact Registry (misma región que usarás en el workflow), por ejemplo:

   `gcloud artifacts repositories create NOMBRE_REPO --repository-format=docker --location=REGION --description=F29`

2. Habilitá APIs: *Cloud Run*, *Artifact Registry* (y *Vertex AI* si extraés PDF).

3. Cuenta de servicio para GitHub (JSON) con roles: **Cloud Run Admin**, **Artifact Registry Writer**, **Service Account User** (sobre la cuenta de servicio que ejecuta Cloud Run, si no es la predeterminada).

4. En el repo de GitHub: **Settings → Secrets and variables → Actions**, cargá:

   | Secreto | Contenido |
   |--------|-----------|
   | `GCP_PROJECT_ID` | ID del proyecto GCP |
   | `GCP_REGION` | Región (ej. `us-central1`) |
   | `GCP_CLOUD_RUN_SERVICE` | Nombre del servicio (ej. `f29-saas`) |
   | `GCP_ARTIFACT_REGISTRY` | Nombre del repo Docker en Artifact Registry |
   | `GCP_SA_KEY` | JSON completo de la cuenta de servicio |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL pública Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (se inyecta en el build y en el deploy) |

5. Conectá el repo a GitHub y hacé push a `main`.

Si tu repositorio Git es **solo** el contenido de `saas/` (sin carpeta padre), mové `.github/workflows/deploy-cloud-run.yml` dentro de ese repo, quitá `working-directory: saas` y los paths `saas/**` (o cambiá a raíz del repo).

## Seguridad

RLS en Postgres asegura que cada usuario solo ve empresas `created_by = auth.uid()` y documentos ligados a esas empresas.
