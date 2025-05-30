# Bull Trigger

> OSS Bootstrap Repository

This repository contains the initial open-source scaffold for the Bull Trigger project.

## Monorepo layout

- `backend/` – Service code (Node.js)
- `frontend/` – Web client (React/Vite)
- `packages/common/` – Shared libraries and tooling

## Quick Start

### Dev
```bash
make bootstrap
make up            # http://localhost:5173
```

### Prod
```bash
make prod-up       # nginx on :80, api on :3000
```

### Self-Host
1. Set env vars in `.env` then `docker compose -f compose.prod.yml up -d`.
2. Optional Telegram integration requires `TELEGRAM_BOT_TOKEN` + `CHAT_ID`.

See full docs: https://<user>.github.io/crypto-kush

![demo](docs/demo.gif)

## Telegram Setup

1. Create a bot with BotFather and copy the `TELEGRAM_BOT_TOKEN`.
2. Add your Telegram user ID to the `users` table with `isAdmin=true` (the seed script inserts an example `admin@example.com`, update as needed).
3. Put the token in `.env`:

```bash
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
```

4. Start the gateway:

```bash
npm run --workspace backend bot
```

Inline commands available:
- `/analyze_market`
- `/scrape_signals`
- `/history`

## License

MIT © 2024 Ilan Kushnir 