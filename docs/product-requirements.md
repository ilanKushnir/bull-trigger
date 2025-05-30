# 📈 Bull Trigger – Product Requirements Document (v2.0)

> **Last updated:** 2025‑05‑29   
> **License:** MIT   
> **Status:** Public open‑source spec

---

## 1 · Vision & Goals

Bull Trigger is an open‑source, self‑hostable crypto‑signal platform that:

* **Scans** the market with multiple modular strategies powered by OpenAI models.
* **Posts** concise, beginner‑friendly signals and market alerts to a Telegram group (inline‑button reactions).
* **Provides** a techy, modern web dashboard (React + Tailwind + shadcn/ui) for configuration and monitoring.
* **Stores everything**—prompts, strategies, schedules, API calls, admins, model tiers, settings—in SQLite so non‑developers can tweak behaviour without redeploying.
* **Ships** as a single `docker compose` stack, runs arm64 (Raspberry Pi 5) or x86, and follows OSS best‑practices (CI, docs, secrets hygiene).

Key success metrics:

| KPI                                  | Target                  |
| ------------------------------------ | ----------------------- |
| Signal duplicate rate                | < 2 % per 72 h          |
| Token overspend alerts               | 100 % before 95 % quota |
| Mean time to add new strategy via UI | < 5 min                 |

---

## 2 · User Personas & Interaction

| Persona         | Interface            | Key Actions                                                        |
| --------------- | -------------------- | ------------------------------------------------------------------ |
| **Trader**      | Telegram             | Reads messages; clicks inline buttons 👍 ✅ ❌; views */history N*   |
| **Admin**       | Telegram + Dashboard | Issues commands; manages strategies/prompts; edits settings/admins |
| **Contributor** | GitHub + Docs        | Forks repo; submits PR; extends strategy templates                 |

Inline buttons appear **only** on brand‑new signal posts; reminders exclude buttons.

---

## 3 · Architecture Overview

```
[Dashboard (React)] → REST /api/*  ─┐
                                   │   Fastify server → LangGraph runtime → OpenAI
Telegram ↔ TelegramGateway ────────┤
                                   │
SQLite (file + Drizzle ORM) ◀───────┘
```

* **Workspaces:** `backend/`, `frontend/`, `packages/common/`.
* **CI:** GitHub Actions builds, tests, lints, publishes Docker images & Docsify site.

---

## 4 · Data Model (SQLite)

| Table                   | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `settings`              | key/value (MODEL_DEEP, MODEL_CHEAP, TOKEN_LIMIT_MONTH, WARN %, PANIC %, etc.) |
| `admins`                | Telegram IDs & execution rights                                                   |
| `strategies`            | id, name, cron, enabled, model tier, trigger_json, description                   |
| `prompts`               | id, strategy_id ⇢ text                                                           |
| `strategy_calls`        | ordered nodes: api or model step (config JSON)                                    |
| `strategy_edges`        | edges: call → dest_strategy_id (triggers)                                       |
| `signals` / `reactions` | trading history                                                                   |
| `token_usage`           | daily token counter                                                               |

All configuration is edited through the dashboard and persisted here.

---

## 5 · Strategies

### Default Seeds (editable)

| Strategy         | Model Tier | Schedule(def.)   | Enabled | Trigger Condition     |
| ---------------- | ---------- | ----------------- | ------- | --------------------- |
| General Analysis | deep       | 09:00 daily       | ✔       | cron_only            |
| Price Watcher    | cheap      | */1 * * * *       | ✔       | {price_change: ≥2 %} |
| Signal Hunter    | deep       | */15 * * * *      | ✔       | {prob≥7}              |
| Fear-Greed       | cheap      | 0 * * * *         | ✔       | Δ ≥ 10 pts            |
| Volume Spike     | cheap      | */10 * * * *      | ✔       | volume Δ ≥ Y          |
| Weekly Education | cheap      | Sun 10:00         | ✖       | cron_only            |
| Token Watcher    | cheap      | 0 * * * *         | ✔       | usage / limit         |

Admins can **add strategies** via UI, defining:

* Name & description
* Schedule (cron)
* Model tier
* One or more *calls* (API fetch or model invocation) + order
* Trigger edges to other strategies
* Trigger condition JSON schema (evaluated server‑side)

The dashboard renders each strategy's flow in a React Flow canvas; nodes (calls) and edges (triggers) can be dragged, edited, added or removed.

---

## 6 · Message & Interaction Rules

* **Signal post:** formatted Markdown; inline buttons [👍 Join] [✅ Profit] [❌ Loss].
* **Reminder post:** same text **without** buttons.
* Button callbacks update `reactions` and may trigger hype/congrats lines via cheap model.
* Daily 09:00 emoji guide.
* 2‑hour heartbeat summary unless an urgent alert already sent in that window.

---

## 7 · Token Accounting

Simple logic:

1. After each OpenAI completion, router records `usage.total_tokens` to `token_usage` (date key). 
2. `Token Watcher` sums month‑to‑date; sends ⚠️ at 80 %, 🔥 at 95 %.
3. Admin resets counter from Settings page after topping‑up OpenAI credit.

---

## 8 · Dashboard Features

| Section    | Features                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------- |
| Home       | System health, token usage gauge, latest alerts                                               |
| Signals    | Paginated table (status chips, join/profit counts)                                            |
| Strategies | React Flow builder; enable/disable; Run Now; prompt editor (Monaco); cron field; trigger JSON |
| Admins     | CRUD Telegram IDs & permissions                                                               |
| Settings   | MODEL_DEEP / MODEL_CHEAP selectors; token limit; reset button                               |

All forms validate with Zod and save via REST.

---

## 9 · Operational & Security Considerations

* Docker secrets for OpenAI key.
* `.env.example` only includes placeholders.
* CORS disabled by default (API and UI on same domain under nginx).
* JWT bearer for dashboard API (single admin token) optional; Telegram admin list is source‑of‑truth for bot commands.

---

## 10 · Open‑Source Deliverables

* **MIT licence**.
* **Contributing guide**, Code of Conduct, PR/Issue templates.
* **Docs site** via Docsify & GitHub Pages (`/docs`).
* CI pipeline: lint → build → test → docker build/push `ghcr.io/<org>/bull-trigger`.
* Example deployment configs:

  * `compose.dev.yml` (fast iteration)
  * `compose.prod.yml` (nginx + api + sqlite volume)
  * `examples/raspberry-pi/` (Pi 5 systemd unit + compose override).

---

## 11 · Roadmap

| Phase | Highlights                                      |
| ----- | ----------------------------------------------- |
| 1     | Repo, DB, Telegram gateway, basic strategies    |
| 2     | LangGraph router, signal pipeline, dedup        |
| 3     | Dashboard MVP (CRUD)                            |
| 4     | Visual strategy builder & token watcher         |
| 5     | Docker prod stack, Docsify, CI/CD, v1.0 release |

---

✅ **End of v2.0 PRD**
