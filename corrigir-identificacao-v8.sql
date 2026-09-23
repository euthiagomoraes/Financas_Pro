-- FINANÇAS PRO — Persistência da identificação do usuário
-- Execute UMA VEZ no Supabase > SQL Editor.
-- Não cria tabela nova. Usa public.familia_membros, que já existe.

alter table public.familia_membros
  add column if not exists tipo text;

alter table public.familia_membros enable row level security;

-- O usuário pode alterar somente a própria identificação no vínculo da família.
drop policy if exists familia_membros_update_own_type on public.familia_membros;
create policy familia_membros_update_own_type
on public.familia_membros
for update
to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- Índice para localizar rapidamente o vínculo do usuário.
create index if not exists idx_familia_membros_usuario_tipo
  on public.familia_membros(usuario_id, tipo);
