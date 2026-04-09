# Roadmap — F29 Micro‑SaaS

Documento vivo: prioridades y entregas hacia **facilitar al usuario con IA**, un **F29 sólido** y buenas prácticas en torno al **SII (Chile)**. La app no sustituye el criterio del contador ni la responsabilidad de la declaración; ayuda a **capturar, ordenar, validar y exportar** información tributaria.

---

## Norte

- **Usuario:** contador o PYME con varias empresas y períodos mensuales.
- **Valor:** cerrar el período con **números confiables**, **trazabilidad** (cada monto explicable por documento) y **salidas claras** (Excel / vistas tipo F29 / checklist hacia sii.cl).
- **IA:** extracción y sugerencias **siempre revisables**; validación por reglas (RUT, DTE, totales) antes de sumar a totales “oficiales” del producto.

---

## Estado actual (referencia)

- [x] Multi‑tenant: empresas por usuario, RUT validado y normalizado.
- [x] Documentos por empresa y período (`YYYY-MM`).
- [x] Importación CSV (estilo RCV) y PDF/imagen vía Gemini (servidor).
- [x] Totales del período en dashboard; borrado de filas; export CSV / Excel.
- [x] Límite de tamaño de archivo; feedback en `/companies` (crear/editar/eliminar).
- [x] **Revisión de documentos:** `pending` / `validated` / `excluded` + nota; totales solo `validated`; CSV entra validado, PDF/IA entra pendiente (migración `0003_documents_review.sql`).
- [x] **Agregados por tipo DTE** y **agrupación F29 (beta)** en dashboard + hojas Excel `Por tipo DTE` / `F29 beta` (`lib/f29/`, versión `2026-04-beta`).
- [x] **Filtros + paginación** en dashboard (`lib/dashboard/periodDocumentFilters.ts`).
- [x] **Líneas F29 de referencia** (catálogo versionado `2026-01-ref`, sin números de casilla SII): panel + hoja Excel `F29 lineas ref`.
- [ ] **Códigos de casilla** alineados al instructivo SII (número de línea por período).
- [ ] Integración directa con APIs del SII (solo cuando haya mandato técnico y legal claro).

---

## Fase A — Cimientos de datos y producto

- [x] **Paginación** del listado (25 por página) + conteo total con filtros.
- [x] **Filtros** por tipo DTE, origen (CSV/PDF), estado de revisión, texto en RUT o folio (URL `GET`, conservados al validar/excluir/eliminar).
- [x] Sumas en BD para agregados del dashboard (RPC `document_period_summary` / `document_period_by_tipo_validated`, migración `0004`); export de detalle CSV/Excel sigue limitado a 2000 filas.
- [ ] Metadatos de importación: archivo, fecha, usuario (mínimo en `metadata_json` o columnas dedicadas).
- [x] Inicio de **`lib/f29/`** (mapa beta DTE → buckets + `summaries`); seguir centralizando reglas contables/tributarias aquí y en `lib/sii/`.

## Fase B — Calidad RCV + documentos sueltos

- [ ] Endurecer parser CSV frente a RCV reales (variantes de columnas).
- [x] **Deduplicación** (clave determinística `dedup_key` + índices; sugerencias futuras) (`0007_documents_dedup.sql`).
- [x] Estados de documento: `pending` / `validated` / `excluded` + `review_note` (migración + UI en dashboard).
- [ ] Notas de crédito/débito: reglas explícitas de cómo afectan neto/IVA/total.

## Fase C — IA con gobernanza

- [ ] Puntuación o flags de **confianza** por campo extraído.
- [x] Flujo “**aceptar extracción**”: filas IA en `pending` hasta **Validar**; totales solo `validated` (pendiente: score de confianza por campo).
- [ ] Reintentos y timeouts claros; mensajes de error accionables.
- [ ] (Opcional) Cola o Edge Function para no depender solo del timeout del Route Handler.

## Fase D — Capa F29 (núcleo de valor)

