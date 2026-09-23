-- Finanças Pro: gravação da identificação diretamente em familia_membros
-- Execute este SQL UMA VEZ no Supabase > SQL Editor.

alter table public.familia_membros
  add column if not exists tipo text;

alter table public.familia_membros enable row level security;

drop policy if exists familia_membros_update_own_type on public.familia_membros;
create policy familia_membros_update_own_type
on public.familia_membros
for update
to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- Opcional, mas ajuda a confirmar a coluna no banco:
create index if not exists idx_familia_membros_usuario_tipo
  on public.familia_membros(usuario_id, tipo);
