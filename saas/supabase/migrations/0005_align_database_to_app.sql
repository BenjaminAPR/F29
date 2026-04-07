-- Sincroniza una base Supabase existente con lo que espera el SaaS F29 (Next.js + RLS + RPC).
-- Ejecutar en SQL Editor del proyecto (schema public). Es idempotente en lo posible.
-- Si algún paso falla (p. ej. duplicados RUT por usuario), leé el mensaje y corregí datos a mano.

create extension if not exists "pgcrypto";

-- ─── profiles ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.profiles set created_at = now() where created_at is null;
update public.profiles set updated_at = coalesce(updated_at, created_at, now()) where updated_at is null;

alter table public.profiles alter column created_at set default now();
alter table public.profiles alter column updated_at set default now();
alter table public.profiles alter column created_at set not null;
alter table public.profiles alter column updated_at set not null;

-- ─── companies ─────────────────────────────────────────────────────────────
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  rut text not null,
  razon_social text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.companies
  add column if not exists rut text,
  add column if not exists razon_social text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz;

-- Si faltan datos obligatorios en filas viejas, esto fallará: completá a mano.
alter table public.companies alter column rut set not null;
alter table public.companies alter column razon_social set not null;
alter table public.companies alter column created_at set default now();
alter table public.companies alter column created_at set not null;

-- Un usuario no puede duplicar el mismo RUT en dos empresas.
alter table public.companies drop constraint if exists companies_created_by_rut_key;
alter table public.companies
  add constraint companies_created_by_rut_key unique (created_by, rut);

create index if not exists companies_created_by_idx on public.companies (created_by);

-- ─── documents ─────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  tipo_doc text not null,
  rut_emisor text,
  folio text,
  monto_neto bigint not null default 0,
  iva bigint not null default 0,
  total bigint not null default 0,
  fecha date,
  period text not null default to_char(current_date, 'YYYY-MM'),
  source_type text not null,
  review_status text not null default 'validated',
  review_note text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.documents
  add column if not exists company_id uuid,
  add column if not exists tipo_doc text,
  add column if not exists rut_emisor text,
  add column if not exists folio text,
  add column if not exists monto_neto bigint,
  add column if not exists iva bigint,
  add column if not exists total bigint,
  add column if not exists fecha date,
  add column if not exists period text,
  add column if not exists source_type text,
  add column if not exists review_status text,
  add column if not exists review_note text,
  add column if not exists metadata_json jsonb,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz;

-- Backfill seguro antes de NOT NULL / CHECK
update public.documents set monto_neto = 0 where monto_neto is null;
update public.documents set iva = 0 where iva is null;
update public.documents set total = 0 where total is null;
update public.documents set metadata_json = '{}'::jsonb where metadata_json is null;
update public.documents set source_type = 'CSV' where source_type is null or source_type not in ('CSV', 'PDF');
update public.documents
set review_status = 'validated'
where review_status is null or review_status not in ('pending', 'validated', 'excluded');
update public.documents
set period = to_char((created_at at time zone 'utc')::date, 'YYYY-MM')
where period is null or trim(period) = '';
update public.documents set tipo_doc = '' where tipo_doc is null;

alter table public.documents alter column monto_neto set default 0;
alter table public.documents alter column iva set default 0;
alter table public.documents alter column total set default 0;
alter table public.documents alter column monto_neto set not null;
alter table public.documents alter column iva set not null;
alter table public.documents alter column total set not null;
alter table public.documents alter column metadata_json set default '{}'::jsonb;
alter table public.documents alter column metadata_json set not null;
alter table public.documents alter column review_status set default 'validated';
alter table public.documents alter column review_status set not null;
alter table public.documents alter column source_type set not null;
alter table public.documents alter column tipo_doc set not null;
alter table public.documents alter column created_at set default now();
alter table public.documents alter column created_at set not null;

-- period YYYY-MM
alter table public.documents drop constraint if exists documents_period_format_chk;
update public.documents
set period = to_char((created_at at time zone 'utc')::date, 'YYYY-MM')
where period !~ '^\d{4}-(0[1-9]|1[0-2])$';
alter table public.documents alter column period set default to_char(current_date, 'YYYY-MM');
alter table public.documents alter column period set not null;
alter table public.documents
  add constraint documents_period_format_chk
  check (period ~ '^\d{4}-(0[1-9]|1[0-2])$');

alter table public.documents drop constraint if exists documents_source_type_chk;
alter table public.documents
  add constraint documents_source_type_chk
  check (source_type in ('CSV', 'PDF'));

alter table public.documents drop constraint if exists documents_review_status_chk;
alter table public.documents
  add constraint documents_review_status_chk
  check (review_status in ('pending', 'validated', 'excluded'));

create index if not exists documents_company_id_idx on public.documents (company_id);
create index if not exists documents_created_by_idx on public.documents (created_by);
create index if not exists documents_company_period_idx on public.documents (company_id, period desc);

