const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const defaultState = {
  loggedIn: false,
  profile: {name:"Jessyca Lisboa", email:"jessyca@exemplo.com"},
  contas: [
    {id:1, descricao:"Energia", categoria:"Moradia", valor:240, vencimento:"2026-09-10", status:"Pendente", pagoEm:"", valorPago:0},
    {id:2, descricao:"Internet", categoria:"Internet", valor:120, vencimento:"2026-09-18", status:"Pendente", pagoEm:"", valorPago:0},
    {id:3, descricao:"Ãgua", categoria:"Moradia", valor:180, vencimento:"2026-09-25", status:"Pendente", pagoEm:"", valorPago:0},
    {id:4, descricao:"Celular", categoria:"Transporte", valor:100, vencimento:"2026-09-28", status:"Pendente", pagoEm:"", valorPago:0},
    {id:5, descricao:"Conta de luz", categoria:"Moradia", valor:240, vencimento:"2026-09-05", status:"Pago", pagoEm:"2026-09-05", valorPago:240},
    {id:6, descricao:"Supermercado", categoria:"AlimentaÃ§Ã£o", valor:320, vencimento:"2026-09-04", status:"Pendente", pagoEm:"", valorPago:0},
    {id:7, descricao:"CondomÃ­nio", categoria:"Moradia", valor:980, vencimento:"2026-09-06", status:"Pago", pagoEm:"2026-09-06", valorPago:980},
    {id:8, descricao:"Plano de saÃºde", categoria:"SaÃºde", valor:450, vencimento:"2026-09-08", status:"Pago", pagoEm:"2026-09-08", valorPago:450}
  ],
  emprestimos: [
    {id:1, descricao:"EmprÃ©stimo Banco X", credor:"Banco X", total:20000, parcelas:48, valorParcela:650, primeira:"2026-10-10", status:"Ativo",
      pagamentos:[1,2,3,4,5,6,7,8].map(n=>({numero:n,pago:true,valor:650,data:"2026-09-05"}))}
  ]
};
let state = JSON.parse(localStorage.getItem("financasProState") || "null") || defaultState;
let route = "dashboard";
let calendarDate = new Date(2026,8,1);

