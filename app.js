const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'mobile-ai-chat-v1';

const state = {
  messages: [],
  settings: {
    apiKey: '',
    model: 'openai/gpt-4o-mini',
    systemPrompt: 'Tu es une IA utile, concise et claire. Réponds en français.',
    mcpConfig: '[]'
  }
};

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const p = JSON.parse(raw);
  state.messages = p.messages || [];
  state.settings = { ...state.settings, ...(p.settings || {}) };
}

function renderSettings() {
  $('apiKey').value = state.settings.apiKey;
  $('modelSelect').value = state.settings.model;
  $('systemPrompt').value = state.settings.systemPrompt;
  $('mcpConfig').value = state.settings.mcpConfig;
  $('modelLabel').textContent = state.settings.model;
}

function renderMessages() {
  const chat = $('chat');
  chat.innerHTML = '';
  state.messages.forEach((m) => {
    const el = document.createElement('div');
    el.className = 'msg ' + m.role;
    el.textContent = m.content;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = m.role + ' · ' + new Date(m.ts).toLocaleTimeString();
    el.appendChild(meta);
    chat.appendChild(el);
  });
  chat.scrollTop = chat.scrollHeight;
}

function addMsg(role, content) {
  state.messages.push({ role, content, ts: Date.now() });
  save();
  renderMessages();
}

function getMcpContext() {
  try {
    const tools = JSON.parse(state.settings.mcpConfig || '[]');
    if (!tools.length) return '';
    return '\n\nOutils MCP disponibles:\n' + tools.map(t => '- ' + t.name + ': ' + (t.description || '')).join('\n');
  } catch { return ''; }
}

async function sendToOpenRouter(userMsg) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.settings.apiKey,
      'HTTP-Referer': window.location.href,
      'X-Title': 'Mobile AI Chat'
    },
    body: JSON.stringify({
      model: state.settings.model,
      messages: [
        { role: 'system', content: state.settings.systemPrompt + getMcpContext() },
        ...state.messages.map(({ role, content }) => ({ role, content }))
      ]
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || 'Pas de réponse';
}

$('toggleSettings').addEventListener('click', () => $('settings').classList.toggle('hidden'));

$('saveSettings').addEventListener('click', () => {
  state.settings.apiKey = $('apiKey').value.trim();
  state.settings.model = $('modelSelect').value;
  state.settings.systemPrompt = $('systemPrompt').value.trim();
  state.settings.mcpConfig = $('mcpConfig').value.trim() || '[]';
  save();
  renderSettings();
  $('settings').classList.add('hidden');
  addMsg('assistant', '✅ Réglages sauvegardés. Modèle : ' + state.settings.model);
});

$('clearChat').addEventListener('click', () => {
  state.messages = [];
  save();
  renderMessages();
});

const input = $('messageInput');
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; });
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('composer').requestSubmit(); } });

$('composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = input.value.trim();
  if (!content) return;
  if (!state.settings.apiKey) { addMsg('assistant', '⚠️ Configure ta clé OpenRouter dans ⚙️ les réglages.'); return; }

  addMsg('user', content);
  input.value = '';
  input.style.height = 'auto';

  const typingEl = document.createElement('div');
  typingEl.className = 'msg assistant typing';
  typingEl.textContent = '...';
  $('chat').appendChild(typingEl);
  $('chat').scrollTop = $('chat').scrollHeight;

  try {
    const reply = await sendToOpenRouter();
    typingEl.remove();
    addMsg('assistant', reply);
  } catch (err) {
    typingEl.remove();
    addMsg('assistant', '❌ Erreur : ' + err.message);
  }
});

load();
renderSettings();
renderMessages();
if (!state.messages.length) addMsg('assistant', '👋 Salut ! Configure ta clé OpenRouter dans ⚙️ puis discute avec moi.');
