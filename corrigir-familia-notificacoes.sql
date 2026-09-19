-- FINANÇAS PRO — Correção de compartilhamento familiar + notificações
-- Execute no Supabase SQL Editor.
-- Não apaga dados financeiros.

-- 1) Garante que registros antigos sem familia_id sejam associados
-- quando o usuário pertence a uma única família.
do $$
declare t text;
begin
  foreach t in array array['contas','contas_recorrentes','categorias','emprestimos','emprestimo_parcelas','assinaturas'] loop
    execute format($f$
      update public.%I x
         set familia_id = m.familia_id
        from public.familia_membros m
       where x.familia_id is null
         and x.usuario_id = m.usuario_id
         and m.familia_id = (
           select min(m2.familia_id::text)::uuid
             from public.familia_membros m2
            where m2.usuario_id = x.usuario_id
         )
         and 1 = (
           select count(*) from public.familia_membros m3
            where m3.usuario_id = x.usuario_id
         )
    $f$,t);
  end loop;
end $$;

-- 2) Políticas de acesso: qualquer membro da mesma família pode visualizar
-- e trabalhar com os registros daquela família.
create or replace function public.is_family_member(target_family uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.familia_membros
     where familia_id = target_family
       and usuario_id = auth.uid()
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['contas','contas_recorrentes','categorias','emprestimos','emprestimo_parcelas','assinaturas'] loop
    execute format('drop policy if exists financas_%s_select_own on public.%I',t,t);
    execute format('drop policy if exists financas_%s_insert_own on public.%I',t,t);
    execute format('drop policy if exists financas_%s_update_own on public.%I',t,t);
    execute format('drop policy if exists financas_%s_delete_own on public.%I',t,t);
    execute format('drop policy if exists financas_%s_family_select on public.%I',t,t);
    execute format('drop policy if exists financas_%s_family_insert on public.%I',t,t);
    execute format('drop policy if exists financas_%s_family_update on public.%I',t,t);
    execute format('drop policy if exists financas_%s_family_delete on public.%I',t,t);

    execute format(
      'create policy financas_%s_family_select on public.%I for select using (public.is_family_member(familia_id))',
      t,t
    );
    execute format(
      'create policy financas_%s_family_insert on public.%I for insert with check (public.is_family_member(familia_id) and usuario_id=auth.uid())',
      t,t
    );
    execute format(
      'create policy financas_%s_family_update on public.%I for update using (public.is_family_member(familia_id)) with check (public.is_family_member(familia_id))',
      t,t
    );
    execute format(
      'create policy financas_%s_family_delete on public.%I for delete using (public.is_family_member(familia_id))',
      t,t
    );
  end loop;
end $$;

-- 3) Notificações: cada usuário vê as próprias notificações.
alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
drop policy if exists "notifications_select_own" on public.notifications;
create policy notifications_select_own
on public.notifications for select
using (recipient_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
create policy notifications_update_own
on public.notifications for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

-- 4) Recria o gatilho de notificações sem depender de updated_at.
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
begin
  if tg_op = 'INSERT' then
    event_type := 'new';
    event_title := 'Nova conta adicionada';
    event_message := coalesce(new.descricao,'Nova conta')
      || ' • ' || to_char(coalesce(new.valor,0),'FM999G999G990D00')
      || ' • vencimento ' || to_char(new.data_vencimento,'DD/MM/YYYY');
    key_prefix := 'new:';
  elsif tg_op = 'UPDATE'
    and lower(coalesce(old.status,'')) <> 'pago'
    and lower(coalesce(new.status,'')) = 'pago' then
    event_type := 'paid';
    event_title := 'Conta paga';
    event_message := coalesce(new.descricao,'Conta') || ' foi marcada como paga.';
    key_prefix := 'paid:';
  else
    return new;
  end if;

  for member in
    select usuario_id
      from public.familia_membros
     where familia_id = new.familia_id
       and usuario_id <> new.usuario_id
  loop
    insert into public.notifications(
      recipient_id, actor_id, familia_id, type, title, message,
      reference_id, notification_key
    )
    values(
      member.usuario_id, new.usuario_id, new.familia_id, event_type,
      event_title, event_message, new.id,
      key_prefix || new.id::text || ':' || member.usuario_id::text
    )
    on conflict (notification_key) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_family_contas on public.contas;
create trigger trg_notify_family_contas
after insert or update of status on public.contas
for each row execute function public.notify_family_members();

-- 5) Habilita Realtime para as notificações.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
