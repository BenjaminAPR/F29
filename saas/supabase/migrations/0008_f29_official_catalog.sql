-- Catálogo versionado de líneas/casillas F29 (oficial) + mapeo desde tipo_doc.
-- Nota: números/códigos pueden cambiar por instructivo; por eso se versiona.

create table if not exists public.f29_official_versions (
  id text primary key,
  label text not null,
  effective_from date not null,
  effective_to date,
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.f29_official_lines (
  version_id text not null references public.f29_official_versions (id) on delete cascade,
  line_code text not null,
  title text not null,
  practitioner_note text,
  sort_order int not null default 0,
  primary key (version_id, line_code)
);

create table if not exists public.f29_line_map (
  version_id text not null references public.f29_official_versions (id) on delete cascade,
  tipo_doc text not null,
  line_code text not null,
  sign int not null default 1 check (sign in (-1, 1)),
  include_neto boolean not null default true,
  include_iva boolean not null default true,
  include_total boolean not null default true,
  primary key (version_id, tipo_doc, line_code),
  constraint f29_line_map_line_fk
    foreign key (version_id, line_code)
    references public.f29_official_lines (version_id, line_code)
    on delete cascade
);

create index if not exists f29_line_map_version_tipo_idx
  on public.f29_line_map (version_id, tipo_doc);

-- Seed inicial (referencial; ajustar con instructivo real)
insert into public.f29_official_versions (id, label, effective_from, source_url)
values ('2026-01-cl', 'Chile F29 (seed) 2026-01', date '2026-01-01', null)
on conflict (id) do nothing;

insert into public.f29_official_lines (version_id, line_code, title, practitioner_note, sort_order)
values
  ('2026-01-cl', 'compras_afectas_credito', 'Compras afectas (crédito fiscal)', 'Incluye compras con IVA recuperable (p. ej. 33, 46). Ver instructivo vigente.', 10),
  ('2026-01-cl', 'compras_exentas', 'Compras exentas/no afectas', 'Operaciones exentas/no afectas (p. ej. 34, 41). Ver instructivo vigente.', 20),
  ('2026-01-cl', 'nc_compras', 'Notas de crédito (compras)', 'DTE 61 y ajustes a crédito fiscal según corresponda.', 30),
  ('2026-01-cl', 'nd_compras', 'Notas de débito (compras)', 'DTE 56 y ajustes según corresponda.', 40),
  ('2026-01-cl', 'otros', 'Otros / revisión manual', 'Casos no mapeados automáticamente.', 90)
on conflict (version_id, line_code) do nothing;

-- Mapeo seed: solo guía (tipo_doc -> línea)
insert into public.f29_line_map (version_id, tipo_doc, line_code, sign, include_neto, include_iva, include_total)
values
  ('2026-01-cl', '33', 'compras_afectas_credito', 1, true, true, true),
  ('2026-01-cl', '46', 'compras_afectas_credito', 1, true, true, true),
  ('2026-01-cl', '34', 'compras_exentas', 1, true, false, true),
  ('2026-01-cl', '41', 'compras_exentas', 1, true, false, true),
  ('2026-01-cl', '61', 'nc_compras', -1, true, true, true),
  ('2026-01-cl', '56', 'nd_compras', 1, true, true, true)
on conflict (version_id, tipo_doc, line_code) do nothing;

