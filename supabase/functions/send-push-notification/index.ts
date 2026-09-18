import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificationRecord = {
  id: string;
  recipient_id: string;
  actor_id?: string | null;
  familia_id?: string | null;
  type: "new" | "paid" | "upcoming" | "overdue" | string;
  title: string;
  message: string;
  reference_id?: string | null;
  created_at?: string;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: NotificationRecord;
  old_record?: unknown;
  notification?: NotificationRecord;
  notification_id?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getNotificationFromBody(body: WebhookPayload): NotificationRecord | null {
  if (body.record?.id) return body.record;
  if (body.notification?.id) return body.notification;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json({ error: "Secrets obrigatórios não configurados." }, 500);
  }

  try {
    const body = (await req.json()) as WebhookPayload;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const notification = getNotificationFromBody(body);

    if (!notification && !body.notification_id) {
      return json({ error: "Informe record ou notification_id." }, 400);
    }

    let currentNotification = notification;

    if (!currentNotification && body.notification_id) {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", body.notification_id)
        .maybeSingle();

      if (error) throw error;
      currentNotification = data as NotificationRecord | null;
    }

    if (!currentNotification) {
      return json({ error: "Notificação não encontrada." }, 404);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .eq("user_id", currentNotification.recipient_id);

    if (subscriptionsError) throw subscriptionsError;

    const payload = JSON.stringify({
      title: currentNotification.title,
      body: currentNotification.message,
      data: {
        notification_id: currentNotification.id,
        type: currentNotification.type,
        reference_id: currentNotification.reference_id ?? null,
        url: "/",
      },
    });

    let sent = 0;
    let removed = 0;
    const failures: Array<{ subscription_id: string; statusCode?: number; error: string }> = [];

    for (const item of subscriptions ?? []) {
      const subscription = {
        endpoint: item.endpoint,
        keys: {
          p256dh: item.p256dh,
          auth: item.auth,
        },
      };

      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ subscription_id: item.id, statusCode, error: message });

        // 404/410 normalmente indicam uma inscrição expirada ou removida.
        if (statusCode === 404 || statusCode === 410) {
          const { error: deleteError } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", item.id);

          if (!deleteError) removed++;
        }
      }
    }

    return json({
      ok: true,
      notification_id: currentNotification.id,
      recipient_id: currentNotification.recipient_id,
      subscriptions: subscriptions?.length ?? 0,
      sent,
      removed,
      failures,
    });
  } catch (error) {
    console.error("send-push-notification error:", error);
    return json({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
