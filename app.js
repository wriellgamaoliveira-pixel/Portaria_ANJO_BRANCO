const APP_CONFIG = {
  SENHA_MESTRA: 'Anjo@2026',
  STORAGE_KEY: 'portaria_registros',
  USERS_KEY: 'usuarios',
  VEHICLES_KEY: 'veiculos',
  DRIVERS_KEY: 'motoristas',
  HELPERS_KEY: 'ajudantes',
  ROUTES_KEY: 'rotas'
};

const state = { registros: [], token: sessionStorage.getItem('token') || '', user: null };
const el = (id) => document.getElementById(id);
const b64 = (s) => btoa(unescape(encodeURIComponent(s)));

const loadJSON = (k, fallback = []) => {
  try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); }
  catch { return fallback; }
};
const saveJSON = (k, value) => localStorage.setItem(k, JSON.stringify(value));

function bootstrap() {
  if (!localStorage.getItem(APP_CONFIG.USERS_KEY)) {
    saveJSON(APP_CONFIG.USERS_KEY, [
      { nome: 'Administrador', login: 'admin', tipo: 'ADMINISTRADOR', status: 'Ativo', senha: b64('Anjo@2026') },
      { nome: 'Portaria', login: 'portaria', tipo: 'PORTARIA', status: 'Ativo', senha: b64('portaria123') }
    ]);
  }
  [APP_CONFIG.STORAGE_KEY, APP_CONFIG.VEHICLES_KEY, APP_CONFIG.DRIVERS_KEY, APP_CONFIG.HELPERS_KEY, APP_CONFIG.ROUTES_KEY]
    .forEach((k) => { if (!localStorage.getItem(k)) saveJSON(k, []); });
}

function login(mode, user, senha) {
  if (mode === 'mestra') {
    if (senha !== APP_CONFIG.SENHA_MESTRA) throw new Error('Senha mestra inválida.');
    state.user = { nome: 'Mestre', tipo: 'ADMINISTRADOR' };
  } else {
    const users = loadJSON(APP_CONFIG.USERS_KEY);
    const found = users.find((u) => (u.login || '').toLowerCase() === user.toLowerCase() && u.senha === b64(senha));
    if (!found) throw new Error('Usuário ou senha inválidos.');
    state.user = found;
  }
  state.token = 'local-auth-ok';
  sessionStorage.setItem('token', state.token);
  sessionStorage.setItem('user', JSON.stringify(state.user));
}

function initAuthUI() {
  const sessionUser = sessionStorage.getItem('user');
  if (state.token && sessionUser) state.user = JSON.parse(sessionUser);

  el('login-screen').classList.toggle('hidden', !!state.token);
  el('app').classList.toggle('hidden', !state.token);

  if (state.token) {
    state.registros = loadJSON(APP_CONFIG.STORAGE_KEY);
    renderAll();
  }
}

function salvarRegistros() { saveJSON(APP_CONFIG.STORAGE_KEY, state.registros); }
function agora() { return new Date().toISOString().slice(0, 16).replace('T', ' '); }

function renderDashboard() {
  const total = state.registros.length;
  const finalizadas = state.registros.filter((r) => r.km_saida).length;
  const patio = total - finalizadas;
  const kmTotal = state.registros.reduce((acc, r) => acc + ((+r.km_saida || 0) - (+r.km_entrada || 0)), 0);

  el('dashboard').innerHTML = `
    <h1>Dashboard</h1>
    <div class='card-grid'>
      <div class='card'><b>Total Registros</b><h2>${total}</h2></div>
      <div class='card'><b>Viagens Finalizadas</b><h2>${finalizadas}</h2></div>
      <div class='card'><b>Veículos no Pátio</b><h2>${patio}</h2></div>
      <div class='card'><b>KM Rodado</b><h2>${kmTotal.toLocaleString('pt-BR')}</h2></div>
    </div>`;
}

