-- FINANÇAS PRO — Módulo Contas: recorrentes + parceladas + competência/histórico
-- Execute no Supabase SQL Editor. Idempotente.

-- 1) Contas recorrentes (modelo/template mensal)
create table if not exists public.contas_recorrentes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  familia_id uuid null references public.familias(id) on delete cascade,
  categoria_id uuid null references public.categorias(id) on delete set null,
  descricao text not null,
  tipo text not null default 'Outros',
  valor numeric(12,2) not null default 0,
  dia_vencimento integer not null default 1 check (dia_vencimento between 1 and 31),
  data_inicio date not null default current_date,
  data_fim date null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.contas_recorrentes add column if not exists familia_id uuid references public.familias(id) on delete cascade;
alter table public.contas_recorrentes add column if not exists categoria_id uuid references public.categorias(id) on delete set null;
alter table public.contas_recorrentes add column if not exists descricao text;
alter table public.contas_recorrentes add column if not exists tipo text not null default 'Outros';
alter table public.contas_recorrentes add column if not exists valor numeric(12,2) not null default 0;
alter table public.contas_recorrentes add column if not exists dia_vencimento integer not null default 1;
alter table public.contas_recorrentes add column if not exists data_inicio date not null default current_date;
alter table public.contas_recorrentes add column if not exists data_fim date;
alter table public.contas_recorrentes add column if not exists ativa boolean not null default true;
alter table public.contas_recorrentes add column if not exists criado_em timestamptz not null default now();
alter table public.contas_recorrentes add column if not exists atualizado_em timestamptz not null default now();

-- 2) Competência identifica a cobrança mensal gerada a partir do modelo.
alter table public.contas add column if not exists competencia date;
alter table public.contas add column if not exists conta_recorrente_id uuid references public.contas_recorrentes(id) on delete set null;
alter table public.contas add column if not exists recorrente boolean not null default false;

create index if not exists idx_contas_familia_competencia on public.contas(familia_id, competencia);
create index if not exists idx_contas_recorrentes_familia on public.contas_recorrentes(familia_id, ativa);
create unique index if not exists uq_conta_recorrente_competencia
  on public.contas(conta_recorrente_id, competencia)
  where conta_recorrente_id is not null and competencia is not null;

-- 3) Contas parceladas: cabeçalho + parcelas, no mesmo conceito de assinatura + cobranças.
create table if not exists public.contas_parceladas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  familia_id uuid null references public.familias(id) on delete cascade,
  categoria_id uuid null references public.categorias(id) on delete set null,
  descricao text not null,
  valor_total numeric(12,2) not null default 0,
  quantidade_parcelas integer not null check (quantidade_parcelas > 0),
  valor_parcela numeric(12,2) not null default 0,
  primeira_vencimento date not null,
  status text not null default 'Ativo',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.contas_parceladas_itens (
  id uuid primary key default gen_random_uuid(),
  conta_parcelada_id uuid not null references public.contas_parceladas(id) on delete cascade,
  usuario_id uuid not null,
  familia_id uuid null references public.familias(id) on delete cascade,
  numero_parcela integer not null,
  data_vencimento date not null,
  valor numeric(12,2) not null default 0,
  status text not null default 'pendente',
  valor_pago numeric(12,2) not null default 0,
  data_pagamento timestamptz null,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique(conta_parcelada_id, numero_parcela)
);

create index if not exists idx_contas_parceladas_familia on public.contas_parceladas(familia_id, criado_em desc);
create index if not exists idx_contas_parceladas_itens_familia_data on public.contas_parceladas_itens(familia_id, data_vencimento);

-- Compatibilidade com instalações antigas que possuíam a coluna nome em contas_recorrentes.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='contas_recorrentes' and column_name='nome') then
    execute $q$update public.contas_recorrentes set descricao=coalesce(nullif(descricao, ''), nome) where descricao is null or trim(descricao)=''$q$;
  end if;
end $$;

