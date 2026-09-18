import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Variáveis do Supabase não configuradas." }, 500);
    }

    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return json({ error: "Token de autenticação ausente." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return json({ error: "Sessão inválida ou expirada." }, 401);
    }

    const body = await req.json();
    const nome = String(body.nome || "").trim();
    const sobrenome = String(body.sobrenome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "");
    const familiaId = String(body.familia_id || "").trim();
    const tipo = String(body.tipo || "").trim();

    const tiposPermitidos = ["Marido", "Esposa", "Namorado", "Namorada", "Solteiro"];

    if (!nome || !sobrenome || !email || !senha || !familiaId || !tipo) {
      return json({ error: "Preencha todos os campos obrigatórios." }, 400);
    }
    if (!tiposPermitidos.includes(tipo)) {
      return json({ error: "Tipo de relacionamento inválido." }, 400);
    }
    if (senha.length < 6) {
      return json({ error: "A senha deve ter pelo menos 6 caracteres." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: membership, error: membershipError } = await admin
      .from("familia_membros")
      .select("papel")
      .eq("familia_id", familiaId)
      .eq("usuario_id", authData.user.id)
      .maybeSingle();

    if (membershipError) return json({ error: membershipError.message }, 400);
    if (membership?.papel !== "admin") {
      return json({ error: "Somente administradores podem cadastrar membros." }, 403);
    }

    const nomeCompleto = `${nome} ${sobrenome}`.trim();

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { name: nomeCompleto, nome, sobrenome },
      });

    if (createError || !created.user) {
      return json({ error: createError?.message || "Não foi possível criar o usuário." }, 400);
    }

    const newUserId = created.user.id;

    const { error: profileError } = await admin.from("profiles").upsert(
      { id: newUserId, nome: nomeCompleto, email, ativo: true },
      { onConflict: "id" }
    );

    if (profileError) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: `Erro ao criar perfil: ${profileError.message}` }, 400);
    }

    const { error: memberError } = await admin.from("familia_membros").upsert(
      {
        familia_id: familiaId,
        usuario_id: newUserId,
        papel: "membro",
        tipo,
      },
      { onConflict: "familia_id,usuario_id" }
    );

    if (memberError) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: `Erro ao vincular membro: ${memberError.message}` }, 400);
    }

    return json({ ok: true, user_id: newUserId, message: "Membro cadastrado com sucesso." });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});