-- Opcional: forzar FK de created_by a auth.users (si hoy apunta a profiles, suele ser el mismo id).
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'documents'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) like '%created_by%'
  loop
    execute format('alter table public.documents drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.documents
  drop constraint if exists documents_created_by_fkey;
alter table public.documents
  add constraint documents_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete cascade;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'companies'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) like '%created_by%'
  loop
    execute format('alter table public.companies drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.companies
  drop constraint if exists companies_created_by_fkey;
alter table public.companies
  add constraint companies_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete cascade;

-- ─── RLS (igual que schema_multitenant.sql) ────────────────────────────────
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.documents enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "companies_select_own" on public.companies;
create policy "companies_select_own" on public.companies
for select using (created_by = auth.uid());

drop policy if exists "companies_insert_own" on public.companies;
create policy "companies_insert_own" on public.companies
for insert with check (created_by = auth.uid());

drop policy if exists "companies_update_own" on public.companies;
create policy "companies_update_own" on public.companies
for update using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "companies_delete_own" on public.companies;
create policy "companies_delete_own" on public.companies
for delete using (created_by = auth.uid());

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
for select using (
  exists (
    select 1 from public.companies c
    where c.id = documents.company_id and c.created_by = auth.uid()
  )
);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.companies c
    where c.id = company_id and c.created_by = auth.uid()
  )
);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
for update using (
  exists (
    select 1 from public.companies c
    where c.id = documents.company_id and c.created_by = auth.uid()
  )
) with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.companies c
    where c.id = company_id and c.created_by = auth.uid()
  )
);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
for delete using (
  exists (
    select 1 from public.companies c
    where c.id = documents.company_id and c.created_by = auth.uid()
  )
);

-- ─── RPC agregados período (mismo cuerpo que 0004) ───────────────────────────
drop function if exists public.document_period_by_tipo_validated(uuid, text, text, text, text, text);
drop function if exists public.document_period_summary(uuid, text, text, text, text, text);

create or replace function public.document_period_summary(
  p_company_id uuid,
  p_period text,
  p_tipo_doc text default null,
  p_source_type text default null,
  p_review_status text default null,
  p_search text default null
)
returns table (
  total_rows bigint,
  validated_count bigint,
  pending_count bigint,
  excluded_count bigint,
  sum_neto_validated bigint,
  sum_iva_validated bigint,
  sum_total_validated bigint
)
language sql
security invoker
set search_path = public
stable
as $$
  select
    count(*)::bigint as total_rows,
    count(*) filter (where d.review_status = 'validated')::bigint as validated_count,
    count(*) filter (where d.review_status = 'pending')::bigint as pending_count,
    count(*) filter (where d.review_status = 'excluded')::bigint as excluded_count,
    coalesce(sum(d.monto_neto) filter (where d.review_status = 'validated'), 0)::bigint as sum_neto_validated,
    coalesce(sum(d.iva) filter (where d.review_status = 'validated'), 0)::bigint as sum_iva_validated,
    coalesce(sum(d.total) filter (where d.review_status = 'validated'), 0)::bigint as sum_total_validated
  from public.documents d
  where d.company_id = p_company_id
    and d.period = p_period
    and (p_tipo_doc is null or trim(p_tipo_doc) = '' or d.tipo_doc = p_tipo_doc)
    and (p_source_type is null or trim(p_source_type) = '' or d.source_type = p_source_type)
    and (p_review_status is null or trim(p_review_status) = '' or d.review_status = p_review_status)
    and (
      p_search is null
      or trim(p_search) = ''
      or d.rut_emisor ilike '%' || trim(p_search) || '%'
      or d.folio ilike '%' || trim(p_search) || '%'
    );
$$;

create or replace function public.document_period_by_tipo_validated(
  p_company_id uuid,
  p_period text,
  p_tipo_doc text default null,
  p_source_type text default null,
  p_review_status text default null,
  p_search text default null
)
returns table (
  tipo_doc text,
  doc_count bigint,
  sum_neto bigint,
  sum_iva bigint,
  sum_total bigint
)
language sql
security invoker
set search_path = public
stable
as $$
  select
    d.tipo_doc,
    count(*)::bigint as doc_count,
    coalesce(sum(d.monto_neto), 0)::bigint as sum_neto,
    coalesce(sum(d.iva), 0)::bigint as sum_iva,
    coalesce(sum(d.total), 0)::bigint as sum_total
  from public.documents d
  where d.company_id = p_company_id
    and d.period = p_period
    and d.review_status = 'validated'
    and (p_tipo_doc is null or trim(p_tipo_doc) = '' or d.tipo_doc = p_tipo_doc)
    and (p_source_type is null or trim(p_source_type) = '' or d.source_type = p_source_type)
    and (p_review_status is null or trim(p_review_status) = '' or d.review_status = p_review_status)
    and (
      p_search is null
      or trim(p_search) = ''
      or d.rut_emisor ilike '%' || trim(p_search) || '%'
      or d.folio ilike '%' || trim(p_search) || '%'
    )
  group by d.tipo_doc
  order by d.tipo_doc;
$$;

revoke all on function public.document_period_summary(uuid, text, text, text, text, text) from public;
revoke all on function public.document_period_by_tipo_validated(uuid, text, text, text, text, text) from public;
grant execute on function public.document_period_summary(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.document_period_by_tipo_validated(uuid, text, text, text, text, text) to authenticated;

-- Perfil automático al registrarse (si falla por permisos en auth.users, ignorá o ejecutá como postgres)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
