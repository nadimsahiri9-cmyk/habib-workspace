// Vercel fallback (non utilise sur Netlify)
export default async function handler(req, res) {
  res.status(200).json({ info: 'Use Netlify functions' });
}
