-- Finanças Pro: identificação do membro, nome da família e notificações com autor
-- Execute no Supabase SQL Editor.

alter table public.familia_membros
  add column if not exists tipo text;

-- Permite que cada usuário altere apenas a própria identificação na família.
drop policy if exists familia_membros_update_own_type on public.familia_membros;
create policy familia_membros_update_own_type
on public.familia_membros
for update
using (usuario_id = auth.uid() and public.is_family_member(familia_id))
with check (usuario_id = auth.uid() and public.is_family_member(familia_id));

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

-- Notificações com o nome de quem realizou a ação.
create or replace function public.notify_family_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member record;
  event_type text;
  event_title text;
  event_message text;
  key_prefix text;
  actor_name text;
begin
  select coalesce(p.nome, pr.nome, 'Um membro da família')
    into actor_name
  from (select coalesce(new.usuario_id, auth.uid()) as id) a
  left join public.profiles p on p.id = a.id
  left join public.perfis pr on pr.id = a.id;

  if tg_op = 'INSERT' then
    event_type := 'new';
    event_title := 'Nova conta adicionada';
    event_message := actor_name || ' adicionou uma nova conta: ' || coalesce(new.descricao, 'Nova conta') ||
      ' • ' || to_char(coalesce(new.valor,0),'FM999G999G990D00') ||
      ' • vencimento ' || to_char(new.data_vencimento,'DD/MM/YYYY');
    key_prefix := 'new:';
  elsif tg_op = 'UPDATE'
    and lower(coalesce(old.status,'')) <> 'pago'
    and lower(coalesce(new.status,'')) = 'pago' then
    event_type := 'paid';
    event_title := 'Conta paga';
    event_message := actor_name || ' pagou uma conta: ' || coalesce(new.descricao, 'Conta') || '.';
    key_prefix := 'paid:';
  else
    return new;
  end if;

  for member in
    select usuario_id
    from public.familia_membros
    where familia_id = new.familia_id
      and usuario_id <> coalesce(new.usuario_id, auth.uid())
  loop
    insert into public.notifications
      (recipient_id, actor_id, familia_id, type, title, message, reference_id, notification_key)
    values
      (member.usuario_id, new.usuario_id, new.familia_id, event_type, event_title,
       event_message, new.id,
       key_prefix || new.id || ':' || coalesce(new.updated_at::text, now()::text) || ':' || member.usuario_id)
    on conflict (notification_key) do nothing;
  end loop;
  return new;
end;
$$;

-- Atualiza o trigger para INSERT e mudança de status para pago.
drop trigger if exists trg_notify_family_contas on public.contas;
create trigger trg_notify_family_contas
after insert or update of status on public.contas
for each row execute function public.notify_family_members();
