/* Finanças Pro — Revisão 2
   - Sem dados fictícios
   - Supabase Auth + leitura dos dados do usuário
   - Layout responsivo com menu mobile seguro
   - Dashboard vazio quando o banco estiver vazio
*/

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const SUPABASE_URL = "https://bcepclvnyjobytqasodx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dtzJI72uUuKsE-bwMwW3Qg_qOpjHkeO";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const emptyState = () => ({
  loggedIn: false,
  profile: { name: "Usuário", email: "" },
  contas: [],
  emprestimos: [],
  categorias: []
});

let state = emptyState();
let currentUser = null;
let route = "dashboard";
let calendarDate = new Date();
calendarDate.setDate(1);

function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dateBR(s) {
  if (!s) return "—";
  const value = String(s).slice(0, 10);
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}
function toast(msg, error = false) {
  const root = $("#toastRoot");
  if (!root) return;
  root.innerHTML = `<div class="toast ${error ? "toast-error" : ""}">${esc(msg)}</div>`;
  setTimeout(() => { root.innerHTML = ""; }, 3000);
}
function isPaid(x) { return x.status === "Pago" || x.pago === true || x.status === "paid"; }
function totalParcelas(e) { return Number(e.parcelas || 0) * Number(e.valorParcela || 0); }
function paidLoan(e) { return (e.pagamentos || []).filter(p => p.pago).reduce((a, p) => a + Number(p.valor || 0), 0); }
function paidCount(e) { return (e.pagamentos || []).filter(p => p.pago).length; }
function remainingLoan(e) { return Math.max(0, totalParcelas(e) - paidLoan(e)); }
function initials(name) {
  const parts = String(name || "Usuário").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(p => p[0]).join("") || "U").toUpperCase();
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function closeMobileMenu() { $("#sidebar")?.classList.remove("mobile-open"); $("#mobileOverlay")?.classList.remove("show"); document.body.classList.remove("menu-open"); }

function setRoute(r) {
  if (!Object.prototype.hasOwnProperty.call({ dashboard: 1, contas: 1, emprestimos: 1, calendario: 1, relatorios: 1 }, r)) r = "dashboard";
  route = r;
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.route === r));
  const name = state.profile.name || "Usuário";
  const meta = {
    dashboard: [`Olá, ${name}! 👋`, "Veja como estão suas finanças hoje."],
    contas: ["Contas", "Controle suas contas e acompanhe os pagamentos."],
    emprestimos: ["Empréstimos", "Acompanhe parcelas, pagamentos e saldo para quitação."],
    calendario: ["Calendário de pagamentos", "Visualize contas e parcelas por data."],
    relatorios: ["Relatórios", "Analise seus gastos, pagamentos e compromissos."]
  }[r];
  $("#pageTitle").textContent = meta[0];
  $("#pageSubtitle").textContent = meta[1];
  closeMobileMenu();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  try {
    const now = new Date();
    $("#currentDate").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
    $("#profileName").textContent = state.profile.name || "Usuário";
    $("#profileEmail").textContent = state.profile.email || "";
    $("#profileAvatar").textContent = initials(state.profile.name);
    $("#topAvatar").textContent = initials(state.profile.name);
    const pages = { dashboard: dashboardHTML, contas: contasHTML, emprestimos: emprestimosHTML, calendario: calendarioHTML, relatorios: relatoriosHTML };
    $("#pageContent").innerHTML = pages[route]();
    bindPage();
  } catch (error) {
    console.error("Erro de renderização:", error);
    $("#pageContent").innerHTML = `<div class="panel error-panel"><strong>Não foi possível carregar esta tela.</strong><p>Atualize a página. Se o problema continuar, verifique a conexão com o Supabase.</p></div>`;
  }
}

