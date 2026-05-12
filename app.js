/** @typedef {{data_hora:string,tipo:'entrada'|'saida',placa:string,motorista:string,km_entrada:string,km_saida:string,foto:string}} Registro */
const APP_CONFIG = {
  SENHA_MESTRA: 'Anjo@2026',
  STORAGE_KEY: 'portaria_registros'
};

const state = { registros: [], token: localStorage.getItem('token') || '' };
const el = (id) => document.getElementById(id);

function agora() { return new Date().toISOString().slice(0, 16).replace('T', ' '); }
function parseCSV(t) { const l = (t || '').trim().split('\n'); const h = (l.shift() || '').split(';'); return l.filter(Boolean).map((r) => { const c = r.split(';'); return Object.fromEntries(h.map((k, i) => [k, c[i] || ''])); }); }
function gerarCSV(regs) { const h = 'data_hora;tipo;placa;motorista;km_entrada;km_saida;foto'; return [h, ...regs.map((r) => [r.data_hora, r.tipo, r.placa, r.motorista, r.km_entrada, r.km_saida, r.foto].join(';'))].join('\n'); }
function salvarLocal() { localStorage.setItem(APP_CONFIG.STORAGE_KEY, JSON.stringify(state.registros)); }
function carregarLocal() { state.registros = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEY) || '[]'); }

async function login(senha) {
  if (senha !== APP_CONFIG.SENHA_MESTRA) throw new Error('Senha inválida');
  state.token = 'local-auth-ok';
  localStorage.setItem('token', state.token);
  initAuthUI();
}

function initAuthUI() {
  el('login-screen').classList.toggle('hidden', !!state.token);
  el('app').classList.toggle('hidden', !state.token);
  if (state.token) { carregarLocal(); renderAll(); }
}

function statusBadge(r) { return r.km_saida ? '<span class="badge ok">Finalizada</span>' : '<span class="badge pend">No Pátio</span>'; }
function calcDashboard() { const total = state.registros.length; const final = state.registros.filter((r) => r.km_saida).length; const patio = total - final; const km = state.registros.reduce((a, r) => a + ((+r.km_saida || 0) - (+r.km_entrada || 0)), 0); return { total, final, patio, km }; }

function renderDashboard() {
  const d = calcDashboard(); const ult = [...state.registros].slice(-7).reverse();
  el('dashboard').innerHTML = `<h1>Dashboard</h1><div class='card-grid'><div class='card'><b>Total de Registros</b><h2>${d.total}</h2></div><div class='card'><b>Km Total Rodado</b><h2>${d.km.toLocaleString('pt-BR')}</h2></div><div class='card'><b>Viagens Finalizadas</b><h2>${d.final}</h2></div><div class='card'><b>Veículos no Pátio</b><h2>${d.patio}</h2></div></div><div class='table-wrap'><h3>Últimos Registros</h3><table><thead><tr><th>Data/Hora</th><th>Placa</th><th>Motorista</th><th>Km Entrada</th><th>Km Saída</th><th>Status</th></tr></thead><tbody>${ult.map((r) => `<tr><td>${r.data_hora}</td><td>${r.placa}</td><td>${r.motorista}</td><td>${r.km_entrada || '-'}</td><td>${r.km_saida || '-'}</td><td>${statusBadge(r)}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderPortaria() {
  el('portaria').innerHTML = `<h1>Portaria</h1><form id='portaria-form' class='form-grid'><select id='tipo'><option value='entrada'>Entrada</option><option value='saida'>Saída</option></select><input id='placa' placeholder='Placa' required /><input id='motorista' placeholder='Motorista' required /><input id='km' type='number' placeholder='KM atual' required /><input id='foto' type='file' accept='image/*' capture='environment' /><button class='primary' type='submit'>Registrar</button></form><p id='msg-portaria'></p>`;
  el('portaria-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = el('tipo').value, placa = el('placa').value.trim().toUpperCase(), motorista = el('motorista').value.trim(), km = Number(el('km').value);
    const f = el('foto').files[0]; let foto = '';
    if (f) { const b = await f.arrayBuffer(); foto = `data:${f.type};base64,${btoa(String.fromCharCode(...new Uint8Array(b)))}`; }

    if (tipo === 'entrada') {
      state.registros.push({ data_hora: agora(), tipo: 'entrada', placa, motorista, km_entrada: String(km), km_saida: '', foto });
    } else {
      const aberto = [...state.registros].reverse().find((r) => r.placa === placa && !r.km_saida);
      if (aberto) { aberto.km_saida = String(km); if (foto) aberto.foto = foto; }
      else { state.registros.push({ data_hora: agora(), tipo: 'saida', placa, motorista, km_entrada: '', km_saida: String(km), foto }); }
    }

    salvarLocal(); renderAll(); el('msg-portaria').textContent = 'Registro salvo localmente com sucesso.';
  });
}

