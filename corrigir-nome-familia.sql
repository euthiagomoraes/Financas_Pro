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

-- Correção robusta: renomeação autorizada dentro do banco.
-- A função verifica explicitamente se auth.uid() é admin da família,
-- executa o UPDATE e devolve a linha alterada.
create or replace function public.renomear_familia(p_familia_id uuid, p_nome text)
returns table(id uuid, nome text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not exists (
    select 1
    from public.familia_membros m
    where m.familia_id = p_familia_id
      and m.usuario_id = auth.uid()
      and m.papel = 'admin'
  ) then
    raise exception 'Usuário não é administrador desta família';
  end if;

  if nullif(trim(p_nome), '') is null then
    raise exception 'O nome da família não pode ficar vazio';
  end if;

  return query
  update public.familias f
     set nome = trim(p_nome)
   where f.id = p_familia_id
  returning f.id, f.nome;
end;
$$;

revoke all on function public.renomear_familia(uuid, text) from public;
grant execute on function public.renomear_familia(uuid, text) to authenticated;
