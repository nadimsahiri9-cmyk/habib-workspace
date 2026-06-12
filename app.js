const $ = id => document.getElementById(id);
const KEY = 'ai-terminal-v3';
const PRICE_MAP = {};

const state = {
  messages: [],
  mcpTools: [],
  session: { tokens: 0, cost: 0, msgs: 0 },
  logs: [],
  settings: {
    model: 'deepseek/deepseek-chat-v3-0324',
    systemPrompt: 'Tu es une IA experte, precise et concise. Tu reponds en francais.\nQuand on te demande de rechercher quelque chose, utilise l outil search.\nQuand on te demande de lire une URL, utilise l outil browse.',
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
    state.session = p.session || { tokens:0, cost:0, msgs:0 };
    state.logs = p.logs || [];
    state.settings = { ...state.settings, ...(p.settings||{}) };
  } catch {}
}

// --- MODELS ---
async function loadModels() {
  try {
    const res = await fetch('/api/models');
    const models = await res.json();
    const sel = $('modelSelect');
    sel.innerHTML = '';
    const groups = { free:'Gratuit', cheap:'Economique', mid:'Standard', premium:'Premium' };
    const byTag = {};
    models.forEach(m => {
      PRICE_MAP[m.id] = { in: m.price_in, out: m.price_out };
      const tag = m.tag || 'mid';
      if (!byTag[tag]) byTag[tag] = [];
      byTag[tag].push(m);
    });
    Object.entries(groups).forEach(([tag, label]) => {
      if (!byTag[tag]) return;
      const grp = document.createElement('optgroup');
      grp.label = '── ' + label;
      byTag[tag].forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        const price = m.price_in === 0 ? 'gratuit' : `$${m.price_in}/$${m.price_out}M`;
        opt.textContent = `${m.label}  ·  ${price}`;
        if (m.id === state.settings.model) opt.selected = true;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
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
  state.logs.unshift({ type, text, ts: new Date().toLocaleTimeString() });
  if (state.logs.length > 60) state.logs.pop();
  renderLogs(); save();
}
function renderLogs() {
  const el = $('logList'); el.innerHTML = '';
  state.logs.slice(0,25).forEach(l => {
    const d = document.createElement('div');
    d.className = `log-entry ${l.type}`;
    d.textContent = `${l.ts}  ${l.text}`;
    el.appendChild(d);
  });
}

// --- MCP PRESETS ---
const MCP_PRESETS = {
  search: {
    name:'search', description:'Recherche web (SearXNG/DDG)', url:'/api/search', method:'POST',
    help:'Outil intégré. Tape : "recherche [sujet]".'
  },
  browse: {
    name:'browse', description:'Lit le contenu d une URL', url:'/api/browse', method:'POST',
    help:'Outil intégré. Tape : "lis https://...".'
  },
  terminal: {
    name:'terminal', description:'Exécute une commande sur ton VPS', url:'', method:'POST',
    help:'Configure l URL webhook dans Settings. Ex : N8N webhook qui execute du bash.'
  },
  notion: {
    name:'notion', description:'Crée/lit des pages Notion', url:'https://api.notion.com/v1/pages', method:'POST',
    headers:'{"Authorization":"Bearer TON_TOKEN","Notion-Version":"2022-06-28","Content-Type":"application/json"}',
    help:'Remplace TON_TOKEN par ton Integration Token Notion (notion.so/my-integrations).'
  },
  github: {
    name:'github', description:'Crée issues / lit repos GitHub', url:'https://api.github.com/repos/TON_REPO/issues', method:'POST',
    headers:'{"Authorization":"Bearer TON_TOKEN","Accept":"application/vnd.github+json"}',
    help:'Remplace TON_REPO et TON_TOKEN par ton repo et ton Personal Access Token GitHub.'
  },
  n8n: {
    name:'n8n', description:'Déclenche un workflow N8N', url:'https://TON_N8N/webhook/TON_ID', method:'POST',
    help:'Colle l URL webhook de ton workflow N8N.'
  },
  telegram: {
    name:'telegram', description:'Envoie un message Telegram', url:'https://api.telegram.org/botTON_TOKEN/sendMessage', method:'POST',
    headers:'{"Content-Type":"application/json"}',
    help:'Remplace TON_TOKEN par ton Bot Token. Le body doit contenir chat_id et text.'
  },
  applenotes: {
    name:'notes', description:'Crée une note (via N8N/Shortcuts)', url:'', method:'POST',
    help:'Apple Notes n a pas d API directe. Utilise un webhook N8N + Apple Shortcuts sur Mac/iPhone pour créer des notes automatiquement.'
  }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = MCP_PRESETS[btn.dataset.preset];
    if (!p) return;
    $('mcpName').value = p.name;
    $('mcpDesc').value = p.description;
    $('mcpUrl').value = p.url || '';
    $('mcpMethod').value = p.method || 'POST';
    $('mcpHeaders').value = p.headers || '';
    // Affiche aide
    let help = document.getElementById('mcpHelpBox');
    if (!help) { help = document.createElement('div'); help.id='mcpHelpBox'; help.className='mcp-help'; $('saveMcp').before(help); }
    help.textContent = p.help || '';
  });
});

