// Cria o anuncio de 1 video JA processado (videoId pronto): copy + creative + (conjunto se
// estrutura por-criativo) + anuncio. Depois apaga o blob (FB ja tem o video).
import { fbPost, getThumb, genCopy, normAcct, parseCountries, adsetBody, checkPass } from '../lib/meta.js';
import { del } from '@vercel/blob';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!checkPass(req)) return res.status(401).json({ error: 'senha incorreta' });
  try {
    const b = req.body || {};
    const fbToken = b.fbToken;
    const adAccount = normAcct(b.adAccount);
    const status = b.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    const cta = b.cta || 'LEARN_MORE';
    const name = b.video?.name || 'video';
    const display = name.replace(/\.(mp4|mov)$/i, '');

    const manual = (b.adTitle && b.adTitle.trim()) && (b.primaryText && b.primaryText.trim());
    const copy = manual ? { headline: '', primary_text: '', description: '' }
      : await genCopy(b.anthropicKey, { fileName: name, brief: b.brief || '', cta });
    const headline = (b.adTitle && b.adTitle.trim()) ? b.adTitle.trim().slice(0, 40) : copy.headline;
    const primary = (b.primaryText && b.primaryText.trim()) ? b.primaryText.trim() : copy.primary_text;

    const thumb = await getThumb(fbToken, b.videoId);
    const creativeBody = {
      name: `AUTO — ${display}`,
      object_story_spec: {
        page_id: b.pageId,
        video_data: {
          video_id: b.videoId, image_url: thumb, title: headline,
          message: primary, link_description: copy.description,
          call_to_action: { type: cta, value: { link: b.landingUrl, link_caption: String(b.landingUrl || '').replace(/^https?:\/\//, '') } },
        },
      },
    };
    const tags = String(b.urlTags || '').trim().replace(/^[?&]+/, '');
    if (tags) creativeBody.url_tags = tags;
    const creative = await fbPost(fbToken, `${adAccount}/adcreatives`, creativeBody);

    let adsetId = b.adsetId;
    if (b.structure === 'adset_per_creative') {
      const cbo = (b.budgetLevel || 'campaign') !== 'adset';
      const dailyBudget = Math.round(Number(b.dailyBudget || 20) * 100);
      const countries = parseCountries(b.countries);
      const as = await fbPost(fbToken, `${adAccount}/adsets`, adsetBody({
        name: `${b.campaignName || 'Sobe Tudo'} — ${display}`, campaignId: b.campaignId, status,
        pixelId: b.pixelId, countries, cbo, dailyBudget,
      }));
      adsetId = as.id;
    }
    const ad = await fbPost(fbToken, `${adAccount}/ads`, { name: display, adset_id: adsetId, creative: { creative_id: creative.id }, status });

    if (b.blobUrl) { try { await del(b.blobUrl); } catch {} }
    res.json({ ok: true, adId: ad.id, adsetId, headline });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
}