function dashboardHTML() {
  const total = state.contas.reduce((a, c) => a + Number(c.valor || 0), 0);
  const paid = state.contas.filter(isPaid).reduce((a, c) => a + Number(c.valorPago || c.valor || 0), 0);
  const pending = state.contas.filter(c => !isPaid(c)).reduce((a, c) => a + Number(c.valor || 0), 0);
  const loans = state.emprestimos.reduce((a, e) => a + remainingLoan(e), 0);
  const paidCountBills = state.contas.filter(isPaid).length;
  const pendingCount = state.contas.filter(c => !isPaid(c)).length;
  const upcoming = [...state.contas].filter(c => !isPaid(c)).sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento))).slice(0, 5);
  const cats = {};
  state.contas.forEach(c => { const k = c.categoria || "Sem categoria"; cats[k] = (cats[k] || 0) + Number(c.valor || 0); });
  const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const catRows = catEntries.length ? catEntries.map(([k, v], i) => `<div class="legend-row"><span class="dot dot-${i % 8}"></span><span>${esc(k)}</span><b>${total ? Math.round(v / total * 100) : 0}%</b><span>${money(v)}</span></div>`).join("") : `<div class="empty compact">Nenhuma despesa cadastrada.</div>`;
  const progressPaid = total ? Math.min(100, paid / total * 100) : 0;
  const progressPending = total ? Math.min(100, pending / total * 100) : 0;

  return `<div class="grid kpi-grid">
    <button class="kpi kpi-clickable" data-route="contas" aria-label="Ver todas as contas">
      <div class="kpi-head"><div class="kpi-icon soft-green">◒</div><span class="kpi-link">Ver contas →</span></div>
      <label>Total de contas do mês</label><strong>${money(total)}</strong><small>${state.contas.length} ${state.contas.length === 1 ? "conta" : "contas"}</small>
      <div class="progress"><span style="width:${progressPaid}%"></span></div>
    </button>
    <button class="kpi kpi-clickable" data-route="contas" data-focus-status="paid" aria-label="Ver contas pagas">
      <div class="kpi-head"><div class="kpi-icon soft-green">✓</div><span class="kpi-link">Ver pagas →</span></div>
      <label>Pagas</label><strong>${money(paid)}</strong><small>${paidCountBills} ${paidCountBills === 1 ? "conta" : "contas"} (${Math.round(total ? paid / total * 100 : 0)}%)</small>
      <div class="progress"><span style="width:${progressPaid}%"></span></div>
    </button>
    <button class="kpi kpi-clickable" data-route="contas" data-focus-status="pending" aria-label="Ver contas pendentes">
      <div class="kpi-head"><div class="kpi-icon soft-red">◷</div><span class="kpi-link">Ver pendentes →</span></div>
      <label>Pendentes</label><strong>${money(pending)}</strong><small>${pendingCount} ${pendingCount === 1 ? "conta" : "contas"} (${Math.round(total ? pending / total * 100 : 0)}%)</small>
      <div class="progress"><span class="red-fill" style="width:${progressPending}%"></span></div>
    </button>
    <button class="kpi kpi-clickable" data-route="emprestimos" aria-label="Ver empréstimos">
      <div class="kpi-head"><div class="kpi-icon soft-purple">▤</div><span class="kpi-link">Ver empréstimos →</span></div>
      <label>Empréstimos</label><strong>${money(loans)}</strong><small>${state.emprestimos.length} ${state.emprestimos.length === 1 ? "empréstimo" : "empréstimos"}</small>
      <div class="progress"><span class="purple-fill" style="width:${state.emprestimos.length ? 35 : 0}%"></span></div>
    </button>
  </div>
  <div class="grid content-grid">
    <div class="panel"><div class="panel-head"><div><h3>Despesas por categoria</h3><div class="panel-sub">Contas cadastradas</div></div></div><div class="donut-area">${catEntries.length ? `<div class="donut"><span>${money(total)}</span><small>Total</small></div>` : `<div class="donut donut-empty"><span>R$ 0</span><small>Sem dados</small></div>`}<div class="legend">${catRows}</div></div></div>
    <div class="panel"><div class="panel-head"><div><h3>Evolução dos gastos</h3><div class="panel-sub">Dados reais das contas</div></div></div><div class="chart-wrap">${lineChart()}</div></div>
    <div class="panel calendar-mini">${miniCalendarHTML()}<button class="calendar-actions" data-route="calendario">▦ &nbsp; Ver todos os eventos</button></div>
  </div>
  <div class="grid bottom-grid">
    <div class="panel"><div class="panel-head"><h3>Próximos vencimentos</h3><button class="link-btn" data-route="contas">Ver todos →</button></div><div class="list">${upcoming.length ? upcoming.map(c => rowConta(c)).join("") : `<div class="empty"><strong>Nenhum vencimento pendente</strong>Suas contas pendentes aparecerão aqui.</div>`}</div></div>
    <div class="panel"><div class="panel-head"><h3>Empréstimos</h3><button class="link-btn" data-route="emprestimos">Ver todos →</button></div>${state.emprestimos.length ? loanSummary(state.emprestimos[0]) : `<div class="empty"><strong>Nenhum empréstimo</strong>Cadastre um empréstimo para acompanhar as parcelas.</div>`}</div>
    <div class="panel"><div class="panel-head"><h3>Resumo financeiro</h3></div><div class="summary-box"><small>Saldo previsto das contas</small><strong>${money(total - paid)}</strong></div><div class="tip-box">💡 <b>Você está no controle.</b><br><span>Os valores exibidos aqui vêm dos seus registros.</span></div></div>
  </div>
  <div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Últimas movimentações</h3><button class="link-btn" data-route="contas">Ver todas →</button></div><div class="list">${state.contas.length ? [...state.contas].sort((a,b) => String(b.pagoEm || b.vencimento).localeCompare(String(a.pagoEm || a.vencimento))).slice(0,3).map(c => rowConta(c,true)).join("") : `<div class="empty">Nenhuma movimentação registrada.</div>`}</div></div>`;
}

