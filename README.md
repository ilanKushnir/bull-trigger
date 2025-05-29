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

## License

MIT © 2024 Ilan Kushnir 