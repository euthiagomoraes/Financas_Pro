-- Notificações compartilhadas da família
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  familia_id uuid references public.familias(id) on delete cascade,
  type text not null check (type in ('new','paid','upcoming','overdue')),
  title text not null,
  message text not null,
  reference_id uuid,
  notification_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select using (recipient_id = auth.uid());
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create or replace function public.notify_family_members()
returns trigger language plpgsql security definer set search_path = public as $$
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
    event_message := coalesce(new.descricao,'Nova conta') || ' • ' || to_char(coalesce(new.valor,0),'FM999G999G990D00') || ' • vencimento ' || to_char(new.data_vencimento,'DD/MM/YYYY');
    key_prefix := 'new:';
  elsif tg_op = 'UPDATE' and lower(coalesce(old.status,'')) <> 'pago' and lower(coalesce(new.status,'')) = 'pago' then
    event_type := 'paid';
    event_title := 'Conta paga';
    event_message := coalesce(new.descricao,'Conta') || ' foi marcada como paga.';
    key_prefix := 'paid:';
  else
    return new;
  end if;

  for member in select usuario_id from public.familia_membros where familia_id = new.familia_id and usuario_id <> coalesce(new.usuario_id,auth.uid()) loop
    insert into public.notifications(recipient_id,actor_id,familia_id,type,title,message,reference_id,notification_key)
    values(member.usuario_id,new.usuario_id,new.familia_id,event_type,event_title,event_message,new.id,key_prefix||new.id||':'||new.updated_at::text||':'||member.usuario_id)
    on conflict (notification_key) do nothing;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_family_contas on public.contas;
create trigger trg_notify_family_contas
after insert or update of status on public.contas
for each row execute function public.notify_family_members();

-- Notificações de vencimento: execute diariamente (pg_cron) às 08:00 no horário UTC.
create or replace function public.generate_due_notifications()
returns void language plpgsql security definer set search_path = public as $$
declare
  c record; member record; t text; ttl text; msg text; k text;
begin
  for c in select * from public.contas where lower(coalesce(status,'')) <> 'pago' and data_vencimento <= current_date + 1 loop
    if c.data_vencimento < current_date then t:='overdue'; ttl:='Conta vencida'; msg:=coalesce(c.descricao,'Conta')||' está vencida desde '||to_char(c.data_vencimento,'DD/MM/YYYY')||'.';
    else t:='upcoming'; ttl:='Conta próxima do vencimento'; msg:=coalesce(c.descricao,'Conta')||' vence amanhã ('||to_char(c.data_vencimento,'DD/MM/YYYY')||').'; end if;
    for member in select usuario_id from public.familia_membros where familia_id=c.familia_id and usuario_id<>c.usuario_id loop
      k:=t||':'||c.id||':'||c.data_vencimento::text||':'||member.usuario_id;
      insert into public.notifications(recipient_id,actor_id,familia_id,type,title,message,reference_id,notification_key) values(member.usuario_id,c.usuario_id,c.familia_id,t,ttl,msg,c.id,k) on conflict(notification_key) do nothing;
    end loop;
  end loop;
end;
$$;

-- Se pg_cron estiver disponível no projeto, habilite e agende:
-- create extension if not exists pg_cron;
-- select cron.schedule('financas-pro-vencimentos','0 11 * * *','select public.generate_due_notifications();');