function lineChart() {
  const months = [];
  const base = new Date(); base.setDate(1);
  for (let i = 5; i >= 0; i--) { const d = new Date(base); d.setMonth(base.getMonth() - i); months.push(d); }
  const vals = months.map(m => state.contas.filter(c => { const d = new Date(String(c.vencimento).slice(0,10) + "T12:00:00"); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); }).reduce((a,c) => a + Number(c.valor || 0), 0));
  const labels = months.map(d => new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d).replace(".", ""));
  const maxValue = Math.max(...vals, 1); const w=600,h=190,p=32;
  const pts = vals.map((v,i) => `${p + i*(w-2*p)/(vals.length-1)},${h-p-(v/maxValue)*(h-2*p)}`).join(" ");
  const circles = vals.map((v,i) => { const x=p+i*(w-2*p)/(vals.length-1), y=h-p-(v/maxValue)*(h-2*p); return `<circle class="point" cx="${x}" cy="${y}" r="4"/><text class="axis-label" x="${x-12}" y="177">${esc(labels[i])}</text>`; }).join("");
  const ticks = [0.33,0.66,1].map((f,i) => { const y=h-p-(h-2*p)*f; return `<line class="axis" x1="32" y1="${y}" x2="580" y2="${y}"/><text class="axis-label" x="2" y="${y+4}">${money(maxValue*f).replace(",00","")}</text>`; }).join("");
  if (!state.contas.length) return `<div class="chart-empty"><span>R$ 0,00</span><small>O gráfico será preenchido quando houver contas.</small></div>`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line class="axis" x1="32" y1="32" x2="32" y2="158"/>${ticks}<polyline class="chart-line" points="${pts}"/><polyline class="chart-area" points="${pts} 568,158 32,158"/>${circles}</svg>`;
}

function rowConta(c, movement=false) {
  return `<div class="list-row"><div class="item-icon">◉</div><div><strong>${esc(c.descricao)}</strong><small>${esc(c.categoria || "Sem categoria")} · ${movement && isPaid(c) ? dateBR(c.pagoEm) : dateBR(c.vencimento)}</small></div><div class="amount">${money(c.valor)}</div><span class="badge ${isPaid(c) ? "paid" : "pending"}">${isPaid(c) ? "Pago" : "Pendente"}</span></div>`;
}
function loanSummary(e) {
  const pc=paidCount(e), rem=remainingLoan(e), pct=e.parcelas ? Math.round(pc/e.parcelas*100) : 0;
  return `<div class="loan-card"><div class="loan-top"><div class="loan-name">▤ ${esc(e.descricao)}</div><span class="amount">${money(totalParcelas(e))}<small>Total previsto</small></span></div><div class="loan-values"><div><strong>${money(e.total)}</strong><small>Valor contratado</small></div></div><div class="loan-bar"><span style="width:${pct}%"></span></div><div class="loan-progress-label"><span>${pc} de ${e.parcelas} parcelas pagas</span><b>${pct}%</b></div><div class="loan-meta"><div><small>Pago</small><strong class="green">${money(paidLoan(e))}</strong></div><div><small>Restante</small><strong class="red">${money(rem)}</strong></div><div><small>Próxima parcela</small><strong>${dateBR(e.primeira)}</strong><small>${money(e.valorParcela)}</small></div></div><button class="btn btn-outline btn-block" style="margin-top:12px" data-loan-view="${esc(e.id)}">Ver detalhes</button></div>`;
}
function miniCalendarHTML() {
  const y=calendarDate.getFullYear(), m=calendarDate.getMonth(), first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate(), today=todayISO();
  let cells="";
  for(let i=0;i<first;i++) cells += "<td></td>";
  for(let d=1;d<=days;d++) { const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, c=state.contas.find(x=>x.vencimento===ds); let cl=ds===today?"today":""; if(c) cl += ` ${isPaid(c)?"paid":"pending"}`; cells += `<td><span class="cal-dot ${cl}">${d}</span></td>`; if((d+first)%7===0 && d!==days) cells += "</tr><tr>"; }
  return `<div class="panel-head"><div><h3>Calendário de pagamentos</h3><div class="panel-sub">${new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(calendarDate)}</div></div></div><table class="mini-calendar-table"><thead><tr>${["D","S","T","Q","Q","S","S"].map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody><tr>${cells}</tr></tbody></table><div class="cal-legend"><span><i class="dot dot-paid"></i>Pago</span><span><i class="dot dot-pending"></i>Pendente</span><span><i class="dot dot-today"></i>Hoje</span></div>`;
}

function contasHTML() {
  const rows = state.contas.map(c => `<tr><td><strong>${esc(c.descricao)}</strong><br><small>${esc(c.categoria || "Sem categoria")}</small></td><td>${money(c.valor)}</td><td>${dateBR(c.vencimento)}</td><td><span class="badge ${isPaid(c)?"paid":"pending"}">${isPaid(c)?"Pago":"Pendente"}</span></td><td><div class="actions">${!isPaid(c)?`<button class="action-btn" data-pay="${esc(c.id)}">Marcar paga</button>`:""}<button class="action-btn" data-edit-conta="${esc(c.id)}">Editar</button><button class="action-btn" data-delete-conta="${esc(c.id)}">Excluir</button></div></td></tr>`).join("");
  return `<div class="toolbar"><div><h2>Contas da casa</h2><p>Dados carregados da sua conta no Supabase.</p></div><div class="toolbar-actions"><input id="contaSearch" class="search" placeholder="Buscar conta..." aria-label="Buscar conta"><select id="contaStatusFilter" class="search-select"><option value="all">Todas</option><option value="paid">Pagas</option><option value="pending">Pendentes</option></select><button class="btn btn-primary" data-new-conta>+ Nova conta</button></div></div><div class="panel table-panel"><table class="data-table"><thead><tr><th>Conta</th><th>Valor</th><th>Vencimento</th><th>Status</th><th style="text-align:right">Ações</th></tr></thead><tbody>${rows || `<tr><td colspan="5"><div class="empty"><strong>Nenhuma conta cadastrada</strong>Quando você cadastrar uma conta, ela aparecerá aqui.</div></td></tr>`}</tbody></table></div>`;
}
function emprestimosHTML() {
  const cards = state.emprestimos.map(e=>{const pc=paidCount(e),rem=remainingLoan(e),pct=e.parcelas?Math.round(pc/e.parcelas*100):0;return `<div class="panel"><div class="panel-head"><div><h3>${esc(e.descricao)}</h3><div class="panel-sub">${esc(e.credor || "")}</div></div><div class="toolbar-actions"><button class="action-btn" data-loan-view="${esc(e.id)}">Parcelas</button><button class="action-btn" data-delete-loan="${esc(e.id)}">Excluir</button></div></div><div class="report-cards"><div class="report-card"><label>Valor contratado</label><strong>${money(e.total)}</strong></div><div class="report-card"><label>Total previsto a pagar</label><strong>${money(totalParcelas(e))}</strong></div><div class="report-card"><label>Saldo restante</label><strong class="red-text">${money(rem)}</strong></div></div><div class="loan-progress-label loan-page-progress"><span>${pc} de ${e.parcelas} parcelas pagas</span><b>${pct}% quitado</b></div><div class="loan-bar"><span style="width:${pct}%"></span></div><div class="loan-meta loan-page-meta"><div><small>Parcela</small><strong>${money(e.valorParcela)}</strong></div><div><small>Primeiro vencimento</small><strong>${dateBR(e.primeira)}</strong></div><div><small>Total pago</small><strong class="green">${money(paidLoan(e))}</strong></div></div></div>`}).join("");
  return `<div class="toolbar"><div><h2>Empréstimos</h2><p>Dados carregados da sua conta no Supabase.</p></div><button class="btn btn-primary" data-new-loan>+ Novo empréstimo</button></div><div class="page-grid">${cards || `<div class="panel empty"><strong>Nenhum empréstimo cadastrado</strong>Cadastre um empréstimo para acompanhar suas parcelas.</div>`}</div>`;
}
function calendarioHTML() {
  const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),today=todayISO(); let cells="";
  for(let i=0;i<first;i++) cells += `<div class="day muted"></div>`;
  for(let d=1;d<=days;d++){const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,items=[...state.contas.filter(c=>c.vencimento===ds).map(c=>({name:c.descricao,val:c.valor,paid:isPaid(c)})),...loanEvents(ds)];cells+=`<div class="day ${ds===today?"day-today":""}"><b>${d}</b>${items.map(x=>`<div class="event ${x.paid?"ev-paid":"ev-pending"}"><span>${esc(x.name)}</span><strong>${money(x.val)}</strong></div>`).join("")}</div>`}
  return `<div class="toolbar"><div><h2>Calendário de pagamentos</h2><p>Contas e parcelas por data.</p></div><div class="toolbar-actions"><button class="btn btn-outline" data-cal-prev>←</button><button class="btn btn-outline" data-cal-today>Hoje</button><button class="btn btn-outline" data-cal-next>→</button></div></div><div class="panel"><div class="panel-head"><h3 style="font-size:18px">${new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(calendarDate)}</h3></div><div class="calendar-grid">${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(x=>`<div class="weekday">${x}</div>`).join("")}${cells}</div></div>`;
}
function loanEvents(ds) { const out=[]; state.emprestimos.forEach(e=>(e.pagamentos||[]).forEach(p=>{if(p.data===ds)out.push({name:`${e.descricao} · ${p.numero}/${e.parcelas}`,val:p.valor,paid:p.pago});})); return out; }
function relatoriosHTML() {
  const total=state.contas.reduce((a,c)=>a+Number(c.valor||0),0),paid=state.contas.filter(isPaid).reduce((a,c)=>a+Number(c.valorPago||c.valor||0),0),pending=total-paid; const cats={}; state.contas.forEach(c=>{const k=c.categoria||"Sem categoria";cats[k]=(cats[k]||0)+Number(c.valor||0);}); const catRows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${money(v)}</td><td>${Math.round(v/Math.max(total,1)*100)}%</td><td><div class="progress"><span style="width:${v/Math.max(...Object.values(cats),1)*100}%"></span></div></td></tr>`).join("");
  return `<div class="report-cards"><div class="report-card"><label>Total lançado</label><strong>${money(total)}</strong><small>Contas cadastradas</small></div><div class="report-card"><label>Total pago</label><strong>${money(paid)}</strong><small>${Math.round(paid/Math.max(total,1)*100)}% do total</small></div><div class="report-card"><label>Total pendente</label><strong class="red-text">${money(pending)}</strong><small>Acompanhe os vencimentos</small></div></div><div class="grid page-grid" style="margin-top:14px"><div class="panel"><div class="panel-head"><div><h3>Gastos por categoria</h3><div class="panel-sub">Distribuição das contas cadastradas</div></div></div><table class="data-table"><thead><tr><th>Categoria</th><th>Valor</th><th>%</th><th>Participação</th></tr></thead><tbody>${catRows||`<tr><td colspan="4"><div class="empty">Nenhum dado para analisar.</div></td></tr>`}</tbody></table></div><div class="panel"><div class="panel-head"><div><h3>Resumo de empréstimos</h3><div class="panel-sub">Posição atual</div></div></div>${state.emprestimos.length?state.emprestimos.map(e=>`<div class="list-row"><div class="item-icon">▤</div><div><strong>${esc(e.descricao)}</strong><small>${paidCount(e)}/${e.parcelas} parcelas pagas</small></div><div class="amount">${money(remainingLoan(e))}</div><span class="badge pending">Saldo</span></div>`).join(""):`<div class="empty">Nenhum empréstimo.</div>`}</div></div>`;
}

