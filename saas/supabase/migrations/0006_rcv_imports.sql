-- Importaciones RCV (SII): batches + filas normalizadas para conciliación.
-- Respeta RLS: solo el usuario dueño de la empresa ve sus batches/rows.

create table if not exists public.rcv_import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  period text not null,
  filename text,
  source_type text not null default 'CSV' check (source_type in ('CSV')),
  warnings jsonb not null default '[]'::jsonb,
  skipped_lines int not null default 0,
  imported_rows int not null default 0,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint rcv_batches_period_format_chk check (period ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

create index if not exists rcv_batches_company_period_idx
  on public.rcv_import_batches (company_id, period desc, created_at desc);

create index if not exists rcv_batches_created_by_idx
  on public.rcv_import_batches (created_by);

create table if not exists public.rcv_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.rcv_import_batches (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  period text not null,
  tipo_doc text not null,
  rut_emisor text,
  folio text,
  monto_neto bigint not null default 0,
  iva bigint not null default 0,
  total bigint not null default 0,
  fecha date,
  dedup_key text not null,
  raw_json jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint rcv_rows_period_format_chk check (period ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

create index if not exists rcv_rows_batch_idx
  on public.rcv_rows (batch_id);

create index if not exists rcv_rows_company_period_idx
  on public.rcv_rows (company_id, period desc, created_at desc);

create index if not exists rcv_rows_created_by_idx
  on public.rcv_rows (created_by);

create index if not exists rcv_rows_dedup_key_idx
  on public.rcv_rows (company_id, period, dedup_key);

-- RLS
alter table public.rcv_import_batches enable row level security;
alter table public.rcv_rows enable row level security;

drop policy if exists "rcv_batches_select_own" on public.rcv_import_batches;
create policy "rcv_batches_select_own" on public.rcv_import_batches
for select using (
  exists (
    select 1 from public.companies c
    where c.id = rcv_import_batches.company_id and c.created_by = auth.uid()
  )
);

drop policy if exists "rcv_batches_insert_own" on public.rcv_import_batches;
create policy "rcv_batches_insert_own" on public.rcv_import_batches
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.companies c
    where c.id = company_id and c.created_by = auth.uid()
  )
);

drop policy if exists "rcv_batches_delete_own" on public.rcv_import_batches;
create policy "rcv_batches_delete_own" on public.rcv_import_batches
for delete using (
  exists (
    select 1 from public.companies c
    where c.id = rcv_import_batches.company_id and c.created_by = auth.uid()
  )
);

drop policy if exists "rcv_rows_select_own" on public.rcv_rows;
create policy "rcv_rows_select_own" on public.rcv_rows
for select using (
  exists (
    select 1 from public.companies c
    where c.id = rcv_rows.company_id and c.created_by = auth.uid()
  )
);

drop policy if exists "rcv_rows_insert_own" on public.rcv_rows;
create policy "rcv_rows_insert_own" on public.rcv_rows
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.companies c
    where c.id = company_id and c.created_by = auth.uid()
  )
);

drop policy if exists "rcv_rows_delete_own" on public.rcv_rows;
create policy "rcv_rows_delete_own" on public.rcv_rows
for delete using (
  exists (
    select 1 from public.companies c
    where c.id = rcv_rows.company_id and c.created_by = auth.uid()
  )
);

