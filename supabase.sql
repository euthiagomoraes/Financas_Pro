-- FINANÇAS PRO — Revisão 6
-- Executar no Supabase SQL Editor.
-- Não apaga dados. Mantém as tabelas atuais e adiciona apenas o necessário.

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null,
  servico text not null,
  icone_slug text not null,
  valor numeric(12,2) not null default 0,
  dia_vencimento integer not null default 1 check (dia_vencimento between 1 and 31),
  ativa boolean not null default true,
  conta_recorrente_id uuid null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Foto também pode ser guardada no cadastro legado, caso ele seja o usado no projeto.
alter table public.perfis add column if not exists avatar_url text;
alter table public.perfis add column if not exists atualizado_em timestamptz default now();

-- Relações usadas pela interface.
do $$ begin
  alter table public.contas add constraint contas_categoria_fk foreign key (categoria_id) references public.categorias(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.contas add constraint contas_recorrente_fk foreign key (conta_recorrente_id) references public.contas_recorrentes(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.contas_recorrentes add constraint recorrentes_categoria_fk foreign key (categoria_id) references public.categorias(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.emprestimo_parcelas add constraint parcelas_emprestimo_fk foreign key (emprestimo_id) references public.emprestimos(id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.assinaturas add constraint assinaturas_recorrente_fk foreign key (conta_recorrente_id) references public.contas_recorrentes(id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists idx_assinaturas_usuario on public.assinaturas(usuario_id);
create index if not exists idx_assinaturas_vencimento on public.assinaturas(usuario_id,dia_vencimento);
create index if not exists idx_contas_usuario_vencimento on public.contas(usuario_id,data_vencimento);
create index if not exists idx_parcelas_usuario_vencimento on public.emprestimo_parcelas(usuario_id,data_vencimento);

alter table public.assinaturas enable row level security;
alter table public.contas enable row level security;
alter table public.contas_recorrentes enable row level security;
alter table public.categorias enable row level security;
alter table public.emprestimos enable row level security;
alter table public.emprestimo_parcelas enable row level security;
alter table public.profiles enable row level security;
alter table public.perfis enable row level security;

-- Políticas por usuário. Idempotentes: podem ser executadas novamente.
drop policy if exists "assinaturas_select_own" on public.assinaturas;
drop policy if exists "assinaturas_insert_own" on public.assinaturas;
drop policy if exists "assinaturas_update_own" on public.assinaturas;
drop policy if exists "assinaturas_delete_own" on public.assinaturas;
create policy "assinaturas_select_own" on public.assinaturas for select using (usuario_id = auth.uid());
create policy "assinaturas_insert_own" on public.assinaturas for insert with check (usuario_id = auth.uid());
create policy "assinaturas_update_own" on public.assinaturas for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "assinaturas_delete_own" on public.assinaturas for delete using (usuario_id = auth.uid());

-- Estas políticas não removem outras permissões administrativas já existentes; os nomes abaixo são exclusivos desta revisão.
drop policy if exists "financas_contas_select_own" on public.contas;
drop policy if exists "financas_contas_insert_own" on public.contas;
drop policy if exists "financas_contas_update_own" on public.contas;
drop policy if exists "financas_contas_delete_own" on public.contas;
create policy "financas_contas_select_own" on public.contas for select using (usuario_id = auth.uid());
create policy "financas_contas_insert_own" on public.contas for insert with check (usuario_id = auth.uid());
create policy "financas_contas_update_own" on public.contas for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "financas_contas_delete_own" on public.contas for delete using (usuario_id = auth.uid());

drop policy if exists "financas_rec_select_own" on public.contas_recorrentes;
drop policy if exists "financas_rec_insert_own" on public.contas_recorrentes;
drop policy if exists "financas_rec_update_own" on public.contas_recorrentes;
drop policy if exists "financas_rec_delete_own" on public.contas_recorrentes;
create policy "financas_rec_select_own" on public.contas_recorrentes for select using (usuario_id = auth.uid());
create policy "financas_rec_insert_own" on public.contas_recorrentes for insert with check (usuario_id = auth.uid());
create policy "financas_rec_update_own" on public.contas_recorrentes for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "financas_rec_delete_own" on public.contas_recorrentes for delete using (usuario_id = auth.uid());

drop policy if exists "financas_cat_select_own" on public.categorias;
drop policy if exists "financas_cat_insert_own" on public.categorias;
drop policy if exists "financas_cat_update_own" on public.categorias;
drop policy if exists "financas_cat_delete_own" on public.categorias;
create policy "financas_cat_select_own" on public.categorias for select using (usuario_id = auth.uid());
create policy "financas_cat_insert_own" on public.categorias for insert with check (usuario_id = auth.uid());
create policy "financas_cat_update_own" on public.categorias for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "financas_cat_delete_own" on public.categorias for delete using (usuario_id = auth.uid());

drop policy if exists "financas_loan_select_own" on public.emprestimos;
drop policy if exists "financas_loan_insert_own" on public.emprestimos;
drop policy if exists "financas_loan_update_own" on public.emprestimos;
drop policy if exists "financas_loan_delete_own" on public.emprestimos;
create policy "financas_loan_select_own" on public.emprestimos for select using (usuario_id = auth.uid());
create policy "financas_loan_insert_own" on public.emprestimos for insert with check (usuario_id = auth.uid());
create policy "financas_loan_update_own" on public.emprestimos for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "financas_loan_delete_own" on public.emprestimos for delete using (usuario_id = auth.uid());

drop policy if exists "financas_parcela_select_own" on public.emprestimo_parcelas;
drop policy if exists "financas_parcela_insert_own" on public.emprestimo_parcelas;
drop policy if exists "financas_parcela_update_own" on public.emprestimo_parcelas;
drop policy if exists "financas_parcela_delete_own" on public.emprestimo_parcelas;
create policy "financas_parcela_select_own" on public.emprestimo_parcelas for select using (usuario_id = auth.uid());
create policy "financas_parcela_insert_own" on public.emprestimo_parcelas for insert with check (usuario_id = auth.uid());
create policy "financas_parcela_update_own" on public.emprestimo_parcelas for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "financas_parcela_delete_own" on public.emprestimo_parcelas for delete using (usuario_id = auth.uid());

-- Perfil principal.
drop policy if exists "financas_profiles_select_own" on public.profiles;
drop policy if exists "financas_profiles_insert_own" on public.profiles;
drop policy if exists "financas_profiles_update_own" on public.profiles;
create policy "financas_profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "financas_profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
create policy "financas_profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Perfil legado, se a aplicação cair para public.perfis.
drop policy if exists "financas_perfis_select_own" on public.perfis;
drop policy if exists "financas_perfis_insert_own" on public.perfis;
drop policy if exists "financas_perfis_update_own" on public.perfis;
create policy "financas_perfis_select_own" on public.perfis for select using (id = auth.uid());
create policy "financas_perfis_insert_own" on public.perfis for insert with check (id = auth.uid());
create policy "financas_perfis_update_own" on public.perfis for update using (id = auth.uid()) with check (id = auth.uid());

-- Storage para foto de perfil.
insert into storage.buckets (id,name,public)
values ('avatars','avatars',true)
on conflict (id) do update set public=true;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_own_insert" on storage.objects;
drop policy if exists "avatars_own_update" on storage.objects;
drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_public_read" on storage.objects for select using (bucket_id='avatars');
create policy "avatars_own_insert" on storage.objects for insert with check (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_own_update" on storage.objects for update using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_own_delete" on storage.objects for delete using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- Revisão 18 — campo usado pelo checkbox Conta recorrente.
alter table public.contas add column if not exists recorrente boolean not null default false;
create index if not exists idx_contas_usuario_recorrente on public.contas(usuario_id,recorrente);

-- ============================================================
-- FINANÇAS PRO — MULTIFAMÍLIAS E MEMBROS (migração segura)
-- Execute após o SQL anterior. Não apaga registros existentes.
-- ============================================================
create table if not exists public.familias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_por uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
create table if not exists public.familia_membros (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  papel text not null default 'membro' check (papel in ('admin','membro')),
  criado_em timestamptz not null default now(),
  unique(familia_id, usuario_id)
);

alter table public.contas add column if not exists familia_id uuid references public.familias(id) on delete cascade;
alter table public.contas_recorrentes add column if not exists familia_id uuid references public.familias(id) on delete cascade;
alter table public.categorias add column if not exists familia_id uuid references public.familias(id) on delete cascade;
alter table public.emprestimos add column if not exists familia_id uuid references public.familias(id) on delete cascade;
alter table public.emprestimo_parcelas add column if not exists familia_id uuid references public.familias(id) on delete cascade;
alter table public.assinaturas add column if not exists familia_id uuid references public.familias(id) on delete cascade;

-- Cria uma família inicial por usuário e associa dados legados a ela.
do $$
declare u record; f uuid;
begin
  for u in select id from auth.users loop
    select id into f from public.familias where criado_por=u.id order by criado_em limit 1;
    if f is null then
      insert into public.familias(nome, criado_por) values ('Minha família',u.id) returning id into f;
    end if;
    insert into public.familia_membros(familia_id,usuario_id,papel)
      values(f,u.id,'admin') on conflict (familia_id,usuario_id) do nothing;
    update public.contas set familia_id=f where usuario_id=u.id and familia_id is null;
    update public.contas_recorrentes set familia_id=f where usuario_id=u.id and familia_id is null;
    update public.categorias set familia_id=f where usuario_id=u.id and familia_id is null;
    update public.emprestimos set familia_id=f where usuario_id=u.id and familia_id is null;
    update public.emprestimo_parcelas set familia_id=f where usuario_id=u.id and familia_id is null;
    update public.assinaturas set familia_id=f where usuario_id=u.id and familia_id is null;
  end loop;
end $$;

create index if not exists idx_familia_membros_usuario on public.familia_membros(usuario_id);
create index if not exists idx_familia_membros_familia on public.familia_membros(familia_id);
create index if not exists idx_contas_familia on public.contas(familia_id);
create index if not exists idx_emprestimos_familia on public.emprestimos(familia_id);
create index if not exists idx_assinaturas_familia on public.assinaturas(familia_id);

alter table public.familias enable row level security;
alter table public.familia_membros enable row level security;
create or replace function public.is_family_member(target_family uuid)
returns boolean language sql security definer stable set search_path=public
as $$ select exists(select 1 from public.familia_membros where familia_id=target_family and usuario_id=auth.uid()); $$;

drop policy if exists familias_select_member on public.familias;
drop policy if exists familias_insert_owner on public.familias;
drop policy if exists familias_update_admin on public.familias;
create policy familias_select_member on public.familias for select using (public.is_family_member(id));
create policy familias_insert_owner on public.familias for insert with check (criado_por=auth.uid());
create policy familias_update_admin on public.familias for update using (exists(select 1 from public.familia_membros m where m.familia_id=id and m.usuario_id=auth.uid() and m.papel='admin'));

drop policy if exists familia_membros_select_member on public.familia_membros;
drop policy if exists familia_membros_insert_admin on public.familia_membros;
create policy familia_membros_select_member on public.familia_membros for select using (public.is_family_member(familia_id));
create policy familia_membros_insert_admin on public.familia_membros for insert with check (public.is_family_member(familia_id));

-- Substitui políticas próprias por políticas baseadas na família.
DO $$
DECLARE t text; p text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contas','contas_recorrentes','categorias','emprestimos','emprestimo_parcelas','assinaturas'] LOOP
    EXECUTE format('drop policy if exists financas_%s_select_own on public.%I',t,t);
    EXECUTE format('drop policy if exists financas_%s_insert_own on public.%I',t,t);
    EXECUTE format('drop policy if exists financas_%s_update_own on public.%I',t,t);
    EXECUTE format('drop policy if exists financas_%s_delete_own on public.%I',t,t);
    EXECUTE format('create policy financas_%s_family_select on public.%I for select using (public.is_family_member(familia_id))',t,t);
    EXECUTE format('create policy financas_%s_family_insert on public.%I for insert with check (public.is_family_member(familia_id) and usuario_id=auth.uid())',t,t);
    EXECUTE format('create policy financas_%s_family_update on public.%I for update using (public.is_family_member(familia_id)) with check (public.is_family_member(familia_id))',t,t);
    EXECUTE format('create policy financas_%s_family_delete on public.%I for delete using (public.is_family_member(familia_id))',t,t);
  END LOOP;
END $$;

-- Remove políticas legadas com nomes diferentes, para não bloquear membros da família.
drop policy if exists assinaturas_select_own on public.assinaturas;
drop policy if exists assinaturas_insert_own on public.assinaturas;
drop policy if exists assinaturas_update_own on public.assinaturas;
drop policy if exists assinaturas_delete_own on public.assinaturas;
drop policy if exists financas_loan_select_own on public.emprestimos;
drop policy if exists financas_loan_insert_own on public.emprestimos;
drop policy if exists financas_loan_update_own on public.emprestimos;
drop policy if exists financas_loan_delete_own on public.emprestimos;
drop policy if exists financas_parcela_select_own on public.emprestimo_parcelas;
drop policy if exists financas_parcela_insert_own on public.emprestimo_parcelas;
drop policy if exists financas_parcela_update_own on public.emprestimo_parcelas;
drop policy if exists financas_parcela_delete_own on public.emprestimo_parcelas;

-- Permite que o criador se inclua como primeiro administrador da própria família.
drop policy if exists familia_membros_insert_admin on public.familia_membros;
create policy familia_membros_insert_admin on public.familia_membros
for insert with check (
  exists(select 1 from public.familias f where f.id=familia_id and f.criado_por=auth.uid())
  or public.is_family_member(familia_id)
);


-- Permite que membros da mesma família visualizem os nomes dos demais membros.
-- Execute esta seção no SQL Editor do Supabase para corrigir "Nome não informado".
drop policy if exists financas_profiles_family_select on public.profiles;
create policy financas_profiles_family_select
on public.profiles for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.familia_membros meu
    join public.familia_membros outro
      on outro.familia_id = meu.familia_id
    where meu.usuario_id = auth.uid()
      and outro.usuario_id = profiles.id
  )
);

drop policy if exists financas_perfis_family_select on public.perfis;
create policy financas_perfis_family_select
on public.perfis for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.familia_membros meu
    join public.familia_membros outro
      on outro.familia_id = meu.familia_id
    where meu.usuario_id = auth.uid()
      and outro.usuario_id = perfis.id
  )
);