function openModal(title,body,submitText="Salvar",onSubmit=async()=>{}) {
  $("#modalRoot").innerHTML=`<div class="modal-backdrop" id="modalBackdrop"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close-modal aria-label="Fechar">×</button></div><form id="modalForm"><div class="modal-body">${body}</div><div class="modal-foot"><button type="button" class="btn btn-outline" data-close-modal>Cancelar</button><button class="btn btn-primary" type="submit">${submitText}</button></div></form></div></div>`;
  $("#modalForm").addEventListener("submit",async e=>{e.preventDefault();const submit=e.submitter;submit.disabled=true;try{await onSubmit(new FormData(e.currentTarget));$("#modalRoot").innerHTML="";}catch(err){console.error(err);toast(err.message||"Não foi possível concluir a operação.",true);submit.disabled=false;}});
  $$('[data-close-modal]').forEach(b=>b.onclick=()=>$("#modalRoot").innerHTML="");
}

function categoryOptions(selected="") {
  const cats = state.categorias.length ? state.categorias : ["Moradia","Alimentação","Transporte","Saúde","Educação","Internet","Lazer","Outros"];
  return cats.map(x=>{const id=x.id ?? "", name=x.nome ?? x.name ?? x; return `<option value="${esc(id || name)}" ${String(id||name)===String(selected)?"selected":""}>${esc(name)}</option>`;}).join("");
}
function newConta(id=null) {
  const c=id?state.contas.find(x=>String(x.id)===String(id)):{};
  openModal(id?"Editar conta":"Nova conta",`<div class="form-grid"><div class="field full"><label>Descrição<input name="descricao" required value="${esc(c.descricao||"")}"></label></div><div class="field"><label>Categoria<select name="categoria" required>${categoryOptions(c.categoriaId||c.categoria||"")}</select></label></div><div class="field"><label>Valor<input name="valor" type="number" step="0.01" min="0" required value="${c.valor||""}"></label></div><div class="field"><label>Data de vencimento<input name="vencimento" type="date" required value="${String(c.vencimento||"").slice(0,10)}"></label></div><div class="field full"><label>Observação<input name="obs" value="${esc(c.obs||"")}"></label></div></div>`,id?"Atualizar":"Cadastrar",async f=>{await saveConta(id,f);});
}
async function saveConta(id,f){
  if(!currentUser) throw new Error("Sessão expirada. Entre novamente.");
  const categoriaValue=f.get("categoria");
  const selectedCat=state.categorias.find(x=>String(x.id)===String(categoriaValue));
  const payload={usuario_id:currentUser.id,descricao:f.get("descricao"),valor:Number(f.get("valor")),data_vencimento:f.get("vencimento"),status:id?(state.contas.find(x=>String(x.id)===String(id))?.status||"Pendente"):"Pendente",data_pagamento:id?(state.contas.find(x=>String(x.id)===String(id))?.pagoEm||null):null,observacao:f.get("obs")||null};
  if(selectedCat) payload.categoria_id=selectedCat.id;
  let result=id?await supabaseClient.from("contas").update(payload).eq("id",id).eq("usuario_id",currentUser.id):await supabaseClient.from("contas").insert(payload);
  if(result.error) throw result.error;
  await loadFinanceData(); render(); toast(id?"Conta atualizada":"Conta cadastrada");
}
function newLoan(){
  openModal("Novo empréstimo",`<div class="form-grid"><div class="field full"><label>Descrição<input name="descricao" required></label></div><div class="field"><label>Credor / instituição<input name="credor" required></label></div><div class="field"><label>Valor contratado<input name="total" type="number" step="0.01" min="0" required></label></div><div class="field"><label>Quantidade de parcelas<input name="parcelas" type="number" min="1" required></label></div><div class="field"><label>Valor da parcela<input name="valorParcela" type="number" step="0.01" min="0" required></label></div><div class="field"><label>Primeiro vencimento<input name="primeira" type="date" required></label></div><div class="field full"><label>Observação<textarea name="obs"></textarea></label></div></div>`,"Cadastrar empréstimo",async f=>{
    if(!currentUser) throw new Error("Sessão expirada. Entre novamente.");
    const payload={usuario_id:currentUser.id,descricao:f.get("descricao"),credor:f.get("credor"),valor_total:Number(f.get("total")),numero_parcelas:Number(f.get("parcelas")),valor_parcela:Number(f.get("valorParcela")),primeira_parcela:f.get("primeira"),status:"Ativo",observacao:f.get("obs")||null};
    const {data,error}=await supabaseClient.from("emprestimos").insert(payload).select().single();
    if(error) throw error;
    const rows=[];const start=new Date(String(f.get("primeira"))+"T12:00:00");for(let i=1;i<=Number(f.get("parcelas"));i++){const d=new Date(start);d.setMonth(d.getMonth()+i-1);rows.push({usuario_id:currentUser.id,emprestimo_id:data.id,numero:i,valor:Number(f.get("valorParcela")),data_vencimento:d.toISOString().slice(0,10),status:"Pendente"});}
    if(rows.length){const ins=await supabaseClient.from("emprestimo_parcelas").insert(rows);if(ins.error){await supabaseClient.from("emprestimos").delete().eq("id",data.id).eq("usuario_id",currentUser.id);throw ins.error;}}
    await loadFinanceData();render();toast("Empréstimo cadastrado e parcelas geradas");
  });
}
function viewLoan(id){const e=state.emprestimos.find(x=>String(x.id)===String(id));if(!e)return;const rows=(e.pagamentos||[]).map(p=>`<tr><td>${p.numero}/${e.parcelas}</td><td>${dateBR(p.data)}</td><td>${money(p.valor)}</td><td><span class="badge ${p.pago?"paid":"pending"}">${p.pago?"Pago":"Pendente"}</span></td><td>${p.pago?`<button class="action-btn" data-unpay="${e.id}:${p.numero}">Desfazer</button>`:`<button class="action-btn" data-loan-pay="${e.id}:${p.numero}">Pagar</button>`}</td></tr>`).join("");openModal(e.descricao,`<div class="report-cards"><div class="report-card"><label>Valor contratado</label><strong>${money(e.total)}</strong></div><div class="report-card"><label>Total pago</label><strong class="green-text">${money(paidLoan(e))}</strong></div><div class="report-card"><label>Falta quitar</label><strong class="red-text">${money(remainingLoan(e))}</strong></div></div><div class="panel table-panel" style="margin-top:14px"><table class="data-table"><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows||`<tr><td colspan="5"><div class="empty">Nenhuma parcela encontrada.</div></td></tr>`}</tbody></table></div>`);}
function payConta(id){const c=state.contas.find(x=>String(x.id)===String(id));if(!c)return;openModal("Registrar pagamento",`<div class="form-grid"><div class="field"><label>Data do pagamento<input name="data" type="date" value="${todayISO()}" required></label></div><div class="field"><label>Valor pago<input name="valor" type="number" step="0.01" value="${c.valor}" required></label></div></div>`,"Confirmar pagamento",async f=>{const {error}=await supabaseClient.from("contas").update({status:"Pago",data_pagamento:f.get("data"),valor_pago:Number(f.get("valor"))}).eq("id",id).eq("usuario_id",currentUser.id);if(error)throw error;await loadFinanceData();render();toast("Pagamento registrado");});}

