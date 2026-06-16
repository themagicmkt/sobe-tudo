# Contributing to Sobe Tudo

First off — thank you! 🙌 This project grows with the community. Contributions of all sizes are welcome, from typo fixes to whole features on the [roadmap](README.md#-roadmap).

> Issues and PRs in **English or Portuguese** are both fine.

## Ways to contribute

- 🐛 **Report bugs** — open an issue with steps to reproduce.
- 💡 **Suggest features** — open a feature request.
- 📝 **Improve docs** — README, this guide, code comments.
- 🛠️ **Pick up an issue** — look for [`good first issue`](https://github.com/themagicmkt/sobe-tudo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) and [`help wanted`](https://github.com/themagicmkt/sobe-tudo/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

## Dev setup

```bash
git clone https://github.com/themagicmkt/sobe-tudo.git
cd sobe-tudo
npm install
npm start            # http://localhost:4000
```

There's no build step — `server.mjs` (Node/Express) serves `public/` directly. Edit and refresh.

## Project layout

```
server.mjs        backend: /api/validate, /api/list, /api/upload (Meta + Anthropic)
public/index.html single-page dashboard (vanilla JS, two tabs)
CLAUDE.md         full project context (for humans and AI assistants)
```

## Pull request flow

1. Fork the repo and create a branch: `git checkout -b feat/short-description`.
2. Make your change. Keep it focused — one logical change per PR.
3. Match the existing style (vanilla JS, no framework, clear comments).
4. Make sure it runs: `npm install && npm start`, and `node --check server.mjs` passes (CI runs this).
5. Open the PR using the template; describe what and why, link any issue (`Closes #123`).

## Guidelines

- **Never commit secrets.** No API keys, tokens, or `.env` files. Keys are user-supplied at runtime.
- **Keep the bring-your-own-keys model** — never embed anyone's keys; never persist keys server-side.
- **Don't add heavy dependencies** without discussion — part of the appeal is being lightweight.
- Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).

## Commit messages

Conventional-ish prefixes help: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

Happy shipping! 🚀
