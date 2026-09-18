import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth=req.headers.get('Authorization')||''; if(!auth.startsWith('Bearer '))return out({error:'Token de autenticação ausente.'},401);
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}}); const {data:{user:actor}}=await client.auth.getUser(); if(!actor)return out({error:'Usuário não autenticado.'},401);
  const body=await req.json(); const target=String(body.target_user_id||actor.id); const familia=String(body.familia_id||'');
  const admin=createClient(url,service);
  if(target!==actor.id){const {data:m}=await admin.from('familia_membros').select('papel').eq('familia_id',familia).eq('usuario_id',actor.id).maybeSingle();if(m?.papel!=='admin')return out({error:'Somente administradores podem remover membros.'},403);}
  for(const table of ['emprestimo_parcelas','contas','emprestimos','assinaturas','contas_recorrentes','categorias']){const r=await admin.from(table).delete().eq('usuario_id',target);if(r.error)return out({error:`Erro ao apagar ${table}: ${r.error.message}`},500);}
  let r=await admin.from('familia_membros').delete().eq('usuario_id',target);if(r.error)return out({error:r.error.message},500);
  await admin.from('profiles').delete().eq('id',target); await admin.from('perfis').delete().eq('id',target);
  const d=await admin.auth.admin.deleteUser(target);if(d.error)return out({error:d.error.message},500);
  return out({ok:true});
 }catch(e){return out({error:'Erro interno ao excluir a conta.'},500)}
});
