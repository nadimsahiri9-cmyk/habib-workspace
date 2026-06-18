# OpenClaw Avancé — Fiche de référence

## Architecture

- **Gateway** = processus unique long-lived qui possède toutes les connexions (channels, WebSocket control-plane)
- Port par défaut : `18789` (WS), canvas et A2UI servis sur le même port
- **1 Gateway par host** — pour isoler : multiple gateways avec profiles/ports séparés
- Connexion : WebSocket, text frames JSON. Première frame = `connect`
- Nodes (iOS/Android/macOS) se connectent au même WS avec `role: node`

## Multi-agent

- Plusieurs agents isolés dans 1 Gateway : workspace, state, sessions séparés
- Config : `agents.list[]` avec `id`, `workspace`, `agentDir`, `skills`
- Chaque agent a son propre `agentDir` → `~/.openclaw/agents/<agentId>/`
- Bindings : mapper un channel account → un agent
- Auth profiles : par agent, dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Skills : hérités de `agents.defaults.skills` ou écrasés par `agents.list[].skills`

## Sessions

- Routage : DM → shared session / Groupes → isolé / Cron → fresh session / Webhooks → isolé
- DM isolation : `session.dmScope: "per-channel-peer"` (recommandé multi-user)
- Identity links : `session.identityLinks` pour lier plusieurs comptes d'une même personne
- Session lifecycle : compaction, pruning configurable dans `session.*`
- Cron jobs : `sessionTarget: "isolated"` = session fraîche à chaque run

## Memory

- MEMORY.md = mémoire long-terme (chargée au début des DM)
- memory/YYYY-MM-DD.md = notes quotidiennes (chargées jour J et J-1)
- DREAMS.md = Dream Diary (optionnel)
- MEMORY.md doit rester compact ; détailler dans memory/*.md
- `memory_search` / `memory_get` indexent tout memory/*.md
- Pas de fichier → pas de mémoire persistée entre sessions

## Tools & Skills

- Tool profiles : `minimal`, `coding`, `messaging`, `full`
- Tool groups : `group:fs`, `group:runtime`, `group:web`, `group:sessions`, etc.
- Skills : dossiers avec SKILL.md, chargés depuis workspace + ~/.openclaw/skills/
- MCP servers : exposés via plugin `bundle-mcp`
- Sandboxing : `tools.sandbox.*` pour restreindre les sessions isolées

## Configuration avancée

- Format : JSON5 (commentaires + trailing commas)
- Hot reload : le Gateway watch le fichier et applique les changements auto
- `openclaw config schema` → JSON Schema complet
- `openclaw config get/set/unset` → CLI one-liners
- Control UI : http://127.0.0.1:18789 (Config tab)
- `agents.defaults.*` : workspace, model, thinking, heartbeat, memory, media, skills, sandbox
- `models.mode` : `merge` ou `replace` pour le catalog provider

## Cron & Automation

- Cron jobs : `schedule` (at/every/cron), `sessionTarget` (main/isolated/current/session:<id>)
- Payload kinds : `systemEvent` (main session) ou `agentTurn` (isolated/current)
- Delivery : `none`, `announce`, `webhook`
- Heartbeat : configurable via `agents.defaults.heartbeat.every`

## Sécurité réseau

- Loopback first : WS par défaut sur `127.0.0.1:18789`
- Non-loopback nécessite shared-secret auth ou `trusted-proxy`
- Remote access : SSH tunnel ou Tailscale VPN (recommandé)
- Ports autorisés courants : 18789, 18790, 2019
- Canvas host protégé par Gateway auth si bind > loopback

## Diagnostics

- `openclaw doctor` → diagnostic complet
- `openclaw status` → état du gateway
- `openclaw config validate` → validation config
- Prometheus metrics : `/gateway/prometheus`
- Logging : configurable dans `logging.md`