function save(){ localStorage.setItem("financasProState", JSON.stringify(state)); }
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function dateBR(s){if(!s)return "â€”"; const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`;}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function toast(msg){const r=$("#toastRoot");r.innerHTML=`<div class="toast">${msg}</div>`;setTimeout(()=>r.innerHTML="",2500);}
function isPaid(x){return x.status==="Pago" || x.pago===true}
function totalParcelas(e){return e.parcelas*e.valorParcela}
function paidLoan(e){return (e.pagamentos||[]).filter(p=>p.pago).reduce((a,p)=>a+Number(p.valor||0),0)}
function paidCount(e){return (e.pagamentos||[]).filter(p=>p.pago).length}
function remainingLoan(e){return Math.max(0,totalParcelas(e)-paidLoan(e))}

function setRoute(r){
  route=r;
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===r));
  const meta={
    dashboard:["OlÃ¡, Jessyca! ðŸ‘‹","Veja como estÃ£o suas finanÃ§as hoje."],
    contas:["Contas","Controle suas contas da casa e acompanhe os pagamentos."],
    emprestimos:["EmprÃ©stimos","Acompanhe parcelas, pagamentos e saldo para quitaÃ§Ã£o."],
    calendario:["CalendÃ¡rio de pagamentos","Visualize contas e parcelas por data."],
    relatorios:["RelatÃ³rios","Analise seus gastos, pagamentos e compromissos."]
  }[r];
  $("#pageTitle").textContent=meta[0]; $("#pageSubtitle").textContent=meta[1];
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}
function render(){
  $("#currentDate").textContent=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
  $("#profileName").textContent=state.profile.name; $("#profileEmail").textContent=state.profile.email;
  const pages={dashboard:dashboardHTML,contas:contasHTML,emprestimos:emprestimosHTML,calendario:calendarioHTML,relatorios:relatoriosHTML};
  $("#pageContent").innerHTML=pages[route]();
  bindPage();
}
function dashboardHTML(){
  const total=state.contas.reduce((a,c)=>a+c.valor,0);
  const paid=state.contas.filter(isPaid).reduce((a,c)=>a+(c.valorPago||c.valor),0);
  const pending=state.contas.filter(c=>!isPaid(c)).reduce((a,c)=>a+c.valor,0);
  const loans=state.emprestimos.reduce((a,e)=>a+remainingLoan(e),0);
  const upcoming=[...state.contas].filter(c=>!isPaid(c)).sort((a,b)=>a.vencimento.localeCompare(b.vencimento)).slice(0,5);
  const cats={};state.contas.forEach(c=>cats[c.categoria]=(cats[c.categoria]||0)+c.valor);
  const max=Math.max(...Object.values(cats),1);
  const catRows=Object.entries(cats).slice(0,8).map(([k,v],i)=>`<div class="legend-row"><span class="dot" style="background:${["#4e7fe0","#ff6370","#f49b49","#10a99c","#9b67df","#50acd5","#f0a95a","#b9c8d5"][i]}"></span><span>${esc(k)}</span><b>${Math.round(v/total*100)}%</b><span>${money(v)}</span></div>`).join("");
  return `<div class="grid kpi-grid">
    <div class="kpi"><div class="kpi-head"><div class="kpi-icon soft-green">âŒ‚</div></div><label>Total de contas do mÃªs</label><strong>${money(total)}</strong><small>${state.contas.length} contas</small><div class="progress"><span style="width:${Math.min(100,total?paid/total*100:0)}%"></span></div></div>
    <div class="kpi"><div class="kpi-head"><div class="kpi-icon soft-green">âœ“</div></div><label>Pagas</label><strong>${money(paid)}</strong><small>${state.contas.filter(isPaid).length} contas (${Math.round(total?paid/total*100:0)}%)</small><div class="progress"><span style="width:${Math.min(100,total?paid/total*100:0)}%"></span></div></div>
    <div class="kpi"><div class="kpi-head"><div class="kpi-icon soft-red">â—·</div></div><label>Pendentes</label><strong>${money(pending)}</strong><small>${state.contas.filter(c=>!isPaid(c)).length} contas (${Math.round(total?pending/total*100:0)}%)</small><div class="progress"><span style="width:${Math.min(100,total?pending/total*100:0)}%;background:#ff6473"></span></div></div>
    <div class="kpi"><div class="kpi-head"><div class="kpi-icon soft-purple">â–¤</div></div><label>EmprÃ©stimos</label><strong>${money(loans)}</strong><small>Total a pagar (saldo)</small><div class="progress"><span style="width:${state.emprestimos.length?55:0}%;background:#7564e9"></span></div></div>
  </div>
  <div class="grid content-grid">
    <div class="panel"><div class="panel-head"><div><h3>Despesas por categoria</h3><div class="panel-sub">Este mÃªs</div></div></div><div class="donut-area"><div class="donut"></div><div class="legend">${catRows}</div></div></div>
    <div class="panel"><div class="panel-head"><div><h3>EvoluÃ§Ã£o dos gastos</h3><div class="panel-sub">Ãšltimos 6 meses</div></div></div><div class="chart-wrap">${lineChart()}</div></div>
    <div class="panel calendar-mini">${miniCalendarHTML()}<button class="calendar-actions" data-route="calendario">â–£ &nbsp; Ver todos os eventos</button></div>
  </div>
  <div class="grid bottom-grid">
    <div class="panel"><div class="panel-head"><h3>PrÃ³ximos vencimentos</h3><button class="link-btn" data-route="contas">Ver todos â†’</button></div><div class="list">${upcoming.length?upcoming.map(c=>rowConta(c)).join(""):`<div class="empty">Nenhuma conta pendente.</div>`}</div></div>
    <div class="panel"><div class="panel-head"><h3>EmprÃ©stimos</h3><button class="link-btn" data-route="emprestimos">Ver todos â†’</button></div>${state.emprestimos.length?loanSummary(state.emprestimos[0]):`<div class="empty"><strong>Nenhum emprÃ©stimo</strong>Cadastre seu primeiro emprÃ©stimo.</div>`}</div>
    <div class="panel"><div class="panel-head"><h3>Resumo financeiro</h3></div><div style="background:#f1f7fa;padding:13px;border-radius:9px"><small style="font-size:10px;color:#63809c">Saldo previsto do mÃªs</small><strong style="display:block;font-size:21px;margin-top:6px">${money(total-paid)}</strong></div><div style="background:#e6f6f4;padding:13px;border-radius:9px;margin-top:12px;font-size:11px;color:#45617b">ðŸ· <b>VocÃª estÃ¡ no controle!</b><br><span style="font-size:10px">Continue assim e mantenha suas finanÃ§as saudÃ¡veis.</span></div></div>
  </div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Ãšltimas movimentaÃ§Ãµes</h3><button class="link-btn" data-route="contas">Ver todas â†’</button></div><div class="list">${[...state.contas].sort((a,b)=>(b.pagoEm||b.vencimento).localeCompare(a.pagoEm||a.vencimento)).slice(0,3).map(c=>rowConta(c,true)).join("")}</div></div>`;
}
function lineChart(){
  const vals=[2200,3500,4100,3600,5400,4300];const labels=["Abr","Mai","Jun","Jul","Ago","Set"];const max=6000,w=600,h=190,p=32;
  const pts=vals.map((v,i)=>`${p+i*(w-2*p)/(vals.length-1)},${h-p-(v/max)*(h-2*p)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line class="axis" x1="32" y1="32" x2="32" y2="158"/><line class="axis" x1="32" y1="158" x2="580" y2="158"/><line class="axis" x1="32" y1="116" x2="580" y2="116"/><line class="axis" x1="32" y1="74" x2="580" y2="74"/><polyline class="chart-line" points="${pts}"/><polyline class="chart-area" opacity=".35" points="${pts} 548,158 32,158"/>${vals.map((v,i)=>{const x=p+i*(w-2*p)/(vals.length-1),y=h-p-(v/max)*(h-2*p);return `<circle class="point" cx="${x}" cy="${y}" r="4"/><text class="axis-label" x="${x-10}" y="177">${labels[i]}</text>`}).join("")}<text class="axis-label" x="2" y="36">R$ 6.000</text><text class="axis-label" x="2" y="78">R$ 4.000</text><text class="axis-label" x="2" y="120">R$ 2.000</text></svg>`;
}
function rowConta(c, movement=false){return `<div class="list-row"><div class="item-icon">${c.categoria==="Moradia"?"âš¡":c.categoria==="Internet"?"âŒ":"â—‰"}</div><div><strong>${esc(c.descricao)}</strong><small>${esc(c.categoria)} Â· ${movement&&isPaid(c)?dateBR(c.pagoEm):dateBR(c.vencimento)}</small></div><div class="amount">${money(c.valor)}</div><span class="badge ${isPaid(c)?"paid":"pending"}">${isPaid(c)?"Pago":"Pendente"}</span></div>`}
function loanSummary(e){const pc=paidCount(e),rem=remainingLoan(e),pct=Math.round(pc/e.parcelas*100);return `<div class="loan-card"><div class="loan-top"><div class="loan-name">â–¤ ${esc(e.descricao)}</div><span class="amount">${money(totalParcelas(e))}<small style="display:block;color:#63809c;font-weight:400">Total a pagar</small></span></div><div class="loan-values"><div><strong>${money(e.total)}</strong><small>Valor contratado</small></div></div><div class="loan-bar"><span style="width:${pct}%"></span></div><div style="display:flex;justify-content:space-between;font-size:9px;color:#66809d"><span>${pc} de ${e.parcelas} parcelas pagas</span><b>${pct}%</b></div><div class="loan-meta"><div><small>Pago</small><strong class="green">${money(paidLoan(e))}</strong></div><div><small>Restante</small><strong class="red">${money(rem)}</strong></div><div><small>PrÃ³xima parcela</small><strong>${e.primeira?dateBR(e.primeira):"â€”"}</strong><small>${money(e.valorParcela)}</small></div></div><button class="btn btn-outline btn-block" style="margin-top:12px" data-loan-view="${e.id}">Ver detalhes</button></div>`}
function miniCalendarHTML(){
  const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  let cells="";for(let i=0;i<first;i++)cells+="<td></td>";
  for(let d=1;d<=days;d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,c=state.contas.find(x=>x.vencimento===ds);let cl=c?(isPaid(c)?"paid":"pending"):"";if(d===8&&m===8)cl="today";cells+=`<td><span class="cal-dot ${cl}">${d}</span></td>`;if((d+first)%7===0)cells+="</tr><tr>"}
  return `<div class="panel-head"><div><h3>CalendÃ¡rio de pagamentos</h3><div class="panel-sub">${new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(calendarDate)}</div></div><span>â€¹ã€€â€º</span></div><table><thead><tr>${["D","S","T","Q","Q","S","S"].map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody><tr>${cells}</tr></tbody></table><div class="cal-legend"><span><i class="dot" style="background:#10b88d"></i>Pago</span><span><i class="dot" style="background:#ff6473"></i>Pendente</span><span><i class="dot" style="background:#f4c64e"></i>Vencendo hoje</span><span><i class="dot" style="background:#7c91a3"></i>Vencido</span></div>`;
}

function contasHTML(){
  const rows=state.contas.map(c=>`<tr><td><strong>${esc(c.descricao)}</strong><br><small>${esc(c.categoria)}</small></td><td>${money(c.valor)}</td><td>${dateBR(c.vencimento)}</td><td><span class="badge ${isPaid(c)?"paid":"pending"}">${isPaid(c)?"Pago":"Pendente"}</span></td><td><div class="actions">${!isPaid(c)?`<button class="action-btn" data-pay="${c.id}">Marcar paga</button>`:""}<button class="action-btn" data-edit-conta="${c.id}">Editar</button><button class="action-btn" data-delete-conta="${c.id}">Excluir</button></div></td></tr>`).join("");
  return `<div class="toolbar"><div><h2>Contas da casa</h2><p>Contas sÃ£o mantidas separadas dos emprÃ©stimos.</p></div><div class="toolbar-actions"><input id="contaSearch" class="search" placeholder="Buscar conta..."><button class="btn btn-primary" data-new-conta>+ Nova conta</button></div></div><div class="panel table-panel"><table class="data-table"><thead><tr><th>Conta</th><th>Valor</th><th>Vencimento</th><th>Status</th><th style="text-align:right">AÃ§Ãµes</th></tr></thead><tbody>${rows||`<tr><td colspan="5"><div class="empty"><strong>Nenhuma conta cadastrada</strong>Adicione sua primeira conta.</div></td></tr>`}</tbody></table></div>`;
}

function emprestimosHTML(){
  const cards=state.emprestimos.map(e=>{const pc=paidCount(e),rem=remainingLoan(e),pct=Math.round(pc/e.parcelas*100);return `<div class="panel"><div class="panel-head"><div><h3>${esc(e.descricao)}</h3><div class="panel-sub">${esc(e.credor)}</div></div><div class="toolbar-actions"><button class="action-btn" data-loan-view="${e.id}">Parcelas</button><button class="action-btn" data-delete-loan="${e.id}">Excluir</button></div></div><div class="report-cards"><div class="report-card"><label>Valor contratado</label><strong>${money(e.total)}</strong></div><div class="report-card"><label>Total previsto a pagar</label><strong>${money(totalParcelas(e))}</strong></div><div class="report-card"><label>Saldo restante</label><strong style="color:#ff5968">${money(rem)}</strong></div></div><div style="margin:15px 0 6px;display:flex;justify-content:space-between;font-size:11px;color:#63809c"><span>${pc} de ${e.parcelas} parcelas pagas</span><b>${pct}% quitado</b></div><div class="loan-bar"><span style="width:${pct}%"></span></div><div class="loan-meta" style="margin-top:10px"><div><small>Parcela</small><strong>${money(e.valorParcela)}</strong></div><div><small>Primeiro vencimento</small><strong>${dateBR(e.primeira)}</strong></div><div><small>Total pago</small><strong class="green">${money(paidLoan(e))}</strong></div></div></div>`}).join("");
  return `<div class="toolbar"><div><h2>EmprÃ©stimos</h2><p>Controle separado das contas da casa.</p></div><button class="btn btn-primary" data-new-loan>+ Novo emprÃ©stimo</button></div><div class="page-grid">${cards||`<div class="panel empty"><strong>Nenhum emprÃ©stimo cadastrado</strong>Cadastre um emprÃ©stimo para gerar automaticamente suas parcelas.</div>`}</div>`;
}

function calendarioHTML(){
  const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  let cells="";for(let i=0;i<first;i++)cells+="<div class='day muted'></div>";
  for(let d=1;d<=days;d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,items=[...state.contas.filter(c=>c.vencimento===ds).map(c=>({name:c.descricao,val:c.valor,paid:isPaid(c),type:"Conta"})),...loanEvents(ds)];cells+=`<div class="day"><b>${d}</b>${items.map(x=>`<div class="event ${x.paid?"ev-paid":"ev-pending"}"><span>${esc(x.name)}</span><strong>${money(x.val)}</strong></div>`).join("")}</div>`}
  return `<div class="toolbar"><div><h2>CalendÃ¡rio de pagamentos</h2><p>Contas pagas e pendentes por dia.</p></div><div class="toolbar-actions"><button class="btn btn-outline" data-cal-prev>â†</button><button class="btn btn-outline" data-cal-today>Hoje</button><button class="btn btn-outline" data-cal-next>â†’</button></div></div><div class="panel"><div class="panel-head"><h3 style="font-size:18px">${new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(calendarDate)}</h3><div class="filters"><select id="calFilter"><option value="all">Todos</option><option value="paid">Pagos</option><option value="pending">Pendentes</option></select></div></div><div class="calendar-grid">${["Dom","Seg","Ter","Qua","Qui","Sex","SÃ¡b"].map(x=>`<div class="weekday">${x}</div>`).join("")}${cells}</div></div>`;
}
function loanEvents(ds){
  const out=[];state.emprestimos.forEach(e=>{(e.pagamentos||[]).forEach(p=>{if(!p.data)return; if(p.data===ds)out.push({name:`${e.descricao} Â· ${p.numero}/${e.parcelas}`,val:p.valor,paid:p.pago,type:"EmprÃ©stimo"})});});
  return out;
}

function relatoriosHTML(){
  const total=state.contas.reduce((a,c)=>a+c.valor,0),paid=state.contas.filter(isPaid).reduce((a,c)=>a+(c.valorPago||c.valor),0),pending=total-paid;
  const cats={};state.contas.forEach(c=>cats[c.categoria]=(cats[c.categoria]||0)+c.valor);
  const catRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${money(v)}</td><td>${Math.round(v/Math.max(total,1)*100)}%</td><td><div class="progress"><span style="width:${v/Math.max(...Object.values(cats),1)*100}%"></span></div></td></tr>`).join("");
  return `<div class="report-cards"><div class="report-card"><label>Total lanÃ§ado</label><strong>${money(total)}</strong><small>Contas do perÃ­odo</small></div><div class="report-card"><label>Total pago</label><strong>${money(paid)}</strong><small>${Math.round(paid/Math.max(total,1)*100)}% do total</small></div><div class="report-card"><label>Total pendente</label><strong style="color:#ff5968">${money(pending)}</strong><small style="color:#d76a16">Acompanhe os vencimentos</small></div></div><div class="grid page-grid" style="margin-top:14px"><div class="panel"><div class="panel-head"><div><h3>Gastos por categoria</h3><div class="panel-sub">DistribuiÃ§Ã£o das contas cadastradas</div></div></div><table class="data-table"><thead><tr><th>Categoria</th><th>Valor</th><th>%</th><th>ParticipaÃ§Ã£o</th></tr></thead><tbody>${catRows}</tbody></table></div><div class="panel"><div class="panel-head"><div><h3>Resumo de emprÃ©stimos</h3><div class="panel-sub">PosiÃ§Ã£o atual</div></div></div>${state.emprestimos.length?state.emprestimos.map(e=>`<div class="list-row"><div class="item-icon">â–¤</div><div><strong>${esc(e.descricao)}</strong><small>${paidCount(e)}/${e.parcelas} parcelas pagas</small></div><div class="amount">${money(remainingLoan(e))}</div><span class="badge pending">Saldo</span></div>`).join(""):`<div class="empty">Nenhum emprÃ©stimo.</div>`}</div></div>`;
}

function openModal(title,body,submitText="Salvar",onSubmit=()=>{}){
  $("#modalRoot").innerHTML=`<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close-modal>Ã—</button></div><form id="modalForm"><div class="modal-body">${body}</div><div class="modal-foot"><button type="button" class="btn btn-outline" data-close-modal>Cancelar</button><button class="btn btn-primary">${submitText}</button></div></form></div></div>`;
  $("#modalForm").addEventListener("submit",e=>{e.preventDefault();onSubmit(new FormData(e.currentTarget));$("#modalRoot").innerHTML="";});
  $$("[data-close-modal]").forEach(b=>b.onclick=()=>$("#modalRoot").innerHTML="");
}
function newConta(id=null){
  const c=id?state.contas.find(x=>x.id==id):{};
  openModal(id?"Editar conta":"Nova conta",`<div class="form-grid">
    <div class="field full"><label>DescriÃ§Ã£o<input name="descricao" required value="${esc(c.descricao||"")}"></label></div>
    <div class="field"><label>Categoria<select name="categoria">${["Moradia","AlimentaÃ§Ã£o","Transporte","SaÃºde","EducaÃ§Ã£o","Internet","Lazer","Outros"].map(x=>`<option ${x===c.categoria?"selected":""}>${x}</option>`).join("")}</select></label></div>
    <div class="field"><label>Valor<input name="valor" type="number" step=".01" min="0" required value="${c.valor||""}"></label></div>
    <div class="field"><label>Data de vencimento<input name="vencimento" type="date" required value="${c.vencimento||""}"></label></div>
    <div class="field"><label>ObservaÃ§Ã£o<input name="obs" value="${esc(c.obs||"")}"></label></div>
  </div>`,id?"Atualizar":"Cadastrar",f=>{const obj={id:id||Date.now(),descricao:f.get("descricao"),categoria:f.get("categoria"),valor:Number(f.get("valor")),vencimento:f.get("vencimento"),status:c.status||"Pendente",pagoEm:c.pagoEm||"",valorPago:c.valorPago||0,obs:f.get("obs")}; if(id)state.contas=state.contas.map(x=>x.id==id?obj:x);else state.contas.push(obj);save();render();toast(id?"Conta atualizada":"Conta cadastrada");});
}
function newLoan(){
  openModal("Novo emprÃ©stimo",`<div class="form-grid">
    <div class="field full"><label>DescriÃ§Ã£o<input name="descricao" placeholder="Ex.: EmprÃ©stimo Banco X" required></label></div>
    <div class="field"><label>Credor / instituiÃ§Ã£o<input name="credor" placeholder="Banco X" required></label></div>
    <div class="field"><label>Valor contratado<input name="total" type="number" step=".01" required></label></div>
    <div class="field"><label>Quantidade de parcelas<input name="parcelas" type="number" min="1" required></label></div>
    <div class="field"><label>Valor da parcela<input name="valorParcela" type="number" step=".01" required></label></div>
    <div class="field"><label>Primeiro vencimento<input name="primeira" type="date" required></label></div>
    <div class="field full"><label>ObservaÃ§Ã£o<textarea name="obs"></textarea></label></div>
  </div>`,`Cadastrar emprÃ©stimo`,f=>{
    const e={id:Date.now(),descricao:f.get("descricao"),credor:f.get("credor"),total:Number(f.get("total")),parcelas:Number(f.get("parcelas")),valorParcela:Number(f.get("valorParcela")),primeira:f.get("primeira"),status:"Ativo",obs:f.get("obs"),pagamentos:[]};
    const start=new Date(e.primeira+"T12:00:00"); for(let i=1;i<=e.parcelas;i++){const d=new Date(start);d.setMonth(d.getMonth()+i-1);e.pagamentos.push({numero:i,pago:false,valor:e.valorParcela,data:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`})}
    state.emprestimos.push(e);save();render();toast("EmprÃ©stimo cadastrado e parcelas geradas");
  });
}
function viewLoan(id){
  const e=state.emprestimos.find(x=>x.id==id);if(!e)return;
  const rows=e.pagamentos.map(p=>`<tr><td>${p.numero}/${e.parcelas}</td><td>${dateBR(p.data)}</td><td>${money(p.valor)}</td><td><span class="badge ${p.pago?"paid":"pending"}">${p.pago?"Pago":"Pendente"}</span></td><td>${p.pago?`<button class="action-btn" data-unpay="${e.id}:${p.numero}">Desfazer</button>`:`<button class="action-btn" data-loan-pay="${e.id}:${p.numero}">Pagar</button>`}</td></tr>`).join("");
  openModal(e.descricao,`<div class="report-cards"><div class="report-card"><label>Valor contratado</label><strong>${money(e.total)}</strong></div><div class="report-card"><label>Total pago</label><strong style="color:#08a987">${money(paidLoan(e))}</strong></div><div class="report-card"><label>Falta quitar</label><strong style="color:#ff5968">${money(remainingLoan(e))}</strong></div></div><div class="panel table-panel" style="margin-top:14px"><table class="data-table"><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>AÃ§Ã£o</th></tr></thead><tbody>${rows}</tbody></table></div>`,"Fechar",()=>{});
}
function payConta(id){
  const c=state.contas.find(x=>x.id==id);if(!c)return;
  openModal("Registrar pagamento",`<div class="form-grid"><div class="field"><label>Data do pagamento<input name="data" type="date" value="${new Date().toISOString().slice(0,10)}" required></label></div><div class="field"><label>Valor pago<input name="valor" type="number" step=".01" value="${c.valor}" required></label></div></div>`,"Confirmar pagamento",f=>{c.status="Pago";c.pagoEm=f.get("data");c.valorPago=Number(f.get("valor"));save();render();toast("Pagamento registrado");});
}

