-- FINANÇAS PRO — correção definitiva da identificação do usuário
-- Execute UMA vez no Supabase > SQL Editor.

alter table public.familia_membros enable row level security;
alter table public.familia_membros add column if not exists tipo text;

-- Leitura dos vínculos da própria família.
drop policy if exists familia_membros_select_member on public.familia_membros;
create policy familia_membros_select_member
on public.familia_membros
for select
using (public.is_family_member(familia_id));

-- Cada usuário pode alterar somente o próprio vínculo.
drop policy if exists familia_membros_update_own_type on public.familia_membros;
create policy familia_membros_update_own_type
on public.familia_membros
for update
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- Índice para acelerar a atualização/leitura do vínculo.
create index if not exists idx_familia_membros_usuario_familia
on public.familia_membros(usuario_id, familia_id);