function renderPortaria() {
  el('portaria').innerHTML = `
    <div class='portaria-tablet'>
      <div class='portaria-header'>
        <div>
          <h1>REGISTRO PORTARIA</h1>
          <p>${new Date().toLocaleDateString('pt-BR')} • ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
        </div>
        <div class='mini-switch'>
          <button type='button' class='mini active'>BA</button><button type='button' class='mini'>TO</button><button type='button' class='mini'>TODAS</button>
        </div>
      </div>

      <div class='segmented'>
        <button type='button' class='seg active' data-tipo='saida'>↪ SAÍDA</button>
        <button type='button' class='seg' data-tipo='entrada'>↩ CHEGADA</button>
      </div>

      <div class='segmented subtipo'>
        <button type='button' class='seg active'>VIAGEM</button>
        <button type='button' class='seg'>MANUTENÇÃO</button>
        <button type='button' class='seg'>ABASTECIMENTO</button>
      </div>

      <div class='retro-box'>
        <div><strong>MODO RETROATIVO</strong><small>Permitir ajuste manual de data/hora/km</small></div>
        <label class='toggle'><input id='retroativo' type='checkbox'><span></span></label>
      </div>

      <form id='portaria-form' class='tablet-grid'>
        <label>PLACA<input id='placa' placeholder='Buscar Placa...' required /></label>
        <label>OPERAÇÃO
          <select id='operacao'>
            <option value='Viagem'>Selecione...</option><option>Viagem</option><option>Manutenção</option><option>Abastecimento</option>
          </select>
        </label>
        <label>KM SAÍDA<input id='km' type='number' placeholder='Automático' required /></label>
        <label>ROTA<input id='rota' placeholder='Buscar Destino...' /></label>

        <label>N° TRANSPORTE<input id='transporte' placeholder='Opcional' /></label>
        <label>MOTORISTA<input id='motorista' placeholder='Buscar Motorista...' required /></label>
        <label>AJUDANTE<input id='ajudante' placeholder='Buscar Ajudante (Opcional)...' /></label>

        <label>VIGIA RESP.
          <select id='vigia'><option>Selecione...</option><option>Porteiro 1</option><option>Porteiro 2</option></select>
        </label>
        <label>CARRINHO PALLET
          <select id='pallet'><option>Selecione...</option><option>Sim</option><option>Não</option></select>
        </label>

        <div class='tablet-actions'>
          <label class='file-btn'>📷 CÂMERA<input id='foto' type='file' accept='image/*' capture='environment' /></label>
          <label class='file-btn'>📎 ANEXAR<input id='anexo' type='file' accept='image/*,.pdf' /></label>
        </div>
        <button class='primary big-submit' type='submit'>✅ REGISTRAR SAÍDA</button>
      </form>
      <p id='msg-portaria'></p>
    </div>`;

  el('portaria').querySelectorAll('.segmented .seg[data-tipo]').forEach((b) => {
    b.addEventListener('click', () => {
      el('portaria').querySelectorAll('.segmented .seg[data-tipo]').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      el('km').placeholder = b.dataset.tipo === 'entrada' ? 'KM Chegada' : 'Automático';
      el('portaria').querySelector('.big-submit').textContent = b.dataset.tipo === 'entrada' ? '✅ REGISTRAR CHEGADA' : '✅ REGISTRAR SAÍDA';
    });
  });

  el('portaria-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipoSel = el('portaria').querySelector('.segmented .seg[data-tipo].active')?.dataset.tipo || 'saida';
    const placa = el('placa').value.trim().toUpperCase();
    const motorista = el('motorista').value.trim();
    const km = String(Number(el('km').value));
    const file = el('foto').files?.[0];
    let foto = '';
    if (file) {
      const b = await file.arrayBuffer();
      foto = `data:${file.type};base64,${btoa(String.fromCharCode(...new Uint8Array(b)))}`;
    }

    if (tipoSel === 'entrada') {
      const aberto = [...state.registros].reverse().find((r) => r.placa === placa && !r.km_saida);
      if (aberto) { aberto.km_saida = km; if (foto) aberto.foto = foto; }
      else state.registros.push({ data_hora: agora(), tipo: 'entrada', placa, motorista, km_entrada: '', km_saida: km, foto });
    } else {
      state.registros.push({ data_hora: agora(), tipo: 'saida', placa, motorista, km_entrada: km, km_saida: '', foto });
    }

    salvarRegistros();
    renderAll();
    el('msg-portaria').textContent = 'Lançamento salvo com sucesso.';
  });
}