// --- MCP RENDER ---
function renderMcpActive() {
  const el = $('mcpActiveList'); el.innerHTML = '';
  state.mcpTools.forEach((t,i) => {
    const chip = document.createElement('div'); chip.className='mcp-chip';
    chip.innerHTML = `<span class="chip-name">${t.name}</span><span class="chip-desc">${t.description}</span><button data-i="${i}">✕</button>`;
    chip.querySelector('button').addEventListener('click',()=>{ state.mcpTools.splice(i,1); save(); renderMcpActive(); renderMcpList(); });
    el.appendChild(chip);
  });
}
function renderMcpList() {
  const el = $('mcpList'); el.innerHTML = '';
  state.mcpTools.forEach((t,i) => {
    const item = document.createElement('div'); item.className='mcp-item';
    item.innerHTML = `<span>${t.name} <span style="color:var(--muted)">${t.description}</span></span><button data-i="${i}">✕</button>`;
    item.querySelector('button').addEventListener('click',()=>{ state.mcpTools.splice(i,1); save(); renderMcpActive(); renderMcpList(); });
    el.appendChild(item);
  });
}

$('saveMcp').addEventListener('click', () => {
  const name=$('mcpName').value.trim(), description=$('mcpDesc').value.trim(), url=$('mcpUrl').value.trim(), method=$('mcpMethod').value;
  let headers={};
  try { if($('mcpHeaders').value.trim()) headers=JSON.parse($('mcpHeaders').value.trim()); } catch {}
  if (!name) return;
  // Si url vide et outil integre, utilise l url par defaut
  const finalUrl = url || ('/api/' + name);
  state.mcpTools.push({name, description, url: finalUrl, method, headers});
  save(); renderMcpActive(); renderMcpList();
  $('mcpName').value=''; $('mcpDesc').value=''; $('mcpUrl').value=''; $('mcpHeaders').value='';
  const help = document.getElementById('mcpHelpBox'); if(help) help.textContent='';
  addLog('ok',`MCP ajouté: ${name}`);
});

// --- MESSAGES ---
function renderMessages() {
  const chat=$('chat'); chat.innerHTML='';
  state.messages.forEach(m => {
    const wrap=document.createElement('div'); wrap.className=`msg-wrap ${m.role}`;
    if (m.toolResult) {
      const tr=document.createElement('div'); tr.className='tool-result'; tr.textContent=m.toolResult; wrap.appendChild(tr);
    }
    if (m.content) {
      const msg=document.createElement('div'); msg.className='msg'; msg.textContent=m.content; wrap.appendChild(msg);
    }
    if (m.reasoning) {
      const toggle=document.createElement('button'); toggle.className='reasoning-toggle'; toggle.textContent='▶ Raisonnement';
      const block=document.createElement('div'); block.className='reasoning-block hidden'; block.textContent=m.reasoning;
      toggle.addEventListener('click',()=>{ const h=block.classList.toggle('hidden'); toggle.textContent=h?'▶ Raisonnement':'▼ Raisonnement'; });
      wrap.appendChild(toggle); wrap.appendChild(block);
    }
    if (m.meta) { const meta=document.createElement('div'); meta.className='msg-meta'; meta.textContent=m.meta; wrap.appendChild(meta); }
    chat.appendChild(wrap);
  });
  chat.scrollTop=chat.scrollHeight;
}

function addMsg(role, content, extras={}) {
  state.messages.push({role, content, ...extras}); save(); renderMessages();
}

function buildSystemPrompt() {
  let s=state.settings.systemPrompt;
  if (state.settings.memoryFacts.trim()) s+='\n\nFaits importants:\n'+state.settings.memoryFacts.trim();
  if (state.settings.summaryMemory) s+='\n\nRésumé précédent:\n'+state.settings.summaryMemory;
  s+=`\n\nDate/heure: ${new Date().toLocaleString('fr-FR')}`;
  return s;
}

