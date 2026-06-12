exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  let query;
  try { query = JSON.parse(event.body).query; } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'query manquante' }) }; }
  if (!query) return { statusCode: 400, headers, body: JSON.stringify({ error: 'query manquante' }) };

  // SearXNG public instance
  const searxUrl = process.env.SEARXNG_URL || 'https://searx.be';

  try {
    const url = `${searxUrl}/search?q=${encodeURIComponent(query)}&format=json&language=fr`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`SearXNG status: ${res.status}`);
    const data = await res.json();
    const results = (data.results || []).slice(0, 5).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content || ''
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ query, results }) };
  } catch (err) {
    // Fallback DuckDuckGo Instant Answer
    try {
      const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`, { signal: AbortSignal.timeout(5000) });
      const ddgData = await ddg.json();
      const results = [];
      if (ddgData.AbstractText) results.push({ title: ddgData.Heading, url: ddgData.AbstractURL, snippet: ddgData.AbstractText });
      (ddgData.RelatedTopics || []).slice(0, 4).forEach(t => { if (t.Text) results.push({ title: t.Text.slice(0, 60), url: t.FirstURL || '', snippet: t.Text }); });
      return { statusCode: 200, headers, body: JSON.stringify({ query, results, source: 'duckduckgo' }) };
    } catch (e2) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Recherche indisponible: ' + err.message }) };
    }
  }
};
