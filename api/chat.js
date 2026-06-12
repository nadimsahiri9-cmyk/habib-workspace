export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, model, systemPrompt, mcpTools } = req.body;

  if (!messages || !model) return res.status(400).json({ error: 'Missing messages or model' });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not set' });

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
        'HTTP-Referer': 'https://mobile-ai-chat.vercel.app',
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
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const elapsed = Date.now() - start;

    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';
    const reasoning = choice?.message?.reasoning || '';
    const usage = data.usage || {};

    return res.status(200).json({
      content,
      reasoning,
      model: data.model || model,
      usage,
      elapsed
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
