const $ = id => document.getElementById(id);
const KEY = 'ai-terminal-v3';
const PRICE_MAP = {};

// --- STATE ---
const state = {
  messages: [],
  mcpTools: [],
  session: { tokens: 0, cost: 0, msgs: 0 },
  logs: [],
  settings: {
    model: 'deepseek/deepseek-chat-v3-0324',
    systemPrompt: 'Tu es une IA experte, precise et concise. Tu reponds en francais. Quand on te demande de rechercher ou de lire une page, utilise les outils disponibles.',
    memoryFacts: '',
    summaryMemory: '',
    searxngUrl: '',
    terminalUrl: ''
  }
};

function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
function load() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!p) return;
    state.messages = p.messages || [];
    state.mcpTools = p.mcpTools || [];
    state.session = p.session || { tokens: 0, cost: 0, msgs: 0 };
    state.logs = p.logs || [];
    state.settings = { ...state.settings, ...(p.settings || {}) };
  } catch {}
}

// --- MODELS ---
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
      opt.textContent = `${m.label}  ·  $${m.price_in}/$${m.price_out}M`;
      if (m.id === state.settings.model) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch {
    $('modelSelect').innerHTML = '<option value="deepseek/deepseek-chat-v3-0324">DeepSeek V3</option>';
  }
  $('modelSelect').addEventListener('change', () => { state.settings.model = $('modelSelect').value; save(); updateStats(); });
}

// --- STATS ---
function updateStats() {
  $('s-tokens').textContent = state.session.tokens.toLocaleString();
  $('s-cost').textContent = '$' + state.session.cost.toFixed(4);
  $('s-msgs').textContent = state.session.msgs;
  $('s-model').textContent = state.settings.model.split('/').pop();
}

// --- LOGS ---
function addLog(type, text) {
  const ts = new Date().toLocaleTimeString();
  state.logs.unshift({ type, text, ts });
  if (state.logs.length > 50) state.logs.pop();
  renderLogs();
  save();
}
function renderLogs() {
  const el = $('logList');
  el.innerHTML = '';
  state.logs.slice(0, 20).forEach(l => {
    const d = document.createElement('div');
    d.className = `log-entry ${l.type}`;
    d.textContent = `${l.ts} ${l.text}`;
    el.appendChild(d);
  });
}

// --- MCP ---
function renderMcpActive() {
  const el = $('mcpActiveList');
  el.innerHTML = '';
  state.mcpTools.forEach((t, i) => {
    const chip = document.createElement('div'); chip.className = 'mcp-chip';
    chip.innerHTML = `<span class="chip-name">${t.name}</span><span style="color:var(--muted);font-size:.7rem">${t.description.slice(0,30)}</span><button data-i="${i}">✕</button>`;
    chip.querySelector('button').addEventListener('click', () => { state.mcpTools.splice(i,1); save(); renderMcpActive(); renderMcpList(); });
    el.appendChild(chip);
  });
}

function renderMcpList() {
  const el = $('mcpList');
  el.innerHTML = '';
  state.mcpTools.forEach((t, i) => {
    const item = document.createElement('div'); item.className = 'mcp-item';
    item.innerHTML = `<span>${t.name} — <span style="color:var(--muted)">${t.url}</span></span><button data-i="${i}">✕</button>`;
    item.querySelector('button').addEventListener('click', () => { state.mcpTools.splice(i,1); save(); renderMcpActive(); renderMcpList(); });
    el.appendChild(item);
  });
}

// Presets MCP
const PRESETS = {
  search: { name: 'search', description: 'Recherche web via SearXNG', url: '/api/search', method: 'POST' },
  browse: { name: 'browse', description: 'Lit le contenu d une URL', url: '/api/browse', method: 'POST' },
  terminal: { name: 'terminal', description: 'Execute une commande sur ton VPS', url: '', method: 'POST' }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = PRESETS[btn.dataset.preset];
    $('mcpName').value = p.name;
    $('mcpDesc').value = p.description;
    $('mcpUrl').value = p.url || state.settings.terminalUrl || '';
    $('mcpMethod').value = p.method;
  });
});

