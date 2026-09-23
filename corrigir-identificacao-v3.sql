-- Finanças Pro: gravação segura da identificação do usuário
-- Execute este SQL uma única vez no Supabase SQL Editor.

alter table public.familia_membros
  add column if not exists tipo text;

create or replace function public.update_my_family_identification(
  p_family_id uuid,
  p_tipo text
)
returns table (id uuid, tipo text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_tipo text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  p_tipo := trim(coalesce(p_tipo, ''));
  if p_tipo = '' then
    raise exception 'A identificação não pode ficar vazia.';
  end if;
  if length(p_tipo) > 80 then
    raise exception 'A identificação deve ter no máximo 80 caracteres.';
  end if;

  update public.familia_membros
     set tipo = p_tipo
   where familia_id = p_family_id
     and usuario_id = auth.uid()
  returning familia_membros.id, familia_membros.tipo
       into v_id, v_tipo;

  if v_id is null then
    raise exception 'Vínculo com a família não encontrado para o usuário autenticado.';
  end if;

  return query select v_id, v_tipo;
end;
$$;

revoke all on function public.update_my_family_identification(uuid, text) from public;
grant execute on function public.update_my_family_identification(uuid, text) to authenticated;
