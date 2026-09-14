const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const SUPABASE_URL = "https://bcepclvnyjobytqasodx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dtzJI72uUuKsE-bwMwW3Qg_qOpjHkeO";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let state = { loggedIn:false, profile:{name:"Usuário",email:""}, categorias:[], contas:[], emprestimos:[] };
let currentUser = null;
let route = "dashboard";
let calendarDate = new Date(); calendarDate.setDate(1);
let contaFilter = "all";

function money(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function dateBR(s){ if(!s)return "—"; const [y,m,d]=String(s).slice(0,10).split("-"); return d&&m&&y?`${d}/${m}/${y}`:"—"; }
function esc(s){ return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function isoDate(v){ return v ? String(v).slice(0,10) : ""; }
function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function toast(msg){ const r=$("#toastRoot"); if(!r)return; r.innerHTML=`<div class="toast">${esc(msg)}</div>`; setTimeout(()=>r.innerHTML="",2600); }
function isPaid(x){ return String(x.status||"").toLowerCase()==="pago" || x.pago===true; }
function totalParcelas(e){ return Number(e.parcelas||0)*Number(e.valorParcela||0); }
function paidLoan(e){ return (e.pagamentos||[]).filter(p=>p.pago).reduce((a,p)=>a+Number(p.valor||0),0); }
function paidCount(e){ return (e.pagamentos||[]).filter(p=>p.pago).length; }
function remainingLoan(e){ return Math.max(0,totalParcelas(e)-paidLoan(e)); }
function getUserName(user){ return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.nome || (user?.email?user.email.split("@")[0]:"Usuário"); }
function initials(name){ return String(name||"Usuário").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "US"; }

function normalizeConta(c){
  return { id:c.id, descricao:c.descricao||c.nome||c.titulo||"Conta", categoria:c.categoria?.nome||c.categoria_nome||c.categoria||"Sem categoria", categoria_id:c.categoria_id||null, valor:Number(c.valor||c.valor_previsto||0), vencimento:isoDate(c.data_vencimento||c.vencimento), status:c.status||"Pendente", pagoEm:isoDate(c.data_pagamento||c.pago_em), valorPago:Number(c.valor_pago||c.valor_pagamento||c.valor||0), obs:c.observacao||"" };
}
function normalizeLoan(l, parcelas=[]){
  const ps=parcelas.filter(p=>String(p.emprestimo_id)===String(l.id)).map(p=>({id:p.id,numero:Number(p.numero_parcela||p.numero||0),pago:String(p.status||"").toLowerCase()==="pago"||p.pago===true,valor:Number(p.valor||p.valor_parcela||0),data:isoDate(p.data_pagamento||p.data_vencimento||p.vencimento)}));
  return {id:l.id,descricao:l.descricao||l.nome||"Empréstimo",credor:l.credor||l.instituicao||"",total:Number(l.valor_total||l.total||l.valor_contratado||0),parcelas:Number(l.quantidade_parcelas||l.parcelas||0),valorParcela:Number(l.valor_parcela||l.parcela||0),primeira:isoDate(l.primeiro_vencimento||l.primeira||l.data_primeiro_vencimento),status:l.status||"Ativo",pagamentos:ps};
}

async function loadProfile(user){
  const candidates=["profiles","perfis"];
  for(const table of candidates){
    try{
      const {data,error}=await supabaseClient.from(table).select("*").eq("id",user.id).maybeSingle();
      if(!error && data){ return {name:data.nome||data.name||getUserName(user),email:data.email||user.email||""}; }
    }catch(_){ }
  }
  return {name:getUserName(user),email:user.email||""};
}

async function loadFinanceData(){
  if(!currentUser) return;
  const [catsRes, contasRes, loansRes, parcelasRes] = await Promise.all([
    supabaseClient.from("categorias").select("*").eq("usuario_id",currentUser.id).eq("ativo",true).order("nome",{ascending:true}),
    supabaseClient.from("contas").select("*").eq("usuario_id",currentUser.id).order("data_vencimento",{ascending:true}),
    supabaseClient.from("emprestimos").select("*").eq("usuario_id",currentUser.id).order("criado_em",{ascending:false}),
    supabaseClient.from("emprestimo_parcelas").select("*").eq("usuario_id",currentUser.id).order("data_vencimento",{ascending:true})
  ]);
  if(catsRes.error && catsRes.error.code!=="PGRST116") throw new Error("Categorias: "+catsRes.error.message);
  if(contasRes.error) throw new Error("Contas: "+contasRes.error.message);
  if(loansRes.error) throw new Error("Empréstimos: "+loansRes.error.message);
  let parcelas=parcelasRes.data||[];
  if(parcelasRes.error && parcelasRes.error.code!=="PGRST116") throw new Error("Parcelas: "+parcelasRes.error.message);
  state.categorias=catsRes.data||[];
  state.contas=(contasRes.data||[]).map(normalizeConta);
  state.emprestimos=(loansRes.data||[]).map(l=>normalizeLoan(l,parcelas));
}

async function startSession(session){
  currentUser=session?.user||null;
  if(!currentUser){ showLogin(); return; }
  state.loggedIn=true; state.profile=await loadProfile(currentUser); state.categorias=[]; state.contas=[]; state.emprestimos=[];
  showApp(); render();
  try { await loadFinanceData(); render(); }
  catch(error){ console.error(error); toast("Não foi possível carregar os dados do Supabase."); renderError(error); }
}
function renderError(error){ const el=$("#pageContent"); if(el) el.insertAdjacentHTML("afterbegin",`<div class="panel error-panel"><strong>Não foi possível carregar os dados.</strong><small>${esc(error.message||error)}</small><button class="btn btn-outline" id="retryData">Tentar novamente</button></div>`); $("#retryData")?.addEventListener("click",async()=>{try{await loadFinanceData();render();}catch(e){renderError(e)}}); }
function showLogin(){ $("#appView")?.classList.add("hidden"); $("#loginView")?.classList.remove("hidden"); }
function showApp(){ $("#loginView")?.classList.add("hidden"); $("#appView")?.classList.remove("hidden"); }

function setRoute(r){
  route=r; closeMobileMenu();
  const meta={dashboard:[`Olá, ${state.profile.name||"Usuário"}! 👋`,"Veja como estão suas finanças hoje."],contas:["Contas","Controle suas contas e acompanhe os pagamentos."],emprestimos:["Empréstimos","Acompanhe parcelas, pagamentos e saldo para quitação."],calendario:["Calendário de pagamentos","Visualize contas e parcelas por data."],relatorios:["Relatórios","Analise seus gastos, pagamentos e compromissos."]}[r]||["Finanças Pro",""];
  $("#pageTitle").textContent=meta[0]; $("#pageSubtitle").textContent=meta[1];
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===r)); render(); window.scrollTo({top:0,behavior:"smooth"});
}
function render(){
  if(!state.loggedIn)return;
  $("#currentDate").textContent=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
  $("#profileName").textContent=state.profile.name||"Usuário"; $("#profileEmail").textContent=state.profile.email||"";
  const av=initials(state.profile.name); $(".avatar").textContent=av; $(".top-avatar").textContent=av;
  const pages={dashboard:dashboardHTML,contas:contasHTML,emprestimos:emprestimosHTML,calendario:calendarioHTML,relatorios:relatoriosHTML};
  try { $("#pageContent").innerHTML=pages[route](); bindPage(); } catch(error){ console.error(error); $("#pageContent").innerHTML=`<div class="panel error-panel"><strong>Ocorreu um erro ao abrir esta página.</strong><small>${esc(error.message)}</small></div>`; }
}