$('saveMcp').addEventListener('click', () => {
  const name = $('mcpName').value.trim();
  const description = $('mcpDesc').value.trim();
  const url = $('mcpUrl').value.trim();
  const method = $('mcpMethod').value;
  let headers = {};
  try { if ($('mcpHeaders').value.trim()) headers = JSON.parse($('mcpHeaders').value.trim()); } catch {}
  if (!name || !url) return;
  state.mcpTools.push({ name, description, url, method, headers });
  save(); renderMcpActive(); renderMcpList();
  $('mcpName').value = ''; $('mcpDesc').value = ''; $('mcpUrl').value = ''; $('mcpHeaders').value = '';
  addLog('ok', `MCP ajoute: ${name}`);
});

// --- MESSAGES ---
function renderMessages() {
  const chat = $('chat'); chat.innerHTML = '';
  state.messages.forEach(m => {
    const wrap = document.createElement('div'); wrap.className = `msg-wrap ${m.role}`;
    const msg = document.createElement('div'); msg.className = 'msg';

    if (m.toolResult) {
      const tr = document.createElement('div'); tr.className = 'tool-result';
      tr.textContent = m.toolResult; wrap.appendChild(tr);
    } else {
      msg.textContent = m.content; wrap.appendChild(msg);
    }

    if (m.reasoning) {
      const toggle = document.createElement('button'); toggle.className = 'reasoning-toggle';
      toggle.textContent = '▶ Raisonnement';
      const block = document.createElement('div'); block.className = 'reasoning-block hidden'; block.textContent = m.reasoning;
      toggle.addEventListener('click', () => { const h = block.classList.toggle('hidden'); toggle.textContent = h ? '▶ Raisonnement' : '▼ Raisonnement'; });
      wrap.appendChild(toggle); wrap.appendChild(block);
    }
    if (m.meta) { const meta = document.createElement('div'); meta.className = 'msg-meta'; meta.textContent = m.meta; wrap.appendChild(meta); }
    chat.appendChild(wrap);
  });
  chat.scrollTop = chat.scrollHeight;
}

function addMsg(role, content, extras = {}) {
  state.messages.push({ role, content, ...extras });
  save(); renderMessages();
}

// --- SYSTEM PROMPT ---
function buildSystemPrompt() {
  let s = state.settings.systemPrompt;
  if (state.settings.memoryFacts.trim()) s += '\n\nFaits importants:\n' + state.settings.memoryFacts.trim();
  if (state.settings.summaryMemory) s += '\n\nResume precedent:\n' + state.settings.summaryMemory;
  s += `\n\nDate/heure actuelle: ${new Date().toLocaleString('fr-FR')}`;
  return s;
}

// --- BUILT-IN TOOLS ---
async function runBuiltinTool(toolName, input) {
  if (toolName === 'search') {
    addLog('info', `search: ${input}`);
    const res = await fetch('/api/search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query: input }) });
    const data = await res.json();
    if (data.error) { addLog('err', `search error: ${data.error}`); return `Erreur recherche: ${data.error}`; }
    const txt = data.results.map((r,i) => `[${i+1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`).join('\n\n');
    addLog('ok', `search: ${data.results.length} resultats`);
    return `Resultats de recherche pour "${input}":\n\n${txt}`;
  }
  if (toolName === 'browse') {
    addLog('info', `browse: ${input}`);
    const res = await fetch('/api/browse', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url: input }) });
    const data = await res.json();
    if (data.error) { addLog('err', `browse error: ${data.error}`); return `Erreur lecture URL: ${data.error}`; }
    addLog('ok', `browse: ${data.length} chars`);
    return `Contenu de ${input}:\n\n${data.text}`;
  }
  return null;
}