function drawTable(targetId, items, cols) {
  const header = cols.map((c) => `<th>${c}</th>`).join('');
  const rows = items.length ? items.map((row) => `<tr>${cols.map((c) => `<td>${row[c] ?? '-'}</td>`).join('')}</tr>`).join('') : `<tr><td colspan='${cols.length}'>Sem dados cadastrados.</td></tr>`;
  el(targetId).innerHTML = `<div class='table-wrap'><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderViagens() {
  const abertas = state.registros.filter((r) => !r.km_saida);
  const encerradas = state.registros.filter((r) => !!r.km_saida);

  const makeRows = (items, tipo) => items.length ? items.map((r,idx) => {
    const globalIndex = state.registros.indexOf(r);
    return `<tr>
      <td><input type='checkbox' class='sel-${tipo}' data-idx='${globalIndex}'></td>
      <td>${r.data_hora || '-'}</td><td>${r.placa || '-'}</td><td>${r.motorista || '-'}</td>
      <td>${r.km_entrada || '-'}</td><td>${r.km_saida || '-'}</td>
      <td><button type='button' class='primary btn-small' data-edit='${globalIndex}'>Editar</button>
      <button type='button' class='primary btn-small danger' data-del='${globalIndex}'>Excluir</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan='7'>Sem viagens ${tipo}.</td></tr>`;

  el('abertas').innerHTML = `<h1>Viagens em Aberto</h1>
    <div class='table-wrap'><div class='lote-actions'>
      <button type='button' class='primary btn-small' id='del-lote-abertas'>Excluir selecionadas</button></div>
      <table><thead><tr><th></th><th>Data/Hora</th><th>Placa</th><th>Motorista</th><th>KM Entrada</th><th>KM Saída</th><th>Ações</th></tr></thead>
      <tbody>${makeRows(abertas, 'abertas')}</tbody></table></div>`;

  el('encerradas').innerHTML = `<h1>Viagens Encerradas</h1>
    <div class='table-wrap'><div class='lote-actions'>
      <button type='button' class='primary btn-small' id='del-lote-encerradas'>Excluir selecionadas</button></div>
      <table><thead><tr><th></th><th>Data/Hora</th><th>Placa</th><th>Motorista</th><th>KM Entrada</th><th>KM Saída</th><th>Ações</th></tr></thead>
      <tbody>${makeRows(encerradas, 'encerradas')}</tbody></table></div>`;

  bindViagemActions();
}

function bindViagemActions() {
  const editar = (idx) => {
    const r = state.registros[idx]; if (!r) return;
    const motorista = prompt('Motorista', r.motorista || ''); if (motorista === null) return;
    const kmEntrada = prompt('KM Entrada', r.km_entrada || ''); if (kmEntrada === null) return;
    const kmSaida = prompt('KM Saída (deixe vazio para aberta)', r.km_saida || ''); if (kmSaida === null) return;
    r.motorista = motorista.trim();
    r.km_entrada = kmEntrada.trim();
    r.km_saida = kmSaida.trim();
    salvarRegistros();
    renderAll();
  };

  const excluir = (idx) => {
    if (!confirm('Excluir esta viagem?')) return;
    state.registros.splice(idx, 1);
    salvarRegistros();
    renderAll();
  };

  document.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editar(Number(b.dataset.edit))));
  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => excluir(Number(b.dataset.del))));

  const excluirLote = (selector) => {
    const idxs = [...document.querySelectorAll(selector+':checked')].map((i) => Number(i.dataset.idx)).sort((a,b)=>b-a);
    if (!idxs.length) return alert('Selecione ao menos uma viagem.');
    if (!confirm(`Excluir ${idxs.length} viagem(ns) selecionada(s)?`)) return;
    idxs.forEach((i) => state.registros.splice(i,1));
    salvarRegistros();
    renderAll();
  };

  el('del-lote-abertas')?.addEventListener('click', () => excluirLote('.sel-abertas'));
  el('del-lote-encerradas')?.addEventListener('click', () => excluirLote('.sel-encerradas'));
}

function renderRelatorios() {
  const ultimos = [...state.registros].slice(-20).reverse();
  el('relatorios').innerHTML = `<h1>Relatórios</h1><p>Últimos 20 lançamentos:</p><div id='rel-table'></div>`;
  drawTable('rel-table', ultimos, ['data_hora', 'tipo', 'placa', 'motorista', 'km_entrada', 'km_saida']);
}


function parseCSVSimple(txt) {
  const lines = (txt || '').trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines.shift().split(';').map((h) => h.trim());
  return lines.map((ln) => {
    const cols = ln.split(';');
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cols[i] || '').trim());
    return obj;
  });
}

function toCSVSimple(rows) {
  if (!rows.length) return 'nome;status';
  const headers = Object.keys(rows[0]);
  return [headers.join(';'), ...rows.map((r) => headers.map((h) => String(r[h] ?? '')).join(';'))].join('\n');
}

function bindCadastroHandlers(chave, tableId, defaultFields) {
  const dados = loadJSON(chave);
  const cols = [...new Set([...(dados[0] ? Object.keys(dados[0]) : []), ...defaultFields])];

  const render = () => {
    const rows = loadJSON(chave);
    const head = cols.map((c) => `<th>${c}</th>`).join('');
    const body = rows.length ? rows.map((r, idx) => `<tr>${cols.map((c) => `<td>${r[c] ?? ''}</td>`).join('')}<td><button class='primary btn-small' data-edit-cad='${idx}' data-key='${chave}'>Editar</button><button class='primary btn-small danger' data-del-cad='${idx}' data-key='${chave}'>Excluir</button></td></tr>`).join('') : `<tr><td colspan='${cols.length+1}'>Sem registros.</td></tr>`;
    el(tableId).innerHTML = `<table><thead><tr>${head}<th>Ações</th></tr></thead><tbody>${body}</tbody></table>`;

    el(tableId).querySelectorAll('[data-edit-cad]').forEach((b) => b.onclick = () => {
      const arr = loadJSON(chave); const i = Number(b.dataset.editCad); const item = arr[i] || {};
      cols.forEach((c) => { const v = prompt(`Editar ${c}`, item[c] ?? ''); if (v !== null) item[c] = v; });
      arr[i] = item; saveJSON(chave, arr); render();
    });
    el(tableId).querySelectorAll('[data-del-cad]').forEach((b) => b.onclick = () => {
      if (!confirm('Excluir cadastro?')) return;
      const arr = loadJSON(chave); arr.splice(Number(b.dataset.delCad),1); saveJSON(chave, arr); render();
    });
  };

  return {
    add: () => { const n = {}; cols.forEach((c) => n[c] = prompt(`Novo ${c}`, '') || ''); const arr = loadJSON(chave); arr.push(n); saveJSON(chave, arr); render(); },
    imp: async (file) => { const txt = await file.text(); saveJSON(chave, parseCSVSimple(txt)); render(); },
    exp: () => { const blob = new Blob([toCSVSimple(loadJSON(chave))], {type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${chave}.csv`; a.click(); URL.revokeObjectURL(a.href); },
    render
  };
}