function bindPage(){
  $$("[data-route]").forEach(b=>b.onclick=()=>setRoute(b.dataset.route));
  $("[data-new-conta]")?.addEventListener("click",()=>newConta());
  $("[data-new-loan]")?.addEventListener("click",newLoan);
  $$("[data-edit-conta]").forEach(b=>b.onclick=()=>newConta(b.dataset.editConta));
  $$("[data-delete-conta]").forEach(b=>b.onclick=()=>{if(confirm("Excluir esta conta?")){state.contas=state.contas.filter(x=>x.id!=b.dataset.deleteConta);save();render();toast("Conta excluída")}});
  $$("[data-pay]").forEach(b=>b.onclick=()=>payConta(b.dataset.pay));
  $$("[data-delete-loan]").forEach(b=>b.onclick=()=>{if(confirm("Excluir este empréstimo e suas parcelas?")){state.emprestimos=state.emprestimos.filter(x=>x.id!=b.dataset.deleteLoan);save();render();toast("Empréstimo excluído")}});
  $$("[data-loan-view]").forEach(b=>b.onclick=()=>viewLoan(b.dataset.loanView));
  $$("[data-cal-prev]").forEach(b=>b.onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);render()});
  $$("[data-cal-next]").forEach(b=>b.onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);render()});
  $$("[data-cal-today]").forEach(b=>b.onclick=()=>{calendarDate=new Date();calendarDate.setDate(1);render()});
  $$("[data-loan-pay],[data-unpay]").forEach(b=>b.onclick=()=>{
    const [eid,num]=(b.dataset.loanPay||b.dataset.unpay).split(":");const e=state.emprestimos.find(x=>x.id==eid),p=e.pagamentos.find(x=>x.numero==num);
    p.pago=b.hasAttribute("data-loan-pay");if(p.pago)p.data=new Date().toISOString().slice(0,10);save();viewLoan(eid);toast(p.pago?"Parcela paga":"Pagamento desfeito");
  });
  $("#contaSearch")?.addEventListener("input",e=>{$$(".data-table tbody tr").forEach(r=>r.style.display=r.textContent.toLowerCase().includes(e.target.value.toLowerCase())?"":"none")});
}
$$(".nav-item").forEach(b=>b.onclick=()=>setRoute(b.dataset.route));
$("#loginForm").addEventListener("submit",e=>{e.preventDefault();state.loggedIn=true;state.profile.email=$("#loginEmail").value;state.profile.name=state.profile.email.split("@")[0].replace(/[._-]/g," ").replace(/\b\w/g,c=>c.toUpperCase());save();boot();toast("Login realizado")});
$("#logoutBtn").onclick=()=>{state.loggedIn=false;save();boot()};
$("#mobileMenu").onclick=()=>$("#sidebar").classList.toggle("mobile-open");
function boot(){if(state.loggedIn){$("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");render()}else{$("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden")}}
boot();

/* CalendÃ¡rio principal */
const style=document.createElement("style");style.textContent=`
.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);border:1px solid #e2edf2;border-right:0;border-bottom:0}
.weekday{background:#f8fbfc;color:#6c879e;text-align:center;font-size:11px;font-weight:600;padding:10px;border-right:1px solid #e2edf2;border-bottom:1px solid #e2edf2}
.day{min-height:100px;padding:8px;border-right:1px solid #e2edf2;border-bottom:1px solid #e2edf2;background:#fff}
.day.muted{background:#f8fafb}.day>b{font-size:11px}.event{font-size:9px;padding:5px 6px;border-radius:6px;margin-top:7px;display:flex;justify-content:space-between;gap:4px}.ev-paid{background:#e2f8f1;color:#078c74}.ev-pending{background:#ffe7ea;color:#e85b69}.event strong{font-size:8px;white-space:nowrap}
@media(max-width:760px){.day{min-height:85px}.event{display:block}.event strong{display:block;margin-top:2px}}
`;document.head.appendChild(style);

