# AI Terminal

Interface mobile-first style terminal pour discuter avec une IA via OpenRouter.
Deploy Vercel (frontend + backend serverless).

## Features

- Design terminal vintage (monospace, ambre sur noir)
- Backend Vercel serverless — cle API securisee cote serveur
- 15 modeles : DeepSeek, Qwen, Mistral, Gemini, GPT, Claude
- Compteur tokens (prompt / completion / total) + cout estime + temps
- Bloc raisonnement repliable (DeepSeek R1, QwQ)
- Memoire faits persistants injectes dans chaque prompt
- Resume automatique toutes les 10 messages
- MCP tools configurables en JSON (fetch vers URL externe)

## Deploy Vercel

1. Forker ou cloner ce repo
2. Aller sur vercel.com > Add New Project > importer le repo
3. Dans Settings > Environment Variables, ajouter :
   - `OPENROUTER_API_KEY` = ta cle OpenRouter
4. Deploy

Aucun build command necessaire. Publish directory : `.`

## Structure

```
index.html       interface
styles.css       design terminal
app.js           logique frontend
api/
  chat.js        proxy OpenRouter (serverless)
  models.js      liste modeles + prix
vercel.json      routing
```

## MCP config exemple

```json
[
  {
    "name": "meteo",
    "description": "retourne la meteo actuelle",
    "url": "https://ton-vps.com/webhook/meteo"
  }
]
```