function dashboardHTML(){
  const total=state.contas.reduce((a,c)=>a+c.valor,0), paid=state.contas.filter(isPaid).reduce((a,c)=>a+(c.valorPago||c.valor),0), pending=state.contas.filter(c=>!isPaid(c)).reduce((a,c)=>a+c.valor,0), loans=state.emprestimos.reduce((a,e)=>a+remainingLoan(e),0);
  const paidCountAll=state.contas.filter(isPaid).length, pendingCount=state.contas.filter(c=>!isPaid(c)).length;
  const upcoming=[...state.contas].filter(c=>!isPaid(c)).sort((a,b)=>a.vencimento.localeCompare(b.vencimento)).slice(0,5);
  const cats={}; state.contas.forEach(c=>cats[c.categoria]=(cats[c.categoria]||0)+c.valor); const catRows=Object.entries(cats).map(([k,v])=>`<div class="legend-row"><span class="dot"></span><span>${esc(k)}</span><b>${Math.round(total?v/total*100:0)}%</b><span>${money(v)}</span></div>`).join("");
  return `<div class="grid kpi-grid">
    <button class="kpi kpi-button" data-route="contas"><div class="kpi-head"><div class="kpi-icon soft-green">⌂</div></div><label>Total de contas</label><strong>${money(total)}</strong><small>${state.contas.length} contas</small><div class="progress"><span style="width:${Math.min(100,total?paid/total*100:0)}%"></span></div></button>
    <button class="kpi kpi-button" data-filter-contas="paid"><div class="kpi-head"><div class="kpi-icon soft-green">✓</div></div><label>Pagas</label><strong>${money(paid)}</strong><small>${paidCountAll} contas</small><div class="progress"><span style="width:${Math.min(100,total?paid/total*100:0)}%"></span></div></button>
    <button class="kpi kpi-button" data-filter-contas="pending"><div class="kpi-head"><div class="kpi-icon soft-red">◷</div></div><label>Pendentes</label><strong>${money(pending)}</strong><small>${pendingCount} contas</small><div class="progress"><span style="width:${Math.min(100,total?pending/total*100:0)}%;background:#ff6473"></span></div></button>
    <button class="kpi kpi-button" data-route="emprestimos"><div class="kpi-head"><div class="kpi-icon soft-purple">▤</div></div><label>Empréstimos</label><strong>${money(loans)}</strong><small>${state.emprestimos.length} cadastrados</small><div class="progress"><span style="width:${state.emprestimos.length?55:0}%;background:#7564e9"></span></div></button>
  </div>
  <div class="grid content-grid"><div class="panel"><div class="panel-head"><div><h3>Despesas por categoria</h3><div class="panel-sub">Dados do Supabase</div></div></div>${catRows?`<div class="legend">${catRows}</div>`:`<div class="empty">Nenhuma conta cadastrada.</div>`}</div><div class="panel"><div class="panel-head"><div><h3>Evolução dos gastos</h3><div class="panel-sub">Últimos 6 meses</div></div></div><div class="chart-wrap">${lineChart()}</div></div><div class="panel calendar-mini">${miniCalendarHTML()}<button class="calendar-actions" data-route="calendario">▣ &nbsp; Ver todos os eventos</button></div></div>
  <div class="grid bottom-grid"><div class="panel"><div class="panel-head"><h3>Próximos vencimentos</h3><button class="link-btn" data-route="contas">Ver todos →</button></div><div class="list">${upcoming.length?upcoming.map(c=>rowConta(c)).join(""):`<div class="empty">Nenhuma conta pendente.</div>`}</div></div><div class="panel"><div class="panel-head"><h3>Empréstimos</h3><button class="link-btn" data-route="emprestimos">Ver todos →</button></div>${state.emprestimos.length?loanSummary(state.emprestimos[0]):`<div class="empty"><strong>Nenhum empréstimo</strong>Cadastre seu primeiro empréstimo.</div>`}</div><div class="panel"><div class="panel-head"><h3>Resumo financeiro</h3></div><div class="summary-box"><small>Saldo previsto</small><strong>${money(total-paid)}</strong></div></div></div>`;
}
function lineChart(){
  const months=[]; const now=new Date(); now.setDate(1); for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1); months.push({y:d.getFullYear(),m:d.getMonth(),label:new Intl.DateTimeFormat("pt-BR",{month:"short"}).format(d).replace(".","")});}
  const vals=months.map(x=>state.contas.filter(c=>{const d=isoDate(c.vencimento);return Number(d.slice(0,4))===x.y&&Number(d.slice(5,7))-1===x.m;}).reduce((a,c)=>a+c.valor,0)); const max=Math.max(...vals,1),w=600,h=190,p=32;
  const pts=vals.map((v,i)=>`${p+i*(w-2*p)/5},${h-p-(v/max)*(h-2*p)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line class="axis" x1="32" y1="32" x2="32" y2="158"/><line class="axis" x1="32" y1="158" x2="580" y2="158"/><polyline class="chart-line" points="${pts}"/>${vals.map((v,i)=>{const x=p+i*(w-2*p)/5,y=h-p-(v/max)*(h-2*p);return `<circle class="point" cx="${x}" cy="${y}" r="4"/><text class="axis-label" x="${x-10}" y="177">${months[i].label}</text>`}).join("")}</svg>`;
}
function rowConta(c){return `<div class="list-row"><div class="item-icon">◉</div><div><strong>${esc(c.descricao)}</strong><small>${esc(c.categoria)} · ${dateBR(c.vencimento)}</small></div><div class="amount">${money(c.valor)}</div><span class="badge ${isPaid(c)?"paid":"pending"}">${isPaid(c)?"Pago":"Pendente"}</span></div>`}
function loanSummary(e){return `<div class="loan-card"><div class="loan-top"><div class="loan-name">▤ ${esc(e.descricao)}</div><span class="amount">${money(remainingLoan(e))}</span></div><div class="loan-meta"><div><small>Parcelas pagas</small><strong>${paidCount(e)}/${e.parcelas}</strong></div><div><small>Parcela</small><strong>${money(e.valorParcela)}</strong></div><div><small>Vencimento inicial</small><strong>${dateBR(e.primeira)}</strong></div></div></div>`}
function miniCalendarHTML(){ const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(); let cells=""; for(let i=0;i<first;i++)cells+="<td></td>"; for(let d=1;d<=days;d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,items=state.contas.filter(c=>c.vencimento===ds);let cl=items.length?(items.some(isPaid)?"paid":"pending"):"";if(ds===todayISO())cl="today";cells+=`<td><span class="cal-dot ${cl}">${d}</span></td>`;if((d+first)%7===0&&d<days)cells+="</tr><tr>";} return `<div class="panel-head"><div><h3>Calendário</h3><div class="panel-sub">${new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(calendarDate)}</div></div></div><table><thead><tr>${["D","S","T","Q","Q","S","S"].map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody><tr>${cells}</tr></tbody></table>`; }

