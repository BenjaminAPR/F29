-- Micro-SaaS F29: multi-tenancy (contador → varias empresas)
-- Ejecutar en Supabase SQL Editor (proyecto nuevo o limpio).

create extension if not exists "pgcrypto";

-- Perfil (1:1 con auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Empresa (creada por un usuario; solo ese usuario la ve por RLS)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  rut text not null,
  razon_social text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (created_by, rut)
);

create index if not exists companies_created_by_idx on public.companies (created_by);

-- Documentos tributarios asociados a la empresa
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
  source_type text not null check (source_type in ('CSV', 'PDF')),
  review_status text not null default 'validated'
    check (review_status in ('pending', 'validated', 'excluded')),
  review_note text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint documents_period_format_chk check (period ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

create index if not exists documents_company_id_idx on public.documents (company_id);
create index if not exists documents_created_by_idx on public.documents (created_by);
create index if not exists documents_company_period_idx on public.documents (company_id, period desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.documents enable row level security;

-- profiles: cada usuario solo ve/edita su fila
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

-- companies
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

-- documents: solo si la empresa pertenece al usuario
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

-- Agregados del período (invoker = RLS). Ver también migrations/0004_document_period_aggregates.sql
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

-- Trigger: perfil al registrarse (opcional; requiere permisos en auth schema vía security definer)
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
