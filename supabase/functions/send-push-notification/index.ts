import webpush from 'npm:web-push';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const body = await req.json();
    const record = body?.record ?? body?.data?.record ?? body;
    const recipientId = record?.recipient_id;
    if (!recipientId) return json({ error: 'recipient_id não informado.' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!supabaseUrl || !serviceRoleKey || !vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
      return json({ error: 'Secrets obrigatórios não configurados.' }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: subscriptions, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', recipientId);
    if (error) return json({ error: error.message }, 500);

    const notification = JSON.stringify({
      title: record.title || 'Finanças Pro',
      body: record.message || 'Você tem uma nova notificação.',
      tag: record.notification_key || record.id || 'financas-pro',
      url: '/',
    });

    const results = [];
    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, notification);
        results.push({ endpoint: sub.endpoint, sent: true });
      } catch (err) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', sub.id);
        results.push({ endpoint: sub.endpoint, sent: false, status });
      }
    }

    return json({ ok: true, recipient_id: recipientId, total: results.length, results });
  } catch (error) {
    return json({ error: error?.message || 'Erro interno.' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
