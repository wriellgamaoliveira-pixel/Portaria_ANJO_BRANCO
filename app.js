/** @typedef {{data_hora:string,tipo:string,placa:string,motorista:string,km_entrada:string,km_saida:string,foto:string}} Registro */
const APP_CONFIG = {
  // Se o frontend estiver no GitHub Pages, informe aqui a URL da sua Vercel (sem barra no final).
  // Exemplo: 'https://portaria-anjo-branco.vercel.app'
  API_BASE_URL: '',
  // Se quiser fixar manualmente a URL RAW do CSV, preencha aqui.
  CSV_RAW_URL: ''
};

const state = { registros: [], token: localStorage.getItem('token') || '', rawBaseUrl: '', apiBaseUrl: '' };
const el = (id) => document.getElementById(id);

function detectarRepoGitHubPages() {
  const host = window.location.hostname;
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (!host.endsWith('.github.io') || pathParts.length === 0) return null;
  const owner = host.replace('.github.io', '');
  const repo = pathParts[0];
  return { owner, repo };
}

function configurarURLsAutomaticas() {
  const repoInfo = detectarRepoGitHubPages();
  if (APP_CONFIG.CSV_RAW_URL) {
    state.rawBaseUrl = APP_CONFIG.CSV_RAW_URL;
  } else if (repoInfo) {
    state.rawBaseUrl = `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/main/dados/registros.csv`;
  }

  state.apiBaseUrl = APP_CONFIG.API_BASE_URL || localStorage.getItem('api_base_url') || '';
}

function apiUrl(path) {
  return state.apiBaseUrl ? `${state.apiBaseUrl}${path}` : path;
}

function parseCSV(t) {
  const limpo = (t || '').trim();
  if (!limpo) return [];
  const l = limpo.split('\n');
  const h = (l.shift() || '').split(';');
  return l.filter(Boolean).map((r) => {
    const c = r.split(';');
    return Object.fromEntries(h.map((k, i) => [k, c[i] || '']));
  });
}

function gerarCSV(regs) {
  const h = 'data_hora;tipo;placa;motorista;km_entrada;km_saida;foto';
  const b = regs.map((r) => [r.data_hora, r.tipo, r.placa, r.motorista, r.km_entrada, r.km_saida, r.foto].join(';'));
  return [h, ...b].join('\n');
}

async function carregarRegistros() {
  if (!state.rawBaseUrl) return;
  try {
    const resp = await fetch(state.rawBaseUrl, { cache: 'no-store' });
    const txt = await resp.text();
    state.registros = parseCSV(txt);
    renderAll();
  } catch {
    state.registros = [];
    renderAll();
  }
}

async function login(senha) {
  const r = await fetch(apiUrl('/api/login'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha })
  });
  if (!r.ok) throw new Error('Senha inválida ou API indisponível');
  const d = await r.json();
  state.token = d.token;
  localStorage.setItem('token', d.token);
  initAuthUI();
}

function initAuthUI() {
  el('login-screen').classList.toggle('hidden', !!state.token);
  el('app').classList.toggle('hidden', !state.token);
  if (state.token) carregarRegistros();
}

function statusBadge(r) { return r.km_saida ? '<span class="badge ok">Finalizada</span>' : '<span class="badge pend">No Pátio</span>'; }
function calcDashboard() {
  const total = state.registros.length;
  const final = state.registros.filter((r) => r.km_saida).length;
  const patio = total - final;
  const km = state.registros.reduce((a, r) => a + ((+r.km_saida || 0) - (+r.km_entrada || 0)), 0);
  return { total, final, patio, km };
}

