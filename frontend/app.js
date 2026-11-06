'use strict';

const app = document.getElementById('app');
const toastBox = document.getElementById('toast');
const state = {
  token: sessionStorage.getItem('g10_token') || '',
  user: JSON.parse(sessionStorage.getItem('g10_user') || 'null'),
  view: 'dashboard', rows: [], options: {}, editing: null, extra: []
};

const navItems = [
  {id:'dashboard', title:'Visão geral', icon:'▦'},
  {id:'alunos', title:'Alunos', icon:'♧', coord:true},
  {id:'disciplinas', title:'Disciplinas', icon:'▤', coord:true},
  {id:'turmas', title:'Turmas', icon:'▣'},
  {id:'matriculas', title:'Matrículas', icon:'☷'},
  {id:'notas', title:'Notas e boletim', icon:'✎'},
  {id:'frequencias', title:'Frequência', icon:'◷'},
  {id:'auditoria', title:'Auditoria', icon:'◎', coord:true},
  {id:'diagnostico', title:'PostgreSQL / RLS', icon:'⚙', coord:true}
];
const resources = {
  alunos: {
    title:'Gestão de alunos', subtitle:'Cadastro, edição e exclusão de estudantes.',
    columns:[['nome','Aluno'],['matricula','Matrícula'],['email','E-mail']],
    fields:[{key:'nome',label:'Nome completo',required:true},{key:'matricula',label:'Matrícula',required:true},
      {key:'email',label:'E-mail',type:'email',required:true}]
  },
  disciplinas: {
    title:'Gestão de disciplinas', subtitle:'Componentes curriculares e cargas horárias.',
    columns:[['codigo','Código'],['nome','Disciplina'],['carga_horaria','Carga horária']],
    fields:[{key:'codigo',label:'Código',required:true},{key:'nome',label:'Nome da disciplina',required:true},
      {key:'cargaHoraria',label:'Carga horária (h)',type:'number',min:1,required:true}]
  },
  turmas: {
    title:'Gestão de turmas', subtitle:'Vincule disciplinas e professores responsáveis.',
    columns:[['nome','Turma'],['disciplina','Disciplina'],['professor','Professor'],['periodo','Período']],
    fields:[{key:'nome',label:'Nome da turma',required:true},
      {key:'disciplinaId',label:'Disciplina',source:'disciplinas',required:true},
      {key:'professorId',label:'Professor',source:'professores',required:true},
      {key:'periodo',label:'Período',required:true}]
  },
  matriculas: {
    title:'Matrículas', subtitle:'Cadastre a participação dos alunos nas turmas.',
    columns:[['aluno','Aluno'],['turma','Turma'],['id','Identificador']],
    fields:[{key:'alunoId',label:'Aluno',source:'alunos',required:true},
      {key:'turmaId',label:'Turma',source:'turmas',required:true}]
  }
};
const isCoord = () => state.user?.perfil === 'COORDENADOR';
const esc = value => String(value ?? '—').replace(/[&<>"']/g, x =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const snake = s => s.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
const fmt = value => value === null || value === undefined ? '—' :
  typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : esc(value);
const msg = (message, error=false) => {
  toastBox.textContent = message; toastBox.className = (error ? 'error ' : '') + 'show';
  clearTimeout(msg.timer); msg.timer = setTimeout(() => toastBox.className = '', 4100);
};

async function api(path, options={}) {
  const headers = {'Accept':'application/json'};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body !== undefined) headers['Content-Type']='application/json';
  let response;
  try { response = await fetch('/api'+path, {...options,headers:{...headers,...(options.headers||{})}}); }
  catch (_) { throw new Error('Não foi possível conectar à API. Confira o Docker Compose.'); }
  let body = null;
  try { body = await response.json(); } catch (_) { /* sem JSON */ }
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      signOut(false);
      throw new Error('Sessão encerrada. Entre novamente.');
    }
    throw new Error(body?.erro || body?.message || `Erro HTTP ${response.status}`);
  }
  return body;
}

