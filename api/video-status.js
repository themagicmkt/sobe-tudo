// Checa o status de processamento de 1 video (chamada curta, o navegador faz polling).
import { fbGet, checkPass } from '../lib/meta.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!checkPass(req)) return res.status(401).json({ error: 'senha incorreta' });
  try {
    const b = req.body || {};
    const j = await fbGet(b.fbToken, `${b.videoId}?fields=status`);
    res.json({ ok: true, status: j.status?.video_status || 'unknown' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
}
