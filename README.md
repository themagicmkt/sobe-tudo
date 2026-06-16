<div align="center">

# 🚀 Sobe Tudo

### Open-source dashboard to launch Facebook / Meta ad campaigns with AI — bring your own keys.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![CodeQL](https://github.com/themagicmkt/sobe-tudo/actions/workflows/codeql.yml/badge.svg)](https://github.com/themagicmkt/sobe-tudo/actions/workflows/codeql.yml)
[![CI](https://github.com/themagicmkt/sobe-tudo/actions/workflows/ci.yml/badge.svg)](https://github.com/themagicmkt/sobe-tudo/actions/workflows/ci.yml)

**Paste your Facebook token + Anthropic (Claude) API key, point at a folder of video creatives, describe your offer — and Sobe Tudo writes the ad copy with AI and builds the whole campaign (CBO campaign → ad set → ads) on the Meta Marketing API.**

</div>

> 🇧🇷 *Painel open-source para subir campanhas no Facebook com IA, usando suas próprias chaves. Documentação em inglês para alcançar mais contribuidores — issues/PRs em português são bem-vindos.*

---

## ✨ Why

Launching a batch of Meta video ads by hand is slow: upload each video, write copy, create the campaign, the ad set, every ad. Sobe Tudo turns that into one screen. It's **bring-your-own-keys** — the AI and ad spend run on *your* accounts, so it's cheap to self-host and there's no middleman.

## 🎯 Features

- 🔑 **Bring your own keys** — your Facebook token and Anthropic key live only in your browser; never stored on a server.
- 🤖 **AI ad copy** — generates `primary_text`, `headline` and `description` per creative with Claude, from a short brief.
- 📁 **Batch from a folder** — point at a folder of `.mp4` / `.mov` and it uploads them all.
- 🏗️ **Full campaign build** — CBO campaign + ad set + ads via the Meta Marketing API, with targeting, budget, CTA and landing URL.
- 🟢 **One-time connect** — a *Connections* tab with green status lights; a *Launch* tab for daily work.
- 🛟 **Safe by default** — campaigns are created **paused** so you review in Ads Manager before going live.
- 📜 **Live log** — watch each step stream in real time.

## 🖥️ Quick start

```bash
git clone https://github.com/themagicmkt/sobe-tudo.git
cd sobe-tudo
npm install
npm start
```

Open **http://localhost:4000**.

> Same Wi-Fi? Other devices can reach it at `http://<your-computer-ip>:4000`.

## 🔌 What you need

| Key | Where to get it |
|---|---|
| **Facebook token** (System User, `ads_management`) | developers.facebook.com → create a Business app → add **Marketing API** → System User with access to your ad account → generate token |
| **Ad Account / Page / Pixel ID** | Meta Ads Manager / Business Settings |
| **Anthropic API key** | https://console.anthropic.com/settings/keys |

> 🔒 Keys are kept in your browser's `localStorage` and sent per-request to your local server. **They are never written to disk by the server.** See [SECURITY.md](SECURITY.md).

## 🧭 How it works

```
Browser (your keys, localStorage)
        │  per-request
        ▼
Local Node/Express server (server.mjs)
        ├─ Anthropic API  → ad copy
        └─ Meta Marketing API → video upload + campaign/adset/ads
```

1. **Connections** — paste keys, click *Connect & validate* (green lights).
2. **Launch** — pick the creatives folder, describe the offer, set budget / countries / landing / CTA / status.
3. **🚀 Launch campaign** — follow the live log. Created **paused** by default.

## 🗺️ Roadmap

Help wanted on any of these — see [issues](https://github.com/themagicmkt/sobe-tudo/issues):

- [ ] Accounts + auth (multi-tenant, leave localhost)
- [ ] Recurring billing (Stripe)
- [ ] Campaign objective picker (traffic / leads / sales)
- [ ] Built-in creative "uniquifier" (refresh fatigued creatives)
- [ ] Native folder picker / drag-and-drop uploads
- [ ] Scheduling, multiple ad sets, A/B, lookalikes
- [ ] Per-niche copy templates + onboarding wizard
- [ ] Tests + retries for failed uploads

## 🤝 Contributing

Contributions are very welcome! Read **[CONTRIBUTING.md](CONTRIBUTING.md)** and look for [`good first issue`](https://github.com/themagicmkt/sobe-tudo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## 🔐 Security

Found a vulnerability? Please follow the responsible-disclosure process in **[SECURITY.md](SECURITY.md)** — don't open a public issue for it.

## ⚠️ Disclaimer

You are responsible for complying with the [Meta Platform Terms](https://www.facebook.com/legal/terms) and advertising policies, and with the [Anthropic Usage Policies](https://www.anthropic.com/legal/aup). This tool acts on **your** accounts with **your** keys.

## 📄 License

[MIT](LICENSE) — free for anyone to use, modify and distribute.

---

> 🤖 For AI coding assistants: read [`CLAUDE.md`](CLAUDE.md) for full project context.
