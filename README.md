# Ouro Admin Dashboard

Extremely simple operator UI for watching **BYOB** preference metrics (what wallets choose, concentration, pending/audit).

This does **not** change airdrop allocation. It only monitors so you can decide later if action is needed.

**Live:** https://ouro-admin-dashboard.onrender.com

## Features

- Username / password login (HttpOnly signed cookie session)
- BYOB overview: active / pending counts, allocate+swap flags, cycle
- Per-token average weight among opted-in wallets (unweighted)
- All-in (100% one token) wallet list
- Active prefs, pending changes, recent audit trail
- Demo metrics when `MONITOR_URL` is unset (UI work without a live monitor)

## Setup

```bash
cp .env.example .env
# edit ADMIN_PASSWORD + SESSION_SECRET at minimum
pnpm install
pnpm dev
```

Open http://127.0.0.1:8790

### Live monitor

On **ouro-monitor**, set:

```bash
ADMIN_API_KEY=long-random-secret
```

On this dashboard:

```bash
MONITOR_URL=https://ouro-monitor.onrender.com
MONITOR_ADMIN_API_KEY=long-random-secret
```

Monitor route (Bearer `ADMIN_API_KEY`):

`GET /v1/admin/byob/metrics`

## Auth notes

- Dashboard login: `ADMIN_USERNAME` / `ADMIN_PASSWORD` + `SESSION_SECRET`
- Sessions: 12h HMAC-signed cookie, `HttpOnly`, `SameSite=Lax`
- Set `COOKIE_SECURE=1` on HTTPS deploys
- Monitor admin key is never sent to the browser; the server proxies with it

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | API + Vite HMR |
| `pnpm build` | Build SPA to `dist/` |
| `pnpm start` | Production (`NODE_ENV=production`) serving `dist/` |

## Concentration caveat

Token averages are **equal-wallet across active BYOB prefs only**. Classic (non-opted-in) holders are excluded. Real cycle demand is OURO-balance-weighted. Treat the bars as an early warning, not a treasury forecast.
