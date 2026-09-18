

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
