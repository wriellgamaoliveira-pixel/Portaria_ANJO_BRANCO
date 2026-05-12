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
    <h1>Lançar Portaria</h1>
    <form id='portaria-form' class='form-grid'>
      <select id='tipo'><option value='entrada'>Entrada</option><option value='saida'>Saída</option></select>
      <input id='placa' placeholder='Placa' required />
      <input id='motorista' placeholder='Motorista' required />
      <input id='km' type='number' placeholder='KM atual' required />
      <input id='foto' type='file' accept='image/*' capture='environment' />
      <button class='primary' type='submit'>Salvar Registro</button>
    </form>
    <p id='msg-portaria'></p>`;

  el('portaria-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = el('tipo').value;
    const placa = el('placa').value.trim().toUpperCase();
    const motorista = el('motorista').value.trim();
    const km = String(Number(el('km').value));
    const file = el('foto').files?.[0];
    let foto = '';
    if (file) {
      const b = await file.arrayBuffer();
      foto = `data:${file.type};base64,${btoa(String.fromCharCode(...new Uint8Array(b)))}`;
    }

    if (tipo === 'entrada') {
      state.registros.push({ data_hora: agora(), tipo, placa, motorista, km_entrada: km, km_saida: '', foto });
    } else {
      const aberto = [...state.registros].reverse().find((r) => r.placa === placa && !r.km_saida);
      if (aberto) { aberto.km_saida = km; if (foto) aberto.foto = foto; }
      else state.registros.push({ data_hora: agora(), tipo, placa, motorista, km_entrada: '', km_saida: km, foto });
    }

    salvarRegistros();
    renderAll();
    el('msg-portaria').textContent = 'Registro salvo com sucesso.';
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
  drawTable('abertas', abertas, ['data_hora', 'placa', 'motorista', 'km_entrada']);
  drawTable('encerradas', encerradas, ['data_hora', 'placa', 'motorista', 'km_entrada', 'km_saida']);
}

function renderRelatorios() {
  const ultimos = [...state.registros].slice(-20).reverse();
  el('relatorios').innerHTML = `<h1>Relatórios</h1><p>Últimos 20 lançamentos:</p><div id='rel-table'></div>`;
  drawTable('rel-table', ultimos, ['data_hora', 'tipo', 'placa', 'motorista', 'km_entrada', 'km_saida']);
}

function renderFrotas() {
  const veiculos = loadJSON(APP_CONFIG.VEHICLES_KEY);
  const motoristas = loadJSON(APP_CONFIG.DRIVERS_KEY);
  const ajudantes = loadJSON(APP_CONFIG.HELPERS_KEY);
  const rotas = loadJSON(APP_CONFIG.ROUTES_KEY);

  el('frotas').innerHTML = `
    <h1>Frotas e Cadastros</h1>
    <div class='card-grid'>
      <div class='card'><b>Veículos importados:</b> ${veiculos.length}</div>
      <div class='card'><b>Motoristas importados:</b> ${motoristas.length}</div>
      <div class='card'><b>Ajudantes importados:</b> ${ajudantes.length}</div>
      <div class='card'><b>Rotas importadas:</b> ${rotas.length}</div>
    </div>
    <h3>Base recuperada do navegador (localStorage)</h3>
    <div id='frotas-veiculos'></div>
    <div id='frotas-motoristas'></div>
    <div id='frotas-rotas'></div>`;

  drawTable('frotas-veiculos', veiculos, ['placa', 'modelo', 'status']);
  drawTable('frotas-motoristas', motoristas, ['nome', 'cnh', 'status']);
  drawTable('frotas-rotas', rotas, ['nome', 'origem', 'destino', 'status']);
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
