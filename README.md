# Bull Trigger

> OSS Bootstrap Repository

This repository contains the initial open-source scaffold for the Bull Trigger project.

## Monorepo layout

- `backend/` – Service code (Node.js)
- `frontend/` – Web client (React/Vite)
- `packages/common/` – Shared libraries and tooling

## Getting Started

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- GNU Make (or compatible)

### Setup

```bash
make bootstrap       # install dependencies for all workspaces
./scripts/setup.sh   # create .env from template
make up              # start dev environment with Docker Compose
```

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