# Sobe Tudo — project context (read first)

> For AI coding assistants and new contributors: read this before changing anything.
> Human contributors should also read [CONTRIBUTING.md](CONTRIBUTING.md).

## What this is
**Sobe Tudo** is an open-source dashboard to **launch Facebook/Meta ad campaigns with AI**, using **the user's own keys**. It's a local app (Node + browser) that:
1. takes the user's keys (Facebook token + Anthropic/Claude API key),
2. reads a folder of creatives (`.mp4`/`.mov`),
3. generates each ad's copy with AI (Claude) from a brief,
4. uploads videos + creates a CBO campaign + ad set + ads via the Meta Marketing API.

## Architecture
```
Browser (keys in localStorage)  ──per-request──▶  server.mjs (Express)
                                                    ├─ Anthropic API → ad copy
                                                    └─ Meta Marketing API → upload + campaign/adset/ads
```
- `server.mjs` — backend. Endpoints: `/api/validate`, `/api/list`, `/api/upload` (streams newline-delimited JSON log).
- `public/index.html` — single-page dashboard, vanilla JS, **two tabs**: *Conexões* (one-time key setup with green status lights) and *Subir Campanha* (daily use). No framework, no build step.
- Copy model: `claude-sonnet-4-6` (const `COPY_MODEL` in `server.mjs`).
- Campaign objective is currently fixed: `OUTCOME_SALES` + ad set `OFFSITE_CONVERSIONS` with pixel `PURCHASE`. CTA, countries, budget, landing URL and status (PAUSED/ACTIVE) are configurable in the UI.

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
6. Native folder picker / drag-and-drop uploads
7. Scheduling (start_time), multiple ad sets, A/B, lookalikes
8. Per-niche copy templates + onboarding wizard
9. Tests + retries for failed uploads

See open issues for what's actively wanted.
