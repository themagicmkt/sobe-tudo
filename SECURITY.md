# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, use GitHub's private reporting:
**[Report a vulnerability](https://github.com/themagicmkt/sobe-tudo/security/advisories/new)** (Security → Advisories → Report a vulnerability).

We aim to acknowledge reports within **72 hours** and to ship a fix or mitigation as quickly as possible. Please include steps to reproduce and the impact you observed.

## Scope & design notes

Sobe Tudo is **bring-your-own-keys** and runs **locally** by default:

- The Facebook token and Anthropic API key are stored in the **browser's `localStorage`** and sent per-request to the local server.
- The server (`server.mjs`) uses the keys **in memory only** for the duration of a request and **never writes them to disk**.
- No keys, tokens, or `.env` files should ever be committed. `.gitignore` excludes `.env*` and `node_modules`.

### If you self-host beyond localhost

The local server binds to all interfaces so other devices on your LAN can reach it. If you expose it more widely (reverse proxy, cloud), you are responsible for adding authentication, TLS, and access control — the MVP has none. Treat the dashboard as trusted-network-only until the auth milestone on the roadmap lands.

## Supported versions

This project is pre-1.0; security fixes are applied to the latest `main`.