async function deleteConta(id){if(!confirm("Excluir esta conta?"))return;const {error}=await supabaseClient.from("contas").delete().eq("id",id).eq("usuario_id",currentUser.id);if(error){toast(error.message,true);return;}await loadFinanceData();render();toast("Conta excluída");}
async function deleteLoan(id){if(!confirm("Excluir este empréstimo e suas parcelas?"))return;const p=await supabaseClient.from("emprestimo_parcelas").delete().eq("emprestimo_id",id).eq("usuario_id",currentUser.id);if(p.error){toast(p.error.message,true);return;}const e=await supabaseClient.from("emprestimos").delete().eq("id",id).eq("usuario_id",currentUser.id);if(e.error){toast(e.error.message,true);return;}await loadFinanceData();render();toast("Empréstimo excluído");}
async function setLoanPayment(eid,num,pay){const p=state.emprestimos.find(x=>String(x.id)===String(eid))?.pagamentos.find(x=>String(x.numero)===String(num));if(!p)return;const payload=pay?{status:"Pago",data_pagamento:todayISO()}:{status:"Pendente",data_pagamento:null};const {error}=await supabaseClient.from("emprestimo_parcelas").update(payload).eq("emprestimo_id",eid).eq("numero",num).eq("usuario_id",currentUser.id);if(error){toast(error.message,true);return;}await loadFinanceData();viewLoan(eid);toast(pay?"Parcela paga":"Pagamento desfeito");}

