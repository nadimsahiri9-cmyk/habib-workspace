const $ = id => document.getElementById(id);
const KEY = 'ai-terminal-v2';
const PRICE_MAP = {};

const state = {
  messages: [],
  settings: {
    model: 'deepseek/deepseek-chat-v3-0324',
    systemPrompt: 'Tu es une IA utile, concise et claire. Reponds en francais.',
    memoryFacts: '',
    mcpConfig: '[]',
    summaryMemory: ''
  }
};

function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function load() {
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!p) return; state.messages = p.messages || []; state.settings = {...state.settings, ...(p.settings||{})}; } catch {}
}

async function loadModels() {
  try {
    const res = await fetch('/api/models');
    const models = await res.json();
    const sel = $('modelSelect');
    sel.innerHTML = '';
    models.forEach(m => {
      PRICE_MAP[m.id] = { in: m.price_in, out: m.price_out };
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.label}  ($${m.price_in}/$${m.price_out}/M)`;
      if (m.id === state.settings.model) opt.selected = true;
      sel.appendChild(opt);
    });
    updateModelLabel();
  } catch { $('modelSelect').innerHTML = '<option value="deepseek/deepseek-chat-v3-0324">DeepSeek V3</option>'; }
}

function updateModelLabel() {
  const sel = $('modelSelect');
  $('modelLabel').textContent = sel.options[sel.selectedIndex]?.text || state.settings.model;
}

function renderSettings() {
  $('modelSelect').value = state.settings.model;
  $('systemPrompt').value = state.settings.systemPrompt;
  $('memoryFacts').value = state.settings.memoryFacts;
  $('mcpConfig').value = state.settings.mcpConfig;
  updateModelLabel();
}

function estimateCost(usage, modelId) {
  const p = PRICE_MAP[modelId]; if (!p || !usage) return null;
  const c = (usage.prompt_tokens/1e6)*p.in + (usage.completion_tokens/1e6)*p.out;
  return c < 0.0001 ? '<$0.0001' : `$${c.toFixed(4)}`;
}

function renderMessages() {
  const chat = $('chat'); chat.innerHTML = '';
  state.messages.forEach(m => {
    const wrap = document.createElement('div'); wrap.className = `msg-wrap ${m.role}`;
    const msg = document.createElement('div'); msg.className = 'msg'; msg.textContent = m.content; wrap.appendChild(msg);
    if (m.reasoning) {
      const toggle = document.createElement('button'); toggle.className = 'reasoning-toggle'; toggle.textContent = '> [thinking] afficher';
      const block = document.createElement('div'); block.className = 'reasoning-block hidden'; block.textContent = m.reasoning;
      toggle.addEventListener('click', () => { const h = block.classList.toggle('hidden'); toggle.textContent = h ? '> [thinking] afficher' : '> [thinking] masquer'; });
      wrap.appendChild(toggle); wrap.appendChild(block);
    }
    if (m.meta) { const meta = document.createElement('div'); meta.className = 'msg-meta'; meta.textContent = m.meta; wrap.appendChild(meta); }
    chat.appendChild(wrap);
  });
  $('chat').scrollTop = $('chat').scrollHeight;
}

function addMsg(role, content, extras = {}) { state.messages.push({role, content, ...extras}); save(); renderMessages(); }
function getMcpTools() { try { return JSON.parse(state.settings.mcpConfig || '[]'); } catch { return []; } }
function buildSystemPrompt() {
  let s = state.settings.systemPrompt;
  if (state.settings.memoryFacts.trim()) s += '\n\nFaits importants:\n' + state.settings.memoryFacts.trim();
  if (state.settings.summaryMemory) s += '\n\nResume precedent:\n' + state.settings.summaryMemory;
  return s;
}

async function runDiagnostic() {
  $('d-model').textContent = state.settings.model;
  $('d-memory').textContent = state.messages.length + ' messages';
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({model: state.settings.model, messages:[{role:'user',content:'ping'}], systemPrompt:'Reponds juste: pong'}) });
    const data = await res.json();
    if (res.ok && data.content) {
      $('d-backend').textContent = 'OK'; $('d-backend').className = 'status-ok';
      $('d-apikey').textContent = 'valide'; $('d-apikey').className = 'status-ok';
      $('d-functions').textContent = 'actives'; $('d-functions').className = 'status-ok';
    } else if (data.error && data.error.includes('OPENROUTER_API_KEY')) {
      $('d-backend').textContent = 'actif'; $('d-backend').className = 'status-ok';
      $('d-apikey').textContent = 'MANQUANTE — ajoute dans Netlify env vars'; $('d-apikey').className = 'status-err';
      $('d-functions').textContent = 'actives'; $('d-functions').className = 'status-ok';
    } else {
      $('d-backend').textContent = 'erreur: ' + (data.error || res.status); $('d-backend').className = 'status-err';
      $('d-apikey').textContent = '?'; $('d-apikey').className = 'status-pending';
      $('d-functions').textContent = 'probleme'; $('d-functions').className = 'status-err';
    }
  } catch(e) {
    $('d-backend').textContent = 'inaccessible'; $('d-backend').className = 'status-err';
    $('d-apikey').textContent = '?'; $('d-apikey').className = 'status-pending';
    $('d-functions').textContent = 'non deployees'; $('d-functions').className = 'status-err';
  }
}

$('toggleDebug').addEventListener('click', () => { $('debugPanel').classList.toggle('hidden'); $('settings').classList.add('hidden'); });
$('toggleSettings').addEventListener('click', () => { $('settings').classList.toggle('hidden'); $('debugPanel').classList.add('hidden'); });
$('runTest').addEventListener('click', runDiagnostic);
$('modelSelect').addEventListener('change', updateModelLabel);
$('saveSettings').addEventListener('click', () => {
  state.settings.model = $('modelSelect').value;
  state.settings.systemPrompt = $('systemPrompt').value.trim();
  state.settings.memoryFacts = $('memoryFacts').value.trim();
  state.settings.mcpConfig = $('mcpConfig').value.trim() || '[]';
  save(); renderSettings(); $('settings').classList.add('hidden');
  addMsg('assistant', 'Configuration sauvegardee. Modele : ' + state.settings.model);
});
$('clearChat').addEventListener('click', () => { state.messages = []; state.settings.summaryMemory = ''; save(); renderMessages(); });

const input = $('messageInput');
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; });
input.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); $('composer').requestSubmit(); } });

$('composer').addEventListener('submit', async e => {
  e.preventDefault();
  const content = input.value.trim(); if (!content) return;
  addMsg('user', content, {meta: new Date().toLocaleTimeString()});
  input.value = ''; input.style.height = 'auto';

  const typing = document.createElement('div'); typing.className = 'msg-wrap assistant';
  typing.innerHTML = '<div class="msg"><span class="typing-indicator">_</span></div>';
  $('chat').appendChild(typing); $('chat').scrollTop = $('chat').scrollHeight;

  const tools = getMcpTools();
  let mcpResult = null;
  for (const tool of tools) {
    if (content.toLowerCase().includes(tool.name.toLowerCase())) {
      try { const r = await fetch(tool.url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:content})}); mcpResult = await r.text(); } catch(err) { mcpResult = 'Erreur MCP: ' + err.message; }
      break;
    }
  }

  const messages = state.messages.filter(m => m.role==='user'||m.role==='assistant').map(({role,content})=>({role,content}));
  if (mcpResult) messages.push({role:'user', content:'Resultat outil: '+mcpResult});

  try {
    const res = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({model:state.settings.model, systemPrompt:buildSystemPrompt(), messages, mcpTools:tools})});
    typing.remove();
    const data = await res.json();
    if (!res.ok) { addMsg('assistant', 'Erreur : ' + (data.error||res.status)); return; }
    const u = data.usage||{};
    const cost = estimateCost(u, data.model||state.settings.model);
    const elapsed = ''; // pas de elapsed cote client ici
    const meta = [new Date().toLocaleTimeString(), data.model||state.settings.model, u.prompt_tokens?`tokens: ${u.prompt_tokens}p/${u.completion_tokens}c/${u.total_tokens}t`:null, cost?'cout: '+cost:null].filter(Boolean).join('  |  ');
    addMsg('assistant', data.content, {reasoning: data.reasoning||null, meta});
  } catch(err) { typing.remove(); addMsg('assistant', 'Erreur reseau : ' + err.message); }
});

load(); loadModels().then(()=>renderSettings()); renderMessages();
if (!state.messages.length) addMsg('assistant', 'Terminal pret. Configure dans [ config ] puis ecris.');