function contasHTML(){ const rows=state.contas.filter(c=>contaFilter==="all"|| (contaFilter==="paid"?isPaid(c):!isPaid(c))).map(c=>`<tr><td><strong>${esc(c.descricao)}</strong><br><small>${esc(c.categoria)}</small></td><td>${money(c.valor)}</td><td>${dateBR(c.vencimento)}</td><td><span class="badge ${isPaid(c)?"paid":"pending"}">${isPaid(c)?"Pago":"Pendente"}</span></td><td><div class="actions">${!isPaid(c)?`<button class="action-btn" data-pay="${c.id}">Marcar paga</button>`:""}<button class="action-btn" data-delete-conta="${c.id}">Excluir</button></div></td></tr>`).join(""); return `<div class="toolbar"><div><h2>Contas</h2><p>${state.contas.length} registro(s) no Supabase.</p></div><div class="toolbar-actions"><select id="contaFilter"><option value="all" ${contaFilter==="all"?"selected":""}>Todas</option><option value="paid" ${contaFilter==="paid"?"selected":""}>Pagas</option><option value="pending" ${contaFilter==="pending"?"selected":""}>Pendentes</option><button class="btn btn-primary" id="newConta">+ Nova conta</button></div></div><div class="panel table-panel"><table class="data-table"><thead><tr><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr></thead><tbody>${rows||`<tr><td colspan="5"><div class="empty">Nenhuma conta encontrada.</div></td></tr>`}</tbody></table></div>`; }
function emprestimosHTML(){return `<div class="toolbar"><div><h2>Empréstimos</h2><p>${state.emprestimos.length} registro(s) no Supabase.</p></div><div class="toolbar-actions"><button class="btn btn-primary" id="newLoan">+ Novo empréstimo</button></div></div><div class="page-grid">${state.emprestimos.map(loanSummary).join("")||`<div class="panel empty"><strong>Nenhum empréstimo cadastrado</strong>Cadastre seu primeiro empréstimo.</div>`}</div>`;}
function loanEvents(ds){const out=[];state.emprestimos.forEach(e=>(e.pagamentos||[]).forEach(p=>{if(p.data===ds)out.push({name:`${e.descricao} · ${p.numero}/${e.parcelas}`,val:p.valor,paid:p.pago});}));return out;}
function calendarioHTML(){
  const y=calendarDate.getFullYear();
  const m=calendarDate.getMonth();
  const first=new Date(y,m,1).getDay();
  const days=new Date(y,m+1,0).getDate();
  let cells="";
  for(let i=0;i<first;i++) cells+='<div class="day empty-day"></div>';
  for(let d=1;d<=days;d++){
    const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const items=[
      ...state.contas.filter(c=>c.vencimento===ds).map(c=>({name:c.descricao,val:c.valor,paid:isPaid(c)})),
      ...loanEvents(ds)
    ];
    const eventHTML=items.map(x=>`<div class="event ${x.paid?"ev-paid":"ev-pending"}"><span>${esc(x.name)}</span><strong>${money(x.val)}</strong></div>`).join("");
    const todayClass=ds===todayISO()?"is-today":"";
    cells+=`<div class="day ${todayClass}"><b>${d}</b>${eventHTML}</div>`;
  }
  const monthTitle=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(calendarDate);
  const emptyMessage=(!state.contas.length && !state.emprestimos.length)?'<div class="empty">Nenhum pagamento cadastrado no Supabase.</div>':'';
  return `<div class="toolbar"><div><h2>Calendário de pagamentos</h2><p>Contas e parcelas por data.</p></div><div class="toolbar-actions"><button class="btn btn-outline" data-cal-prev>←</button><button class="btn btn-outline" data-cal-today>Hoje</button><button class="btn btn-outline" data-cal-next>→</button></div></div><div class="panel"><div class="panel-head"><h3 style="font-size:18px">${monthTitle}</h3></div><div class="calendar-grid">${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(x=>`<div class="weekday">${x}</div>`).join("")}${cells}</div>${emptyMessage}</div>`;
}
function relatoriosHTML(){const total=state.contas.reduce((a,c)=>a+c.valor,0),paid=state.contas.filter(isPaid).reduce((a,c)=>a+(c.valorPago||c.valor),0),pending=total-paid;return `<div class="report-cards"><div class="report-card"><label>Total lançado</label><strong>${money(total)}</strong></div><div class="report-card"><label>Total pago</label><strong>${money(paid)}</strong></div><div class="report-card"><label>Total pendente</label><strong>${money(pending)}</strong></div></div><div class="panel" style="margin-top:14px"><h3>Resumo</h3><p class="panel-sub">Os valores acima são calculados diretamente dos registros carregados do Supabase.</p></div>`;}

