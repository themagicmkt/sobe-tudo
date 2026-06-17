# Sobe Tudo — project context (read first)

> For AI coding assistants and new contributors: read this before changing anything.
> Human contributors should also read [CONTRIBUTING.md](CONTRIBUTING.md).

## What this is
**Sobe Tudo** is an open-source dashboard to **launch Facebook/Meta ad campaigns with AI**, using **the user's own keys**. It's a local app (Node + browser) that:
1. takes the user's keys (Facebook token + Anthropic/Claude API key),
2. reads a folder of creatives (`.mp4`/`.mov`),
3. generates each ad's copy with AI (Claude) from a brief,
4. uploads videos + creates a CBO campaign + ad set + ads via the Meta Marketing API.

## Architecture — Vercel serverless + Blob (scales to hundreds of videos)
```
Browser (keys in localStorage)
  1) uploads each video → Vercel Blob (client upload, concurrency 4 + retry)   [api/blob-upload.js = token]
  2) POST /api/create-campaign  → campaign (+ base adset if 1-1-X)
  3) per video, orchestrated by the browser (concurrency 3 + retry + resume):
       POST /api/ingest-video  → FB ingests via file_url (Blob URL) → videoId
       POST /api/video-status  → poll until "ready"
       POST /api/create-ad     → copy (Anthropic) + creative + (adset if 1-2-1) + ad; then deletes the Blob
```
**Why this shape:** a single serverless function caps at ~300s, so doing all videos in one request breaks at scale. Instead the browser orchestrates short per-video calls — hundreds of videos work, failures are isolated and retried, and Blob dodges the 4.5MB function body limit. FB pulls the video from the Blob URL (`file_url`), so bytes never pass through a function.
- `api/*.js` — serverless functions: `validate`, `blob-upload`, `create-campaign`, `ingest-video`, `video-status`, `create-ad`. Shared logic in `lib/meta.js`.
- `public/index.html` — single-page dashboard, vanilla JS **module** (imports `@vercel/blob/client` from esm.sh). Two tabs: *Conexões* (keys + optional password) and *Subir Campanha*.
- Env needed: `BLOB_READ_WRITE_TOKEN` (auto when a Blob store is connected to the project); optional `APP_PASSWORD` (gate — checked via `clientPayload` on blob-upload and `x-app-pass` header elsewhere).
- Local dev: `vercel dev` (needs the project linked + `vercel env pull`). History: earlier versions used a local Express server (server.mjs) with native osascript pickers / multer — removed; do not reintroduce.
- Copy model: `claude-sonnet-4-6` (const `COPY_MODEL` in `server.mjs`).
- Campaign objective is currently fixed: `OUTCOME_SALES` + ad set `OFFSITE_CONVERSIONS` with pixel `PURCHASE`.
- **Campaign structure is configurable** (the core value): `structure` = `one_adset` (1 ad set, all creatives in it) | `adset_per_creative` (one ad set per video, 1 ad each); `budgetLevel` = `campaign` (CBO, budget on the campaign) | `adset` (ABO, budget on each ad set).
- **Nomenclatura do dono (campanha-conjunto-anúncio):** `1-1-1` = 1 campanha, 1 conjunto, 1 anúncio; `1-1-X` = 1 conjunto com vários criativos (`one_adset`); `1-2-1` = vários conjuntos com 1 anúncio cada (`adset_per_creative`). O número do meio = nº de conjuntos. A UI mostra o código real (ex.: `1-1-5`, `1-6-1`) na dica de orçamento. Use essa nomenclatura ao falar de estrutura. `makeAdset()` adds the budget+bid_strategy only when ABO; the campaign carries them only when CBO.
- Ad fields, each manual-override OR AI: `primaryText` (corpo), `adTitle` (headline), description (AI only); plus `cta` (button enum) and `urlTags` (UTMs → `url_tags` on the creative). Countries via autocomplete→ISO. CTA, countries, budget, landing URL, status (PAUSED/ACTIVE) all configurable.

## Non-negotiable design decisions
- **Bring-your-own-keys**: users supply FB token + Anthropic key. NEVER embed anyone's keys; NEVER persist keys server-side; NEVER commit secrets.
- **Launches PAUSED by default** so the user reviews in Ads Manager before going live.
- **No em-dashes / en-dashes in generated copy** (enforced in the system prompt).
- FB token needs the `ads_management` scope (System User).
- Keep it lightweight — avoid heavy dependencies.

## Run locally
```
npm install
npm start        # → http://localhost:4000
```
No build step; `server.mjs` serves `public/` directly. Edit and refresh.

## Roadmap (good contribution targets)
1. Accounts + auth (multi-tenant, leave localhost)
2. Recurring billing (Stripe)
3. Hosting / deploy (web app, not just localhost)
4. Campaign objective picker (traffic / leads / sales) beyond OUTCOME_SALES
5. Built-in creative "uniquifier" to refresh fatigued creatives
6. ~~Drag-and-drop uploads~~ ✅ done (browser upload)
7. Scheduling (start_time), multiple ad sets, A/B, lookalikes
8. Per-niche copy templates + onboarding wizard
9. Tests + retries for failed uploads

See open issues for what's actively wanted.
