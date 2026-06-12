exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  let url;
  try { url = JSON.parse(event.body).url; } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'url manquante' }) }; }
  if (!url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'url manquante' }) };

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AITerminal/1.0)' }, signal: AbortSignal.timeout(8000) });
    const html = await res.text();
    // Extrait le texte brut en supprimant les balises HTML
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);
    return { statusCode: 200, headers, body: JSON.stringify({ url, text, length: text.length }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
