# Configuração do Web Push — Finanças Pro

## 1. Publicar a Edge Function

No PowerShell, dentro da pasta do projeto:

```powershell
supabase functions deploy send-push-notification
```

Se o Supabase CLI solicitar autenticação:

```powershell
supabase login
supabase link --project-ref bcepclvnyjobytqasodx
```

## 2. Configurar os Secrets

Os três secrets VAPID já devem existir no Dashboard. Também é necessário disponibilizar a chave de serviço do Supabase para a função:

```powershell
supabase secrets set `
  VAPID_PUBLIC_KEY="SUA_PUBLIC_KEY" `
  VAPID_PRIVATE_KEY="SUA_PRIVATE_KEY" `
  VAPID_SUBJECT="mailto:seu-email@dominio.com"
```

Não coloque a chave privada no GitHub, no `app.js` ou no `index.html`.

A variável `SUPABASE_SERVICE_ROLE_KEY` deve ser configurada como secret no ambiente da função, caso não esteja disponível automaticamente:

```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
```

A chave `service_role` é extremamente sensível. Nunca a publique ou envie pelo chat.

## 3. Configurar o Database Webhook

No Supabase Dashboard:

1. Acesse **Database → Webhooks**.
2. Crie um webhook para a tabela `public.notifications`.
3. Evento: **Insert**.
4. Método: **POST**.
5. URL da Edge Function:

```text
https://bcepclvnyjobytqasodx.supabase.co/functions/v1/send-push-notification
```

6. Envie o cabeçalho:

```text
Authorization: Bearer SUA_ANON_KEY
Content-Type: application/json
```

> O endpoint valida o conteúdo recebido e usa os secrets internos para consultar as assinaturas. Para uma configuração mais restrita, use um segredo próprio no cabeçalho e valide-o no código antes de ativar em produção.

O payload padrão do Database Webhook inclui `record`, que contém a linha recém-inserida em `notifications`.

## 4. Teste manual

Depois de publicar e configurar o webhook, use o SQL Editor para inserir uma notificação de teste para um usuário que já tenha ativado as notificações no navegador:

```sql
insert into public.notifications (
  recipient_id,
  type,
  title,
  message
)
values (
  'UUID_DO_USUARIO_DESTINATARIO',
  'new',
  'Teste do Finanças Pro',
  'Esta é uma notificação push de teste.'
);
```

O webhook deverá chamar a função, que buscará as linhas de `push_subscriptions` daquele usuário e enviará o push.

## 5. Observações importantes

- A permissão de notificações precisa ser concedida no navegador/dispositivo.
- O usuário precisa clicar em **Ativar notificações** no perfil.
- O push depende de uma assinatura válida em `push_subscriptions`.
- Inscrições que retornarem HTTP 404 ou 410 são removidas automaticamente.
- O código envia para o `recipient_id` da notificação, não para todos os membros da família.
- A função de vencimentos (`generate_due_notifications`) ainda precisa ser agendada no banco para criar os avisos diários.