function renderHistorico() {
  el('historico').innerHTML = `<h1>Histórico</h1><div class='form-grid'><select id='filtro-status'><option value='todos'>Todos</option><option value='entrada'>Entrada</option><option value='saida'>Saída</option></select><input id='busca' placeholder='Pesquisar placa ou motorista' /><label class='primary' style='display:inline-block;text-align:center;line-height:20px'>Importar CSV<input id='importar-csv' type='file' accept='.csv,.txt' style='display:none'></label><button id='exportar' class='primary' type='button'>Exportar CSV</button></div><div class='table-wrap'><table><thead><tr><th>Data/Hora</th><th>Tipo</th><th>Placa</th><th>Motorista</th><th>Km Entrada</th><th>Km Saída</th><th>Foto</th></tr></thead><tbody id='tb-historico'></tbody></table></div>`;
  const refresh = () => { const st = el('filtro-status').value, q = el('busca').value.toLowerCase(); const regs = state.registros.filter((r) => (st === 'todos' || r.tipo === st) && (`${r.placa} ${r.motorista}`.toLowerCase().includes(q))); el('tb-historico').innerHTML = regs.map((r) => `<tr><td>${r.data_hora}</td><td>${r.tipo}</td><td>${r.placa}</td><td>${r.motorista}</td><td>${r.km_entrada || '-'}</td><td>${r.km_saida || '-'}</td><td>${r.foto ? `<button type='button' data-foto='${r.foto}'>📷</button>` : '-'}</td></tr>`).join(''); el('tb-historico').querySelectorAll('button[data-foto]').forEach((b) => b.addEventListener('click', () => abrirFoto(b.dataset.foto))); };
  el('filtro-status').addEventListener('change', refresh); el('busca').addEventListener('input', refresh);
  el('exportar').addEventListener('click', exportarCSV);
  el('importar-csv').addEventListener('change', async (e) => { const file = e.target.files?.[0]; if (!file) return; const txt = await file.text(); state.registros = parseCSV(txt); salvarLocal(); renderAll(); });
  refresh();
}

function abrirFoto(src) { el('foto-modal-img').src = src; el('foto-modal').classList.remove('hidden'); }
function exportarCSV() { const c = gerarCSV(state.registros); const blob = new Blob([c], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'registros.txt'; a.click(); URL.revokeObjectURL(a.href); }
function renderAll() { renderDashboard(); renderPortaria(); renderHistorico(); }
function setupNav() { document.querySelectorAll('.menu-btn').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('.menu-btn').forEach((x) => x.classList.remove('active')); b.classList.add('active'); document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden')); el(b.dataset.screen).classList.remove('hidden'); el('sidebar').classList.remove('open'); })); el('hamburger').onclick = () => el('sidebar').classList.toggle('open'); }

el('login-form').addEventListener('submit', async (e) => { e.preventDefault(); try { await login(el('senha').value); el('login-erro').textContent = ''; } catch (err) { el('login-erro').textContent = err.message; } });
el('logout-btn').onclick = () => { localStorage.removeItem('token'); state.token = ''; initAuthUI(); };
el('fechar-modal').onclick = () => el('foto-modal').classList.add('hidden');
setupNav(); initAuthUI();
