/* Finanças Pro — Revisão 7
   Mobile first • Supabase • sem dados fictícios • preserva as tabelas existentes
*/
const CFG=window.FINANCAS_CONFIG||{};
const sb=supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey);
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const dateBR=v=>{if(!v)return'—';const d=new Date(String(v).length===10?v+'T12:00:00':v);return isNaN(d)?'—':d.toLocaleDateString('pt-BR')};
const iso=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const today=()=>iso(new Date());
const monthName=d=>d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,x=>x.toUpperCase());
const uid=()=>crypto.randomUUID();
let user=null, profile=null, page='dashboard', contaFilter='all', loanFilter='Ativos', calendarDate=new Date(), sidebarCollapsed=localStorage.getItem('financas-sidebar-collapsed')==='1';
let families=[], activeFamily=null;
let notifications=[], notificationsChannel=null;
const state={contas:[],recorrentes:[],emprestimos:[],parcelas:[],categorias:[],assinaturas:[],assinaturaCobrancas:[],parceladas:[],parceladaItens:[],metas:[],metaItens:[]};
const SERVICE_LOGOS={
 netflix:'https://cdn.simpleicons.org/netflix', amazonprime:'https://cdn.simpleicons.org/amazonprime', uber:'https://cdn.simpleicons.org/uber',
 youtube:'https://cdn.simpleicons.org/youtube', spotify:'https://cdn.simpleicons.org/spotify', disneyplus:'https://cdn.simpleicons.org/disneyplus',
 max:'https://cdn.simpleicons.org/max', icloud:'https://cdn.simpleicons.org/icloud', googleone:'https://cdn.simpleicons.org/googleone',
 primevideo:'https://cdn.simpleicons.org/primevideo'
};
const SERVICES=[['Netflix','netflix'],['Amazon Prime','amazonprime'],['Uber','uber'],['YouTube Premium','youtube'],['Spotify','spotify'],['Disney+','disneyplus'],['Max','max'],['iCloud+','icloud'],['Google One','googleone'],['Prime Video','primevideo']];
const DEFAULT_CATEGORIES=[
 ['Alimentação','conta'],['Casa','conta'],['Educação','conta'],['Investimento','conta'],['Lazer','conta'],['Outros','conta'],['Saúde','conta'],['Transporte','conta']
];
const CATEGORY_NAMES=DEFAULT_CATEGORIES.map(([nome])=>nome).sort((a,b)=>a.localeCompare(b,'pt-BR'));
function icon(n,size=18){return `<i data-lucide="${n}" width="${size}" height="${size}"></i>`}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2600)}
function showAlicePopup(kind){const root=$('#alicePopupRoot');if(!root)return;const paid=kind==='paid';root.innerHTML=`<div class="alice-popup alice-${paid?'paid':'new'}" role="status" aria-live="polite"><button class="alice-popup-close" type="button" aria-label="Fechar">×</button><img src="${paid?'assets/alice-paga.png':'assets/alice-nova-conta.png'}" alt="${paid?'Alice comemorando uma conta paga':'Alice preocupada com uma nova conta'}"><div class="alice-popup-copy"><strong>${paid?'Conta paga! 🎉':'Nova conta adicionada'}</strong><span>${paid?'Tudo em dia. Muito bem!':'Vamos organizar mais essa.'}</span></div></div>`;const popup=root.firstElementChild;requestAnimationFrame(()=>popup.classList.add('is-visible'));const close=()=>{popup.classList.remove('is-visible');setTimeout(()=>{if(root.firstElementChild===popup)root.innerHTML=''},260)};popup.querySelector('.alice-popup-close').onclick=close;clearTimeout(showAlicePopup.timer);showAlicePopup.timer=setTimeout(close,4200)}
function refreshIcons(){if(window.lucide)lucide.createIcons()}
function urlBase64ToUint8Array(base64String){const padding='='.repeat((4-base64String.length%4)%4);const raw=atob((base64String+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
function getVapidPublicKey(){return String(window.FINANCAS_CONFIG?.vapidPublicKey||window.FINANCAS_VAPID_PUBLIC_KEY||'').trim();}
function isIOSDevice(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&'ontouchend' in document)}
function isStandalonePWA(){return window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true}
async function enablePushNotifications(){
 const vapidKey=getVapidPublicKey();
 if(!('serviceWorker' in navigator)||!('PushManager' in window)) return toast('Este dispositivo não oferece suporte a notificações web.');
 if(!vapidKey||vapidKey.startsWith('COLE_')) return toast('Chave pública VAPID não configurada.');
 if(isIOSDevice()&&!isStandalonePWA()) return toast('No iPhone, adicione o Finanças Pro à Tela de Início para ativar notificações.');
 try{const reg=await navigator.serviceWorker.register('./sw.js');const permission=await Notification.requestPermission();if(permission!=='granted')return toast('Permissão de notificações não concedida.');let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(vapidKey)});const json=sub.toJSON();if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)return toast('O navegador não retornou os dados da inscrição de notificações.');const {error}=await sb.from('push_subscriptions').upsert({user_id:user.id,endpoint:json.endpoint,p256dh:json.keys.p256dh,auth:json.keys.auth,user_agent:navigator.userAgent,updated_at:new Date().toISOString()},{onConflict:'endpoint'});if(error)return toast('Erro ao salvar dispositivo: '+error.message);toast('Notificações ativadas neste celular.');}catch(e){console.error(e);toast('Não foi possível ativar as notificações: '+(e?.message||'erro desconhecido'));}}
async function registerPushWorker(){if('serviceWorker' in navigator)try{await navigator.serviceWorker.register('./sw.js')}catch(e){console.warn('Service Worker:',e.message)}}