function signOut(notify=true) {
  state.token=''; state.user=null;
  sessionStorage.removeItem('g10_token');sessionStorage.removeItem('g10_user');
  renderLogin();if (notify) msg('Sessão encerrada.');
}
function renderLogin() {
  app.innerHTML = `<main class="login-bg"><section class="login-card">
    <div class="login-brand"><div class="brand-icon">✦</div><div><b>Acadêmico G10</b><small>Plataforma interna • PostgreSQL</small></div></div>
    <h1>Bem-vindo de volta</h1><p>Entre com sua conta de professor ou coordenador para continuar.</p>
    <form id="login-form">
      <div class="login-field"><label for="login">Usuário</label><input id="login" name="login" value="coordenacao" autocomplete="username" required></div>
      <div class="login-field"><label for="senha">Senha</label><input id="senha" name="senha" type="password" placeholder="Sua senha" autocomplete="current-password" required></div>
      <button class="btn btn-primary login-submit" type="submit">Entrar na plataforma →</button>
    </form>
    <div class="demo-users"><h3>Acessos de demonstração</h3>
      <button type="button" class="demo-user" data-action="demo" data-login="coordenacao" data-password="Coord@123"><b>👑 Coordenação</b><span>coordenacao / Coord@123</span></button>
      <button type="button" class="demo-user" data-action="demo" data-login="ana" data-password="Prof@123"><b>👩‍🏫 Professora Ana</b><span>ana / Prof@123</span></button>
      <button type="button" class="demo-user" data-action="demo" data-login="bruno" data-password="Prof@123"><b>👨‍🏫 Professor Bruno</b><span>bruno / Prof@123</span></button>
    </div><p style="text-align:center;margin-top:18px;font-size:11px">Projeto educacional G10 · Acesso restrito</p>
  </section></main>`;
}
function shell() {
  const current = navItems.find(n => n.id===state.view);
  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-icon">✦</div><div><strong>Acadêmico G10</strong><small>GESTÃO INTELIGENTE</small></div></div>
      <div><div class="section-label">Área de trabalho</div><nav class="nav" aria-label="Navegação principal">
       ${navItems.filter(n => !n.coord || isCoord()).map(n=>`<button type="button" data-action="navigate" data-view="${n.id}" class="${n.id===state.view?'active':''}"><span class="nav-icon">${n.icon}</span>${esc(n.title)}</button>`).join('')}
      </nav></div>
      <div class="sidebar-bottom"><div class="profile-name">${esc(state.user?.nome)}</div><div class="profile-role">${isCoord()?'Coordenador':'Professor'} · ambiente interno</div>
      <button type="button" class="logout" data-action="logout">Sair da conta ↗</button></div>
    </aside>
    <main class="main"><div class="topbar"><div class="breadcrumb">Plataforma Acadêmica / <b>${esc(current?.title)}</b></div><span class="pill">Sistema em operação</span></div>
    <div id="content"><div class="panel empty">Carregando dados da API...</div></div></main>
  </div>`;
}
function pageTitle(title, desc) {return `<div class="page-head"><div><h1>${esc(title)}</h1><p class="lead">${esc(desc)}</p></div></div>`;}
function table(cols, rows, action='', emptyText='Nenhum registro encontrado.') {
  if (!rows.length) return `<div class="empty"><strong>Sem resultados</strong>${esc(emptyText)}</div>`;
  return `<div class="table-wrap"><table class="table"><thead><tr>
    ${cols.map(c => `<th>${esc(c[1])}</th>`).join('')}${action?'<th>Ações</th>':''}
    </tr></thead><tbody>${rows.map(row => `<tr>${cols.map(c=>`<td class="${c[2]||''}">${c[3]?c[3](row[c[0]],row):fmt(row[c[0]])}</td>`).join('')}
    ${action?`<td><div class="actions">${action(row)}</div></td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
function statusTag(status) {
  const styles = {'APROVADO':'success','REPROVADO':'danger','SEM NOTAS':'warning','SEM FREQUENCIA':'neutral'};
  return `<span class="tag ${styles[status]||'neutral'}">${esc(status)}</span>`;
}
function formField(f, row={}) {
  const val = row[snake(f.key)] ?? row[f.key] ?? '';
  const type = f.type || 'text';
  const required = f.required ? 'required' : '';
  let input;
  if (f.source) {
    const opts = state.options[f.source] || [];
    input = `<select name="${esc(f.key)}" ${required}><option value="">Selecione...</option>${opts.map(o=> {
      const title = f.source==='turmas' ? `${o.nome} (${o.disciplina || ''})` : (o.nome || o.aluno || o.id);
      return `<option value="${Number(o.id)}" ${String(val)===String(o.id)?'selected':''}>${esc(title)}</option>`;
    }).join('')}</select>`;
  } else {
    input = `<input name="${esc(f.key)}" type="${esc(type)}" value="${esc(val)}" ${required}
        ${f.min !== undefined?`min="${f.min}"`:''}${f.max !== undefined?`max="${f.max}"`:''}
        ${type==='number'?`step="${f.step||1}"`:''} maxlength="180">`;
  }
  return `<div class="form-field"><label>${esc(f.label)}</label>${input}</div>`;
}
function formPanel(title, fields, row, name) {
  return `<section class="panel"><div class="panel-head"><div><h2>${esc(title)}</h2><div class="panel-desc">Os campos são validados pela API e pelo banco.</div></div></div>
    <form id="data-form" data-kind="${name}"><div class="form-grid">${fields.map(f=>formField(f,row)).join('')}</div>
    <div class="form-actions">${state.editing!==null?'<button type="button" class="btn btn-outline" data-action="cancel">Cancelar</button>':''}
      <button class="btn btn-primary" type="submit">${state.editing!==null?'Salvar alterações':'Adicionar registro'}</button></div>
    </form></section>`;
}

async function loadView() {
  const requested = state.view;
  const content = document.getElementById('content');
  if (!content) return;
  content.innerHTML = '<div class="panel empty">Buscando informações no PostgreSQL...</div>';
  try {
    if (requested === 'dashboard') {
      const data=await api('/resumo');if (requested!==state.view) return;renderDashboard(content,data);
    } else if (resources[requested]) {
      const spec=resources[requested];
      const needs=spec.fields.filter(f=>f.source).map(f=>f.source);
      const calls=[api('/'+requested),...needs.map(key=>api(key==='professores'?'/usuarios/professores':'/'+key))];
      const all=await Promise.all(calls);if(requested!==state.view)return;
      state.rows=all[0];state.options={};needs.forEach((key,i)=>state.options[key]=all[i+1]);
      renderResource(content,requested);
    } else if (requested === 'notas') {
      const [rows,matriculas]=await Promise.all([api('/notas'),api('/matriculas')]);
      if(requested!==state.view)return;state.rows=rows;state.options={matriculas};renderNotas(content);
    } else if (requested === 'frequencias') {
      const [rows,matriculas,resumo]=await Promise.all([api('/frequencias'),api('/matriculas'),api('/frequencias/resumo')]);
      if(requested!==state.view)return;state.rows=rows;state.options={matriculas};state.extra=resumo;renderFrequencias(content);
    } else if (requested === 'auditoria') {
      const rows=await api('/auditoria');if(requested!==state.view)return;state.rows=rows;renderAuditoria(content);
    } else if (requested === 'diagnostico') {
      const data=await api('/diagnostico');if(requested!==state.view)return;renderDiagnostico(content,data);
    }
  } catch(ex){if(document.getElementById('content')) document.getElementById('content').innerHTML=`<div class="panel empty"><strong>Não foi possível carregar</strong>${esc(ex.message)}</div>`;}
}
function navigate(view) {
  if (!navItems.some(n=>n.id===view&&(!n.coord||isCoord()))) return;
  state.view=view;state.editing=null;shell();loadView();window.scrollTo({top:0,behavior:'auto'});
}
function renderDashboard(el, data) {
  el.innerHTML=pageTitle('Painel acadêmico',`Olá, ${state.user.nome}. Acompanhe as notas e a frequência em tempo real.`)+`
  <section class="hero"><div><h2>Organização que vira resultado.</h2><p>Notas, frequência e matrículas integradas. O PostgreSQL aplica políticas de segurança e registra alterações automaticamente.</p></div><div class="hero-illustration">◈</div></section>
  <section class="stats">
    <div class="stat"><span class="symbol">▦</span><small>Matrículas visíveis</small><b>${data.matriculas}</b></div>
    <div class="stat"><span class="symbol">✓</span><small>Alunos aprovados</small><b>${data.aprovados}</b></div>
    <div class="stat"><span class="symbol">◷</span><small>Situações pendentes</small><b>${data.pendentes}</b></div>
  </section>
  <section class="panel"><div class="panel-head"><h2>Boletim acadêmico · View PostgreSQL</h2><button class="btn btn-light btn-small" data-action="navigate" data-view="notas">Gerenciar notas ↗</button></div>
    ${table([['aluno','Aluno'],['disciplina','Disciplina'],['media','Média'],['percentual_frequencia','Frequência (%)'],['situacao','Situação','',statusTag]],data.boletim)}
  </section>`;
}
function renderResource(el, name) {
  const spec=resources[name];
  const editRow=state.rows.find(r=>String(r.id)===String(state.editing))||{};
  const showForm=isCoord();
  el.innerHTML=pageTitle(spec.title,spec.subtitle)+
    (showForm?formPanel(state.editing!==null?'Editar registro':'Novo cadastro',spec.fields,editRow,name):'')+
    `<section class="panel"><div class="panel-head"><h2>Registros cadastrados</h2><span class="tag">${state.rows.length} registros</span></div>`+
    table(spec.columns,state.rows,showForm?r=>`<button class="btn btn-light btn-small" data-action="edit" data-id="${r.id}">Editar</button><button class="btn btn-danger btn-small" data-action="delete" data-id="${r.id}">Excluir</button>`:'')+'</section>';
}
function gradeFields() {
  const row=state.rows.find(r=>String(r.matricula_id)===String(state.editing))||{};
  const opts=state.options.matriculas||[];
  const current=state.editing??'';
  return `<div class="form-field"><label>Matrícula do aluno</label>
  <select name="matriculaId" required ${state.editing!==null?'disabled':''}><option value="">Selecione...</option>
  ${opts.map(r=>`<option value="${r.id}" ${String(current)===String(r.id)?'selected':''}>${esc(r.aluno)} — ${esc(r.turma)} (#${r.id})</option>`).join('')}</select></div>
  ${formField({key:'nota1',label:'1ª nota (0 a 10)',type:'number',min:0,max:10,step:0.1,required:true},row)}
  ${formField({key:'nota2',label:'2ª nota (0 a 10)',type:'number',min:0,max:10,step:0.1,required:true},row)}`;
}
function renderNotas(el) {
  el.innerHTML=pageTitle('Notas e boletim','Lançamento por procedure SQL. Média e situação calculadas por function PostgreSQL.')+
  `<section class="panel"><div class="panel-head"><h2>${state.editing!==null?'Atualizar lançamento':'Lançar ou atualizar notas'}</h2><span class="tag">sp_lancar_notas</span></div>
  <form id="data-form" data-kind="notas"><div class="form-grid">${gradeFields()}</div><div class="form-actions">
  ${state.editing!==null?'<button class="btn btn-outline" type="button" data-action="cancel">Cancelar</button>':''}
  <button class="btn btn-primary" type="submit">${state.editing!==null?'Atualizar nota':'Salvar notas'}</button></div></form></section>
  <section class="panel"><div class="panel-head"><h2>Boletim (vw_boletim)</h2><span class="tag">RLS ativo</span></div>
  ${table([['aluno','Aluno'],['turma','Turma'],['nota1','Nota 1'],['nota2','Nota 2'],['media','Média'],
    ['percentual_frequencia','Frequência (%)'],['situacao','Situação','',statusTag]],state.rows,r=>`
    <button class="btn btn-light btn-small" data-action="edit" data-id="${r.matricula_id}">${r.nota1===null?'Lançar':'Editar'}</button>
    ${r.nota1!==null?`<button class="btn btn-danger btn-small" data-action="delete" data-id="${r.matricula_id}">Excluir</button>`:''}`)}
  </section>`;
}
function renderFrequencias(el) {
  const row=state.rows.find(r=>String(r.id)===String(state.editing))||{};
  const options=state.options.matriculas||[];
  el.innerHTML=pageTitle('Controle de frequência','Presenças e faltas por matrícula e data. RLS protege os registros de outros professores.')+
  `<section class="panel"><div class="panel-head"><h2>${state.editing!==null?'Editar frequência':'Registrar aula'}</h2><span class="tag">Trigger de auditoria</span></div>
    <form id="data-form" data-kind="frequencias"><div class="form-grid">
      <div class="form-field"><label>Matrícula do aluno</label><select name="matriculaId" required ${state.editing!==null?'disabled':''}>
      <option value="">Selecione...</option>${options.map(m=>`<option value="${m.id}" ${String(row.matricula_id)===String(m.id)?'selected':''}>${esc(m.aluno)} — ${esc(m.turma)} (#${m.id})</option>`).join('')}</select></div>
      ${formField({key:'dataAula',label:'Data da aula',type:'date',required:true}, {data_aula:row.data_aula||new Date().toISOString().slice(0,10)})}
      <div class="form-field"><label>Presença</label><select name="presente" required><option value="true" ${row.presente!==false?'selected':''}>Presente</option><option value="false" ${row.presente===false?'selected':''}>Faltou</option></select></div>
    </div><div class="form-actions">${state.editing!==null?'<button type="button" class="btn btn-outline" data-action="cancel">Cancelar</button>':''}
    <button type="submit" class="btn btn-primary">Salvar frequência</button></div></form>
  </section>
  <section class="panel"><div class="panel-head"><h2>Presenças e faltas</h2><span class="tag">${state.rows.length} lançamentos</span></div>
    ${table([['aluno','Aluno'],['turma','Turma'],['data_aula','Data da aula'],['presente','Presença','',v=>`<span class="tag ${v?'success':'danger'}">${v?'Presente':'Falta'}</span>`]],state.rows,r=>`
    <button class="btn btn-light btn-small" data-action="edit" data-id="${r.id}">Editar</button>
    <button class="btn btn-danger btn-small" data-action="delete" data-id="${r.id}">Excluir</button>`)}</section>
  <section class="panel"><div class="panel-head"><h2>Resumo da frequência · Segunda View</h2><span class="tag">vw_frequencia_resumo</span></div>
    ${table([['aluno','Aluno'],['turma','Turma'],['total_aulas','Aulas'],['presencas','Presenças'],['faltas','Faltas'],['percentual_frequencia','Frequência (%)']],state.extra)}</section>`;
}
function renderAuditoria(el) {
  const formatJson = value => {
    if (!value) return '—';
    let txt = typeof value==='string'?value:JSON.stringify(value,null,2);
    return `<details class="details"><summary>Exibir JSON</summary><pre>${esc(txt)}</pre></details>`;
  };
  el.innerHTML=pageTitle('Auditoria e rastreabilidade','Logs imutáveis para a aplicação, registrados automaticamente pelos triggers do PostgreSQL.')+
  `<section class="panel"><div class="panel-head"><h2>audit.log_eventos</h2><span class="tag">Últimos 80 eventos</span></div>
  ${table([['id','ID'],['tabela','Tabela'],['operacao','Operação','',v=>`<span class="tag ${v==='DELETE'?'danger':v==='INSERT'?'success':'warning'}">${esc(v)}</span>`],
    ['usuario_id','ID operador'],['role_db','Role SQL'],['criado_em','Horário'],['dados_antes','Antes','',formatJson],['dados_depois','Depois','',formatJson]],state.rows)}</section>`;
}
function renderDiagnostico(el,data) {
  const pairs=Object.entries(data);
  el.innerHTML=pageTitle('Infraestrutura PostgreSQL','Verifique os recursos ativos no banco sem sair do sistema.')+
  `<section class="hero"><div><h2>Segurança em múltiplas camadas</h2><p>SPA → Spring Boot → HikariCP → PgBouncer → PostgreSQL. O servidor aceita conexões apenas do IP do PgBouncer.</p></div><div class="hero-illustration">⬡</div></section>
  <section class="panel"><div class="panel-head"><h2>Configurações do banco em execução</h2><span class="tag success">Consulta SQL real</span></div>
    <div class="diag-grid">${pairs.map(([k,v])=>`<div class="diag-item"><span>${esc(k.replaceAll('_',' ').toUpperCase())}</span><strong>${fmt(v)}</strong></div>`).join('')}</div></section>
  <section class="panel"><h2 style="margin-bottom:11px">Teste demonstrável: statement_timeout</h2>
    <p class="panel-desc">O endpoint executa SELECT pg_sleep(5), mas o PostgreSQL cancela a query após 3 segundos. A API captura o erro SQLSTATE 57014.</p>
    <div class="code">-- Consulta de demonstração<br>SELECT pg_sleep(5);<br>-- Esperado: canceling statement due to statement timeout</div>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:15px"><button class="btn btn-primary" data-action="timeout">Executar teste do timeout</button><span id="timeout-result" class="muted" style="font-size:12px"></span></div>
  </section>
  <section class="panel"><h2 style="margin-bottom:9px">O que está sendo validado?</h2><p class="panel-desc">Os privilégios reais do banco são diferentes por perfil. A função set_config('app.usuario_id', ..., true) associa a identidade do operador somente à transação atual. As views foram criadas como security_invoker=true para não contornar RLS.</p></section>`;
}

function rerenderCurrent() {
  const el=document.getElementById('content');if(!el)return;
  if(resources[state.view]) renderResource(el,state.view);
  else if(state.view==='notas') renderNotas(el);
  else if(state.view==='frequencias') renderFrequencias(el);
}
function payload(form) {
  const obj=Object.fromEntries(new FormData(form).entries());
  for (const key of Object.keys(obj)) {
    if (['disciplinaId','professorId','alunoId','turmaId','matriculaId','cargaHoraria','nota1','nota2'].includes(key))
      obj[key] = Number(obj[key]);
    if(key==='presente') obj[key] = obj[key]==='true';
  }
  return obj;
}

app.addEventListener('submit', async e=>{
  const form=e.target;if(form.id!=='login-form'&&form.id!=='data-form')return;
  e.preventDefault();const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
  try {
    if(form.id==='login-form') {
      const data=await api('/auth/login',{method:'POST',body:JSON.stringify(payload(form))});
      state.token=data.token;state.user=data.usuario;
      sessionStorage.setItem('g10_token',state.token);
      sessionStorage.setItem('g10_user',JSON.stringify(state.user));
      state.view='dashboard';state.editing=null;shell();await loadView();msg('Bem-vindo ao sistema!');
    } else {
      const kind=form.dataset.kind;let path='/'+kind;let method='POST';const body=payload(form);
      if(state.editing!==null) {
        path+='/'+state.editing;method='PUT';
        if(kind==='notas')delete body.matriculaId;
        if(kind==='frequencias')delete body.matriculaId;
      }
      await api(path,{method,body:JSON.stringify(body)});
      state.editing=null;msg('Registro salvo. Auditoria e regras do banco aplicadas.');await loadView();
    }
  } catch(ex) {msg(ex.message,true);} finally {if(submit)submit.disabled=false;}
});

app.addEventListener('click', async e=>{
  const btn=e.target.closest('[data-action]');if(!btn)return;
  const action=btn.dataset.action;
  if(action==='navigate'){navigate(btn.dataset.view);return;}
  if(action==='logout'){signOut();return;}
  if(action==='demo'){
    document.getElementById('login').value=btn.dataset.login;
    document.getElementById('senha').value=btn.dataset.password;
    msg('Credenciais de demonstração preenchidas.');return;
  }
  if(action==='cancel'){state.editing=null;rerenderCurrent();return;}
  if(action==='edit'){
    state.editing=Number(btn.dataset.id);rerenderCurrent();window.scrollTo({top:0,behavior:'smooth'});return;
  }
  if(action==='delete'){
    const id=Number(btn.dataset.id);
    if(!confirm('Excluir este registro? A exclusão pode afetar dados vinculados.'))return;
    try{await api('/'+state.view+'/'+id,{method:'DELETE'});state.editing=null;msg('Registro excluído.');await loadView();}
    catch(ex){msg(ex.message,true);}return;
  }
  if(action==='timeout'){
    const result=document.getElementById('timeout-result');btn.disabled=true;
    if(result)result.textContent='Testando timeout no servidor...';
    try {const data=await api('/diagnostico/timeout',{method:'POST'});
      if(result)result.innerHTML=`<span class="tag ${data.timeout_acionado?'success':'warning'}">${esc(data.detalhe)}</span>`;
    } catch(ex) {if(result)result.textContent=ex.message;msg(ex.message,true);}
    finally{btn.disabled=false;}
  }
});

if(state.token&&state.user) {shell();api('/auth/me').then(u=>{
  state.user=u;sessionStorage.setItem('g10_user',JSON.stringify(u));shell();loadView();
}).catch(()=>signOut(false));}
else renderLogin();
