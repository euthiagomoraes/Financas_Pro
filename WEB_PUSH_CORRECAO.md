# Correção do Web Push e painel de notificações

## Publicar a função

Na pasta raiz do projeto:

```powershell
supabase functions deploy send-push-notification --no-verify-jwt
```

A função usa os secrets `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.

## Criar o Database Webhook

No Supabase: Database > Webhooks > Create webhook.

- Tabela: `public.notifications`
- Evento: `INSERT`
- Método: `POST`
- URL: `https://bcepclvnyjobytqasodx.supabase.co/functions/v1/send-push-notification`
- Headers: `Content-Type: application/json` e `Authorization: Bearer SUA_ANON_KEY`

O corpo padrão deve conter `record`.

## Testar

Ative as notificações no iPhone e insira uma notificação de teste no SQL Editor:

```sql
insert into public.notifications (recipient_id, type, title, message)
values ('UUID_DO_USUARIO', 'new', 'Teste do Finanças Pro', 'Notificação de teste no celular.');
```

O painel também foi corrigido para não usar `outerHTML` ao abrir e fechar ao clicar fora.
