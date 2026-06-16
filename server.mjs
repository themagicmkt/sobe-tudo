// Sobe Tudo — backend local. Sobe campanhas no Facebook com IA.
// O usuario fornece as PROPRIAS chaves (FB token + Anthropic) na UI; elas
// trafegam por request e NUNCA sao gravadas em disco aqui.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const FB_API = 'https://graph.facebook.com/v21.0';
const COPY_MODEL = 'claude-sonnet-4-6'; // equilibrio custo/qualidade; trocavel

// ── Meta helpers (token vem por chamada) ─────────────────────────────
async function fbGet(token, p) {
  const sep = p.includes('?') ? '&' : '?';
  const r = await fetch(`${FB_API}/${p}${sep}access_token=${encodeURIComponent(token)}`);
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`Meta ${p}: ${j.error?.error_user_msg || j.error?.message || r.status}`);
  return j;
}
async function fbPost(token, p, body) {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.append(k, v && typeof v === 'object' ? JSON.stringify(v) : String(v));
  form.append('access_token', token);
  const r = await fetch(`${FB_API}/${p}`, { method: 'POST', body: form });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`Meta ${p}: ${j.error?.error_user_msg || j.error?.message || r.status}`);
  return j;
}
async function uploadVideo(token, account, filePath, name) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.mov' ? 'video/quicktime' : 'video/mp4';
  const form = new FormData();
  form.append('source', new Blob([buf], { type: mime }), path.basename(filePath));
  form.append('name', name);
  form.append('access_token', token);
  const r = await fetch(`${FB_API}/${account}/advideos`, { method: 'POST', body: form });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`upload ${name}: ${j.error?.message || r.status}`);
  return j.id;
}
async function waitVideoReady(token, videoId, maxMs = 180000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const j = await fbGet(token, `${videoId}?fields=status`);
      const s = j.status?.video_status;
      if (s === 'ready') return true;
      if (s === 'error') throw new Error('video_processing_error');
    } catch {}
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error('timeout processando video');
}
async function getThumb(token, videoId) {
  const j = await fbGet(token, `${videoId}/thumbnails?fields=uri,is_preferred`);
  const list = j.data || [];
  return (list.find((t) => t.is_preferred) || list[0])?.uri || null;
}