function renderFrotas() {
  el('frotas').innerHTML = `
    <h1>Cadastros</h1>
    <div class='cad-layout'>
      <aside class='cad-menu'>
        <h3>CADASTROS</h3>
        <button class='menu-btn-cad active' data-cad='motoristas'>👤 Motoristas</button>
        <button class='menu-btn-cad' data-cad='ajudantes'>👥 Ajudantes</button>
        <button class='menu-btn-cad' data-cad='porteiros'>🛂 Porteiros</button>
        <button class='menu-btn-cad' data-cad='veiculos'>🚚 Veículos</button>
        <button class='menu-btn-cad' data-cad='rotas'>🗺️ Rotas</button>
        <button class='menu-btn-cad' data-cad='log'>🧾 Log de Cadastros</button>
      </aside>

      <section class='cad-content'>
        <div class='lote-actions'>
          <button id='cad-add' class='primary btn-small'>Incluir manualmente</button>
          <label class='primary btn-small' style='cursor:pointer'>Importar CSV<input id='cad-import' type='file' accept='.csv' style='display:none'></label>
          <button id='cad-export' class='primary btn-small'>Exportar CSV</button>
          <button id='cad-save-repo' class='primary btn-small'>Salvar no Repositório</button>
        </div>
        <div id='cad-table' class='table-wrap'></div>
      </section>
    </div>`;

  const maps = {
    motoristas: {key: APP_CONFIG.DRIVERS_KEY, fields:['nome','cnh','status']},
    ajudantes: {key: APP_CONFIG.HELPERS_KEY, fields:['nome','status']},
    porteiros: {key: APP_CONFIG.USERS_KEY, fields:['nome','login','tipo','status']},
    veiculos: {key: APP_CONFIG.VEHICLES_KEY, fields:['placa','modelo','status']},
    rotas: {key: APP_CONFIG.ROUTES_KEY, fields:['nome','origem','destino','status']},
    log: {key: 'log_cadastros', fields:['data','acao','modulo','usuario']}
  };
  if (!localStorage.getItem('log_cadastros')) saveJSON('log_cadastros', []);

  let atual = 'motoristas';
  let handler = bindCadastroHandlers(maps[atual].key, 'cad-table', maps[atual].fields);
  handler.render();

  const swap = (tab) => {
    atual = tab;
    document.querySelectorAll('.menu-btn-cad').forEach((b) => b.classList.toggle('active', b.dataset.cad === tab));
    handler = bindCadastroHandlers(maps[atual].key, 'cad-table', maps[atual].fields);
    handler.render();
  };

  document.querySelectorAll('.menu-btn-cad').forEach((b) => b.onclick = () => swap(b.dataset.cad));
  el('cad-add').onclick = () => handler.add();
  el('cad-export').onclick = () => handler.exp();
  el('cad-import').onchange = (e) => { const f = e.target.files?.[0]; if (f) handler.imp(f); };
  el('cad-save-repo').onclick = async () => {
    const key = maps[atual].key;
    const csv = toCSVSimple(loadJSON(key));
    try {
      const r = await fetch('/api/cadastro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modulo: key, csv }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.erro || 'Falha ao salvar');
      alert(`CSV salvo no repositório em: ${j.path}`);
    } catch (e) {
      alert('Não foi possível salvar no repositório: ' + e.message);
    }
  };
}

function renderAll() {
  renderDashboard();
  renderPortaria();
  renderViagens();
  renderRelatorios();
  renderFrotas();
}

function setupNav() {
  document.querySelectorAll('.menu-btn').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.menu-btn').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
    el(b.dataset.screen).classList.remove('hidden');
    el('sidebar').classList.remove('open');
  }));
  el('hamburger').onclick = () => el('sidebar').classList.toggle('open');
}

function setupLoginMode() {
  document.querySelectorAll('input[name="modo-login"]').forEach((i) => i.addEventListener('change', () => {
    const isUserMode = document.querySelector('input[name="modo-login"]:checked').value === 'usuario';
    el('usuario-wrap').classList.toggle('hidden', !isUserMode);
  }));
}

el('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const mode = document.querySelector('input[name="modo-login"]:checked').value;
  try {
    login(mode, el('usuario').value.trim(), el('senha').value);
    el('login-erro').textContent = '';
    initAuthUI();
  } catch (err) {
    el('login-erro').textContent = err.message;
  }
});

el('logout-btn').onclick = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  state.token = '';
  state.user = null;
  initAuthUI();
};

bootstrap();
setupNav();
setupLoginMode();
initAuthUI();
