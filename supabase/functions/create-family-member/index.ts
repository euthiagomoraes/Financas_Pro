import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authorization = req.headers.get('Authorization') || ''
    if (!authorization.startsWith('Bearer ')) return reply({ error: 'Token de autenticação ausente.' }, 401)

    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return reply({ error: 'Usuário não autenticado.' }, 401)

    const body = await req.json().catch(() => null)
    const email = String(body?.email || '').trim().toLowerCase()
    const nome = String(body?.nome || '').trim()
    const senha = String(body?.senha || '')
    const tipo = String(body?.tipo || '').trim()
    const familiaId = String(body?.familia_id || '').trim()
    if (!email || !nome || senha.length < 6 || !tipo || !familiaId) return reply({ error: 'Preencha nome, e-mail, senha, tipo e família corretamente.' }, 400)

    const admin = createClient(url, service)
    const { data: membership, error: membershipError } = await admin.from('familia_membros').select('papel').eq('familia_id', familiaId).eq('usuario_id', user.id).maybeSingle()
    if (membershipError) return reply({ error: `Erro ao validar administrador: ${membershipError.message}` }, 500)
    if (membership?.papel !== 'admin') return reply({ error: 'Somente administradores podem cadastrar membros.' }, 403)

    const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { name: nome } })
    if (createError || !created.user) return reply({ error: createError?.message || 'Não foi possível criar o usuário.' }, 400)

    const { error: profileError } = await admin.from('profiles').upsert({ id: created.user.id, nome, email, ativo: true }, { onConflict: 'id' })
    if (profileError) {
      const legacyProfile = await admin.from('perfis').upsert({ id: created.user.id, nome, email }, { onConflict: 'id' })
      if (legacyProfile.error) {
        await admin.auth.admin.deleteUser(created.user.id)
        return reply({ error: `Erro ao criar perfil: ${profileError.message}` }, 400)
      }
    }

    const { error: memberError } = await admin.from('familia_membros').insert({ familia_id: familiaId, usuario_id: created.user.id, papel: 'membro', tipo })
    if (memberError) {
      await admin.from('profiles').delete().eq('id', created.user.id)
      await admin.auth.admin.deleteUser(created.user.id)
      return reply({ error: `Erro ao vincular membro à família: ${memberError.message}` }, 400)
    }

    return reply({ ok: true, user_id: created.user.id })
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : 'Erro interno ao cadastrar membro.' }, 500)
  }
})
