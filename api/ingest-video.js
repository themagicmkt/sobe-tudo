// Manda o FB ingerir 1 video a partir da URL publica do Blob. Retorna rapido.
import { uploadVideoByUrl, normAcct, checkPass } from '../lib/meta.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!checkPass(req)) return res.status(401).json({ error: 'senha incorreta' });
  try {
    const b = req.body || {};
    const videoId = await uploadVideoByUrl(b.fbToken, normAcct(b.adAccount), b.blobUrl, b.name || 'video');
    res.json({ ok: true, videoId });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
}
