// Cria a campanha (1x). Se estrutura = 1 conjunto (1-1-X), cria tambem o conjunto base.
// Retorna ids pro navegador usar nas chamadas de create-ad.
import { fbPost, normAcct, parseCountries, adsetBody, checkPass } from '../lib/meta.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!checkPass(req)) return res.status(401).json({ error: 'senha incorreta' });
  try {
    const b = req.body || {};
    const fbToken = b.fbToken;
    const adAccount = normAcct(b.adAccount);
    const status = b.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    const structure = b.structure === 'adset_per_creative' ? 'adset_per_creative' : 'one_adset';
    const cbo = (b.budgetLevel || 'campaign') !== 'adset';
    const dailyBudget = Math.round(Number(b.dailyBudget || 20) * 100);
    const countries = parseCountries(b.countries);
    const name = `${b.campaignName || 'Sobe Tudo'} — ${new Date().toISOString().slice(0, 10)}`;

    const campaign = await fbPost(fbToken, `${adAccount}/campaigns`, {
      name, objective: 'OUTCOME_SALES', status, special_ad_categories: [],
      ...(cbo ? { daily_budget: dailyBudget, bid_strategy: 'LOWEST_COST_WITHOUT_CAP' } : {}),
    });

    let adsetId = null;
    if (structure === 'one_adset') {
      const as = await fbPost(fbToken, `${adAccount}/adsets`, adsetBody({
        name: `${b.campaignName || 'Sobe Tudo'} — set 1`, campaignId: campaign.id, status,
        pixelId: b.pixelId, countries, cbo, dailyBudget,
      }));
      adsetId = as.id;
    }
    res.json({ ok: true, campaignId: campaign.id, adsetId, structure, cbo });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
}
