-- Finanças Pro — identificação do usuário
-- Execute UMA VEZ no Supabase > SQL Editor.
-- Não cria tabela nova. Apenas adiciona o campo de identificação
-- aos perfis e mantém o campo correspondente no vínculo da família.

alter table public.profiles
  add column if not exists tipo text;

alter table public.perfis
  add column if not exists tipo text;

alter table public.familia_membros
  add column if not exists tipo text;

-- RLS para o próprio usuário atualizar a identificação no vínculo familiar.
alter table public.familia_membros enable row level security;

drop policy if exists familia_membros_update_own_type on public.familia_membros;
create policy familia_membros_update_own_type
on public.familia_membros
for update
to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

-- O perfil já deve possuir estas políticas, mas o bloco é seguro para
-- ambientes onde a política ainda não foi criada.
alter table public.profiles enable row level security;
drop policy if exists financas_profiles_update_own on public.profiles;
create policy financas_profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

alter table public.perfis enable row level security;
drop policy if exists financas_perfis_update_own on public.perfis;
create policy financas_perfis_update_own
on public.perfis
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
