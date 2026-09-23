-- Finanças Pro — correção definitiva para alteração do Nome da família
-- Execute este arquivo no Supabase SQL Editor.

alter table public.familias enable row level security;
alter table public.familia_membros enable row level security;

-- O administrador pode alterar somente as famílias das quais é membro com papel admin.
drop policy if exists familias_update_admin on public.familias;
create policy familias_update_admin
on public.familias
for update
to authenticated
using (
  exists (
    select 1
    from public.familia_membros as m
    where m.familia_id = public.familias.id
      and m.usuario_id = auth.uid()
      and m.papel = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.familia_membros as m
    where m.familia_id = public.familias.id
      and m.usuario_id = auth.uid()
      and m.papel = 'admin'
  )
);

-- Garante que o membro autenticado consiga consultar sua própria família.
drop policy if exists familias_select_member on public.familias;
create policy familias_select_member
on public.familias
for select
to authenticated
using (
  exists (
    select 1
    from public.familia_membros as m
    where m.familia_id = public.familias.id
      and m.usuario_id = auth.uid()
  )
);

-- Diagnóstico opcional: depois de executar o SQL acima, este SELECT deve retornar
-- a família do usuário atual e papel = admin.
-- select f.id, f.nome, m.papel
-- from public.familias f
-- join public.familia_membros m on m.familia_id = f.id
-- where m.usuario_id = auth.uid();