function name(){return profile?.nome||user?.user_metadata?.name||user?.email?.split('@')[0]||'Usuário'}
function avatarUrl(){return profile?.avatar_url||user?.user_metadata?.avatar_url||''}
function isPaid(c){return String(c.status||'').toLowerCase()==='pago'}
function loanIsSettled(loan){
 const expected=Number(loan.parcelas||loan.quantidade_parcelas||0);
 const ps=state.parcelas.filter(p=>p.emprestimo_id===loan.id);
 return expected>0 && ps.length>=expected && ps.every(isPaid);
}
function loanDisplayStatus(loan){return loanIsSettled(loan)?'Quitado':(loan.status||'Ativo')}
function isAdmin(){return activeFamily?.papel==='admin';}
function notificationTitle(n){return n.title||'Notificação'}
function notificationDate(v){return v?new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):''}
async function loadNotifications(){
 if(!user)return;
 const q=await sb.from('notifications').select('*').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(30);
 if(!q.error)notifications=q.data||[];
}
function notificationsHtml(){
 const unread=notifications.filter(n=>!n.read_at).length;
 return `<div class="notifications-panel" id="notificationsPanel" hidden><div class="notifications-head"><strong>Notificações</strong><button class="link-btn" id="markNotificationsRead">Marcar como lidas</button></div><div class="notifications-list">${notifications.length?notifications.map(n=>`<button class="notification-item ${n.read_at?'':'unread'}" data-notification-id="${n.id}"><span class="notification-dot">${icon(n.type==='paid'?'check-circle':n.type==='overdue'?'alert-circle':n.type==='upcoming'?'clock':'bell',15)}</span><span><strong>${esc(notificationTitle(n))}</strong><small>${esc(n.message||'')}</small><em>${notificationDate(n.created_at)}</em></span></button>`).join(''):'<div class="empty">Nenhuma notificação.</div>'}</div></div>`;
}
function notificationBell(){const unread=notifications.filter(n=>!n.read_at).length;return `<div class="notification-wrap"><button class="icon-btn" id="notificationBell" aria-label="Notificações" aria-expanded="false">${icon('bell',18)}${unread?`<span class="notification-badge">${unread>9?'9+':unread}</span>`:''}</button>${notificationsHtml()}</div>`}
async function toggleNotifications(){const panel=$('#notificationsPanel');if(!panel)return;const open=panel.hidden;panel.hidden=!open;$('#notificationBell')?.setAttribute('aria-expanded',String(open));if(open){const now=new Date().toISOString();const q=await sb.from('notifications').update({read_at:now}).eq('recipient_id',user.id).is('read_at',null);if(!q.error)notifications=notifications.map(n=>({...n,read_at:n.read_at||now}));const list=$('.notifications-list',panel);if(list)list.innerHTML=notifications.length?notifications.map(n=>`<button class="notification-item ${n.read_at?'':'unread'}" data-notification-id="${n.id}"><span class="notification-dot">${icon(n.type==='paid'?'check-circle':n.type==='overdue'?'alert-circle':n.type==='upcoming'?'clock':'bell',15)}</span><span><strong>${esc(notificationTitle(n))}</strong><small>${esc(n.message||'')}</small><em>${notificationDate(n.created_at)}</em></span></button>`).join(''):'<div class="empty">Nenhuma notificação.</div>';refreshIcons();}}
async function markNotificationsRead(){const {error}=await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',user.id).is('read_at',null);if(error)return toast(error.message);notifications=notifications.map(n=>({...n,read_at:n.read_at||new Date().toISOString()}));render();}
function subscribeNotifications(){if(!user||notificationsChannel)return;notificationsChannel=sb.channel(`notifications-${user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${user.id}`},payload=>{notifications=[payload.new,...notifications].slice(0,30);if(document.querySelector('#notificationBell'))render();}).subscribe();}
function nav(){return [['dashboard','layout-dashboard','Início'],['emprestimos','hand-coins','Empréstimos'],['calendario','calendar-days','Calendário'],['assinaturas','repeat-2','Assinaturas'],['metas','target','Metas'],['relatorios','chart-no-axes-combined','Relatórios'],['familia','users','Área da Família'],['perfil','circle-user-round','Perfil']];}
function contasNav(){const open=['contas','contas-recorrentes','contas-parceladas'].includes(page);return `<div class="nav-group ${open?'open':''}"><button class="nav-group-toggle ${open?'active':''}" data-nav="contas" aria-expanded="${open}">${icon('receipt-text',18)}<span>Contas</span><span class="nav-chevron">${icon(open?'chevron-down':'chevron-right',14)}</span></button>${open?`<div class="nav-sub"><button data-nav="contas" class="${page==='contas'?'active':''}">${icon('list',15)}<span>Todas</span></button><button data-nav="contas-recorrentes" class="${page==='contas-recorrentes'?'active':''}">${icon('repeat-2',15)}<span>Recorrentes</span></button><button data-nav="contas-parceladas" class="${page==='contas-parceladas'?'active':''}">${icon('layers-3',15)}<span>Parceladas</span></button></div>`:''}</div>`;}
function familySelector(){return ''}
function shell(){return `<div class="mobile-overlay" id="mobileOverlay" aria-hidden="true"></div><aside class="sidebar" id="sidebar"><button class="sidebar-collapse" id="sidebarCollapse" title="Recolher/expandir menu" aria-label="Recolher ou expandir menu">${icon("panel-left-close",18)}</button><div class="brand"><div class="brand-mark">${icon('trending-up',23)}</div><div><h2>Finanças Pro</h2><span>Você no controle</span></div></div><nav class="nav">${contasNav()}${nav().map(([p,ic,l])=>`<button data-nav="${p}" class="${page===p?'active':''}">${icon(ic,18)}<span>${l}</span></button>`).join('')}</nav><div class="sidebar-spacer"></div><div class="quote">“Grandes objetivos começam com um bom planejamento financeiro.”</div><div class="user-mini"><div class="avatar">${avatarUrl()?`<img src="${esc(avatarUrl())}" alt="Foto do perfil">`:icon('user',20)}</div><div><strong>${esc(name())}</strong><span>${esc(user?.email||profile?.email||'')}</span></div><button class="logout" id="logout" title="Sair">${icon('log-out',17)}</button></div></aside><main class="main"><header class="topbar"><button class="mobile-menu" id="mobileMenu">${icon('menu',21)}</button><div class="top-actions"><div class="month-selector" aria-label="Competência selecionada"><button class="icon-btn month-selector-btn" data-month="-1" aria-label="Mês anterior">${icon('chevron-left',16)}</button><button class="month-selector-label" data-nav="calendario" title="Abrir calendário">${icon('calendar-days',15)}<span>${monthName(calendarDate)}</span></button><button class="icon-btn month-selector-btn" data-month="1" aria-label="Próximo mês">${icon('chevron-right',16)}</button></div>${notificationBell()}<button class="icon-btn" data-nav="perfil"><div class="avatar" style="width:30px;height:30px">${avatarUrl()?`<img src="${esc(avatarUrl())}" alt="">`:icon('user',16)}</div></button></div></header><div class="content" id="content"></div></main><nav class="mobile-bottom">${[['dashboard','house','Início'],['contas','receipt-text','Contas'],['calendario','calendar-days','Calendário'],['emprestimos','hand-coins','Empréstimos'],['assinaturas','repeat-2','Mais']].map(([p,ic,l])=>`<button data-nav="${p}" class="${page===p?'active':''}">${icon(ic,19)}<span>${l}</span></button>`).join('')}</nav>`}
function render(){document.querySelector('#app').innerHTML=shell();renderPage();refreshIcons();bindGlobal();bindFamilyControls()}
function bindFamilyControls(){const select=$('#familySelect');if(select)select.onchange=async()=>{activeFamily=families.find(f=>f.id===select.value)||families[0];localStorage.setItem('financas-active-family',activeFamily.id);await loadData();render()};$('#newFamily')?.addEventListener('click',newFamily)}
function newFamily(){modal('Nova família',`<form id="familyForm" class="form-grid"><div class="field full"><label>Nome da família</label><input name="nome" placeholder="Ex.: Família Lisboa" required maxlength=80></div><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelForm">Cancelar</button><button class="btn btn-primary">Criar família</button></div></form>`);$('#cancelForm').onclick=closeModal;$('#familyForm').onsubmit=async e=>{e.preventDefault();const nome=new FormData(e.currentTarget).get('nome').trim();const {data,error}=await sb.from('familias').insert({nome,criado_por:user.id}).select().single();if(error)return toast(error.message);const m=await sb.from('familia_membros').insert({familia_id:data.id,usuario_id:user.id,papel:'admin'});if(m.error)return toast(m.error.message);families.push(data);activeFamily=data;closeModal();await loadData();render();toast('Família criada com sucesso.')}}
function renderPage(){const c=$('#content');if(!c)return;try{let html='';if(page==='dashboard')html=dashboard();if(page==='contas')html=contas();if(page==='contas-recorrentes')html=contasRecorrentes();if(page==='contas-parceladas')html=contasParceladas();if(page==='emprestimos')html=emprestimos();if(page==='calendario')html=calendario();if(page==='assinaturas')html=assinaturas();if(page==='metas')html=metasPage();if(page==='relatorios')html=relatorios();if(page==='familia')html=familyPage();if(page==='perfil')html=perfilPage();c.replaceChildren();c.insertAdjacentHTML('afterbegin',html);refreshIcons();bindPage()}catch(err){console.error(err);c.innerHTML=`<div class="card empty">Não foi possível carregar esta tela.<br><small>${esc(err.message||err)}</small></div>`}}
function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`}
function inSelectedMonth(value){const d=new Date(String(value)+'T12:00:00');return d.getFullYear()===calendarDate.getFullYear()&&d.getMonth()===calendarDate.getMonth()}
function parceladaIsPaid(p){return String(p.status||'').toLowerCase()==='pago'}
function parceladaStatus(p){return parceladaIsPaid(p)?{label:'Pago',cls:'paid'}:(String(p.status||'').toLowerCase()==='cancelado'?{label:'Cancelado',cls:'inactive'}:{label:'Pendente',cls:'pending'})}
function recurringTypes(){return ['Água','Luz','Gás','Internet','Aluguel','Condomínio','IPTU','Seguro','Outros']}
async function ensureRecurringBillsThrough(targetDate=calendarDate){
 if(!state.recorrentes.length||!activeFamily)return;
 const target=new Date(targetDate.getFullYear(),targetDate.getMonth(),1);
 for(const r of state.recorrentes.filter(x=>x.ativa)){
   const startRaw=r.data_inicio||today(),start=new Date(String(startRaw).slice(0,10)+'T12:00:00');
   if(isNaN(start)||new Date(start.getFullYear(),start.getMonth(),1)>target)continue;
   const end=r.data_fim?new Date(String(r.data_fim).slice(0,10)+'T12:00:00'):null;
   const cursor=new Date(start.getFullYear(),start.getMonth(),1);
   while(cursor<=target){
     if(end&&cursor>new Date(end.getFullYear(),end.getMonth(),1))break;
     const competencia=monthKey(cursor),lastDay=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
     const day=Math.min(Number(r.dia_vencimento)||1,lastDay),vencimento=iso(new Date(cursor.getFullYear(),cursor.getMonth(),day));
     const exists=state.contas.some(c=>c.conta_recorrente_id===r.id&&String(c.competencia||'').slice(0,7)===competencia.slice(0,7));
     if(!exists){
       const payload={usuario_id:user.id,familia_id:activeFamily.id,conta_recorrente_id:r.id,competencia,recorrente:true,descricao:r.descricao,categoria_id:r.categoria_id||null,valor:Number(r.valor)||0,data_vencimento:vencimento,status:'Pendente',valor_pago:0,data_pagamento:null,observacao:null};
       const q=await sb.from('contas').upsert(payload,{onConflict:'conta_recorrente_id,competencia',ignoreDuplicates:true}).select('*');
       if(!q.error&&q.data?.length)state.contas.push(...q.data.map(x=>({...x,vencimento:x.data_vencimento})));
     }
     cursor.setMonth(cursor.getMonth()+1);
   }
 }
}
function recurringHistory(r){return state.contas.filter(c=>c.conta_recorrente_id===r.id).sort((a,b)=>String(b.competencia||b.vencimento).localeCompare(String(a.competencia||a.vencimento)))}
function recurringForm(r=null){const catOptions=state.categorias.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(r?.categoria_id||'')?'selected':''}>${esc(c.nome)}</option>`).join('');return `<form id="recorrenteForm" class="form-grid"><div class="field full"><label>Descrição</label><input name="descricao" value="${esc(r?.descricao||'')}" placeholder="Ex.: Conta de luz" required></div><div class="field"><label>Tipo</label><select name="tipo">${recurringTypes().map(t=>`<option ${t===String(r?.tipo||'Outros')?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>Valor mensal</label>${moneyInput('valor',r?.valor??'')}</div><div class="field"><label>Dia de vencimento</label><input name="dia_vencimento" type="number" min="1" max="31" value="${r?.dia_vencimento||1}" required></div><div class="field"><label>Categoria</label><select name="categoria_id"><option value="">Sem categoria</option>${catOptions}</select></div><div class="field"><label>Início</label><input name="data_inicio" type="date" value="${r?.data_inicio||today()}" required></div><div class="field"><label>Fim (opcional)</label><input name="data_fim" type="date" value="${r?.data_fim||''}"></div><div class="field"><label>Status</label><select name="ativa"><option value="true" ${r?.ativa!==false?'selected':''}>Ativa</option><option value="false" ${r?.ativa===false?'selected':''}>Inativa</option></select></div><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelForm">Cancelar</button>${r?`<button type="button" class="btn btn-danger" id="deleteRecorrente">${icon('trash-2',14)} Excluir</button>`:''}<button class="btn btn-primary">${r?'Salvar alterações':'Criar recorrência'}</button></div></form>`}
function contasRecorrentes(){return `<div class="toolbar"><div><div class="eyebrow">Contas</div><h1>Contas Recorrentes</h1><p class="muted">Água, luz, gás, internet, aluguel, condomínio, IPTU, seguro e outras despesas mensais.</p></div><button class="btn btn-primary" data-action="new-recorrente">${icon('plus',17)} Adicionar</button></div><div class="subscription-grid">${state.recorrentes.length?state.recorrentes.map(r=>{const history=recurringHistory(r),paid=history.filter(isPaid).length;return `<details class="card sub-card sub-compact"><summary class="sub-summary"><div class="service-logo">${icon('repeat-2',23)}</div><div class="sub-info"><h3>${esc(r.descricao)}</h3><div class="muted">${esc(r.tipo)} • ${money(r.valor)}/mês • vencimento dia ${r.dia_vencimento}</div><small class="muted">${history.length} lançamento(s) • ${paid} pago(s)</small></div><span class="status ${r.ativa?'active':'inactive'}">${r.ativa?'Ativa':'Inativa'}</span><span class="sub-expand">Detalhes⌄</span></summary><div class="sub-expanded"><h4>Histórico mensal</h4>${history.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th><th></th></tr></thead><tbody>${history.map(c=>{const st=contaStatus(c);return `<tr class="subscription-charge-row"><td data-label="Competência">${String(c.competencia||c.vencimento).slice(5,7)}/${String(c.competencia||c.vencimento).slice(0,4)}</td><td data-label="Vencimento">${dateBR(c.vencimento)}</td><td data-label="Valor">${money(c.valor)}</td><td data-label="Status"><span class="status ${st.cls}">${st.label}</span></td><td data-label="Pagamento">${c.data_pagamento?dateBR(String(c.data_pagamento).slice(0,10)):'—'}</td><td data-label="Ação">${!isPaid(c)?`<button class="btn btn-primary" data-toggle-status="${c.id}">Marcar como pago</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="muted">Nenhum lançamento gerado ainda.</p>'}<div class="sub-actions"><button class="btn btn-outline" data-edit-recorrente="${r.id}">${icon('pencil',14)} Editar recorrência</button><button class="btn btn-danger" data-delete-recorrente="${r.id}">${icon('trash-2',14)} Excluir</button></div></div></details>`}).join(''):'<div class="card empty" style="grid-column:1/-1">Nenhuma conta recorrente cadastrada.</div>'}</div>`}
function parceladaForm(p=null){return `<form id="parceladaForm" class="form-grid"><div class="field full"><label>Descrição</label><input name="descricao" value="${esc(p?.descricao||'')}" placeholder="Ex.: Notebook, móveis, escola..." required></div><div class="field"><label>Valor total</label>${moneyInput('valor_total',p?.valor_total??'')}</div><div class="field"><label>Quantidade de parcelas</label><input name="quantidade_parcelas" type="number" min="1" step="1" value="${p?.quantidade_parcelas||1}" required></div><div class="field"><label>Valor da parcela</label>${moneyInput('valor_parcela',p?.valor_parcela??'')}</div><div class="field"><label>Primeiro vencimento</label><input name="primeira_vencimento" type="date" value="${p?.primeira_vencimento||today()}" required></div><div class="field"><label>Categoria</label><select name="categoria_id"><option value="">Sem categoria</option>${state.categorias.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(p?.categoria_id||'')?'selected':''}>${esc(c.nome)}</option>`).join('')}</select></div><div class="field"><label>Status</label><select name="status"><option value="Ativo" ${String(p?.status||'Ativo')==='Ativo'?'selected':''}>Ativo</option><option value="Concluído" ${String(p?.status||'')==='Concluído'?'selected':''}>Concluído</option><option value="Cancelado" ${String(p?.status||'')==='Cancelado'?'selected':''}>Cancelado</option></select></div><div class="field full"><label>Observação</label><textarea name="observacao">${esc(p?.observacao||'')}</textarea></div><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelForm">Cancelar</button>${p?`<button type="button" class="btn btn-danger" id="deleteParcelada">${icon('trash-2',14)} Excluir</button>`:''}<button class="btn btn-primary">${p?'Salvar alterações':'Criar conta parcelada'}</button></div></form>`}
function contasParceladas(){const totalAtivo=state.parceladas.filter(p=>String(p.status||'').toLowerCase()==='ativo').reduce((a,p)=>a+Number(p.valor_parcela||0),0);return `<div class="toolbar"><div><div class="eyebrow">Contas</div><h1>Contas Parceladas</h1><p class="muted">Cada lançamento possui seu histórico de parcelas, como no módulo de assinaturas.</p></div><button class="btn btn-primary" data-action="new-parcelada">${icon('plus',17)} Adicionar</button></div><div class="sub-total"><span class="muted">Compromisso mensal ativo</span><strong>${money(totalAtivo)}</strong><span class="muted">${state.parceladas.filter(p=>String(p.status||'').toLowerCase()==='ativo').length} conta(s) parcelada(s) ativa(s)</span></div><div class="subscription-grid">${state.parceladas.length?state.parceladas.map(p=>{const items=state.parceladaItens.filter(i=>i.conta_parcelada_id===p.id).sort((a,b)=>a.numero_parcela-b.numero_parcela),paid=items.filter(parceladaIsPaid).length;return `<details class="card sub-card sub-compact"><summary class="sub-summary"><div class="service-logo">${icon('layers-3',23)}</div><div class="sub-info"><h3>${esc(p.descricao)}</h3><div class="muted">${money(p.valor_parcela)}/parcela • ${p.quantidade_parcelas} parcelas</div><small class="muted">${paid}/${items.length} paga(s) • total ${money(p.valor_total)}</small></div><span class="status ${String(p.status||'').toLowerCase()==='ativo'?'active':'inactive'}">${esc(p.status||'Ativo')}</span><span class="sub-expand">Detalhes⌄</span></summary><div class="sub-expanded"><h4>Histórico de parcelas</h4>${items.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th><th></th></tr></thead><tbody>${items.map(i=>{const st=parceladaStatus(i);return `<tr class="subscription-charge-row"><td data-label="Parcela">${i.numero_parcela}/${p.quantidade_parcelas}</td><td data-label="Vencimento">${dateBR(i.data_vencimento)}</td><td data-label="Valor">${money(i.valor)}</td><td data-label="Status"><span class="status ${st.cls}">${st.label}</span></td><td data-label="Pagamento">${i.data_pagamento?dateBR(String(i.data_pagamento).slice(0,10)):'—'}</td><td data-label="Ação">${!parceladaIsPaid(i)?`<button class="btn btn-primary" data-toggle-parcelada="${i.id}">Marcar como pago</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="muted">Nenhuma parcela cadastrada.</p>'}<div class="sub-actions"><button class="btn btn-outline" data-edit-parcelada="${p.id}">${icon('pencil',14)} Editar conta</button><button class="btn btn-danger" data-delete-parcelada="${p.id}">${icon('trash-2',14)} Excluir</button></div></div></details>`}).join(''):'<div class="card empty" style="grid-column:1/-1">Nenhuma conta parcelada cadastrada.</div>'}</div>`}

function dashboard(){
 const d=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1),m=d.getMonth(),y=d.getFullYear();
 const inMonth=value=>{const x=new Date(String(value)+'T12:00:00');return x.getFullYear()===y&&x.getMonth()===m};
 const bills=[...state.contas.filter(c=>inMonth(c.vencimento)),...state.assinaturaCobrancas.filter(ch=>inMonth(ch.data_vencimento)).map(ch=>({id:`subcharge-${ch.id}`,descricao:state.assinaturas.find(s=>s.id===ch.assinatura_id)?.servico||'Assinatura',valor:Number(ch.valor)||0,vencimento:ch.data_vencimento,status:String(ch.status||'pendente').toLowerCase(),origem:'Assinatura',virtual:true})),...state.parceladaItens.filter(p=>inMonth(p.data_vencimento)).map(p=>({id:`parcelada-${p.id}`,descricao:state.parceladas.find(x=>x.id===p.conta_parcelada_id)?.descricao||'Conta parcelada',valor:Number(p.valor)||0,vencimento:p.data_vencimento,status:String(p.status||'pendente').toLowerCase(),origem:'Parcelada',virtual:true}))];
 const total=bills.reduce((s,c)=>s+Number(c.valor||0),0),paid=bills.filter(isPaid),pending=bills.filter(c=>!isPaid(c));
 const paidTotal=paid.reduce((s,c)=>s+Number(c.valor||0),0),pendingTotal=pending.reduce((s,c)=>s+Number(c.valor||0),0);
 const monthLoans=state.parcelas.filter(p=>inMonth(p.data_vencimento)).reduce((s,p)=>s+Number(p.valor||0),0)+state.parceladaItens.filter(p=>inMonth(p.data_vencimento)).reduce((s,p)=>s+Number(p.valor||0),0);
 const monthSubs=state.assinaturaCobrancas.filter(ch=>inMonth(ch.data_vencimento)).reduce((s,x)=>s+Number(x.valor||0),0);
 const upcoming=[...state.contas.filter(c=>inMonth(c.vencimento)&&!isPaid(c)).map(c=>({date:c.vencimento,title:c.descricao,value:c.valor,type:'bill'})),...state.parcelas.filter(p=>inMonth(p.data_vencimento)&&!isPaid(p)).map(p=>({date:p.data_vencimento,title:`Parcela ${p.numero_parcela}`,value:p.valor,type:'loan'})),...state.parceladaItens.filter(p=>inMonth(p.data_vencimento)&&!parceladaIsPaid(p)).map(p=>({date:p.data_vencimento,title:`${state.parceladas.find(x=>x.id===p.conta_parcelada_id)?.descricao||'Conta parcelada'} • parcela ${p.numero_parcela}`,value:p.valor,type:'parcelada'}))].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
 return `<section class="welcome"><div><div class="eyebrow">Visão geral</div><h1>Olá, ${esc(name())}!</h1><p>Resumo de ${monthName(d).toLowerCase()}.</p></div><button class="btn btn-primary" data-action="new-conta">${icon('plus',17)} Lançar conta</button></section><section class="kpis"><article class="card kpi green dashboard-link" data-dashboard-route="all" tabindex="0" role="button" aria-label="Abrir todas as contas de ${monthName(d)}"><div class="kpi-icon">${icon('wallet',19)}</div><small>Contas do mês</small><h3>${money(total)}</h3><p>${bills.length} registro(s)</p></article><article class="card kpi green dashboard-link" data-dashboard-route="paid" tabindex="0" role="button" aria-label="Abrir contas pagas"><div class="kpi-icon">${icon('circle-check',19)}</div><small>Contas pagas</small><h3>${money(paidTotal)}</h3><p>${paid.length} paga(s)</p></article><article class="card kpi red dashboard-link" data-dashboard-route="pending" tabindex="0" role="button" aria-label="Abrir contas pendentes"><div class="kpi-icon">${icon('clock-3',19)}</div><small>Contas a pagar</small><h3>${money(pendingTotal)}</h3><p>${pending.length} pendente(s)</p></article><article class="card kpi gold dashboard-link" data-dashboard-route="subscriptions" tabindex="0" role="button" aria-label="Abrir assinaturas"><div class="kpi-icon">${icon('repeat-2',19)}</div><small>Assinaturas</small><h3>${money(monthSubs)}</h3><p>${state.assinaturas.filter(s=>s.ativa).length} ativa(s)</p></article></section><div class="grid-main"><section class="card section-card"><div class="section-head"><div><h2>Resumo financeiro</h2><p>Últimos 6 meses até ${monthName(d)}</p></div><div class="legend"><span><i class="dot green"></i>Contas pagas</span><span><i class="dot red"></i>Contas lançadas</span></div></div>${monthChart()}</section><section class="card section-card"><div class="section-head"><div><h2>Resumo por categoria</h2><p>${monthName(d)}</p></div></div>${dashboardCategorySummary(bills,monthLoans,monthSubs)}</section></div><div class="grid-main"><section class="card section-card"><div class="section-head"><div><h2>Próximos vencimentos</h2><p>Contas e parcelas em aberto</p></div><button class="link-btn" data-nav="calendario">Ver calendário →</button></div><div class="upcoming">${upcoming.length?upcoming.map(u=>`<div class="up-item"><div class="date-box"><strong>${new Date(u.date+'T12:00:00').getDate()}</strong><small>${new Date(u.date+'T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</small></div><div class="up-copy"><strong>${esc(u.title)}</strong><small>${money(u.value)}</small></div><span class="status pending">Pendente</span></div>`).join(''):'<div class="empty">Nenhum vencimento pendente.</div>'}</div></section><section class="card section-card"><div class="section-head"><div><h2>Assinaturas</h2><p>Serviços ativos</p></div><button class="link-btn" data-nav="assinaturas">Ver todas →</button></div><div class="upcoming">${state.assinaturas.filter(s=>s.ativa).slice(0,5).map(s=>`<div class="up-item"><div class="date-box">${icon('repeat-2',15)}</div><div class="up-copy"><strong>${esc(s.servico)}</strong><small>Dia ${s.dia_vencimento} • ${money(s.valor)}/mês</small></div><span class="status active">Ativa</span></div>`).join('')||'<div class="empty">Nenhuma assinatura ativa.</div>'}</div></section></div>`}

function dashboardCategorySummary(bills,loanTotal,subTotal){
 const groups={};
 bills.forEach(c=>{const cat=state.categorias.find(x=>String(x.id)===String(c.categoria_id));const key=cat?.nome||'Sem categoria';groups[key]=(groups[key]||0)+Number(c.valor||0)});
 const rows=Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0],'pt-BR')).map(([name,value])=>`<div class="metric-row"><span>${esc(name)}</span><div class="metric-bar"><i style="width:${Math.min(100,value/Math.max(1,bills.reduce((s,c)=>s+Number(c.valor||0),0))*100)}%"></i></div><strong>${money(value)}</strong></div>`).join('');
 const commitmentRows=`<div class="metric-row"><span>Empréstimos</span><div class="metric-bar"><i style="width:${Math.min(100,loanTotal>0?60:0)}%"></i></div><strong>${money(loanTotal)}</strong></div><div class="metric-row"><span>Assinaturas</span><div class="metric-bar"><i style="width:${Math.min(100,subTotal>0?35:0)}%"></i></div><strong>${money(subTotal)}/mês</strong></div>`;
 return `<div class="metric-list">${rows||'<div class="empty">Nenhuma categoria lançada neste mês.</div>'}${commitmentRows}</div>`;
}

function monthChart(){const end=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1),arr=[];for(let i=5;i>=0;i--){const d=new Date(end.getFullYear(),end.getMonth()-i,1),y=d.getFullYear(),m=d.getMonth();const matches=d=>{const x=new Date(String(d)+'T12:00:00');return x.getFullYear()===y&&x.getMonth()===m};const rows=[...state.contas.filter(c=>matches(c.vencimento)),...state.assinaturaCobrancas.filter(ch=>matches(ch.data_vencimento)).map(ch=>({valor:Number(ch.valor)||0,status:String(ch.status||'pendente').toLowerCase()}))];const all=rows.reduce((s,c)=>s+Number(c.valor||0),0),pg=rows.filter(isPaid).reduce((s,c)=>s+Number(c.valor||0),0);arr.push({l:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),all,pg})}const max=Math.max(1,...arr.flatMap(x=>[x.all,x.pg]));return `<div class="chart">${arr.map(x=>`<div class="bar-col"><div class="bars"><div class="bar income" title="Pagas ${money(x.pg)}" style="height:${Math.max(2,x.pg/max*100)}%"></div><div class="bar expense" title="Lançadas ${money(x.all)}" style="height:${Math.max(2,x.all/max*100)}%"></div></div><div class="bar-label">${x.l}</div></div>`).join('')}</div>`}
function contaStatus(c){
 if(isPaid(c))return {label:'Pago',cls:'paid'};
 const d=String(c.vencimento||'');
 if(d===today())return {label:'Vence hoje',cls:'today'};
 return {label:'Pendente',cls:'pending'};
}
function contas(){
 const selected=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1);
 const virtualSubsAll=state.assinaturaCobrancas.map(ch=>{const sub=state.assinaturas.find(s=>s.id===ch.assinatura_id);return {id:`subcharge-${ch.id}`,descricao:sub?.servico||'Assinatura',valor:Number(ch.valor)||0,vencimento:ch.data_vencimento,status:String(ch.status||'pendente').toLowerCase(),origem:'Assinatura',virtual:true}});
 const virtualLoansAll=state.parcelas.map(p=>{const loan=state.emprestimos.find(l=>l.id===p.emprestimo_id);return {id:`loan-${p.id}`,descricao:loan?loan.descricao:'Empréstimo',valor:Number(p.valor)||0,vencimento:p.data_vencimento,status:p.status,origem:'Empréstimo',virtual:true,loanId:p.emprestimo_id,numero_parcela:p.numero_parcela}});
 const virtualParceladasAll=state.parceladaItens.map(p=>{const parent=state.parceladas.find(x=>x.id===p.conta_parcelada_id);return {id:`parcelada-${p.id}`,descricao:parent?.descricao||'Conta parcelada',valor:Number(p.valor)||0,vencimento:p.data_vencimento,status:p.status,origem:'Parcelada',virtual:true,parceladaItemId:p.id,numero_parcela:p.numero_parcela}});
 const virtualSubs=virtualSubsAll.filter(x=>inSelectedMonth(x.vencimento)),virtualLoans=virtualLoansAll.filter(x=>inSelectedMonth(x.vencimento)),virtualParceladas=virtualParceladasAll.filter(x=>inSelectedMonth(x.vencimento));
 const historyRows=state.contas.map(c=>({...c,origem:c.recorrente?'Recorrente':'Conta'}));
 let rows=contaFilter==='all'?[...historyRows,...virtualSubsAll,...virtualLoansAll,...virtualParceladasAll]:[...state.contas.filter(c=>inSelectedMonth(c.vencimento)).map(c=>({...c,origem:c.recorrente?'Recorrente':'Conta'})),...virtualSubs,...virtualLoans,...virtualParceladas];
 if(contaFilter==='paid')rows=rows.filter(isPaid); if(contaFilter==='pending')rows=rows.filter(x=>!isPaid(x));
 rows.sort((a,b)=>{const ad=String(a.vencimento||''),bd=String(b.vencimento||'');if(contaFilter==='all'){const nowKey=monthKey(new Date()),am=ad.slice(0,7),bm=bd.slice(0,7);const rank=x=>x===nowKey.slice(0,7)?0:(x>nowKey.slice(0,7)?1:2);const ra=rank(am),rb=rank(bm);if(ra!==rb)return ra-rb;if(ra===1||ra===2)return bd.localeCompare(ad)||String(a.descricao).localeCompare(String(b.descricao));return ad.localeCompare(bd)||String(a.descricao).localeCompare(String(b.descricao));}return ad.localeCompare(bd)||String(a.descricao).localeCompare(String(b.descricao));});
 const selectedRows=[...state.contas.filter(c=>inSelectedMonth(c.vencimento)),...virtualSubs,...virtualLoans,...virtualParceladas],paid=selectedRows.filter(isPaid).length,pending=selectedRows.length-paid;
 return `<div class="toolbar"><div><div class="eyebrow">Planejamento mensal</div><h1>Contas</h1><p class="muted">${contaFilter==='all'?'Histórico completo de contas, com o mês atual sempre no topo.':`Lançamentos de ${monthName(selected)}`}</p></div><button class="btn btn-primary" data-action="new-conta">${icon('plus',17)} Lançar conta</button></div><div class="toolbar"><div class="toolbar-left"><button class="tab ${contaFilter==='all'?'active':''}" data-conta-filter="all">Todas (${state.contas.length+state.assinaturaCobrancas.length+state.parcelas.length+state.parceladaItens.length})</button><button class="tab ${contaFilter==='paid'?'active':''}" data-conta-filter="paid">Pagas (${paid})</button><button class="tab ${contaFilter==='pending'?'active':''}" data-conta-filter="pending">Pendentes (${pending})</button></div><input class="search" id="contaSearch" placeholder="Buscar conta, assinatura ou parcelada..."></div><section class="card section-card table-wrap"><table class="data-table"><thead><tr><th>Descrição</th><th>Origem</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(c=>{const st=contaStatus(c);return `<tr class="${!c.virtual?'clickable-row':''}" ${!c.virtual?`data-edit-conta="${c.id}" tabindex="0" role="button"`:''}><td data-label="Descrição"><strong>${esc(c.descricao)}</strong>${c.numero_parcela?`<br><small class="muted">Parcela ${c.numero_parcela}</small>`:''}${c.recorrente?`<br><small class="muted">${icon('repeat-2',11)} Conta recorrente</small>`:''}</td><td data-label="Origem"><span class="status ${c.origem==='Assinatura'?'gold':c.origem==='Empréstimo'?'blue':'soft'}">${esc(c.origem||'Conta')}</span></td><td data-label="Valor" class="money">${money(c.valor)}</td><td data-label="Vencimento">${dateBR(c.vencimento)}</td><td data-label="Status"><button class="status ${st.cls}" data-toggle-status="${c.virtual?'':c.id}" ${c.virtual?'disabled':''}>${st.label}</button></td></tr>`}).join(''):'<tr><td colspan="5" class="empty">Nenhuma conta encontrada.</td></tr>'}</tbody></table></section>`;
}

function calendario(){const d=calendarDate,first=new Date(d.getFullYear(),d.getMonth(),1),start=first.getDay(),days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(),cells=[];for(let i=0;i<start;i++)cells.push(`<div class="day muted-day"></div>`);for(let day=1;day<=days;day++){const ds=iso(new Date(d.getFullYear(),d.getMonth(),day));const hasB=state.contas.some(c=>c.vencimento===ds),hasL=state.parcelas.some(p=>p.data_vencimento===ds),hasP=state.parceladaItens.some(p=>p.data_vencimento===ds),hasS=state.assinaturas.some(s=>s.ativa&&Number(s.dia_vencimento)===day);cells.push(`<div class="day ${ds===today()?'today':''}"><strong>${day}</strong><div class="event-dots">${hasB?'<i class="event-dot bill"></i>':''}${hasL?'<i class="event-dot loan"></i>':''}${hasP?'<i class="event-dot parcelada"></i>':''}${hasS?'<i class="event-dot sub"></i>':''}</div></div>`)}return `<div class="toolbar"><div><div class="eyebrow">Planejamento</div><h1>Calendário</h1><p class="muted">Contas, empréstimos, parceladas e assinaturas em uma única visão.</p></div></div><div class="calendar-layout"><section class="card calendar-card"><div class="month-nav"><button class="icon-btn" data-month="-1">${icon('chevron-left',17)}</button><h2>${monthName(d)}</h2><button class="icon-btn" data-month="1">${icon('chevron-right',17)}</button></div><div class="calendar-grid">${['D','S','T','Q','Q','S','S'].map(x=>`<div class="weekday">${x}</div>`).join('')}${cells.join('')}</div><div class="legend" style="margin-top:14px"><span><i class="dot" style="background:#ed626c"></i>Contas</span><span><i class="dot" style="background:#5796d9"></i>Empréstimos</span><span><i class="dot" style="background:#8b68c7"></i>Parceladas</span><span><i class="dot" style="background:#e5a03a"></i>Assinaturas</span></div></section><section class="card section-card"><div class="section-head"><div><h2>Eventos do mês</h2><p>${monthName(d)}</p></div></div><div class="upcoming">${calendarEvents(d).length?calendarEvents(d).map(e=>`<div class="up-item"><div class="date-box"><strong>${new Date(e.date+'T12:00:00').getDate()}</strong><small>${new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</small></div><div class="up-copy"><strong>${esc(e.title)}</strong><small>${e.kind} • ${money(e.value)}</small></div></div>`).join(''):'<div class="empty">Nenhum evento no mês.</div>'}</div></section></div>`}
function calendarEvents(d){const y=d.getFullYear(),m=d.getMonth();const arr=[];state.contas.forEach(c=>{const x=new Date(c.vencimento+'T12:00:00');if(x.getFullYear()===y&&x.getMonth()===m)arr.push({date:c.vencimento,title:c.descricao,value:c.valor,kind:'Conta'})});state.parcelas.forEach(p=>{const x=new Date(p.data_vencimento+'T12:00:00');if(x.getFullYear()===y&&x.getMonth()===m)arr.push({date:p.data_vencimento,title:`Parcela ${p.numero_parcela}`,value:p.valor,kind:'Empréstimo'})});state.parceladaItens.forEach(p=>{const x=new Date(p.data_vencimento+'T12:00:00');const parent=state.parceladas.find(v=>v.id===p.conta_parcelada_id);if(x.getFullYear()===y&&x.getMonth()===m)arr.push({date:p.data_vencimento,title:`${parent?.descricao||'Conta parcelada'} • parcela ${p.numero_parcela}`,value:p.valor,kind:'Parcelada'})});state.assinaturas.filter(s=>s.ativa).forEach(s=>{const day=Math.min(Number(s.dia_vencimento)||1,new Date(y,m+1,0).getDate()),ds=iso(new Date(y,m,day));arr.push({date:ds,title:s.servico,value:s.valor,kind:'Assinatura'})});return arr.sort((a,b)=>a.date.localeCompare(b.date)).slice(0,25)}
function assinaturas(){const total=state.assinaturas.filter(s=>s.ativa).reduce((a,s)=>a+Number(s.valor||0),0);return `<div class="toolbar"><div><div class="eyebrow">Custos recorrentes</div><h1>Assinaturas</h1><p class="muted">Acompanhe as cobranças mensais e seus pagamentos.</p></div><button class="btn btn-primary" data-action="new-sub">${icon('plus',17)} Adicionar</button></div><div class="sub-total"><span class="muted">Total mensal ativo</span><strong>${money(total)}</strong><span class="muted">${state.assinaturas.filter(s=>s.ativa).length} assinatura(s) ativa(s)</span></div><div class="subscription-grid">${state.assinaturas.length?state.assinaturas.map(s=>{const charges=state.assinaturaCobrancas.filter(c=>c.assinatura_id===s.id).sort((a,b)=>String(b.competencia).localeCompare(String(a.competencia)));const paid=charges.filter(c=>c.status==='pago').length;return `<details class="card sub-card sub-compact"><summary class="sub-summary"><div class="service-logo">${SERVICE_LOGOS[s.icone_slug]?`<img src="${SERVICE_LOGOS[s.icone_slug]}" alt="${esc(s.servico)}" onerror="this.style.display='none'">`:icon('repeat-2',24)}</div><div class="sub-info"><h3>${esc(s.servico)}</h3><div class="muted">${money(s.valor)}/mês • vencimento dia ${s.dia_vencimento}</div><small class="muted">${charges.length} cobrança(s) • ${paid} paga(s)</small></div><span class="status ${s.ativa?'active':'inactive'}">${s.ativa?'Ativa':'Inativa'}</span><span class="sub-expand">Detalhes⌄</span></summary><div class="sub-expanded"><h4>Histórico de cobranças</h4>${charges.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th><th></th></tr></thead><tbody>${charges.map(c=>`<tr class="subscription-charge-row"><td data-label="Competência">${String(c.competencia).slice(5,7)}/${String(c.competencia).slice(0,4)}</td><td data-label="Vencimento">${dateBR(c.data_vencimento)}</td><td data-label="Valor">${money(c.valor)}</td><td data-label="Status"><span class="status ${c.status==='pago'?'active':c.status==='cancelado'?'inactive':'pending'}">${c.status==='pago'?'Pago':c.status==='cancelado'?'Cancelado':'Pendente'}</span></td><td data-label="Pagamento">${c.data_pagamento?dateBR(String(c.data_pagamento).slice(0,10)):'—'}</td><td data-label="Ação">${c.status==='pendente'?`<button class="btn btn-primary" data-pay-sub-charge="${c.id}">Marcar como pago</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Nenhuma cobrança registrada ainda.</p>'}<div class="sub-actions"><button class="btn btn-outline" data-edit-sub="${s.id}">${icon('pencil',14)} Editar assinatura</button><button class="btn btn-danger" data-delete-sub="${s.id}" title="Excluir assinatura">${icon('trash-2',14)} Excluir assinatura</button></div></div></details>`}).join(''):'<div class="card empty" style="grid-column:1/-1">Nenhuma assinatura cadastrada. Adicione seus serviços recorrentes para acompanhar o custo mensal.</div>'}</div>`}
function relatorios(){const now=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1),m=now.getMonth(),y=now.getFullYear();const monthMatch=d=>{const x=new Date(String(d)+'T12:00:00');return x.getMonth()===m&&x.getFullYear()===y};const bills=[...state.contas.filter(c=>monthMatch(c.vencimento)),...state.assinaturaCobrancas.filter(ch=>monthMatch(ch.data_vencimento)).map(ch=>{const sub=state.assinaturas.find(s=>s.id===ch.assinatura_id);return {id:`subcharge-${ch.id}`,descricao:sub?.servico||'Assinatura',valor:Number(ch.valor)||0,vencimento:ch.data_vencimento,status:String(ch.status||'pendente').toLowerCase(),origem:'Assinatura',virtual:true}}),...state.parceladaItens.filter(p=>monthMatch(p.data_vencimento)).map(p=>{const parent=state.parceladas.find(x=>x.id===p.conta_parcelada_id);return {id:`parcelada-${p.id}`,descricao:parent?.descricao||'Conta parcelada',valor:Number(p.valor)||0,vencimento:p.data_vencimento,status:String(p.status||'pendente').toLowerCase(),origem:'Parcelada',virtual:true}})];const total=bills.reduce((a,c)=>a+Number(c.valor||0),0),paid=bills.filter(isPaid).reduce((a,c)=>a+Number(c.valor||0),0),pending=total-paid,subs=state.assinaturas.filter(s=>s.ativa).reduce((a,s)=>a+Number(s.valor||0),0),loans=state.emprestimos.filter(l=>String(l.status).toLowerCase()==='ativo').reduce((a,l)=>a+Number(l.total||0),0);const groups={};bills.forEach(c=>{const cat=state.categorias.find(x=>String(x.id)===String(c.categoria_id));const key=cat?.nome||'Sem categoria';groups[key]=(groups[key]||0)+Number(c.valor||0)});const categoryRows=Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="metric-row"><span>${esc(k)}</span><div class="metric-bar"><i style="width:${Math.min(100,total? v/total*100:0)}%"></i></div><strong>${money(v)}</strong></div>`).join('')||'<div class="empty">Nenhum lançamento categorizado neste mês.</div>';return `<div class="toolbar"><div><div class="eyebrow">Análise</div><h1>Relatórios</h1><p class="muted">Resumo baseado somente nos seus registros.</p></div></div><div class="kpis"><article class="card kpi green"><small>Total lançado</small><h3>${money(total)}</h3><p>${bills.length} contas</p></article><article class="card kpi green"><small>Pago</small><h3>${money(paid)}</h3><p>${total?Math.round(paid/total*100):0}% do total</p></article><article class="card kpi red"><small>Pendente</small><h3>${money(pending)}</h3><p>${bills.filter(c=>!isPaid(c)).length} contas</p></article><article class="card kpi gold"><small>Assinaturas</small><h3>${money(subs)}</h3><p>custo mensal</p></article></div><div class="report-grid" style="margin-top:14px"><section class="card section-card"><div class="section-head"><div><h2>Análise por categoria</h2><p>${monthName(now)}</p></div></div><div class="metric-list">${categoryRows}</div></section><section class="card section-card"><div class="section-head"><div><h2>Compromissos</h2><p>${monthName(now)}</p></div></div><div class="metric-list"><div class="metric-row"><span>Assinaturas</span><div class="metric-bar"><i style="width:${Math.min(100,subs/Math.max(total,1)*100)}%"></i></div><strong>${money(subs)}/mês</strong></div><div class="metric-row"><span>Empréstimos ativos</span><div class="metric-bar"><i style="width:${Math.min(100,loans>0?60:0)}%"></i></div><strong>${money(loans)}</strong></div></div></section></div>`}

function moneyInput(name,value='',required=true,extra=''){
  const display=value===''?'':money(value);
  return `<input class="currency-input" name="${name}" type="text" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" value="${display}" ${required?'required':''} ${extra}>`;
}
function bindMoneyInputs(root=document){
  root.querySelectorAll('.currency-input').forEach(input=>{
    input.addEventListener('focus',()=>{const n=parseMoney(input.value);input.value=n?String(n.toFixed(2)).replace('.',','):''});
    input.addEventListener('input',()=>{input.value=input.value.replace(/[^0-9,.]/g,'')});
    input.addEventListener('blur',()=>{const n=parseMoney(input.value);input.value=n?money(n):'R$ 0,00'});
  });
}

function familyPage(){
 const members=[];
 return `<div class="toolbar"><div><div class="eyebrow">Família</div><h1>Área da Família</h1><p class="muted">Gerencie os membros e o acesso compartilhado.</p></div>${isAdmin()?'<button class="btn btn-primary" id="newFamilyMember" onclick="openFamilyMemberForm()">'+icon('user-plus',17)+' Inserir novo membro</button>':''}</div><section class="card section-card"><div class="section-head"><div><h2>${esc(activeFamily?.nome||'Minha família')}</h2><p>Seu perfil: <strong>${isAdmin()?'Administrador':'Membro'}</strong></p></div></div><div id="familyMembersList" class="upcoming"><div class="loading">Carregando membros...</div></div></section>`;
}
async function openFamilyMemberForm(){
 if(!isAdmin())return toast('Somente administradores podem inserir membros.');
 modal('Inserir novo membro',`<form id="memberForm" class="form-grid"><div class="field"><label>Nome</label><input name="nome" required></div><div class="field"><label>Sobrenome</label><input name="sobrenome" required></div><div class="field full"><label>E-mail</label><input name="email" type="email" required></div><div class="field"><label>Senha provisória</label><input name="senha" type="password" minlength=6 required></div><div class="field"><label>Tipo</label><select name="tipo" required><option value="Marido">Marido</option><option value="Esposa">Esposa</option><option value="Namorado">Namorado</option><option value="Namorada">Namorada</option><option value="Solteiro">Solteiro</option></select></div><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelForm">Cancelar</button><button class="btn btn-primary">Cadastrar membro</button></div></form>`);
 $('#cancelForm').onclick=closeModal;
 $('#memberForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const email=String(f.get('email')).trim().toLowerCase();const nome=`${String(f.get('nome')).trim()} ${String(f.get('sobrenome')).trim()}`;const tipo=String(f.get('tipo'));const senha=String(f.get('senha')||'');const {data:created,error:createError}=await sb.functions.invoke('create-family-member',{body:{email,nome,senha,tipo,familia_id:activeFamily.id}});if(createError){let detail=createError.message||'Não foi possível cadastrar o membro.';try{const body=createError.context&&await createError.context.json();if(body?.error)detail=body.error;}catch{}return toast(detail);}if(created?.error)return toast(created.error);closeModal();toast('Membro cadastrado com acesso à família.');await loadFamilies();await renderFamilyMembers();};
}
async function renderFamilyMembers(){
 const root=$('#familyMembersList');if(!root||!activeFamily)return;
 const q=await sb.from('familia_membros').select('usuario_id,papel,tipo').eq('familia_id',activeFamily.id);
 if(q.error){root.innerHTML=`<p class="muted">${esc(q.error.message)}</p>`;return}
 const ids=[...new Set((q.data||[]).map(x=>x.usuario_id))];let profiles=[];
 if(ids.length){
   const pr=await sb.from('profiles').select('id,nome,email,avatar_url,tipo').in('id',ids);
   profiles=pr.data||[];
   if(!profiles.length){
     const legacy=await sb.from('perfis').select('id,nome,email,avatar_url,tipo').in('id',ids);
     profiles=legacy.data||[];
   }else{
     // Alguns usuários antigos podem ter a foto apenas em public.perfis.
     const missingAvatar=profiles.filter(x=>!x.avatar_url).map(x=>x.id);
     if(missingAvatar.length){
       const legacy=await sb.from('perfis').select('id,avatar_url').in('id',missingAvatar);
       const legacyById=Object.fromEntries((legacy.data||[]).map(x=>[x.id,x.avatar_url]));
       profiles=profiles.map(x=>({...x,avatar_url:x.avatar_url||legacyById[x.id]||''}));
     }
   }
 }
 const byId=Object.fromEntries(profiles.map(x=>[x.id,x]));
 root.innerHTML=(q.data||[]).map(m=>{
   const pr=byId[m.usuario_id]||{};
   const admin=String(m.papel||'').toLowerCase()==='admin';
   const relationship=String(pr.tipo||m.tipo||(admin?'Esposa':'')).trim();
   const roleLabel=admin?'Adm':'Membro';
   const canRemove=isAdmin()&&m.usuario_id!==user.id;
   const avatar=pr.avatar_url?`<img src="${esc(pr.avatar_url)}" alt="Foto de ${esc(pr.nome||'usuário')}" class="family-avatar">`:icon('user',16);
   return `<div class="up-item"><div class="date-box family-avatar-box">${avatar}</div><div class="up-copy"><strong>${esc(pr.nome||'Nome não informado')}</strong><small>${esc(relationship)}</small></div><span class="status soft">${roleLabel}</span>${canRemove?`<button class="btn btn-danger btn-icon" title="Remover membro" data-remove-member="${m.usuario_id}">${icon('trash-2',15)}</button>`:''}</div>`
 }).join('')||'<div class="empty">Nenhum membro cadastrado.</div>';refreshIcons();
 document.querySelectorAll('[data-remove-member]').forEach(b=>b.onclick=()=>removeFamilyMember(b.dataset.removeMember));
}

function perfilPage(){const tipoAtual=String(profile?.tipo||activeFamily?.tipo||'').trim();return `<div class="toolbar"><div><div class="eyebrow">Minha conta</div><h1>Perfil</h1><p class="muted">Atualize seus dados, sua família, sua identificação e sua senha.</p></div></div><div class="profile-grid"><section class="card profile-card"><div class="profile-big">${avatarUrl()?`<img src="${esc(avatarUrl())}" alt="Foto do perfil">`:icon('user',42)}</div><h2 style="font:800 18px Manrope;margin:0">${esc(name())}</h2><p class="muted">${esc(user?.email||profile?.email||'')}</p><label class="btn btn-soft" style="margin-top:10px">${icon('camera',16)} Alterar foto<input type="file" id="avatarInput" accept="image/*" hidden></label><p class="muted" style="margin-top:12px"></p></section><section class="card profile-form"><form id="profileForm" class="form-grid"><div class="field"><label>Nome completo *</label><input name="nome" value="${esc(profile?.nome||name())}" required maxlength=120></div><div class="field"><label>E-mail</label><input value="${esc(user?.email||profile?.email||'')}" disabled></div><div class="field"><label>Minha identificação *</label><input name="tipo" value="${esc(tipoAtual)}" placeholder="Ex.: Marido, Poderoso chefão, Eu que mando na casa" required maxlength="80"></div><div class="field full"><label>Nome da família *</label><input name="familia" value="${esc(activeFamily?.nome||'Minha Família')}" required maxlength=80></div><div class="field"><label>Nova senha</label><input name="novaSenha" type="password" minlength=6 autocomplete="new-password" placeholder="Deixe em branco para manter"></div><div class="field"><label>Confirmar nova senha</label><input name="confirmarSenha" type="password" minlength=6 autocomplete="new-password" placeholder="Repita a nova senha"></div><div class="form-note full">O nome da família pode ser alterado pelo administrador. Sua identificação pode ser atualizada a qualquer momento.</div><div class="form-actions profile-actions"><button type="button" class="btn btn-outline" id="enablePushNotifications">${icon('bell',15)} Ativar notificações</button><button type="button" class="btn btn-danger" id="deleteMyAccount">${icon('trash-2',15)} Apagar minha conta</button><button class="btn btn-primary">Salvar perfil</button></div></form></section></div>`}
function modal(title,body){$('#modalRoot').innerHTML=`<div class="overlay" id="overlay"><div class="modal"><div class="modal-head"><h2>${title}</h2><button class="close" id="closeModal">${icon('x',18)}</button></div>${body}</div></div>`;refreshIcons();$('#closeModal').onclick=closeModal;$('#overlay').addEventListener('click',e=>{if(e.target.id==='overlay')closeModal()})}
function closeModal(){$('#modalRoot').innerHTML=''}
function parseMoney(v){const raw=String(v??'').trim().replace(/R\$\s?/gi,'').replace(/\s/g,'');if(!raw)return 0;if(raw.includes(','))return Number(raw.replace(/\./g,'').replace(',','.'))||0;return Number(raw)||0}
function categoryNameFromRecord(c){
 const raw=c?.categoria_nome||c?.categoria||c?.categoriaName||'';
 return String(raw).trim();
}
function categoryOptionValue(c){
 const id=c?.categoria_id??c?.category_id??'';
 return String(id);
}
async function resolveContaCategoryId(rawValue){
 const value=String(rawValue||'').trim();
 if(!value)return null;
 if(!value.startsWith('__name__:'))return value;
 const nome=value.slice('__name__:'.length).trim();
 const normalized=nome.toLocaleLowerCase('pt-BR');
 let existente=state.categorias.find(x=>String(x.nome||'').trim().toLocaleLowerCase('pt-BR')===normalized);
 if(existente?.id)return existente.id;
 if(!activeFamily?.id)throw new Error('Nenhuma família ativa foi encontrada.');
 const q=await sb.from('categorias').select('*').eq('familia_id',activeFamily.id).eq('ativo',true);
 if(q.error)throw new Error(`Não foi possível consultar categorias: ${q.error.message}`);
 existente=(q.data||[]).find(x=>String(x.nome||'').trim().toLocaleLowerCase('pt-BR')===normalized);
 if(existente?.id){
   state.categorias=[...state.categorias.filter(x=>x.id!==existente.id),existente];
   return existente.id;
 }
 const created=await sb.from('categorias').insert({
   usuario_id:user.id,familia_id:activeFamily.id,nome,tipo:'conta',ativo:true
 }).select('*').single();
 if(created.error)throw new Error(`Não foi possível gravar a categoria "${nome}": ${created.error.message}`);
 state.categorias.push(created.data);
 return created.data.id;
}function contaFormMarkup(c = null) {
  const edit = !!c;
  const status = isPaid(c || {}) ? 'Pago' : 'Pendente';

  // Categorias permitidas para contas
  // Filtra categorias válidas e remove duplicidades por nome.
  // O banco pode conter registros repetidos criados por versões anteriores.
  const uniqueCategories = new Map();
  state.categorias
    .filter(x => {
      const tipo = String(x.tipo || 'conta').trim().toLowerCase();
      return (tipo === 'conta' || tipo === 'ambos') && String(x.nome || '').trim();
    })
    .forEach(x => {
      const key = String(x.nome || '').trim().toLocaleLowerCase('pt-BR');
      if (!uniqueCategories.has(key)) uniqueCategories.set(key, x);
    });

  const cats = [...uniqueCategories.values()].sort((a, b) =>
    String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
  );

  const currentId = categoryOptionValue(c);
  const currentName = categoryNameFromRecord(c);

  const selectedByName = cats.find(x =>
    String(x.nome || '')
      .trim()
      .toLocaleLowerCase('pt-BR') ===
    currentName.toLocaleLowerCase('pt-BR')
  );

  const selectedId =
    currentId || selectedByName?.id || '';

  // Categorias padrão caso não existam registros no Supabase
  const defaultCategories = [
    'Alimentação',
    'Casa',
    'Educação',
    'Investimento',
    'Lazer',
    'Outros',
    'Saúde',
    'Transporte'
  ];

  const fallbackCategories =
    typeof CATEGORY_NAMES !== 'undefined' &&
    Array.isArray(CATEGORY_NAMES) &&
    CATEGORY_NAMES.length
      ? CATEGORY_NAMES
      : defaultCategories;

  const options = cats.length
    ? cats
        .map(x => `
          <option
            value="${esc(x.id)}"
            ${
              String(selectedId) === String(x.id)
                ? 'selected'
                : ''
            }
          >
            ${esc(x.nome)}
          </option>
        `)
        .join('')
    : fallbackCategories
        .sort((a, b) =>
          String(a).localeCompare(
            String(b),
            'pt-BR'
          )
        )
        .map(nome => `
          <option
            value="__name__:${esc(nome)}"
            ${
              currentName.toLocaleLowerCase('pt-BR') ===
              String(nome).toLocaleLowerCase('pt-BR')
                ? 'selected'
                : ''
            }
          >
            ${esc(nome)}
          </option>
        `)
        .join('');

  return `
    <form id="contaForm" class="form-grid">

      <div class="field">
        <label>Descrição</label>
        <input
          name="descricao"
          placeholder="Ex.: Energia, internet, aluguel"
          value="${esc(c?.descricao || '')}"
          required
        >
      </div>

      <div class="field">
        <label>Categoria</label>

        <select name="categoria_id">
          <option value="">
            Sem categoria
          </option>

          ${options}
        </select>
      </div>

      <div class="field">
        <label>Valor</label>
        ${moneyInput('valor', c?.valor ?? '')}
      </div>

      <div class="field">
        <label>Vencimento</label>

        <input
          name="data_vencimento"
          type="date"
          value="${c?.vencimento || today()}"
          required
        >
      </div>

      <div class="field">
        <label>Conta recorrente</label>

        <label class="check-field">
          <input
            name="recorrente"
            type="checkbox"
            value="true"
            ${c?.recorrente ? 'checked' : ''}
          >

          <span>
            Marcar como conta recorrente
          </span>
        </label>
      </div>

      <div class="field">
        <label>Status</label>

        <select name="status">
          <option
            ${status === 'Pendente' ? 'selected' : ''}
          >
            Pendente
          </option>

          <option
            ${status === 'Pago' ? 'selected' : ''}
          >
            Pago
          </option>
        </select>
      </div>

      <div class="field full">
        <label>Observação</label>

        <textarea
          name="observacao"
          placeholder="Opcional"
        >${esc(c?.observacao || '')}</textarea>
      </div>

      <div class="form-actions">

        <button
          type="button"
          class="btn btn-outline"
          id="cancelForm"
        >
          Cancelar
        </button>

        ${
          edit
            ? `
              <button
                type="button"
                class="btn btn-danger"
                id="deleteContaForm"
              >
                ${icon('trash-2', 15)}
                Excluir
              </button>
            `
            : ''
        }

        <button
          class="btn btn-primary"
          type="submit"
        >
          ${
            edit
              ? 'Salvar alterações'
              : 'Lançar conta'
          }
        </button>

      </div>

    </form>
  `;
}
function openContaForm(c=null){
 const edit=!!c;
 modal(edit?'Editar conta':'Lançar nova conta',contaFormMarkup(c));
 bindMoneyInputs($('#contaForm'));
 $('#cancelForm').onclick=closeModal;
 $('#deleteContaForm')?.addEventListener('click',async e=>{
  e.preventDefault();
  const btn=e.currentTarget;
  if(btn.disabled)return;
  const submit=$('#contaForm button[type=submit]');
  btn.disabled=true;
  if(submit)submit.disabled=true;
  try{await deleteRow('contas',c.id,'Conta excluída.')}finally{
    if(document.body.contains(btn))btn.disabled=false;
    if(submit&&document.body.contains(submit))submit.disabled=false;
  }
 });
 $('#contaForm').onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(form.dataset.submitting==='1')return;
  const f=new FormData(form),status=f.get('status'),valor=parseMoney(f.get('valor'));
  if(valor<=0)return toast('Informe um valor maior que zero.');
  form.dataset.submitting='1';
  const submitBtn=form.querySelector('button[type=submit]');
  const deleteBtn=$('#deleteContaForm');
  if(submitBtn){submitBtn.disabled=true;submitBtn.textContent=edit?'Salvando alterações...':'Lançando conta...';}
  if(deleteBtn)deleteBtn.disabled=true;
  try{
   let categoriaId=null;
   try{categoriaId=await resolveContaCategoryId(f.get('categoria_id'));}
   catch(err){console.error(err);return toast(err.message||'Não foi possível salvar a categoria.');}
   const basePayload={descricao:String(f.get('descricao')||'').trim(),categoria_id:categoriaId,valor,data_vencimento:f.get('data_vencimento'),status,valor_pago:status==='Pago'?valor:0,data_pagamento:status==='Pago'?today():null,observacao:f.get('observacao')||null};
  const recorrente=f.get('recorrente')==='true';
  let payload={...basePayload,recorrente};
  let result=edit?await sb.from('contas').update(payload).eq('id',c.id).eq('familia_id',activeFamily?.id):await sb.from('contas').insert({...payload,usuario_id:user.id,familia_id:activeFamily?.id});
  if(result.error&&(result.error.code==='PGRST204'||result.error.code==='42703'||/recorrente/i.test(result.error.message||''))){
   result=edit?await sb.from('contas').update(basePayload).eq('id',c.id).eq('familia_id',activeFamily?.id):await sb.from('contas').insert({...basePayload,usuario_id:user.id,familia_id:activeFamily?.id});
   if(!result.error&&recorrente)toast('Conta salva, mas o campo recorrente ainda não existe no banco. Execute a migração SQL da revisão.');
  }
  if(result.error&&(result.error.code==='23514'||result.error.code==='22P02')){
   const alt={...basePayload,status:status==='Pago'?'pago':'pendente'};
   result=edit?await sb.from('contas').update({...alt,recorrente}).eq('id',c.id).eq('familia_id',activeFamily?.id):await sb.from('contas').insert({...alt,recorrente,usuario_id:user.id,familia_id:activeFamily?.id});
   if(result.error&&(result.error.code==='PGRST204'||result.error.code==='42703'||/recorrente/i.test(result.error.message||''))){
    result=edit?await sb.from('contas').update(alt).eq('id',c.id).eq('familia_id',activeFamily?.id):await sb.from('contas').insert({...alt,usuario_id:user.id,familia_id:activeFamily?.id})
   }
  }
   if(result.error)return toast(`Não foi possível ${edit?'atualizar':'gravar'} a conta: ${result.error.message}`);
   closeModal();await loadData();render();if(!edit)showAlicePopup('new');toast(edit?'Conta atualizada com sucesso.':'Conta gravada com sucesso.');
  }finally{
   form.dataset.submitting='0';
  }
 }
}
function openRecorrenteForm(r=null){modal(r?'Editar conta recorrente':'Nova conta recorrente',recurringForm(r));bindMoneyInputs($('#recorrenteForm'));$('#cancelForm').onclick=closeModal;$('#deleteRecorrente')?.addEventListener('click',async()=>deleteRow('contas_recorrentes',r.id,'Conta recorrente excluída.'));$('#recorrenteForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),valor=parseMoney(f.get('valor')),dia=Number(f.get('dia_vencimento'));if(valor<=0)return toast('Informe um valor maior que zero.');if(dia<1||dia>31)return toast('Informe um dia entre 1 e 31.');const payload={usuario_id:user.id,familia_id:activeFamily?.id,descricao:String(f.get('descricao')||'').trim(),tipo:String(f.get('tipo')||'Outros'),valor,dia_vencimento:dia,categoria_id:f.get('categoria_id')||null,data_inicio:f.get('data_inicio'),data_fim:f.get('data_fim')||null,ativa:f.get('ativa')==='true',atualizado_em:new Date().toISOString()};const q=r?await sb.from('contas_recorrentes').update(payload).eq('id',r.id).eq('familia_id',activeFamily?.id):await sb.from('contas_recorrentes').insert(payload);if(q.error)return toast(`Não foi possível salvar a recorrência: ${q.error.message}`);closeModal();await loadData();render();toast(r?'Conta recorrente atualizada.':'Conta recorrente criada.')}}
function newRecorrente(){openRecorrenteForm()}
function editRecorrente(id){const r=state.recorrentes.find(x=>x.id===id);if(r)openRecorrenteForm(r)}
function openParceladaForm(p=null){modal(p?'Editar conta parcelada':'Nova conta parcelada',parceladaForm(p));bindMoneyInputs($('#parceladaForm'));$('#cancelForm').onclick=closeModal;const total=$('#parceladaForm [name="valor_total"]'),qty=$('#parceladaForm [name="quantidade_parcelas"]'),inst=$('#parceladaForm [name="valor_parcela"]');const sync=()=>{const q=Number(qty.value)||0,t=parseMoney(total.value),v=parseMoney(inst.value);if(q&&t&&!v)inst.value=money(t/q);else if(q&&v&&!t)total.value=money(q*v)};[total,qty,inst].forEach(x=>x?.addEventListener('input',sync));$('#deleteParcelada')?.addEventListener('click',async()=>{if(!confirm('Excluir esta conta parcelada e todas as suas parcelas?'))return;const d=await sb.from('contas_parceladas').delete().eq('id',p.id).eq('familia_id',activeFamily?.id);if(d.error)return toast(d.error.message);closeModal();await loadData();render();toast('Conta parcelada excluída.')});$('#parceladaForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),descricao=String(f.get('descricao')||'').trim(),q=Number(f.get('quantidade_parcelas')),t=parseMoney(f.get('valor_total')),vp=parseMoney(f.get('valor_parcela'));if(!descricao||q<1||t<=0||vp<=0)return toast('Informe descrição, valor e quantidade de parcelas.');const payload={usuario_id:user.id,familia_id:activeFamily?.id,categoria_id:f.get('categoria_id')||null,descricao,valor_total:t,quantidade_parcelas:q,valor_parcela:vp,primeira_vencimento:f.get('primeira_vencimento'),status:String(f.get('status')||'Ativo'),observacao:f.get('observacao')||null,atualizado_em:new Date().toISOString()};let qdb=p?await sb.from('contas_parceladas').update(payload).eq('id',p.id).eq('familia_id',activeFamily?.id).select('id').single():await sb.from('contas_parceladas').insert(payload).select('id').single();if(qdb.error)return toast(`Não foi possível salvar: ${qdb.error.message}`);const id=qdb.data.id;const first=new Date(payload.primeira_vencimento+'T12:00:00');const existing=p?state.parceladaItens.filter(x=>x.conta_parcelada_id===id):[];const items=Array.from({length:q},(_,i)=>{const d=new Date(first.getFullYear(),first.getMonth()+i,first.getDate()),prev=existing.find(x=>Number(x.numero_parcela)===i+1);return{conta_parcelada_id:id,usuario_id:user.id,familia_id:activeFamily?.id,numero_parcela:i+1,data_vencimento:iso(d),valor:vp,status:prev?.status||'pendente',valor_pago:Number(prev?.valor_pago)||0,data_pagamento:prev?.data_pagamento||null,observacao:prev?.observacao||null}});if(p){const del=await sb.from('contas_parceladas_itens').delete().eq('conta_parcelada_id',id).eq('familia_id',activeFamily?.id);if(del.error)return toast(`Conta salva, mas não foi possível recriar as parcelas: ${del.error.message}`)}const ins=await sb.from('contas_parceladas_itens').insert(items);if(ins.error)return toast(`Conta salva, mas as parcelas não foram criadas: ${ins.error.message}`);closeModal();await loadData();render();toast(p?'Conta parcelada atualizada.':'Conta parcelada criada.')}}
function newParcelada(){openParceladaForm()}
function editParcelada(id){const p=state.parceladas.find(x=>x.id===id);if(p)openParceladaForm(p)}
async function toggleParceladaStatus(id){const item=state.parceladaItens.find(x=>x.id===id);if(!item)return;const paid=parceladaIsPaid(item),patch=paid?{status:'pendente',valor_pago:0,data_pagamento:null,atualizado_em:new Date().toISOString()}:{status:'pago',valor_pago:Number(item.valor)||0,data_pagamento:new Date().toISOString(),atualizado_em:new Date().toISOString()};const q=await sb.from('contas_parceladas_itens').update(patch).eq('id',id).eq('familia_id',activeFamily?.id);if(q.error)return toast(q.error.message);await loadData();const parent=state.parceladas.find(x=>x.id===item.conta_parcelada_id);if(parent){const items=state.parceladaItens.filter(x=>x.conta_parcelada_id===parent.id);const allPaid=items.length>=Number(parent.quantidade_parcelas||0)&&items.every(parceladaIsPaid);const nextStatus=allPaid?'Concluído':'Ativo';if(String(parent.status||'')!==nextStatus){await sb.from('contas_parceladas').update({status:nextStatus,atualizado_em:new Date().toISOString()}).eq('id',parent.id).eq('familia_id',activeFamily?.id);await loadData();}}render();if(!paid)showAlicePopup('paid');toast(paid?'Parcela voltou para pendente.':'Parcela marcada como paga.')}
function newConta(){openContaForm()}
function editConta(id){const c=state.contas.find(x=>x.id===id);if(c)openContaForm(c)}
function newLoan(){modal('Novo empréstimo',`<form id="loanForm" class="form-grid"><div class="field"><label>Descrição</label><input name="descricao" required></div><div class="field"><label>Credor</label><input name="credor" required></div><div class="field"><label>Valor contratado</label>${moneyInput('valor_contratado')}</div><div class="field"><label>Quantidade de parcelas</label><input name="quantidade_parcelas" type="number" inputmode="numeric" min="1" step="1" required></div><div class="field"><label>Valor da parcela</label>${moneyInput('valor_parcela')}</div><div class="field"><label>Valor total</label>${moneyInput('valor_total','',true,'readonly aria-readonly="true"')}</div><div class="field"><label>Primeiro vencimento</label><input name="primeiro_vencimento" type="date" value="${today()}" required></div><div class="field"><label>Status</label><select name="status"><option>Ativo</option><option>Quitado</option><option>Cancelado</option></select></div><div class="field full"><label>Observação</label><textarea name="observacao"></textarea></div><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelForm">Cancelar</button><button class="btn btn-primary">Salvar empréstimo</button></div></form>`);bindMoneyInputs($('#loanForm'));const qty=$('#loanForm [name="quantidade_parcelas"]'),inst=$('#loanForm [name="valor_parcela"]'),total=$('#loanForm [name="valor_total"]');const updateTotal=()=>{const q=Number(qty.value)||0,v=parseMoney(inst.value);total.value=q&&v?money(q*v):'R$ 0,00'};qty.addEventListener('input',updateTotal);inst.addEventListener('input',updateTotal);inst.addEventListener('blur',updateTotal);$('#cancelForm').onclick=closeModal;$('#loanForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),q=Number(f.get('quantidade_parcelas')),vp=parseMoney(f.get('valor_parcela')),vc=parseMoney(f.get('valor_contratado')),vt=q*vp;if(!q||q<1)return toast('Informe a quantidade de parcelas.');if(vp<=0)return toast('Informe o valor da parcela.');if(vc<0)return toast('Valor contratado inválido.');const p={usuario_id:user.id,familia_id:activeFamily?.id,descricao:String(f.get('descricao')).trim(),credor:String(f.get('credor')).trim(),valor_contratado:vc,valor_total:vt,quantidade_parcelas:q,valor_parcela:vp,primeiro_vencimento:f.get('primeiro_vencimento'),status:f.get('status'),observacao:f.get('observacao')||null};let loanResult=await sb.from('emprestimos').insert(p).select('id').single();if(loanResult.error&&loanResult.error.code==='23514'){loanResult=await sb.from('emprestimos').insert({...p,status:String(p.status).toLowerCase()}).select('id').single()}if(loanResult.error)return toast(`Não foi possível gravar o empréstimo: ${loanResult.error.message}`);const data=loanResult.data;const first=new Date(p.primeiro_vencimento+'T12:00:00');const ps=Array.from({length:q},(_,i)=>{const d=new Date(first.getFullYear(),first.getMonth()+i,first.getDate());return{emprestimo_id:data.id,usuario_id:user.id,familia_id:activeFamily?.id,numero_parcela:i+1,data_vencimento:iso(d),valor:vp,status:'Pendente',valor_pago:0,data_pagamento:null,observacao:null}});let parcelResult=await sb.from('emprestimo_parcelas').insert(ps);if(parcelResult.error&&parcelResult.error.code==='23514')parcelResult=await sb.from('emprestimo_parcelas').insert(ps.map(x=>({...x,usuario_id:user.id,familia_id:activeFamily?.id,status:'pendente'})));if(parcelResult.error){await sb.from('emprestimos').delete().eq('id',data.id).eq('usuario_id',user.id);return toast(`As parcelas não foram gravadas. O empréstimo foi revertido: ${parcelResult.error.message}`)}closeModal();await loadData();render();toast('Empréstimo e parcelas gravados com sucesso.')}}
function metasPage(){return `<div class="toolbar"><div><div class="eyebrow">Planejamento pessoal</div><h1>Metas</h1><p class="muted">Organize seus objetivos em etapas e acompanhe seu progresso.</p></div><button class="btn btn-primary" data-action="new-meta">${icon('plus',17)} Criar nova meta</button></div><div class="subscription-grid">${state.metas.length?state.metas.map(m=>{const items=state.metaItens.filter(i=>i.meta_id===m.id);const done=items.filter(i=>i.concluida).length;return `<details class="card sub-card sub-compact"><summary class="sub-summary"><div class="service-logo">${icon('target',23)}</div><div class="sub-info"><h3>${esc(m.titulo)}</h3><small class="muted">${done} de ${items.length} etapas concluídas</small></div><span class="status ${items.length&&done===items.length?'active':'pending'}">${items.length?Math.round(done/items.length*100):0}%</span><span class="sub-expand">Detalhes⌄</span></summary><div class="sub-expanded"><div class="goal-items">${items.map(i=>`<label class="goal-item"><input type="checkbox" data-goal-item="${i.id}" ${i.concluida?'checked':''}><span class="${i.concluida?'goal-done':''}">${esc(i.descricao)}</span></label>`).join('')||'<p class="muted">Nenhuma etapa cadastrada.</p>'}</div><div class="sub-actions"><button class="btn btn-danger" data-delete-meta="${m.id}">${icon('trash-2',14)} Excluir meta</button></div></div></details>`}).join(''):'<div class="card empty" style="grid-column:1/-1">Nenhuma meta cadastrada. Crie uma meta e divida-a em pequenas etapas.</div>'}</div>`}
function newMeta(){modal('Criar nova meta',`<form id="metaForm" class="form-grid"><div class="field full"><label>Nome da meta</label><input name="titulo" placeholder="Ex.: Operadora de máquinas, Casa dos Sonhos" required maxlength="120"></div><div class="field full"><label>Etapas da meta</label><div id="metaSteps"><div class="meta-step-input"><input name="etapa" placeholder="Ex.: Comprar tijolos" required maxlength="180"><button type="button" class="btn btn-outline" data-remove-step aria-label="Remover etapa">×</button></div></div><button type="button" class="btn btn-outline" id="addMetaStep">+ Adicionar etapa</button></div><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelForm">Cancelar</button><button class="btn btn-primary">Salvar meta</button></div></form>`);$('#cancelForm').onclick=closeModal;$('#addMetaStep').onclick=()=>$('#metaSteps').insertAdjacentHTML('beforeend',`<div class="meta-step-input"><input name="etapa" placeholder="Descreva esta etapa" required maxlength="180"><button type="button" class="btn btn-outline" data-remove-step aria-label="Remover etapa">×</button></div>`);$('#metaSteps').onclick=e=>{const b=e.target.closest('[data-remove-step]');if(b&&$('#metaSteps').children.length>1)b.parentElement.remove()};$('#metaForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),titulo=String(f.get('titulo')||'').trim(),etapas=f.getAll('etapa').map(x=>String(x).trim()).filter(Boolean);if(!titulo||!etapas.length)return toast('Informe o nome da meta e pelo menos uma etapa.');const {data,error}=await sb.from('metas').insert({usuario_id:user.id,familia_id:activeFamily.id,titulo}).select().single();if(error)return toast('Erro ao criar meta: '+error.message);const rows=etapas.map(descricao=>({meta_id:data.id,usuario_id:user.id,familia_id:activeFamily.id,descricao,concluida:false}));const res=await sb.from('meta_itens').insert(rows);if(res.error){await sb.from('metas').delete().eq('id',data.id).eq('usuario_id',user.id);return toast('Erro ao salvar etapas: '+res.error.message)}closeModal();await loadData();render();toast('Meta criada com sucesso.')};}
async function toggleMetaItem(id,checked){const {error}=await sb.from('meta_itens').update({concluida:checked,atualizado_em:new Date().toISOString()}).eq('id',id).eq('usuario_id',user.id);if(error){toast('Não foi possível atualizar a etapa: '+error.message);return}await loadData();renderPage()}
async function deleteMeta(id){if(!confirm('Excluir esta meta e todas as as suas etapas?'))return;const {error}=await sb.from('metas').delete().eq('id',id).eq('usuario_id',user.id);if(error)return toast('Não foi possível excluir a meta: '+error.message);await loadData();render();toast('Meta excluída.')}
function newSub(){modal('Adicionar assinatura',`<form id="subForm" class="form-grid"><div class="field full"><label>Serviço</label><div class="service-picker">${SERVICES.map(([n,s])=>`<button type="button" class="service-choice" data-service="${s}"><img src="${SERVICE_LOGOS[s]}" alt="${n}"><span>${n}</span></button>`).join('')}</div><input type="hidden" name="icone_slug"></div><div class="field"><label>Nome do serviço</label><input name="servico" id="serviceName" placeholder="Ex.: Netflix, Academia, Internet" required></div><div class="field"><label>Valor mensal</label>${moneyInput('valor')}</div><div class="field"><label>Dia de vencimento</label><input name="dia_vencimento" type="number" inputmode="numeric" min="1" max="31" required></div><div class="field"><label>Status</label><select name="ativa"><option value="true">Ativa</option><option value="false">Inativa</option></select></div><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelForm">Cancelar</button><button class="btn btn-primary">Salvar assinatura</button></div></form>`);bindMoneyInputs($('#subForm'));$('#cancelForm').onclick=closeModal;document.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-service]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');const slug=b.dataset.service,n=SERVICES.find(x=>x[1]===slug)?.[0]||'';$('#serviceName').value=n;$('#subForm [name=icone_slug]').value=slug});$('#subForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(state.assinaturas.length>=10)return toast('Limite de 10 assinaturas atingido.');const servico=String(f.get('servico')||'').trim(),valor=parseMoney(f.get('valor')),dia=Number(f.get('dia_vencimento'));if(!servico)return toast('Informe o nome do serviço.');if(valor<0)return toast('Valor inválido.');if(dia<1||dia>31)return toast('Informe um dia entre 1 e 31.');const p={usuario_id:user.id,familia_id:activeFamily?.id,servico,icone_slug:f.get('icone_slug')||'custom',valor,dia_vencimento:dia,ativa:f.get('ativa')==='true'};const {error}=await sb.from('assinaturas').insert(p);if(error)return toast(`Não foi possível gravar a assinatura: ${error.message}`);closeModal();await loadData();render();toast('Assinatura gravada com sucesso.')}}
function editSub(id){const s=state.assinaturas.find(x=>x.id===id);if(!s)return;modal('Editar assinatura',`<form id="subEditForm" class="form-grid"><div class="field full"><label>Nome do serviço</label><input name="servico" required value="${esc(s.servico)}"></div><div class="field"><label>Valor mensal</label>${moneyInput('valor',String(s.valor||0))}</div><div class="field"><label>Dia de vencimento</label><input name="dia_vencimento" type="number" min="1" max="31" required value="${s.dia_vencimento}"></div><div class="field"><label>Status</label><select name="ativa"><option value="true" ${s.ativa?'selected':''}>Ativa</option><option value="false" ${!s.ativa?'selected':''}>Inativa</option></select></div><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelForm">Cancelar</button><button class="btn btn-primary">Salvar alterações</button></div></form>`);bindMoneyInputs($('#subEditForm'));$('#cancelForm').onclick=closeModal;$('#subEditForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),servico=String(f.get('servico')||'').trim(),valor=parseMoney(f.get('valor')),dia=Number(f.get('dia_vencimento'));if(!servico||valor<0||dia<1||dia>31)return toast('Confira o nome, valor e dia de vencimento.');const {data,error}=await sb.from('assinaturas').update({servico,valor,dia_vencimento:dia,ativa:f.get('ativa')==='true'}).eq('id',id).eq('usuario_id',user.id).select('id');if(error)return toast(`Não foi possível atualizar: ${error.message}`);if(!data?.length)return toast('Nenhuma assinatura foi atualizada.');closeModal();await loadData();render();toast('Assinatura atualizada.')}}
function isDesktopViewport(){return window.matchMedia('(min-width: 761px)').matches}
function syncSidebarState(){const desktop=isDesktopViewport();const collapsed=desktop&&localStorage.getItem('financas-sidebar-collapsed')==='1';document.body.classList.toggle('sidebar-collapsed',collapsed);const b=$('#sidebarCollapse');if(b){b.innerHTML=icon(collapsed?'panel-left-open':'panel-left-close',18);b.title=collapsed?'Expandir menu':'Recolher menu';b.setAttribute('aria-label',collapsed?'Expandir menu':'Recolher menu');refreshIcons();}if(!desktop)closeMobileSidebar()}
function toggleSidebarCollapse(){if(!isDesktopViewport())return;const collapsed=!document.body.classList.contains('sidebar-collapsed');localStorage.setItem('financas-sidebar-collapsed',collapsed?'1':'0');syncSidebarState();}
function closeMobileSidebar(){const s=$('#sidebar');s?.classList.remove('open');$('#mobileOverlay')?.classList.remove('show');$('#mobileOverlay')?.setAttribute('aria-hidden','true')}
function closeNotificationsOnOutside(e){const wrap=$('.notification-wrap');const panel=$('#notificationsPanel');if(!wrap||!panel||panel.hidden)return;if(!wrap.contains(e.target)){panel.hidden=true;$('#notificationBell')?.setAttribute('aria-expanded','false');}}
function bindGlobal(){syncSidebarState();if(!window.__financasSidebarViewportBound){const mq=window.matchMedia('(min-width: 761px)');const sync=()=>syncSidebarState();if(mq.addEventListener)mq.addEventListener('change',sync);else mq.addListener(sync);window.__financasSidebarViewportBound=true;}$('#notificationBell')?.addEventListener('click',e=>{e.stopPropagation();toggleNotifications()});$('#notificationsPanel')?.addEventListener('click',e=>e.stopPropagation());if(!window.__financasNotificationsOutsideBound){document.addEventListener('click',closeNotificationsOnOutside,true);window.__financasNotificationsOutsideBound=true;}$('#markNotificationsRead')?.addEventListener('click',markNotificationsRead);document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{page=b.dataset.nav;closeMobileSidebar();render();if(page==='familia')setTimeout(renderFamilyMembers,0)});$('#mobileMenu')?.addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#mobileOverlay')?.classList.toggle('show',open);$('#mobileOverlay')?.setAttribute('aria-hidden',open?'false':'true')});$('#mobileOverlay')?.addEventListener('click',closeMobileSidebar);$('#sidebarCollapse')?.addEventListener('click',toggleSidebarCollapse);$('#logout')?.addEventListener('click',async()=>{await sb.auth.signOut()});document.querySelectorAll('[data-action="new-conta"]').forEach(b=>b.onclick=newConta);$('#newFamilyMember')?.addEventListener('click',openFamilyMemberForm)}
function bindPage(){document.querySelectorAll('[data-dashboard-route]').forEach(el=>{const go=()=>{const route=el.dataset.dashboardRoute;if(route==='subscriptions'){page='assinaturas';contaFilter='all';}else{page='contas';contaFilter=route;}render();};el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});document.querySelectorAll('[data-action="new-conta"]').forEach(b=>b.onclick=newConta);document.querySelectorAll('[data-action="new-loan"]').forEach(b=>b.onclick=newLoan);document.querySelectorAll('[data-action="new-sub"]').forEach(b=>b.onclick=newSub);document.querySelectorAll('[data-action="new-recorrente"]').forEach(b=>b.onclick=newRecorrente);document.querySelectorAll('[data-action="new-parcelada"]').forEach(b=>b.onclick=newParcelada);document.querySelectorAll('[data-edit-recorrente]').forEach(b=>b.onclick=()=>editRecorrente(b.dataset.editRecorrente));document.querySelectorAll('[data-delete-recorrente]').forEach(b=>b.onclick=()=>deleteRow('contas_recorrentes',b.dataset.deleteRecorrente,'Conta recorrente excluída.'));document.querySelectorAll('[data-edit-parcelada]').forEach(b=>b.onclick=()=>editParcelada(b.dataset.editParcelada));document.querySelectorAll('[data-delete-parcelada]').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir esta conta parcelada e todas as suas parcelas?'))return;const q=await sb.from('contas_parceladas').delete().eq('id',b.dataset.deleteParcelada).eq('familia_id',activeFamily?.id);if(q.error)return toast(q.error.message);await loadData();render();toast('Conta parcelada excluída.')});document.querySelectorAll('[data-toggle-parcelada]').forEach(b=>b.onclick=()=>toggleParceladaStatus(b.dataset.toggleParcelada));document.querySelectorAll('[data-action="new-meta"]').forEach(b=>b.onclick=newMeta);document.querySelectorAll('[data-goal-item]').forEach(b=>b.onchange=()=>toggleMetaItem(b.dataset.goalItem,b.checked));document.querySelectorAll('[data-delete-meta]').forEach(b=>b.onclick=()=>deleteMeta(b.dataset.deleteMeta));document.querySelectorAll('[data-conta-filter]').forEach(b=>b.onclick=()=>{contaFilter=b.dataset.contaFilter;renderPage()});document.querySelectorAll('[data-loan-filter]').forEach(b=>b.onclick=()=>{loanFilter=b.dataset.loanFilter;renderPage()});document.querySelectorAll('[data-month]').forEach(b=>b.onclick=async()=>{calendarDate.setMonth(calendarDate.getMonth()+Number(b.dataset.month));await ensureRecurringBillsThrough(calendarDate);renderPage()});const tbody=$('.data-table tbody');if(tbody)tbody.onclick=e=>{const statusBtn=e.target.closest('[data-toggle-status]');if(statusBtn){e.stopPropagation();toggleContaStatus(statusBtn.dataset.toggleStatus);return}const loanStatusBtn=e.target.closest('[data-toggle-loan-status]');if(loanStatusBtn){e.stopPropagation();toggleLoanStatus(loanStatusBtn.dataset.toggleLoanStatus);return}const row=e.target.closest('[data-edit-conta]');if(row){editConta(row.dataset.editConta);return}if(row&&e.key==='Enter')editConta(row.dataset.editConta)};document.querySelectorAll('[data-edit-conta]').forEach(row=>row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();editConta(row.dataset.editConta)}});document.querySelectorAll('[data-open-loan]').forEach(b=>{const open=()=>openLoanDetails(b.dataset.openLoan);b.onclick=open;b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});document.querySelectorAll('[data-edit-loan]').forEach(b=>b.onclick=e=>{e.stopPropagation();editLoan(b.dataset.editLoan)});document.querySelectorAll('[data-edit-sub]').forEach(b=>b.onclick=()=>editSub(b.dataset.editSub));document.querySelectorAll('[data-delete-sub]').forEach(b=>b.onclick=()=>deleteRow('assinaturas',b.dataset.deleteSub,'Assinatura excluída.'));document.querySelectorAll('[data-pay-sub-charge]').forEach(b=>b.onclick=()=>paySubscriptionCharge(b.dataset.paySubCharge));$('#profileForm')?.addEventListener('submit',saveProfile);$('#deleteMyAccount')?.addEventListener('click',()=>deleteAccount(user.id));$('#avatarInput')?.addEventListener('change',uploadAvatar);$('#enablePushNotifications')?.addEventListener('click',enablePushNotifications);$('#contaSearch')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.data-table tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none')})}

async function paySubscriptionCharge(id){const charge=state.assinaturaCobrancas.find(c=>c.id===id);if(!charge||charge.status!=='pendente')return toast('Esta cobrança não está pendente.');if(!confirm(`Confirmar pagamento da competência ${String(charge.competencia).slice(5,7)}/${String(charge.competencia).slice(0,4)} no valor de ${money(charge.valor)}?`))return;const paidAt=new Date().toISOString();const {error}=await sb.from('assinatura_cobrancas').update({status:'pago',data_pagamento:paidAt,atualizado_em:paidAt}).eq('id',id).eq('usuario_id',user.id).eq('status','pendente');if(error)return toast('Não foi possível registrar o pagamento: '+error.message);const sub=state.assinaturas.find(s=>s.id===charge.assinatura_id);if(sub?.ativa){const comp=String(charge.competencia).slice(0,10),[y,m]=comp.split('-').map(Number),next=new Date(y,m-1+1,1);const yy=next.getFullYear(),mm=String(next.getMonth()+1).padStart(2,'0'),last=new Date(yy,next.getMonth()+1,0).getDate(),day=Math.min(Number(sub.dia_vencimento)||1,last),competencia=`${yy}-${mm}-01`,vencimento=`${yy}-${mm}-${String(day).padStart(2,'0')}`;const exists=state.assinaturaCobrancas.some(c=>c.assinatura_id===sub.id&&String(c.competencia).slice(0,10)===competencia);if(!exists){const payload={assinatura_id:sub.id,usuario_id:user.id,familia_id:activeFamily?.id,competencia,data_vencimento:vencimento,valor:Number(sub.valor),status:'pendente'};const result=await sb.from('assinatura_cobrancas').upsert(payload,{onConflict:'assinatura_id,competencia',ignoreDuplicates:true});if(result.error)return toast('Pagamento salvo, mas houve erro ao criar a próxima cobrança: '+result.error.message)}}await loadData();render();toast('Pagamento registrado e próxima competência verificada.');}

async function toggleContaStatus(id){
 const c=state.contas.find(x=>x.id===id);if(!c)return;
 const paid=isPaid(c);
 const patch=paid?{status:'Pendente',valor_pago:0,data_pagamento:null}:{status:'Pago',valor_pago:Number(c.valor)||0,data_pagamento:today()};
 const {error}=await sb.from('contas').update(patch).eq('id',id).eq('usuario_id',user.id);
 if(error)return toast(error.message);await loadData();render();if(!paid)showAlicePopup('paid');toast(paid?'Conta voltou para pendente.':'Conta marcada como paga.');
}

async function toggleLoanStatus(id){
 const p=state.parcelas.find(x=>x.id===id);if(!p)return;
 const paid=isPaid(p);
 const nextStatus=paid?'pendente':'pago';
 const fallbackStatus=paid?'Pendente':'Pago';
 const basePatch=paid?{status:nextStatus,valor_pago:0,data_pagamento:null}:{status:nextStatus,valor_pago:Number(p.valor)||0,data_pagamento:today()};
 let result=await sb.from('emprestimo_parcelas').update(basePatch).eq('id',id).eq('usuario_id',user.id);
 if(result.error){
   result=await sb.from('emprestimo_parcelas').update({...basePatch,status:fallbackStatus}).eq('id',id).eq('usuario_id',user.id);
 }
 if(result.error){console.error('Erro ao alterar status da parcela:',result.error);return toast(`Não foi possível alterar a parcela: ${result.error.message||'verifique o status aceito no banco'}`)}
 await loadData();
 const overlay=$('#overlay');
 if(overlay){const loanId=p.emprestimo_id;openLoanDetails(loanId)}else render();
 if(!paid)showAlicePopup('paid');toast(paid?'Parcela voltou para pendente.':'Parcela marcada como paga.');
}

async function deleteRow(table,id,msg){
 if(!confirm('Excluir este registro?'))return;
 const {data,error}=await sb.from(table).delete().eq('id',id).eq('usuario_id',user.id).select('id');
 if(error)return toast(error.message);
 if(!data?.length)return toast('Nenhum registro foi excluído.');
 if(table==='contas')closeModal();
 await loadData();
 render();
 toast(msg);
}
async function deleteLoan(id){if(!confirm('Excluir o empréstimo e suas parcelas?'))return;const child=await sb.from('emprestimo_parcelas').delete().eq('emprestimo_id',id).eq('usuario_id',user.id);if(child.error)return toast(`Não foi possível excluir as parcelas: ${child.error.message}`);const parent=await sb.from('emprestimos').delete().eq('id',id).eq('usuario_id',user.id);if(parent.error)return toast(`Não foi possível excluir o empréstimo: ${parent.error.message}`);closeModal();await loadData();render();toast('Empréstimo excluído.') }

async function deleteAccount(targetUserId=null){
 const own=!targetUserId||targetUserId===user.id;
 if(!confirm(own?'Tem certeza que deseja apagar sua conta e todos os seus dados? Esta ação é permanente.':'Remover este membro e apagar todos os dados lançados por ele?'))return;
 const {data,error}=await sb.functions.invoke('delete-user-account',{body:{target_user_id:targetUserId||user.id,familia_id:activeFamily?.id}});
 if(error)return toast(error.message||'Não foi possível excluir.');
 if(data?.error)return toast(data.error);
 if(own){await sb.auth.signOut();return;} await loadFamilies();await loadData();render();toast('Membro removido com sucesso.');
}
async function removeFamilyMember(id){if(!isAdmin())return toast('Somente administradores podem remover membros.');if(id===user.id)return;return deleteAccount(id);}
async function saveProfile(e){
 e.preventDefault();
 const f=new FormData(e.currentTarget);
 const nome=String(f.get('nome')||'').trim();
 const familia=String(f.get('familia')||'').trim();
 const tipo=String(f.get('tipo')||'').trim();
 const novaSenha=String(f.get('novaSenha')||'');
 const confirmarSenha=String(f.get('confirmarSenha')||'');
 if(!nome||!familia||!tipo)return toast('Preencha os campos obrigatórios.');
 if(novaSenha||confirmarSenha){
   if(novaSenha.length<6)return toast('A nova senha deve ter pelo menos 6 caracteres.');
   if(novaSenha!==confirmarSenha)return toast('As senhas não conferem.');
 }

 // A identificação é uma informação livre do perfil do usuário.
 // Não atualizamos familia_membros.tipo porque essa coluna pode possuir
 // uma restrição/check legado que aceite somente alguns papéis.
 // O valor persistente fica em profiles.tipo.
 let q=await sb.from('profiles')
   .update({nome,email:user.email,ativo:true,tipo,updated_at:new Date().toISOString()})
   .eq('id',user.id);

 if(q.error){
   q=await sb.from('perfis')
     .update({nome,email:user.email,ativo:true,tipo,atualizado_em:new Date().toISOString()})
     .eq('id',user.id);
 }

 if(q.error)return toast('Não foi possível salvar seu perfil: '+q.error.message);

 // Recarrega do Supabase e confirma a persistência antes de informar sucesso.
 await loadProfile();
 if(String(profile?.tipo||'').trim()!==tipo){
   // Perfil inexistente na tabela principal: tenta criar/atualizar de forma idempotente.
   let retry=await sb.from('profiles').upsert({
     id:user.id,nome,email:user.email,ativo:true,tipo,updated_at:new Date().toISOString()
   },{onConflict:'id'});
   if(retry.error){
     retry=await sb.from('perfis').upsert({
       id:user.id,nome,email:user.email,ativo:true,tipo,atualizado_em:new Date().toISOString()
     },{onConflict:'id'});
   }
   if(retry.error)return toast('Não foi possível salvar sua identificação: '+retry.error.message);
   await loadProfile();
   if(String(profile?.tipo||'').trim()!==tipo){
     return toast('O Supabase não confirmou a identificação salva.');
   }
 }

 if(activeFamily){
   activeFamily={...activeFamily,tipo};
   families=families.map(x=>x.id===activeFamily.id?{...x,tipo}:x);
 }

 if(activeFamily&&familia!==String(activeFamily.nome||'').trim()){
   if(!isAdmin())return toast('Somente o administrador pode alterar o nome da família.');

   // O UPDATE antigo aceitava uma resposta vazia como sucesso. Com RLS,
   // isso pode significar que nenhuma linha foi realmente alterada.
   // Agora pedimos a linha atualizada de volta e só alteramos o estado local
   // depois que o Supabase confirmar a persistência.
   const familyId=activeFamily.id;

   // Usa uma função RPC SECURITY DEFINER para que a autorização seja validada
   // no banco e o UPDATE não dependa de uma combinação frágil de políticas RLS.
   const fq=await sb.rpc('renomear_familia', {p_familia_id:familyId, p_nome:familia});

   if(fq.error){
     console.error('Erro ao renomear família:', fq.error);
     return toast('Não foi possível alterar o nome da família: '+(fq.error.message||'erro no Supabase'));
   }
   const row=Array.isArray(fq.data)?fq.data[0]:fq.data;
   if(!row){
     return toast('O nome não foi salvo. Verifique se seu usuário é administrador desta família.');
   }
   if(String(row.nome||'').trim()!==familia){
     return toast('O Supabase não confirmou o novo nome da família.');
   }

   activeFamily={...activeFamily,nome:row.nome};
   families=families.map(x=>x.id===familyId?{...x,nome:row.nome}:x);
 }
 if(novaSenha){
   const sq=await sb.auth.updateUser({password:novaSenha});
   if(sq.error)return toast('Perfil salvo, mas a senha não foi alterada: '+sq.error.message);
 }
 await loadProfile();
 render();
 toast('Perfil atualizado.');
}
async function uploadAvatar(e){const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/'))return toast('Selecione uma imagem.');if(file.size>3*1024*1024)return toast('A foto deve ter até 3 MB.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${user.id}/avatar.${ext}`;let q=await sb.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type});if(q.error)return toast(q.error.message);const {data}=sb.storage.from('avatars').getPublicUrl(path);const avatar_url=data.publicUrl+'?v='+Date.now();let u=await sb.from('profiles').update({avatar_url,updated_at:new Date().toISOString()}).eq('id',user.id);if(u.error)u=await sb.from('perfis').update({avatar_url,atualizado_em:new Date().toISOString()}).eq('id',user.id);if(u.error)return toast(u.error.message);await loadProfile();render();toast('Foto de perfil atualizada.')}
async function loadProfile(){let q=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(q.data)profile=q.data;else{q=await sb.from('perfis').select('*').eq('id',user.id).maybeSingle();profile=q.data||null}}
async function seedDefaultCategories(){
 const {data,error}=await sb.from('categorias').select('nome,tipo').eq('usuario_id',user.id);
 if(error)return console.warn('Categorias padrão:',error.message);
 const existing=new Set((data||[]).map(x=>`${String(x.nome||'').trim().toLocaleLowerCase('pt-BR')}|${String(x.tipo||'').trim().toLowerCase()}`));
 const missing=DEFAULT_CATEGORIES.filter(([nome,tipo])=>!existing.has(`${nome.trim().toLocaleLowerCase('pt-BR')}|${tipo.trim().toLowerCase()}`)).map(([nome,tipo])=>({usuario_id:user.id,familia_id:activeFamily?.id,nome,tipo,ativo:true}));
 if(missing.length){const q=await sb.from('categorias').insert(missing);if(q.error)console.warn('Categorias padrão:',q.error.message)}
}
async function loadCategories(){if(!activeFamily){state.categorias=[];return;}const q=await sb.from('categorias').select('*').eq('familia_id',activeFamily.id).eq('ativo',true).order('tipo').order('nome');state.categorias=q.error?[]:(q.data||[]);}
async function loadFamilies(){
 const {data,error}=await sb.from('familia_membros').select('id,familia_id,papel,tipo,familias(id,nome,criado_em)').eq('usuario_id',user.id);
 if(error){console.warn('Famílias:',error.message);families=[];return}
 families=(data||[]).map(x=>({...x.familias,member_id:x.id,papel:x.papel,tipo:x.tipo||''})).filter(Boolean);
 const saved=localStorage.getItem('financas-active-family');activeFamily=families.find(f=>f.id===saved)||families[0]||null;
}
async function loadData(){
 if(!activeFamily){state.contas=[];state.recorrentes=[];state.emprestimos=[];state.parcelas=[];state.assinaturas=[];state.assinaturaCobrancas=[];state.parceladas=[];state.parceladaItens=[];state.categorias=[];return}
 await seedDefaultCategories();await loadCategories();
 const fid=activeFamily.id;
 const [c,l,p,sub,charges,rec,parceladas,parceladaItens,goals,goalItems]=await Promise.all([
  sb.from('contas').select('*').eq('familia_id',fid).order('data_vencimento'),
  sb.from('emprestimos').select('*').eq('familia_id',fid).order('criado_em',{ascending:false}),
  sb.from('emprestimo_parcelas').select('*').eq('familia_id',fid).order('data_vencimento'),
  sb.from('assinaturas').select('*').eq('familia_id',fid).order('dia_vencimento'),
  sb.from('assinatura_cobrancas').select('*').eq('familia_id',fid).order('competencia',{ascending:false}),
  sb.from('contas_recorrentes').select('*').eq('familia_id',fid).order('criado_em',{ascending:false}),
  sb.from('contas_parceladas').select('*').eq('familia_id',fid).order('criado_em',{ascending:false}),
  sb.from('contas_parceladas_itens').select('*').eq('familia_id',fid).order('data_vencimento'),
  sb.from('metas').select('*').eq('familia_id',fid).order('criado_em',{ascending:false}),
  sb.from('meta_itens').select('*').eq('familia_id',fid).order('criado_em')
 ]);
 state.contas=(c.data||[]).map(x=>({...x,vencimento:x.data_vencimento}));state.recorrentes=rec.data||[];state.parceladas=parceladas.data||[];state.parceladaItens=parceladaItens.data||[];state.emprestimos=(l.data||[]).map(x=>({...x,total:Number(x.valor_total),valorContratado:Number(x.valor_contratado),parcelas:Number(x.quantidade_parcelas),valorParcela:Number(x.valor_parcela),primeira:x.primeiro_vencimento}));state.parcelas=p.data||[];state.assinaturas=sub.data||[];state.assinaturaCobrancas=charges.data||[];state.metas=goals.data||[];state.metaItens=goalItems.data||[];
 // Garante a cobrança da competência corrente para assinaturas ativas, sem duplicar registros.
 if(!charges.error){const now=new Date(),yy=now.getFullYear(),mm=String(now.getMonth()+1).padStart(2,'0'),competencia=`${yy}-${mm}-01`;for(const assinatura of state.assinaturas.filter(x=>x.ativa)){if(state.assinaturaCobrancas.some(x=>x.assinatura_id===assinatura.id&&String(x.competencia).slice(0,10)===competencia))continue;const last=new Date(yy,now.getMonth()+1,0).getDate(),day=Math.min(Number(assinatura.dia_vencimento)||1,last),data_vencimento=`${yy}-${mm}-${String(day).padStart(2,'0')}`;const {data,error}=await sb.from('assinatura_cobrancas').upsert({assinatura_id:assinatura.id,usuario_id:user.id,familia_id:fid,competencia,data_vencimento,valor:Number(assinatura.valor)||0,status:'pendente'},{onConflict:'assinatura_id,competencia',ignoreDuplicates:true}).select('*');if(!error&&data?.length)state.assinaturaCobrancas.push(...data);else if(error)console.warn('Cobrança inicial não criada:',error.message)}}
 await ensureRecurringBillsThrough(calendarDate);
 const errs=[c,l,p,sub,charges,rec,parceladas,parceladaItens].filter(x=>x.error);if(errs.length)console.warn('Supabase:',errs.map(x=>x.error.message));
}


function renderSignup(){const app=document.querySelector('#app');app.innerHTML=`<div class="login-page"><div class="login-card"><div class="login-brand"><div class="brand-mark">${icon('trending-up',25)}</div><div><strong>Finanças <span>Pro</span></strong><small>Crie sua família</small></div></div><div class="login-heading"><span class="eyebrow">Novo cadastro</span><h1>Comece agora</h1><p>Preencha todos os campos para criar sua conta e família.</p></div><form id="signupForm" class="login-form"><div class="field"><label for="signupName">Nome completo *</label><input id="signupName" name="nome" autocomplete="name" required maxlength="120"></div><div class="field"><label for="signupFamily">Nome da família *</label><input id="signupFamily" name="familia" required maxlength="80"></div><div class="field"><label for="signupEmail">E-mail *</label><input id="signupEmail" name="email" type="email" autocomplete="email" required></div><div class="field"><label for="signupPassword">Senha *</label><input id="signupPassword" name="senha" type="password" autocomplete="new-password" minlength="6" required></div><button class="btn btn-primary login-submit">Criar conta</button><button type="button" class="btn btn-soft login-submit" id="googleSignupButton">${icon('globe',18)} Criar conta com Google</button><button type="button" class="btn btn-soft login-submit" id="backLogin">Voltar ao login</button></form></div></div>`;refreshIcons();$('#googleSignupButton')?.addEventListener('click',async()=>{const button=$('#googleSignupButton');if(button){button.disabled=true;button.textContent='Abrindo Google...';}const {error:q}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});if(q){if(button){button.disabled=false;button.innerHTML=`${icon('globe',18)} Criar conta com Google`;refreshIcons();}toast('Não foi possível criar a conta com Google: '+q.message);}});$('#backLogin').onclick=()=>renderLogin();$('#signupForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const nome=String(f.get('nome')||'').trim();const familia=String(f.get('familia')||'').trim();const email=String(f.get('email')||'').trim().toLowerCase();const senha=String(f.get('senha')||'');if(!nome||!familia||!email||!senha)return toast('Preencha todos os campos obrigatórios.');if(senha.length<6)return toast('A senha deve ter pelo menos 6 caracteres.');const submit=e.currentTarget.querySelector('button[type=submit]')||e.currentTarget.querySelector('button:not([type])');if(submit){submit.disabled=true;submit.textContent='Criando conta...';}const q=await sb.auth.signUp({email,password:senha,options:{data:{name:nome}}});if(q.error){if(submit){submit.disabled=false;submit.textContent='Criar conta';}return toast(q.error.message);}if(!q.data.user){if(submit){submit.disabled=false;submit.textContent='Criar conta';}return toast('Não foi possível criar o usuário.');}if(!q.data.session){if(submit){submit.disabled=false;submit.textContent='Criar conta';}return toast('O Supabase ainda exige confirmação de e-mail. Desative essa opção no painel e tente novamente.');}const fam=await sb.from('familias').insert({nome:familia,criado_por:q.data.user.id}).select().single();if(fam.error){if(submit){submit.disabled=false;submit.textContent='Criar conta';}return toast('Usuário criado, mas a família não foi criada: '+fam.error.message);}const mem=await sb.from('familia_membros').insert({familia_id:fam.data.id,usuario_id:q.data.user.id,papel:'admin'});if(mem.error){if(submit){submit.disabled=false;submit.textContent='Criar conta';}return toast('Família criada, mas o vínculo do administrador falhou: '+mem.error.message);}toast('Cadastro realizado com sucesso. Faça login.');await sb.auth.signOut();renderLogin('Cadastro realizado. Faça login.');};}
function renderLogin(errorMsg=''){const app=document.querySelector('#app');app.innerHTML=`<div class="login-page"><div class="login-glow login-glow-a"></div><div class="login-glow login-glow-b"></div><div class="login-card"><div class="login-brand"><div class="brand-mark">${icon('trending-up',25)}</div><div><strong>Finanças <span>Pro</span></strong><small>Você no controle</small></div></div><div class="login-heading"><span class="eyebrow">Acesso seguro</span><h1>Bem-vindo</h1><p>Entre para acompanhar suas contas, empréstimos e assinaturas.</p></div><form id="loginForm" class="login-form"><div class="field"><label for="loginEmail">E-mail</label><div class="input-icon">${icon('mail',18)}<input id="loginEmail" name="email" type="email" autocomplete="email" placeholder="seu@email.com" required></div></div><div class="field"><label for="loginPassword">Senha</label><div class="input-icon">${icon('lock-keyhole',18)}<input id="loginPassword" name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" required><button type="button" class="password-toggle" id="togglePassword" aria-label="Mostrar senha">${icon('eye',18)}</button></div></div><div id="loginError" class="login-error" ${errorMsg?'':'hidden'}>${esc(errorMsg)}</div><button class="btn btn-primary login-submit" type="submit" id="loginSubmit">${icon('log-in',18)} Entrar</button></form><div class="login-divider"><span>ou</span></div><button type="button" class="btn btn-soft login-submit" id="googleLoginButton">${icon('globe',18)} Entrar com Google</button><button type="button" class="btn btn-soft login-submit" id="signupButton">Criar conta</button><div class="login-footer"></div></div></div>`;refreshIcons();const form=$('#loginForm'),email=$('#loginEmail'),password=$('#loginPassword'),error=$('#loginError'),submit=$('#loginSubmit');$('#signupButton')?.addEventListener('click',renderSignup);$('#googleLoginButton')?.addEventListener('click',async()=>{const button=$('#googleLoginButton');if(button){button.disabled=true;button.textContent='Abrindo Google...';}const {error:q}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});if(q){if(button){button.disabled=false;button.innerHTML=`${icon('globe',18)} Entrar com Google`;refreshIcons();}toast('Não foi possível entrar com Google: '+q.message);}});$('#togglePassword')?.addEventListener('click',()=>{const show=password.type==='password';password.type=show?'text':'password';$('#togglePassword').innerHTML=icon(show?'eye-off':'eye',18);refreshIcons()});form?.addEventListener('submit',async e=>{e.preventDefault();error.hidden=true;error.textContent='';submit.disabled=true;submit.innerHTML=`${icon('loader-circle',18)} Entrando...`;refreshIcons();const {error:q}=await sb.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(q){error.textContent=q.message.includes('Invalid login credentials')?'E-mail ou senha incorretos.':q.message;error.hidden=false;submit.disabled=false;submit.innerHTML=`${icon('log-in',18)} Entrar`;refreshIcons();return}submit.innerHTML=`${icon('check',18)} Acesso autorizado`;refreshIcons()})}
function renderSplash(){
 const app=document.querySelector('#app');
 app.innerHTML=`<section class="splash-page" aria-label="Carregando Finanças Pro"><div class="splash-orb splash-orb-a"></div><div class="splash-orb splash-orb-b"></div><div class="splash-content"><div class="splash-art"><img src="assets/alice-preview.png" alt="Alice, mascote do Finanças Pro"></div><div class="splash-loader" aria-hidden="true"><span></span></div></div></section>`;
 const enter=()=>{if(enter.done)return;enter.done=true;clearTimeout(timer);render()};
 const timer=setTimeout(enter,2800);
}

async function ensureGoogleFamily(){if(!user)return;await loadFamilies();if(!families.length){const nome=String(user.user_metadata?.name||user.user_metadata?.full_name||user.email?.split('@')[0]||'Usuário').trim();let pq=await sb.from('profiles').upsert({id:user.id,nome,email:user.email,ativo:true,updated_at:new Date().toISOString()},{onConflict:'id'});if(pq.error){pq=await sb.from('perfis').upsert({id:user.id,nome,email:user.email,atualizado_em:new Date().toISOString()},{onConflict:'id'});}const fam=await sb.from('familias').insert({nome:'Minha Família',criado_por:user.id}).select().single();if(fam.error){console.warn('Família padrão:',fam.error.message);return;}const mem=await sb.from('familia_membros').insert({familia_id:fam.data.id,usuario_id:user.id,papel:'admin'});if(mem.error){console.warn('Vínculo padrão:',mem.error.message);return;}await loadFamilies();}}
async function openApp(showSplash=false){await registerPushWorker();await loadProfile();await ensureGoogleFamily();await loadData();await loadNotifications();subscribeNotifications();if(showSplash)renderSplash();else render()}
async function boot(){const {data}=await sb.auth.getSession();user=data.session?.user||null;sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){user=null;profile=null;renderLogin()}else if(event==='SIGNED_IN'&&session?.user){user=session.user;setTimeout(async()=>{await openApp(true)},0)}});if(!user){renderLogin();return}await openApp(false)}
boot();