function bindPage(){
  $$('[data-route]').forEach(b=>b.onclick=()=>setRoute(b.dataset.route));
  $("[data-new-conta]")?.addEventListener("click",()=>newConta());
  $("[data-new-loan]")?.addEventListener("click",newLoan);
  $$('[data-edit-conta]').forEach(b=>b.onclick=()=>newConta(b.dataset.editConta));
  $$('[data-delete-conta]').forEach(b=>b.onclick=()=>deleteConta(b.dataset.deleteConta));
  $$('[data-pay]').forEach(b=>b.onclick=()=>payConta(b.dataset.pay));
  $$('[data-delete-loan]').forEach(b=>b.onclick=()=>deleteLoan(b.dataset.deleteLoan));
  $$('[data-loan-view]').forEach(b=>b.onclick=()=>viewLoan(b.dataset.loanView));
  $$('[data-cal-prev]').forEach(b=>b.onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);render();});
  $$('[data-cal-next]').forEach(b=>b.onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);render();});
  $$('[data-cal-today]').forEach(b=>b.onclick=()=>{calendarDate=new Date();calendarDate.setDate(1);render();});
  $$('[data-loan-pay]').forEach(b=>b.onclick=()=>{const [eid,num]=b.dataset.loanPay.split(":");setLoanPayment(eid,num,true);});
  $$('[data-unpay]').forEach(b=>b.onclick=()=>{const [eid,num]=b.dataset.unpay.split(":");setLoanPayment(eid,num,false);});
  const search=$("#contaSearch"), filter=$("#contaStatusFilter");
  const apply=()=>{$$(".data-table tbody tr").forEach(r=>{const text=r.textContent.toLowerCase(), q=(search?.value||"").toLowerCase(), okSearch=text.includes(q), status=filter?.value||"all", badge=r.querySelector(".badge"), okStatus=status==="all"||((status==="paid")?badge?.classList.contains("paid"):badge?.classList.contains("pending"));r.style.display=okSearch&&okStatus?"":"none";});};
  search?.addEventListener("input",apply);filter?.addEventListener("change",apply);
  $$('[data-focus-status]').forEach(b=>b.addEventListener("click",()=>setTimeout(()=>{$("#contaStatusFilter") && ($("#contaStatusFilter").value=b.dataset.focusStatus,$("#contaStatusFilter").dispatchEvent(new Event("change")));},0)));
}