// --- BUILT-IN TOOLS ---
async function runBuiltinTool(name, input) {
  addLog('info',`${name}: ${input.slice(0,60)}`);
  try {
    const res = await fetch(`/api/${name}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(name==='browse' ? {url:input} : {query:input})
    });
    const data = await res.json();
    if (data.error) { addLog('err',`${name}: ${data.error}`); return `Erreur ${name}: ${data.error}`; }
    if (name==='search') {
      const txt=(data.results||[]).map((r,i)=>`[${i+1}] ${r.title}\n${r.snippet}\n${r.url}`).join('\n\n');
      addLog('ok',`search: ${(data.results||[]).length} resultats`);
      return `Résultats pour "${input}":\n\n${txt}`;
    }
    if (name==='browse') {
      addLog('ok',`browse: ${data.length} chars`);
      return `Contenu de ${input}:\n\n${data.text}`;
    }
  } catch(e) { addLog('err',`${name}: ${e.message}`); return `Erreur: ${e.message}`; }
}

// Detect intent
function detectIntent(text) {
  const t=text.toLowerCase();
  if (/recherch|search|trouve|googl|info sur|actualit|qu.est.ce que|c.est quoi/.test(t)) return 'search';
  if (/lis|lire|ouvre|browse|https?:\/\/|contenu de|page de/.test(t)) return 'browse';
  return null;
}
function extractArg(text, intent) {
  if (intent==='browse') { const m=text.match(/https?:\/\/[^\s]+/); return m?m[0]:text; }
  return text.replace(/^.*(recherche|search|trouve|info sur|parle.moi de|qu.est.ce que|c.est quoi)\s*/i,'').trim() || text;
}

// --- SEND ---
$('composer').addEventListener('submit', async e => {
  e.preventDefault();
  const content=$('messageInput').value.trim(); if(!content) return;
  addMsg('user', content, {meta:new Date().toLocaleTimeString()});
  $('messageInput').value=''; $('messageInput').style.height='auto';
  state.session.msgs++; updateStats();

  const typing=document.createElement('div'); typing.className='msg-wrap assistant typing';
  typing.innerHTML='<div class="msg"></div>';
  $('chat').appendChild(typing); $('chat').scrollTop=$('chat').scrollHeight;

  let contextInjection=null;

  // Detect built-in tool
  const intent=detectIntent(content);
  if (intent) {
    const arg=extractArg(content, intent);
    const toolEl=document.createElement('div'); toolEl.className='tool-result';
    toolEl.textContent=`⚙ ${intent}: ${arg.slice(0,80)}...`;
    typing.insertBefore(toolEl, typing.firstChild);
    const result=await runBuiltinTool(intent, arg);
    if (result) { contextInjection=result; toolEl.textContent=`✓ ${intent} (${result.length} chars)`; }
  }

  // MCP custom tools
  if (!contextInjection) {
    for (const tool of state.mcpTools) {
      if (!['search','browse'].includes(tool.name) && content.toLowerCase().includes(tool.name.toLowerCase())) {
        try {
          const opts={method:tool.method||'POST', headers:{'Content-Type':'application/json',...(tool.headers||{})}};
          if (tool.method!=='GET') opts.body=JSON.stringify({query:content, input:content});
          const r=await fetch(tool.url, opts); contextInjection=await r.text();
          addLog('ok',`MCP ${tool.name}: OK`);
        } catch(err) { addLog('err',`MCP ${tool.name}: ${err.message}`); }
        break;
      }
    }
  }

  const messages=state.messages.filter(m=>m.role==='user'||m.role==='assistant').map(({role,content})=>({role,content}));
  if (contextInjection) messages.push({role:'user', content:`Contexte additionnel pour ta réponse:\n\n${contextInjection}`});

  try {
    const res=await fetch('/api/chat',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:state.settings.model, systemPrompt:buildSystemPrompt(), messages, mcpTools:state.mcpTools})
    });
    typing.remove();
    const data=await res.json();
    if (!res.ok) { addMsg('assistant','Erreur: '+(data.error||res.status)); addLog('err',data.error||String(res.status)); return; }

    const u=data.usage||{};
    if (u.total_tokens) state.session.tokens+=u.total_tokens;
    const p=PRICE_MAP[data.model||state.settings.model];
    if (p&&u.prompt_tokens) state.session.cost+=(u.prompt_tokens/1e6)*p.in+(u.completion_tokens/1e6)*p.out;
    updateStats(); save();

    const meta=[data.model||state.settings.model, u.total_tokens?`${u.total_tokens} tok`:null].filter(Boolean).join(' · ');
    addMsg('assistant', data.content, {reasoning:data.reasoning||null, meta});
    addLog('ok',`chat OK · ${u.total_tokens||0} tok`);
  } catch(err) { typing.remove(); addMsg('assistant','Erreur réseau: '+err.message); addLog('err',err.message); }
});

// --- QUICK ACTIONS ---
$('btnSearch').addEventListener('click',()=>{ setInput('recherche '); $('btnSearch').classList.add('active'); setTimeout(()=>$('btnSearch').classList.remove('active'),2000); });
$('btnBrowse').addEventListener('click',()=>setInput('lis https://'));
$('btnTerminal').addEventListener('click',()=>setInput('terminal: '));
$('btnCode').addEventListener('click',()=>setInput('génère le code pour '));
$('sidebarSearch').addEventListener('click',()=>{ setInput('recherche '); closeSidebar(); });
$('sidebarBrowse').addEventListener('click',()=>{ setInput('lis https://'); closeSidebar(); });
$('sidebarCode').addEventListener('click',()=>{ setInput('génère le code pour '); closeSidebar(); });
$('sidebarTerminal').addEventListener('click',()=>{ setInput('terminal: '); closeSidebar(); });
function setInput(v){ $('messageInput').value=v; $('messageInput').focus(); $('messageInput').style.height='auto'; $('messageInput').style.height=$('messageInput').scrollHeight+'px'; }
function closeSidebar(){ $('sidebar').classList.remove('open'); }

// --- SETTINGS ---
function renderSettings() {
  $('modelSelect').value=state.settings.model;
  $('systemPrompt').value=state.settings.systemPrompt;
  $('memoryFacts').value=state.settings.memoryFacts;
  $('searxngUrl').value=state.settings.searxngUrl||'';
  $('terminalUrl').value=state.settings.terminalUrl||'';
}
$('saveSettings').addEventListener('click',()=>{
  state.settings.model=$('modelSelect').value;
  state.settings.systemPrompt=$('systemPrompt').value.trim();
  state.settings.memoryFacts=$('memoryFacts').value.trim();
  state.settings.searxngUrl=$('searxngUrl').value.trim();
  state.settings.terminalUrl=$('terminalUrl').value.trim();
  // Maj URL terminal dans les outils
  const term=state.mcpTools.find(t=>t.name==='terminal');
  if (term&&state.settings.terminalUrl) term.url=state.settings.terminalUrl;
  save(); renderSettings(); $('settingsPanel').classList.add('hidden');
  updateStats(); addLog('ok','Settings sauvegardés');
});

// --- SIDEBAR & PANELS ---
$('openSidebar').addEventListener('click',()=>$('sidebar').classList.add('open'));
$('closeSidebar').addEventListener('click',closeSidebar);
$('toggleSettings').addEventListener('click',()=>{ $('settingsPanel').classList.toggle('hidden'); $('mcpPanel').classList.add('hidden'); });
$('closeSettings').addEventListener('click',()=>$('settingsPanel').classList.add('hidden'));
$('openMcpPanel').addEventListener('click',()=>{ $('mcpPanel').classList.toggle('hidden'); $('settingsPanel').classList.add('hidden'); });
$('closeMcpPanel').addEventListener('click',()=>$('mcpPanel').classList.add('hidden'));
$('clearChat').addEventListener('click',()=>{
  state.messages=[]; state.session={tokens:0,cost:0,msgs:0}; state.logs=[];
  save(); renderMessages(); updateStats(); renderLogs(); closeSidebar();
});

// --- INPUT ---
const input=$('messageInput');
input.addEventListener('input',()=>{ input.style.height='auto'; input.style.height=input.scrollHeight+'px'; });
input.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('composer').requestSubmit();} });

// --- INIT ---
load();
loadModels().then(()=>renderSettings());
renderMessages(); renderMcpActive(); renderMcpList(); renderLogs(); updateStats();

// Auto-add built-in tools if missing
['search','browse'].forEach(name=>{
  if (!state.mcpTools.find(t=>t.name===name)) {
    const p=MCP_PRESETS[name]; state.mcpTools.push({name:p.name, description:p.description, url:p.url, method:p.method, headers:{}});
  }
});
renderMcpActive(); renderMcpList(); save();

if (!state.messages.length) addMsg('assistant', 'AI Terminal prêt.\n\n🔍 Recherche web active\n🌐 Lecture URL active\n$ Terminal (config dans ⚙)\n\nTape ton message ou utilise les boutons.');
