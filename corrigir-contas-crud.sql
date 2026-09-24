-- FINANÇAS PRO — correção de inserir, editar, marcar pago e excluir contas
-- Execute UMA VEZ no Supabase > SQL Editor.
-- Não cria tabela nova e não apaga dados.

-- 1) Garante a coluna usada pela versão com famílias.
alter table public.contas
  add column if not exists familia_id uuid references public.familias(id) on delete cascade;

create index if not exists idx_contas_familia_crud
  on public.contas(familia_id);

-- 2) Função usada pelas políticas abaixo para confirmar que o usuário pertence à família.
create or replace function public.is_family_member(target_family uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.familia_membros m
    where m.familia_id = target_family
      and m.usuario_id = auth.uid()
  );
$$;

revoke all on function public.is_family_member(uuid) from public;
grant execute on function public.is_family_member(uuid) to authenticated;

-- 3) Vincula contas legadas que ainda estejam sem familia_id.
do $$
declare
  r record;
  f uuid;
begin
  for r in
    select distinct c.usuario_id
    from public.contas c
    where c.familia_id is null
      and c.usuario_id is not null
  loop
    select m.familia_id
      into f
    from public.familia_membros m
    where m.usuario_id = r.usuario_id
    order by m.criado_em
    limit 1;

    if f is not null then
      update public.contas
         set familia_id = f
       where usuario_id = r.usuario_id
         and familia_id is null;
    end if;
  end loop;
end $$;

-- 4) RLS canônico para contas compartilhadas pela família.
alter table public.contas enable row level security;

drop policy if exists "financas_contas_select_own" on public.contas;
drop policy if exists "financas_contas_insert_own" on public.contas;
drop policy if exists "financas_contas_update_own" on public.contas;
drop policy if exists "financas_contas_delete_own" on public.contas;
drop policy if exists financas_contas_family_select on public.contas;
drop policy if exists financas_contas_family_insert on public.contas;
drop policy if exists financas_contas_family_update on public.contas;
drop policy if exists financas_contas_family_delete on public.contas;

drop policy if exists contas_select_family on public.contas;
drop policy if exists contas_insert_family on public.contas;
drop policy if exists contas_update_family on public.contas;
drop policy if exists contas_delete_family on public.contas;

create policy contas_select_family
on public.contas
for select
to authenticated
using (public.is_family_member(familia_id));

create policy contas_insert_family
on public.contas
for insert
to authenticated
with check (
  public.is_family_member(familia_id)
  and usuario_id = auth.uid()
);

create policy contas_update_family
on public.contas
for update
to authenticated
using (public.is_family_member(familia_id))
with check (public.is_family_member(familia_id));

create policy contas_delete_family
on public.contas
for delete
to authenticated
using (public.is_family_member(familia_id));

-- 5) Confirma o acesso básico ao objeto para usuários autenticados.
grant select, insert, update, delete on table public.contas to authenticated;

-- Diagnóstico opcional:
-- select id, familia_id, usuario_id, descricao, valor, data_vencimento
-- from public.contas
-- order by criado_em desc nulls last;
