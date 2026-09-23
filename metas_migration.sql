-- Finanças -Pro: módulo Metas
create table if not exists public.metas (
 id uuid primary key default gen_random_uuid(),
 usuario_id uuid not null,
 familia_id uuid not null,
 titulo text not null check (length(trim(titulo)) between 1 and 120),
 criado_em timestamptz not null default now()
);
create table if not exists public.meta_itens (
 id uuid primary key default gen_random_uuid(),
 meta_id uuid not null references public.metas(id) on delete cascade,
 usuario_id uuid not null,
 familia_id uuid not null,
 descricao text not null check (length(trim(descricao)) between 1 and 180),
 concluida boolean not null default false,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create index if not exists idx_metas_familia_criado on public.metas(familia_id, criado_em desc);
create index if not exists idx_meta_itens_meta on public.meta_itens(meta_id, criado_em);
alter table public.metas enable row level security;
alter table public.meta_itens enable row level security;
drop policy if exists metas_family_access on public.metas;
create policy metas_family_access on public.metas for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists meta_itens_family_access on public.meta_itens;
create policy meta_itens_family_access on public.meta_itens for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
