exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'OPENROUTER_API_KEY not set' }) };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { messages, model, systemPrompt, mcpTools } = body;
  if (!messages || !model) return { statusCode: 400, body: JSON.stringify({ error: 'Missing messages or model' }) };

  let systemContent = systemPrompt || 'Tu es une IA utile, concise et claire. Reponds en francais.';
  if (mcpTools && mcpTools.length) {
    systemContent += '\n\nOutils disponibles (MCP):\n' + mcpTools.map(t => `- ${t.name}: ${t.description}`).join('\n');
  }

  const start = Date.now();

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: err }) };
    }

    const data = await response.json();
    const elapsed = Date.now() - start;
    const choice = data.choices?.[0];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: choice?.message?.content || '',
        reasoning: choice?.message?.reasoning || '',
        model: data.model || model,
        usage: data.usage || {},
        elapsed
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
