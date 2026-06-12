const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args)).catch(() => globalThis.fetch(...args));

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'OPENROUTER_API_KEY non definie dans Netlify' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) }; }

  const { messages, model, systemPrompt, mcpTools } = body;
  if (!messages || !model) return { statusCode: 400, headers, body: JSON.stringify({ error: 'messages ou model manquant' }) };

  let systemContent = systemPrompt || 'Tu es une IA utile. Reponds en francais.';
  if (mcpTools && mcpTools.length)
    systemContent += '\n\nOutils MCP:\n' + mcpTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

  try {
    const response = await globalThis.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mobile-ai-chat.netlify.app',
        'X-Title': 'Mobile AI Chat'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemContent }, ...messages],
        include_reasoning: true
      })
    });

    const data = await response.json();
    if (!response.ok) return { statusCode: response.status, headers, body: JSON.stringify({ error: JSON.stringify(data) }) };

    const choice = data.choices?.[0];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: choice?.message?.content || '',
        reasoning: choice?.message?.reasoning || '',
        model: data.model || model,
        usage: data.usage || {}
      })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