async function markContaPaid(id){const {error}=await supabaseClient.from("contas").update({status:"Pago",data_pagamento:todayISO()}).eq("id",id).eq("usuario_id",currentUser.id);if(error)throw error;await loadFinanceData();render();toast("Conta marcada como paga.");}
async function deleteConta(id){const {error}=await supabaseClient.from("contas").delete().eq("id",id).eq("usuario_id",currentUser.id);if(error)throw error;await loadFinanceData();render();toast("Conta excluída.");}
function modalHTML(title,body){return `<div class="modal-backdrop" id="dataModal"><div class="modal-card"><div class="modal-head"><h3>${title}</h3><button class="modal-close" id="closeModal">×</button></div>${body}</div></div>`;}
function openContaModal(){
  const opts=state.categorias.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join("");
  document.body.insertAdjacentHTML("beforeend",modalHTML("Nova conta",`<form id="contaForm" class="form-grid"><label>Descrição<input name="descricao" required></label><label>Categoria<select name="categoria_id"><option value="">Sem categoria</option>${opts}</select></label><label>Valor<input name="valor" type="number" step="0.01" min="0" required></label><label>Vencimento<input name="data_vencimento" type="date" required value="${todayISO()}"></label><label>Status<select name="status"><option>Pendente</option><option>Pago</option></select></label><label>Observação<input name="observacao"></label><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelModal">Cancelar</button><button class="btn btn-primary">Salvar conta</button></div></form>`));
  bindModalClose();
  $("#contaForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const payload={usuario_id:currentUser.id,descricao:f.get("descricao"),categoria_id:f.get("categoria_id")||null,valor:Number(f.get("valor")),data_vencimento:f.get("data_vencimento"),status:f.get("status"),valor_pago:f.get("status")==="Pago"?Number(f.get("valor")):0,data_pagamento:f.get("status")==="Pago"?todayISO():null,observacao:f.get("observacao")||null};try{const {error}=await supabaseClient.from("contas").insert(payload);if(error)throw error;closeModal();await loadFinanceData();render();toast("Conta cadastrada.")}catch(err){toast(err.message)}};
}
function openLoanModal(){
  document.body.insertAdjacentHTML("beforeend",modalHTML("Novo empréstimo",`<form id="loanForm" class="form-grid"><label>Descrição<input name="descricao" required></label><label>Credor<input name="credor" required></label><label>Valor contratado<input name="valor_contratado" type="number" step="0.01" min="0" required></label><label>Valor total<input name="valor_total" type="number" step="0.01" min="0" required></label><label>Quantidade de parcelas<input name="quantidade_parcelas" type="number" min="1" required></label><label>Valor da parcela<input name="valor_parcela" type="number" step="0.01" min="0" required></label><label>Primeiro vencimento<input name="primeiro_vencimento" type="date" required value="${todayISO()}"></label><label>Status<select name="status"><option>Ativo</option><option>Quitado</option><option>Cancelado</option></select></label><label>Observação<input name="observacao"></label><div class="form-actions"><button type="button" class="btn btn-outline" id="cancelModal">Cancelar</button><button class="btn btn-primary">Salvar empréstimo</button></div></form>`));
  bindModalClose();
  $("#loanForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const payload={usuario_id:currentUser.id,descricao:f.get("descricao"),credor:f.get("credor"),valor_contratado:Number(f.get("valor_contratado")),valor_total:Number(f.get("valor_total")),quantidade_parcelas:Number(f.get("quantidade_parcelas")),valor_parcela:Number(f.get("valor_parcela")),primeiro_vencimento:f.get("primeiro_vencimento"),status:f.get("status"),observacao:f.get("observacao")||null};try{const {data,error}=await supabaseClient.from("emprestimos").insert(payload).select("id").single();if(error)throw error;const id=data.id;const n=payload.quantidade_parcelas;const first=new Date(payload.primeiro_vencimento+"T12:00:00");const parcelas=Array.from({length:n},(_,i)=>{const d=new Date(first.getFullYear(),first.getMonth()+i,first.getDate());const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;return {emprestimo_id:id,usuario_id:currentUser.id,numero_parcela:i+1,data_vencimento:ds,valor:payload.valor_parcela,status:"Pendente",valor_pago:0,data_pagamento:null,observacao:null};});const {error:pe}=await supabaseClient.from("emprestimo_parcelas").insert(parcelas);if(pe){await supabaseClient.from("emprestimos").delete().eq("id",id).eq("usuario_id",currentUser.id);throw pe;}closeModal();await loadFinanceData();render();toast(`${n} parcela(s) criada(s).`);}catch(err){toast(err.message)}};
}
function bindModalClose(){$("#closeModal")?.addEventListener("click",closeModal);$("#cancelModal")?.addEventListener("click",closeModal);$("#dataModal")?.addEventListener("click",e=>{if(e.target.id==="dataModal")closeModal()});}
function closeModal(){$("#dataModal")?.remove();}
function bindPage(){
  $$('[data-route]').forEach(b=>b.onclick=()=>setRoute(b.dataset.route));
  $$('[data-filter-contas]').forEach(b=>b.onclick=()=>{contaFilter=b.dataset.filterContas;setRoute("contas")});
  $("#contaFilter")?.addEventListener("change",e=>{contaFilter=e.target.value;render()});
  $("#newConta")?.addEventListener("click",openContaModal);
  $("#newLoan")?.addEventListener("click",openLoanModal);
  $$('[data-pay]').forEach(b=>b.onclick=async()=>{try{await markContaPaid(b.dataset.pay)}catch(e){toast(e.message)}});
  $$('[data-delete-conta]').forEach(b=>b.onclick=async()=>{if(confirm("Excluir esta conta?"))try{await deleteConta(b.dataset.deleteConta)}catch(e){toast(e.message)}});
  $$('[data-cal-prev]').forEach(b=>b.onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);render()});
  $$('[data-cal-next]').forEach(b=>b.onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);render()});
  $$('[data-cal-today]').forEach(b=>b.onclick=()=>{const d=new Date();calendarDate=new Date(d.getFullYear(),d.getMonth(),1);render()});
}
function closeMobileMenu(){ $("#sidebar")?.classList.remove("mobile-open"); $("#mobileOverlay")?.classList.remove("show"); }

async function initAuth(){
  try{
    const {data,error}=await supabaseClient.auth.getSession(); if(error)throw error; await startSession(data.session);
    supabaseClient.auth.onAuthStateChange((event,session)=>{ setTimeout(()=>startSession(session),0); });
  }catch(error){console.error(error);showLogin();toast("Erro ao iniciar o Supabase.");}
}

$("#loginForm")?.addEventListener("submit",async e=>{e.preventDefault();const email=$("#loginEmail").value.trim(),password=$("#loginPassword").value;const btn=e.submitter;btn.disabled=true;try{const {error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;}catch(error){toast(error.message||"Não foi possível entrar.");}finally{btn.disabled=false;}});
$("#logoutBtn")?.addEventListener("click",async()=>{await supabaseClient.auth.signOut();state={loggedIn:false,profile:{name:"Usuário",email:""},categorias:[],contas:[],emprestimos:[]};showLogin();});
$("#mobileMenu")?.addEventListener("click",()=>{$("#sidebar")?.classList.add("mobile-open");$("#mobileOverlay")?.classList.add("show")});
$("#mobileOverlay")?.addEventListener("click",closeMobileMenu);

initAuth();