// --- DETECT TOOL INTENT ---
function detectIntent(text) {
  const t = text.toLowerCase();
  if (/recherch|search|trouve|googl|info sur|actualit/.test(t)) return 'search';
  if (/lis|lire|ouvre|browse|http|www\.|contenu de/.test(t)) return 'browse';
  return null;
}

function extractArg(text, intent) {
  if (intent === 'browse') {
    const m = text.match(/https?:\/\/[^\s]+/);
    if (m) return m[0];
  }
  if (intent === 'search') {
    return text.replace(/recherche|search|trouve|donne.moi|info sur|parle.moi de/gi,'').trim();
  }
  return text;
}

// --- SEND ---
$('composer').addEventListener('submit', async e => {
  e.preventDefault();
  const content = $('messageInput').value.trim();
  if (!content) return;

  addMsg('user', content, { meta: new Date().toLocaleTimeString() });
  $('messageInput').value = ''; $('messageInput').style.height = 'auto';
  state.session.msgs++; updateStats();

  // Typing indicator
  const typing = document.createElement('div');
  typing.className = 'msg-wrap assistant typing';
  typing.innerHTML = '<div class="msg"></div>';
  $('chat').appendChild(typing);
  $('chat').scrollTop = $('chat').scrollHeight;

  // Detect built-in tool
  const intent = detectIntent(content);
  let contextInjection = null;

  if (intent) {
    const arg = extractArg(content, intent);
    const toolEl = document.createElement('div');
    toolEl.className = 'tool-result';
    toolEl.textContent = `⚙ ${intent}: ${arg}...`;
    typing.insertBefore(toolEl, typing.firstChild);
    const toolResult = await runBuiltinTool(intent, arg);
    if (toolResult) {
      contextInjection = toolResult;
      toolEl.textContent = `✓ ${intent}: resultat injecte (${toolResult.length} chars)`;
    }
  }

  // MCP custom tools
  for (const tool of state.mcpTools) {
    if (content.toLowerCase().includes(tool.name.toLowerCase())) {
      try {
        const opts = { method: tool.method || 'POST', headers: { 'Content-Type': 'application/json', ...(tool.headers||{}) } };
        if (tool.method !== 'GET') opts.body = JSON.stringify({ query: content });
        const r = await fetch(tool.url, opts);
        contextInjection = await r.text();
        addLog('ok', `MCP ${tool.name}: OK`);
      } catch(err) { addLog('err', `MCP ${tool.name}: ${err.message}`); }
      break;
    }
  }

  const messages = state.messages.filter(m => m.role==='user'||m.role==='assistant').map(({role,content})=>({role,content}));
  if (contextInjection) messages.push({ role:'user', content:`Contexte additionnel pour repondre:\n\n${contextInjection}` });

  try {
    const res = await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model: state.settings.model, systemPrompt: buildSystemPrompt(), messages, mcpTools: state.mcpTools })
    });
    typing.remove();
    const data = await res.json();
    if (!res.ok) { addMsg('assistant', 'Erreur: ' + (data.error||res.status)); addLog('err', data.error||res.status); return; }

    // Update session stats
    const u = data.usage||{};
    if (u.total_tokens) state.session.tokens += u.total_tokens;
    const p = PRICE_MAP[data.model||state.settings.model];
    if (p && u.prompt_tokens) state.session.cost += (u.prompt_tokens/1e6)*p.in + (u.completion_tokens/1e6)*p.out;
    updateStats(); save();

    const meta = [data.model||state.settings.model, u.total_tokens?`${u.total_tokens} tokens`:null].filter(Boolean).join('  ·  ');
    addMsg('assistant', data.content, { reasoning: data.reasoning||null, meta });
    addLog('ok', `chat: ${u.total_tokens||0} tokens`);
  } catch(err) {
    typing.remove();
    addMsg('assistant', 'Erreur reseau: ' + err.message);
    addLog('err', err.message);
  }
});

