// Helpers compartilhados pelas serverless functions (Meta Marketing API + Anthropic).
import Anthropic from '@anthropic-ai/sdk';

export const FB_API = 'https://graph.facebook.com/v21.0';
export const COPY_MODEL = 'claude-sonnet-4-6';

export const COUNTRY = {
  'BRASIL':'BR','BRAZIL':'BR','EUA':'US','ESTADOS UNIDOS':'US','USA':'US','UNITED STATES':'US',
  'REINO UNIDO':'GB','UK':'GB','UNITED KINGDOM':'GB','INGLATERRA':'GB','PORTUGAL':'PT',
  'CANADA':'CA','CANADÁ':'CA','AUSTRALIA':'AU','AUSTRÁLIA':'AU','ALEMANHA':'DE','GERMANY':'DE',
  'FRANCA':'FR','FRANÇA':'FR','FRANCE':'FR','ESPANHA':'ES','SPAIN':'ES','ITALIA':'IT','ITÁLIA':'IT',
  'MEXICO':'MX','MÉXICO':'MX','IRLANDA':'IE','HOLANDA':'NL','PAISES BAIXOS':'NL','SUICA':'CH','SUÍÇA':'CH',
  'NOVA ZELANDIA':'NZ','NOVA ZELÂNDIA':'NZ','JAPAO':'JP','JAPÃO':'JP','ARGENTINA':'AR',
};
export function toCC(tok) {
  tok = String(tok || '').trim();
  if (!tok) return null;
  const up = tok.toUpperCase();
  if (/^[A-Z]{2}$/.test(up)) return up;
  if (COUNTRY[up]) return COUNTRY[up];
  return { invalid: tok };
}
export const normAcct = (a) => {
  a = String(a || '').trim();
  return a && !a.startsWith('act_') ? 'act_' + a.replace(/^act_/, '') : a;
};
export function parseCountries(raw) {
  const parsed = String(raw || 'US').split(',').map(toCC).filter(Boolean);
  const invalid = parsed.filter((c) => typeof c === 'object').map((c) => c.invalid);
  if (invalid.length) throw new Error(`País inválido: ${invalid.join(', ')}. Use código de 2 letras (US, BR, GB...).`);
  if (!parsed.length) throw new Error('Informe ao menos um país (ex: US).');
  return parsed;
}

export async function fbGet(token, p) {
  const sep = p.includes('?') ? '&' : '?';
  const r = await fetch(`${FB_API}/${p}${sep}access_token=${encodeURIComponent(token)}`);
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`Meta ${p}: ${j.error?.error_user_msg || j.error?.message || r.status}`);
  return j;
}
export async function fbPost(token, p, body) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.append(k, v && typeof v === 'object' ? JSON.stringify(v) : String(v));
  form.append('access_token', token);
  const r = await fetch(`${FB_API}/${p}`, { method: 'POST', body: form });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`Meta ${p}: ${j.error?.error_user_msg || j.error?.message || r.status}`);
  return j;
}
// FB ingere o video direto de uma URL publica (do Blob). Sem trafegar bytes pela funcao.
export async function uploadVideoByUrl(token, account, fileUrl, name) {
  const j = await fbPost(token, `${account}/advideos`, { file_url: fileUrl, name });
  return j.id;
}
export async function waitVideoReady(token, videoId, maxMs = 240000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const j = await fbGet(token, `${videoId}?fields=status`);
      const s = j.status?.video_status;
      if (s === 'ready') return true;
      if (s === 'error') throw new Error('video_processing_error');
    } catch (e) { if (String(e.message).includes('processing_error')) throw e; }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error('timeout processando video');
}
export async function getThumb(token, videoId) {
  const j = await fbGet(token, `${videoId}/thumbnails?fields=uri,is_preferred`);
  const list = j.data || [];
  return (list.find((t) => t.is_preferred) || list[0])?.uri || null;
}

export async function genCopy(anthropicKey, { fileName, brief, cta }) {
  const client = new Anthropic({ apiKey: anthropicKey });
  const system = 'Voce escreve copy de anuncio de video para o Facebook/Meta, de alta conversao. Responda APENAS um JSON valido com as chaves: primary_text, headline, description. Sem markdown, sem texto fora do JSON. NUNCA use travessoes (em-dash/en-dash); use ponto ou virgula. Escreva no MESMO idioma do brief.';
  const user = `Brief do produto/oferta:\n${brief}\n\nArquivo do video: ${fileName}\nBotao (CTA): ${cta}\n\nRegras: primary_text 1 a 3 frases (max 240 chars), headline curto (max 40 chars), description 1 linha (max 30 chars).`;
  const r = await client.messages.create({ model: COPY_MODEL, max_tokens: 700, system, messages: [{ role: 'user', content: user }] });
  const text = (r.content.find((b) => b.type === 'text')?.text) || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('IA nao retornou JSON');
  const o = JSON.parse(m[0]);
  return {
    primary_text: String(o.primary_text || '').slice(0, 240),
    headline: String(o.headline || '').slice(0, 40),
    description: String(o.description || '').slice(0, 30),
  };
}

// Cria um conjunto. cbo=true => orcamento na campanha (conjunto sem budget).
export function adsetBody({ name, campaignId, status, pixelId, countries, cbo, dailyBudget }) {
  return {
    name, campaign_id: campaignId, status,
    billing_event: 'IMPRESSIONS', optimization_goal: 'OFFSITE_CONVERSIONS',
    promoted_object: { pixel_id: pixelId, custom_event_type: 'PURCHASE' },
    targeting: { geo_locations: { countries }, age_min: 25, age_max: 65 },
    ...(cbo ? {} : { daily_budget: dailyBudget, bid_strategy: 'LOWEST_COST_WITHOUT_CAP' }),
  };
}

// Gate de senha opcional (env APP_PASSWORD). Sem env => aberto.
export function checkPass(req) {
  const need = process.env.APP_PASSWORD;
  if (!need) return true;
  const got = req.headers['x-app-pass'] || '';
  return got === need;
}
