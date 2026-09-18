import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405)

  let createdUserId: string | null = null

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authorization = req.headers.get('Authorization') || ''

    if (!authorization.startsWith('Bearer ')) {
      return reply({ error: 'Token de autenticação ausente.' }, 401)
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } }
    })
    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData.user) return reply({ error: 'Usuário não autenticado.' }, 401)

    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const nome = String(body.nome || '').trim()
    const senha = String(body.senha || '')
    const tipo = String(body.tipo || '').trim()
    const familiaId = String(body.familia_id || '').trim()

    if (!email || !nome || !senha || !tipo || !familiaId) {
      return reply({ error: 'Preencha nome, e-mail, senha, tipo e família.' }, 400)
    }
    if (senha.length < 6) return reply({ error: 'A senha deve ter pelo menos 6 caracteres.' }, 400)

    const admin = createClient(url, serviceKey)
    const { data: membership, error: membershipError } = await admin
      .from('familia_membros')
      .select('papel')
      .eq('familia_id', familiaId)
      .eq('usuario_id', authData.user.id)
      .maybeSingle()

    if (membershipError) return reply({ error: `Erro ao verificar administrador: ${membershipError.message}` }, 500)
    if (membership?.papel !== 'admin') return reply({ error: 'Somente administradores podem cadastrar membros.' }, 403)

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { name: nome }
    })

    if (createError || !created.user) {
      return reply({ error: createError?.message || 'Não foi possível criar o usuário.' }, 400)
    }
    createdUserId = created.user.id

    const { error: profileError } = await admin.from('profiles').upsert({
      id: createdUserId,
      nome,
      email,
      ativo: true
    }, { onConflict: 'id' })

    if (profileError) {
      await admin.auth.admin.deleteUser(createdUserId)
      return reply({ error: `Usuário criado, mas falhou ao salvar o perfil: ${profileError.message}` }, 400)
    }

    const { error: memberError } = await admin.from('familia_membros').upsert({
      familia_id: familiaId,
      usuario_id: createdUserId,
      papel: 'membro',
      tipo
    }, { onConflict: 'familia_id,usuario_id' })

    if (memberError) {
      await admin.from('profiles').delete().eq('id', createdUserId)
      await admin.auth.admin.deleteUser(createdUserId)
      return reply({ error: `Usuário criado, mas falhou ao vincular à família: ${memberError.message}` }, 400)
    }

    return reply({ ok: true, user_id: createdUserId })
  } catch (error) {
    console.error(error)
    if (createdUserId) {
      try {
        const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        await admin.auth.admin.deleteUser(createdUserId)
      } catch (_) {}
    }
    return reply({ error: error instanceof Error ? error.message : 'Erro interno ao cadastrar membro.' }, 500)
  }
})
