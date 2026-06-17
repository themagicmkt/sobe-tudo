import Anthropic from '@anthropic-ai/sdk';
import { fbGet, normAcct, COPY_MODEL, checkPass } from '../lib/meta.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!checkPass(req)) return res.status(401).json({ error: 'senha incorreta' });
  const { fbToken, anthropicKey } = req.body || {};
  const adAccount = normAcct(req.body?.adAccount);
  const out = {};
  try {
    const acc = await fbGet(fbToken, `${adAccount}?fields=name,currency,account_status`);
    out.fb = { ok: true, name: acc.name, currency: acc.currency };
  } catch (e) { out.fb = { ok: false, error: e.message }; }
  if (anthropicKey && anthropicKey.trim()) {
    try {
      const c = new Anthropic({ apiKey: anthropicKey.trim() });
      await c.messages.create({ model: COPY_MODEL, max_tokens: 5, messages: [{ role: 'user', content: 'ok' }] });
      out.anthropic = { ok: true };
    } catch (e) { out.anthropic = { ok: false, error: e.message }; }
  } else {
    out.anthropic = { ok: false, error: 'cole sua API key da Anthropic (sk-ant-...)' };
  }
  res.json(out);
}
