import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async (req) => {
  try {
    const auth = req.headers.get('Authorization') || ''
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401 })
    const body = await req.json()
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: membership } = await admin.from('familia_membros').select('papel').eq('familia_id', body.familia_id).eq('usuario_id', user.id).maybeSingle()
    if (membership?.papel !== 'admin') return new Response(JSON.stringify({ error: 'Somente administradores podem cadastrar membros.' }), { status: 403 })
    const { data: created, error } = await admin.auth.admin.createUser({ email: body.email, password: body.senha, email_confirm: true, user_metadata: { name: body.nome } })
    if (error) throw error
    await admin.from('profiles').upsert({ id: created.user.id, nome: body.nome, email: body.email, ativo: true }, { onConflict: 'id' })
    const { error: memberError } = await admin.from('familia_membros').upsert({ familia_id: body.familia_id, usuario_id: created.user.id, papel: 'membro', tipo: body.tipo }, { onConflict: 'familia_id,usuario_id' })
    if (memberError) throw memberError
    return new Response(JSON.stringify({ ok: true, user_id: created.user.id }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } }) }
})