- [x] Mapa **versionado** DTE → buckets orientativos (`F29_BUCKET_MAP_VERSION` en `lib/f29/mapVersion.ts`); no son líneas oficiales aún.
- [x] Panel **F29 (beta)** en dashboard + totales por tipo DTE (solo validados).
- [x] Catálogo interno **lineRefId** + mapeo bucket DTE → referencia (`lib/f29/officialLines.ts`).
- [x] Catálogo **F29 oficial** versionado (seed) + mapeo `tipo_doc` → línea (`0008`).
- [x] RPC **F29 oficial** por línea + drill‑down (`0009`) y pantalla `/dashboard/f29-official`.
- [ ] Tabla **código de casilla oficial SII** alineada al instructivo real (número de casilla por vigencia) → reemplazar seed.
- [ ] Alertas de cuadre: saltos vs. mes anterior, IVA inconsistente con tipo DTE, etc.
- [x] Export Excel: hojas **Por tipo DTE** y **F29 beta** (además de Resumen / Documentos).
- [ ] Checklist declaración / plantilla alineada a pasos en sii.cl.

## Fase E — Mundo SII (producto + educación)

- [ ] Sección ayuda: qué hace la app vs. qué debe hacerse en **sii.cl**.
- [ ] Enlaces a instructivos oficiales y advertencias de cambio normativo.
- [ ] (Futuro) Conector solo si existen **APIs/descargas** utilizables con permiso del contribuyente.

## Fase F — SaaS y escala

- [ ] Varios usuarios por estudio (invitaciones, roles).
- [ ] Facturación del producto, límites por plan.
- [ ] Observabilidad (logs, métricas), backups y política de retención.

---

## Prioridad inmediata sugerida (orden)

1. ~~Estados de documento + revisión humana post‑IA.~~ **Hecho** (v. `0003` + dashboard).  
2. ~~Agregados por **tipo DTE** y primer mapa **F29 (beta)**.~~ **Hecho** (panel + Excel); falta mapeo a **líneas oficiales** con instructivo.  
3. ~~Filtros + paginación en el dashboard.~~ **Hecho** (tabla + totales/agregados/export acotados a conjunto filtrado, máx. 2000 filas para resúmenes).  
4. ~~**Sumas en base de datos** para totales y paneles F29 con filtros.~~ **Hecho** (`0004` + `documentPeriodAggregateRpc.ts`); detalle de export sigue cap 2000.  
5. **Casillas F29 según instructivo** (numeración SII + vigencia).

---

## Riesgos a tener presentes

- Los **códigos y instructivos F29 cambian**; el motor de líneas debe ser **versionable**.
- La IA puede equivocarse: **validación numérica y reglas** obligatorias.
- **Declaración en el SII** sigue siendo responsabilidad del contribuyente/contador.

---

## Cómo usar este archivo

- Marcar casillas a medida que se implemente (`[x]`).
- En PRs grandes, referenciar la fase (`Fase D — …`).
- Para decisiones normativas delicadas, enlazar instructivo oficial y fecha en un comentario o ADR breve.

---

## Registro de avances (ir actualizando)

| Fecha (aprox.) | Qué cambió |
|----------------|------------|
| 2026-04 | Estados de revisión en `documents`, totales filtrados, CSV/Excel con columnas de revisión, README con migración `0003`. |
| 2026-04 | `lib/f29/`: agregados por DTE + buckets beta, panel en dashboard, hojas Excel extra, versión de mapa `2026-04-beta`. |
| 2026-04 | `lib/dashboard/periodDocumentFilters.ts`: filtros GET, paginación 25, resúmenes hasta 2000 filas filtradas; POST conserva filtros vía `ret_*`. |
| 2026-04 | `lib/f29/officialLines.ts` + `officialReferenceVersion.ts`: líneas de referencia F29, UI y Excel. |
| 2026-04 | Migración `0004` + RPC en Postgres: totales y agregados por tipo sin tope 2000; dashboard con fallback a muestra si falta la migración. |
| 2026-04 | `0006` (RCV batches/rows) + `0010` (RPC conciliación) + panel “Conciliación RCV (beta)” en dashboard. |
| 2026-04 | `0007` dedup_key en `documents` + `0008`/`0009` F29 oficial (seed) + vista `/dashboard/f29-official`. |