async function loadProfile(user){
  let name=user.user_metadata?.full_name||user.user_metadata?.name||user.user_metadata?.nome||"";
  try { const {data}=await supabaseClient.from("profiles").select("*").eq("id",user.id).maybeSingle(); if(data) name=data.nome||data.name||data.full_name||name; } catch(e){ console.warn("Perfil opcional não carregado:",e.message); }
  if(!name) name=user.email?.split("@")[0]?.replace(/[._-]/g," ").replace(/\b\w/g,c=>c.toUpperCase())||"Usuário";
  state.profile={name,email:user.email||""};
}

function normalizeConta(row){
  return {id:row.id,descricao:row.descricao||row.nome||"Sem descrição",categoriaId:row.categoria_id,categoria:row.categoria?.nome||row.categoria_nome||row.categoria||"Sem categoria",valor:Number(row.valor||0),vencimento:row.data_vencimento||row.vencimento,pagoEm:row.data_pagamento||row.pago_em||"",valorPago:Number(row.valor_pago||0),status:row.status||"Pendente",obs:row.observacao||row.obs||""};
}
function normalizeLoan(row, installments){
  const pags=(installments||[]).filter(p=>String(p.emprestimo_id)===String(row.id)).map(p=>({id:p.id,numero:Number(p.numero),pago:(p.status||"").toLowerCase()==="pago"||p.pago===true,valor:Number(p.valor||p.valor_parcela||0),data:p.data_vencimento||p.vencimento,dataPagamento:p.data_pagamento}));
  return {id:row.id,descricao:row.descricao||"Empréstimo",credor:row.credor||"",total:Number(row.valor_total??row.total??0),parcelas:Number(row.numero_parcelas??row.parcelas??pags.length),valorParcela:Number(row.valor_parcela??row.valorParcela??(pags[0]?.valor||0)),primeira:row.primeira_parcela||row.primeira||pags[0]?.data||"",status:row.status||"Ativo",obs:row.observacao||"",pagamentos:pags};
}

