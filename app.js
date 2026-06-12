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
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    state.messages = p.messages || [];
    state.settings = { ...state.settings, ...(p.settings || {}) };
  } catch {}
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
      opt.textContent = `${m.label}  ($${m.price_in}/$${m.price_out} /M)`;
      if (m.id === state.settings.model) opt.selected = true;
      sel.appendChild(opt);
    });
    updateModelLabel();
  } catch (e) {
    $('modelSelect').innerHTML = '<option value="deepseek/deepseek-chat-v3-0324">DeepSeek V3</option>';
  }
}

function updateModelLabel() {
  const sel = $('modelSelect');
  const label = sel.options[sel.selectedIndex]?.text || state.settings.model;
  $('modelLabel').textContent = label;
}

function renderSettings() {
  $('modelSelect').value = state.settings.model;
  $('systemPrompt').value = state.settings.systemPrompt;
  $('memoryFacts').value = state.settings.memoryFacts;
  $('mcpConfig').value = state.settings.mcpConfig;
  updateModelLabel();
}

function estimateCost(usage, modelId) {
  const prices = PRICE_MAP[modelId];
  if (!prices || !usage) return null;
  const cost = (usage.prompt_tokens / 1e6) * prices.in + (usage.completion_tokens / 1e6) * prices.out;
  return cost < 0.0001 ? '<$0.0001' : `$${cost.toFixed(4)}`;
}

function renderMessages() {
  const chat = $('chat');
  chat.innerHTML = '';
  state.messages.forEach(m => {
    const wrap = document.createElement('div');
    wrap.className = `msg-wrap ${m.role}`;

    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = m.content;
    wrap.appendChild(msg);

    if (m.reasoning) {
      const toggle = document.createElement('button');
      toggle.className = 'reasoning-toggle';
      toggle.textContent = '> [thinking] afficher le raisonnement';
      const block = document.createElement('div');
      block.className = 'reasoning-block hidden';
      block.textContent = m.reasoning;
      toggle.addEventListener('click', () => {
        const hidden = block.classList.toggle('hidden');
        toggle.textContent = hidden ? '> [thinking] afficher le raisonnement' : '> [thinking] masquer le raisonnement';
      });
      wrap.appendChild(toggle);
      wrap.appendChild(block);
    }

    if (m.meta) {
      const meta = document.createElement('div');
      meta.className = 'msg-meta';
      meta.textContent = m.meta;
      wrap.appendChild(meta);
    }

    chat.appendChild(wrap);
  });
  chat.scrollTop = chat.scrollHeight;
}

function addMsg(role, content, extras = {}) {
  state.messages.push({ role, content, ...extras });
  save();
  renderMessages();
}

function getMcpTools() {
  try { return JSON.parse(state.settings.mcpConfig || '[]'); } catch { return []; }
}

function buildSystemPrompt() {
  let sys = state.settings.systemPrompt;
  if (state.settings.memoryFacts.trim()) {
    sys += '\n\nFaits importants sur l utilisateur :\n' + state.settings.memoryFacts.trim();
  }
  if (state.settings.summaryMemory) {
    sys += '\n\nResume de la conversation precedente :\n' + state.settings.summaryMemory;
  }
  return sys;
}

async function maybeSummarize() {
  if (state.messages.filter(m => m.role === 'user').length % 10 !== 0) return;
  const last20 = state.messages.slice(-20).map(m => `${m.role}: ${m.content}`).join('\n');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: state.settings.model,
        systemPrompt: 'Resumes cette conversation en 5 lignes maximum, en francais.',
        messages: [{ role: 'user', content: last20 }]
      })
    });
    const data = await res.json();
    if (data.content) {
      state.settings.summaryMemory = data.content;
      save();
    }
  } catch {}
}

async function callMcpTool(tool, userMsg) {
  try {
    const res = await fetch(tool.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: userMsg })
    });
    return await res.text();
  } catch (e) {
    return `Erreur MCP (${tool.name}): ${e.message}`;
  }
}

$('toggleSettings').addEventListener('click', () => $('settings').classList.toggle('hidden'));

$('modelSelect').addEventListener('change', updateModelLabel);

$('saveSettings').addEventListener('click', () => {
  state.settings.model = $('modelSelect').value;
  state.settings.systemPrompt = $('systemPrompt').value.trim();
  state.settings.memoryFacts = $('memoryFacts').value.trim();
  state.settings.mcpConfig = $('mcpConfig').value.trim() || '[]';
  save();
  updateModelLabel();
  $('settings').classList.add('hidden');
  addMsg('assistant', 'Configuration sauvegardee. Modele : ' + state.settings.model);
});

$('clearChat').addEventListener('click', () => {
  state.messages = [];
  state.settings.summaryMemory = '';
  save();
  renderMessages();
});

const input = $('messageInput');
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; });
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('composer').requestSubmit(); } });

$('composer').addEventListener('submit', async e => {
  e.preventDefault();
  const content = input.value.trim();
  if (!content) return;

  addMsg('user', content, { meta: new Date().toLocaleTimeString() });
  input.value = '';
  input.style.height = 'auto';

  const typing = document.createElement('div');
  typing.className = 'msg-wrap assistant';
  typing.innerHTML = '<div class="msg"><span class="typing-indicator">_</span></div>';
  $('chat').appendChild(typing);
  $('chat').scrollTop = $('chat').scrollHeight;

  const tools = getMcpTools();
  let mcpResult = null;
  if (tools.length) {
    for (const tool of tools) {
      if (content.toLowerCase().includes(tool.name.toLowerCase())) {
        mcpResult = await callMcpTool(tool, content);
        break;
      }
    }
  }

  const messages = state.messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(({ role, content }) => ({ role, content }));

  if (mcpResult) messages.push({ role: 'user', content: `Resultat de l outil : ${mcpResult}` });

  const start = Date.now();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: state.settings.model,
        systemPrompt: buildSystemPrompt(),
        messages,
        mcpTools: tools
      })
    });

    typing.remove();

    if (!res.ok) {
      const err = await res.json();
      addMsg('assistant', 'Erreur : ' + (err.error || res.status));
      return;
    }

    const data = await res.json();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const u = data.usage || {};
    const cost = estimateCost(u, data.model || state.settings.model);

    const metaParts = [
      new Date().toLocaleTimeString(),
      data.model || state.settings.model,
      u.prompt_tokens ? `tokens: ${u.prompt_tokens}p / ${u.completion_tokens}c / ${u.total_tokens}t` : null,
      cost ? `cout: ${cost}` : null,
      `${elapsed}s`
    ].filter(Boolean);

    addMsg('assistant', data.content, {
      reasoning: data.reasoning || null,
      meta: metaParts.join('  |  ')
    });

    await maybeSummarize();

  } catch (err) {
    typing.remove();
    addMsg('assistant', 'Erreur reseau : ' + err.message);
  }
});

load();
loadModels().then(() => renderSettings());
renderMessages();
if (!state.messages.length) {
  addMsg('assistant', 'Terminal pret. Configure le modele dans [ config ] puis commence.');
}