-- 4) Vincula dados legados à família do usuário quando possível.
do $$
declare r record; f uuid;
begin
  for r in select distinct usuario_id from public.contas_recorrentes where familia_id is null and usuario_id is not null loop
    select familia_id into f from public.familia_membros where usuario_id=r.usuario_id order by criado_em limit 1;
    if f is not null then update public.contas_recorrentes set familia_id=f where usuario_id=r.usuario_id and familia_id is null; end if;
  end loop;
  for r in select distinct usuario_id from public.contas where familia_id is null and usuario_id is not null loop
    select familia_id into f from public.familia_membros where usuario_id=r.usuario_id order by criado_em limit 1;
    if f is not null then update public.contas set familia_id=f where usuario_id=r.usuario_id and familia_id is null; end if;
  end loop;
end $$;

-- 5) RLS por família para os novos registros.
alter table public.contas_recorrentes enable row level security;
alter table public.contas_parceladas enable row level security;
alter table public.contas_parceladas_itens enable row level security;

drop policy if exists contas_recorrentes_family_select on public.contas_recorrentes;
drop policy if exists contas_recorrentes_family_insert on public.contas_recorrentes;
drop policy if exists contas_recorrentes_family_update on public.contas_recorrentes;
drop policy if exists contas_recorrentes_family_delete on public.contas_recorrentes;
create policy contas_recorrentes_family_select on public.contas_recorrentes for select to authenticated using (public.is_family_member(familia_id));
create policy contas_recorrentes_family_insert on public.contas_recorrentes for insert to authenticated with check (public.is_family_member(familia_id) and usuario_id=auth.uid());
create policy contas_recorrentes_family_update on public.contas_recorrentes for update to authenticated using (public.is_family_member(familia_id)) with check (public.is_family_member(familia_id));
create policy contas_recorrentes_family_delete on public.contas_recorrentes for delete to authenticated using (public.is_family_member(familia_id));

drop policy if exists contas_parceladas_family_select on public.contas_parceladas;
drop policy if exists contas_parceladas_family_insert on public.contas_parceladas;
drop policy if exists contas_parceladas_family_update on public.contas_parceladas;
drop policy if exists contas_parceladas_family_delete on public.contas_parceladas;
create policy contas_parceladas_family_select on public.contas_parceladas for select to authenticated using (public.is_family_member(familia_id));
create policy contas_parceladas_family_insert on public.contas_parceladas for insert to authenticated with check (public.is_family_member(familia_id) and usuario_id=auth.uid());
create policy contas_parceladas_family_update on public.contas_parceladas for update to authenticated using (public.is_family_member(familia_id)) with check (public.is_family_member(familia_id));
create policy contas_parceladas_family_delete on public.contas_parceladas for delete to authenticated using (public.is_family_member(familia_id));

drop policy if exists contas_parceladas_itens_family_select on public.contas_parceladas_itens;
drop policy if exists contas_parceladas_itens_family_insert on public.contas_parceladas_itens;
drop policy if exists contas_parceladas_itens_family_update on public.contas_parceladas_itens;
drop policy if exists contas_parceladas_itens_family_delete on public.contas_parceladas_itens;
create policy contas_parceladas_itens_family_select on public.contas_parceladas_itens for select to authenticated using (public.is_family_member(familia_id));
create policy contas_parceladas_itens_family_insert on public.contas_parceladas_itens for insert to authenticated with check (public.is_family_member(familia_id) and usuario_id=auth.uid());
create policy contas_parceladas_itens_family_update on public.contas_parceladas_itens for update to authenticated using (public.is_family_member(familia_id)) with check (public.is_family_member(familia_id));
create policy contas_parceladas_itens_family_delete on public.contas_parceladas_itens for delete to authenticated using (public.is_family_member(familia_id));

grant select, insert, update, delete on table public.contas_recorrentes to authenticated;
grant select, insert, update, delete on table public.contas_parceladas to authenticated;
grant select, insert, update, delete on table public.contas_parceladas_itens to authenticated;