async function loadFinanceData(){
  if(!currentUser) return;
  const [catsRes,contasRes,loansRes,partsRes] = await Promise.all([
    supabaseClient.from("categorias").select("*").eq("usuario_id",currentUser.id).order("nome"),
    supabaseClient.from("contas").select("*, categoria:categorias(nome)").eq("usuario_id",currentUser.id).order("data_vencimento",{ascending:true}),
    supabaseClient.from("emprestimos").select("*").eq("usuario_id",currentUser.id).order("created_at",{ascending:false}),
    supabaseClient.from("emprestimo_parcelas").select("*").eq("usuario_id",currentUser.id).order("numero",{ascending:true})
  ]);
  const failures=[catsRes,contasRes,loansRes,partsRes].filter(r=>r.error);
  if(failures.length) { console.error("Falha ao carregar dados:",failures.map(x=>x.error)); throw failures[0].error; }
  state.categorias=catsRes.data||[];
  state.contas=(contasRes.data||[]).map(normalizeConta);
  state.emprestimos=(loansRes.data||[]).map(r=>normalizeLoan(r,partsRes.data||[]));
}

async function applySession(session){
  currentUser=session?.user||null;
  if(!currentUser){state=emptyState();$("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden");closeMobileMenu();return;}
  try {
    state=emptyState(); state.loggedIn=true; await loadProfile(currentUser); await loadFinanceData();
    $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");
    setRoute("dashboard");
  } catch(error) {
    console.error(error);
    state=emptyState(); state.loggedIn=true; state.profile={name:currentUser.email?.split("@")[0]||"Usuário",email:currentUser.email||""};
    $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");setRoute("dashboard");
    toast("Não foi possível ler os dados do Supabase. O painel foi aberto vazio.",true);
  }
}

async function initAuth(){
  $("#appLoading")?.classList.add("hidden");
  const {data,error}=await supabaseClient.auth.getSession();
  if(error){console.error(error);toast("Não foi possível verificar a sessão.",true);bootLogin();return;}
  await applySession(data.session);
  supabaseClient.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>applySession(session),0);});
}
function bootLogin(){state=emptyState();$("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden");}

$("#loginForm")?.addEventListener("submit",async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;$("#loginError").textContent="";try{const {error}=await supabaseClient.auth.signInWithPassword({email:$("#loginEmail").value.trim(),password:$("#loginPassword").value});if(error)throw error;toast("Login realizado");}catch(error){console.error(error);$("#loginError").textContent=error.message||"Não foi possível entrar.";}finally{btn.disabled=false;}});
$("#logoutBtn")?.addEventListener("click",async()=>{const {error}=await supabaseClient.auth.signOut();if(error)toast(error.message,true);});
$("#mobileMenu")?.addEventListener("click",()=>{const open=$("#sidebar").classList.toggle("mobile-open");$("#mobileOverlay").classList.toggle("show",open);document.body.classList.toggle("menu-open",open);});
$("#mobileOverlay")?.addEventListener("click",closeMobileMenu);
$$('.nav-item').forEach(b=>b.addEventListener("click",()=>setRoute(b.dataset.route)));

document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeMobileMenu();$("#modalRoot").innerHTML="";}});

initAuth();