function renderDashboard() {
  const d = calcDashboard();
  const ult = [...state.registros].slice(-7).reverse();
  el('dashboard').innerHTML = `<h1>Dashboard</h1><div class='card-grid'><div class='card'><b>Total de Registros</b><h2>${d.total}</h2></div><div class='card'><b>Km Total Rodado</b><h2>${d.km.toLocaleString('pt-BR')}</h2></div><div class='card'><b>Viagens Finalizadas</b><h2>${d.final}</h2></div><div class='card'><b>Veículos no Pátio</b><h2>${d.patio}</h2></div></div><div class='table-wrap'><h3>Últimos Registros</h3><table><thead><tr><th>Data/Hora</th><th>Placa</th><th>Motorista</th><th>Km Entrada</th><th>Km Saída</th><th>Status</th></tr></thead><tbody>${ult.map((r) => `<tr><td>${r.data_hora}</td><td>${r.placa}</td><td>${r.motorista}</td><td>${r.km_entrada || '-'}</td><td>${r.km_saida || '-'}</td><td>${statusBadge(r)}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderPortaria() {
  el('portaria').innerHTML = `<h1>Portaria</h1><form id='portaria-form' class='form-grid'><select id='tipo'><option value='entrada'>Entrada</option><option value='saida'>Saída</option></select><input id='placa' placeholder='Placa' required /><input id='motorista' placeholder='Motorista' required /><input id='km' type='number' placeholder='KM atual' required /><input id='foto' type='file' accept='image/*' capture='environment' /><button class='primary' type='submit'>Registrar</button></form><p id='msg-portaria'></p>`;
  el('portaria-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = el('tipo').value, placa = el('placa').value.trim().toUpperCase(), motorista = el('motorista').value.trim(), km = Number(el('km').value);
    const f = el('foto').files[0];
    let foto_base64 = '';
    if (f) {
      const b = await f.arrayBuffer();
      foto_base64 = btoa(String.fromCharCode(...new Uint8Array(b)));
    }
    const r = await fetch(apiUrl('/api/registro'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ tipo, placa, motorista, km, foto_base64 })
    });
    el('msg-portaria').textContent = r.ok ? 'Registro salvo com sucesso.' : 'Erro ao registrar';
    if (r.ok) await carregarRegistros();
  });
}

function renderHistorico() {
  el('historico').innerHTML = `<h1>Histórico</h1><div class='form-grid'><select id='filtro-status'><option value='todos'>Todos</option><option value='entrada'>Entrada</option><option value='saida'>Saída</option></select><input id='busca' placeholder='Pesquisar placa ou motorista' /><button id='exportar' class='primary' type='button'>Exportar CSV</button></div><div class='table-wrap'><table><thead><tr><th>Data/Hora</th><th>Tipo</th><th>Placa</th><th>Motorista</th><th>Km Entrada</th><th>Km Saída</th><th>Foto</th></tr></thead><tbody id='tb-historico'></tbody></table></div>`;
  const refresh = () => {
    const st = el('filtro-status').value, q = el('busca').value.toLowerCase();
    const regs = state.registros.filter((r) => (st === 'todos' || r.tipo === st) && (`${r.placa} ${r.motorista}`.toLowerCase().includes(q)));
    el('tb-historico').innerHTML = regs.map((r) => `<tr><td>${r.data_hora}</td><td>${r.tipo}</td><td>${r.placa}</td><td>${r.motorista}</td><td>${r.km_entrada || '-'}</td><td>${r.km_saida || '-'}</td><td>${r.foto ? `<button type='button' data-foto='${r.foto}'>📷</button>` : '-'}</td></tr>`).join('');
    el('tb-historico').querySelectorAll('button[data-foto]').forEach((b) => b.addEventListener('click', () => abrirFoto(b.dataset.foto)));
  };
  el('filtro-status').addEventListener('change', refresh);
  el('busca').addEventListener('input', refresh);
  el('exportar').addEventListener('click', exportarCSV);
  refresh();
}

function abrirFoto(nome) {
  if (!state.rawBaseUrl) return;
  const base = state.rawBaseUrl.replace('/dados/registros.csv', '');
  el('foto-modal-img').src = `${base}/fotos/${nome}`;
  el('foto-modal').classList.remove('hidden');
}

function exportarCSV() {
  const c = gerarCSV(state.registros);
  const blob = new Blob([c], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'registros.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderAll() { renderDashboard(); renderPortaria(); renderHistorico(); }

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

el('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await login(el('senha').value);
    el('login-erro').textContent = '';
  } catch (err) {
    el('login-erro').textContent = err.message;
  }
});
el('logout-btn').onclick = () => { localStorage.removeItem('token'); state.token = ''; initAuthUI(); };
el('fechar-modal').onclick = () => el('foto-modal').classList.add('hidden');

configurarURLsAutomaticas();
setupNav();
initAuthUI();