// ── Copy via Anthropic (chave do usuario) ────────────────────────────
async function genCopy(anthropicKey, { fileName, brief, cta }) {
  const client = new Anthropic({ apiKey: anthropicKey });
  const system = 'Voce escreve copy de anuncio de video para o Facebook/Meta, de alta conversao. Responda APENAS um JSON valido com as chaves: primary_text, headline, description. Sem markdown, sem texto fora do JSON. NUNCA use travessoes (em-dash/en-dash); use ponto ou virgula. Escreva no MESMO idioma do brief.';
  const user = `Brief do produto/oferta:\n${brief}\n\nArquivo do video: ${fileName}\nBotao (CTA): ${cta}\n\nRegras: primary_text 1 a 3 frases (max 240 chars), headline curto (max 40 chars), description 1 linha (max 30 chars). Escreva para fazer a pessoa clicar.`;
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

// ── endpoints ────────────────────────────────────────────────────────
app.post('/api/validate', async (req, res) => {
  const { fbToken, adAccount, anthropicKey } = req.body;
  const out = {};
  try {
    const acc = await fbGet(fbToken, `${adAccount}?fields=name,currency,account_status`);
    out.fb = { ok: true, name: acc.name, currency: acc.currency };
  } catch (e) { out.fb = { ok: false, error: e.message }; }
  if (anthropicKey) {
    try {
      const c = new Anthropic({ apiKey: anthropicKey });
      await c.messages.create({ model: COPY_MODEL, max_tokens: 5, messages: [{ role: 'user', content: 'ok' }] });
      out.anthropic = { ok: true };
    } catch (e) { out.anthropic = { ok: false, error: e.message }; }
  }
  res.json(out);
});

app.post('/api/list', (req, res) => {
  try {
    let folder = String(req.body.folder || '').replace(/^~/, process.env.HOME);
    if (!fs.existsSync(folder)) return res.json({ ok: false, error: 'Pasta nao encontrada' });
    const files = fs.readdirSync(folder).filter((f) => /\.(mp4|mov)$/i.test(f)).sort();
    res.json({ ok: true, files });
  } catch (e) { res.json({ ok: false, error: e.message }); }
});

app.post('/api/upload', async (req, res) => {
  // streaming de log via SSE-like (newline-delimited JSON)
  res.setHeader('Content-Type', 'application/x-ndjson');
  const send = (o) => res.write(JSON.stringify(o) + '\n');
  const log = (msg) => send({ type: 'log', msg });
  try {
    const b = req.body;
    const folder = String(b.folder || '').replace(/^~/, process.env.HOME);
    const files = (b.files && b.files.length ? b.files : fs.readdirSync(folder).filter((f) => /\.(mp4|mov)$/i.test(f)));
    if (!files.length) throw new Error('Nenhum criativo selecionado');
    const cta = b.cta || 'LEARN_MORE';
    const countries = String(b.countries || 'US').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    const dailyBudget = Math.round(Number(b.dailyBudget || 20) * 100); // em centavos
    const status = b.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    const date = new Date().toISOString().slice(0, 10);

    log(`Criando campanha CBO (${status}, $${(dailyBudget / 100).toFixed(2)}/dia)...`);
    const campaign = await fbPost(b.fbToken, `${b.adAccount}/campaigns`, {
      name: `${b.campaignName || 'Sobe Tudo'} — ${date}`,
      objective: 'OUTCOME_SALES', status, special_ad_categories: [],
      daily_budget: dailyBudget, bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    });
    log(`Campanha: ${campaign.id}`);

    const adset = await fbPost(b.fbToken, `${b.adAccount}/adsets`, {
      name: `${b.campaignName || 'Sobe Tudo'} — set 1`, campaign_id: campaign.id, status,
      billing_event: 'IMPRESSIONS', optimization_goal: 'OFFSITE_CONVERSIONS',
      promoted_object: { pixel_id: b.pixelId, custom_event_type: 'PURCHASE' },
      targeting: { geo_locations: { countries }, age_min: 25, age_max: 65 },
    });
    log(`Adset: ${adset.id} (${countries.join(',')})`);

    let n = 0;
    for (const file of files) {
      const fp = path.join(folder, file);
      const display = file.replace(/\.(mp4|mov)$/i, '');
      try {
        log(`[${file}] gerando copy com IA...`);
        const copy = await genCopy(b.anthropicKey, { fileName: file, brief: b.brief || '', cta });
        log(`[${file}] subindo video...`);
        const videoId = await uploadVideo(b.fbToken, b.adAccount, fp, display);
        await waitVideoReady(b.fbToken, videoId);
        const thumb = await getThumb(b.fbToken, videoId);
        const creative = await fbPost(b.fbToken, `${b.adAccount}/adcreatives`, {
          name: `AUTO — ${display}`,
          object_story_spec: {
            page_id: b.pageId,
            video_data: {
              video_id: videoId, image_url: thumb, title: copy.headline,
              message: copy.primary_text, link_description: copy.description,
              call_to_action: { type: cta, value: { link: b.landingUrl, link_caption: String(b.landingUrl || '').replace(/^https?:\/\//, '') } },
            },
          },
        });
        await fbPost(b.fbToken, `${b.adAccount}/ads`, { name: display, adset_id: adset.id, creative: { creative_id: creative.id }, status });
        n++;
        log(`[${file}] ✅ ad criado — "${copy.headline}"`);
      } catch (e) {
        log(`[${file}] ❌ ${e.message}`);
      }
    }
    send({ type: 'done', campaignId: campaign.id, ads: n, total: files.length });
  } catch (e) {
    send({ type: 'error', error: e.message });
  }
  res.end();
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`\n  Sobe Tudo rodando → http://localhost:${PORT}\n`));