// --- QUICK ACTION BUTTONS ---
$('btnSearch').addEventListener('click', () => { $('messageInput').value = 'recherche '; $('messageInput').focus(); $('btnSearch').classList.toggle('active'); });
$('btnBrowse').addEventListener('click', () => { $('messageInput').value = 'lis https://'; $('messageInput').focus(); });
$('btnCode').addEventListener('click', () => { $('messageInput').value = 'genere le code pour '; $('messageInput').focus(); });
$('sidebarSearch').addEventListener('click', () => { $('messageInput').value = 'recherche '; $('messageInput').focus(); $('sidebar').classList.remove('open'); });
$('sidebarBrowse').addEventListener('click', () => { $('messageInput').value = 'lis https://'; $('messageInput').focus(); $('sidebar').classList.remove('open'); });
$('sidebarCode').addEventListener('click', () => { $('messageInput').value = 'genere le code pour '; $('messageInput').focus(); $('sidebar').classList.remove('open'); });

// --- SETTINGS ---
function renderSettings() {
  $('modelSelect').value = state.settings.model;
  $('systemPrompt').value = state.settings.systemPrompt;
  $('memoryFacts').value = state.settings.memoryFacts;
  $('searxngUrl').value = state.settings.searxngUrl||'';
  $('terminalUrl').value = state.settings.terminalUrl||'';
}

$('saveSettings').addEventListener('click', () => {
  state.settings.model = $('modelSelect').value;
  state.settings.systemPrompt = $('systemPrompt').value.trim();
  state.settings.memoryFacts = $('memoryFacts').value.trim();
  state.settings.searxngUrl = $('searxngUrl').value.trim();
  state.settings.terminalUrl = $('terminalUrl').value.trim();
  // Update preset browse URL si searxng URL changee
  PRESETS.search.url = state.settings.searxngUrl ? '/api/search' : '/api/search';
  save(); renderSettings(); $('settingsPanel').classList.add('hidden');
  updateStats();
  addLog('ok', 'Settings sauvegardes');
});

// --- SIDEBAR & PANELS ---
$('openSidebar').addEventListener('click', () => $('sidebar').classList.add('open'));
$('closeSidebar').addEventListener('click', () => $('sidebar').classList.remove('open'));
$('toggleSettings').addEventListener('click', () => { $('settingsPanel').classList.toggle('hidden'); $('mcpPanel').classList.add('hidden'); });
$('closeSettings').addEventListener('click', () => $('settingsPanel').classList.add('hidden'));
$('openMcpPanel').addEventListener('click', () => { $('mcpPanel').classList.toggle('hidden'); $('settingsPanel').classList.add('hidden'); });
$('closeMcpPanel').addEventListener('click', () => $('mcpPanel').classList.add('hidden'));

$('clearChat').addEventListener('click', () => {
  state.messages = []; state.session = { tokens:0, cost:0, msgs:0 }; state.logs = [];
  save(); renderMessages(); updateStats(); renderLogs();
  $('sidebar').classList.remove('open');
});

// --- INPUT ---
const input = $('messageInput');
input.addEventListener('input', () => { input.style.height='auto'; input.style.height=input.scrollHeight+'px'; });
input.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('composer').requestSubmit();} });

// --- INIT ---
load();
loadModels().then(() => renderSettings());
renderMessages();
renderMcpActive();
renderMcpList();
renderLogs();
updateStats();

// Auto-ajouter les outils built-in si absents
const builtins = ['search','browse'];
builtins.forEach(name => {
  if (!state.mcpTools.find(t=>t.name===name)) {
    state.mcpTools.push(PRESETS[name] || {name, description:'outil integre', url:'/api/'+name, method:'POST'});
  }
});
renderMcpActive(); renderMcpList(); save();

if (!state.messages.length) addMsg('assistant', 'AI Terminal pret.\n\nOutils actifs: recherche web 🔍  lecture URL 🌐\nTape ton message ou utilise les boutons rapides.');
