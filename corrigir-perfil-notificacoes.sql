-- Finanças Pro: identificação do membro, nome da família e notificações com autor
-- Execute no Supabase SQL Editor.

alter table public.familia_membros
  add column if not exists tipo text;

-- Permite que cada usuário altere apenas a própria identificação na família.
drop policy if exists familia_membros_update_own_type on public.familia_membros;
create policy familia_membros_update_own_type
on public.familia_membros
for update
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- Garante que administradores possam atualizar o nome da família.
drop policy if exists familias_update_admin on public.familias;
create policy familias_update_admin
on public.familias
for update
using (
  exists (
    select 1 from public.familia_membros m
    where m.familia_id = id
      and m.usuario_id = auth.uid()
      and m.papel = 'admin'
  )
)
with check (
  exists (
    select 1 from public.familia_membros m
    where m.familia_id = id
      and m.usuario_id = auth.uid()
      and m.papel = 'admin'
  )
);
