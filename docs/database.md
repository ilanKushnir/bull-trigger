# Database Schema

Bull Trigger uses SQLite with Drizzle ORM for data persistence.

## Overview

The database stores user management, strategy definitions, execution tracking, and system configuration. All tables use SQLite's built-in types with Drizzle ORM providing type safety and migrations.

## Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with Telegram integration and admin permissions |
| `strategies` | Trading strategy definitions with cron scheduling |
| `prompts` | Reusable prompt templates for AI models |
| `settings` | Key-value configuration storage |
| `signals` | Signal definitions (alternative strategy implementation) |

## Execution & Flow Tables

| Table | Description |
|-------|-------------|
| `strategy_executions` | Strategy run history and status tracking |
| `flow_execution_logs` | Detailed step-by-step execution logs |
| `api_calls` | External API call definitions for strategies |
| `model_calls` | AI model interaction definitions |
| `strategy_nodes_conditions` | Conditional logic nodes in strategy flows |
| `strategy_nodes_triggers` | Strategy-to-strategy trigger nodes |
| `strategy_nodes_telegram` | Telegram message sending nodes |

## Messaging & History

| Table | Description |
|-------|-------------|
| `messages` | Telegram message tracking with reactions |

## Schema Details

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | autoincrement |
| email | text | unique, required |
| name | text | optional display name |
| telegram_id | text | unique Telegram user ID |
| is_admin | boolean | admin privileges (default: false) |
| created_at | text | timestamp |

### `strategies`
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | autoincrement |
| name | text | strategy name |
| description | text | optional description |
| enabled | boolean | active status (default: true) |
| cron | text | schedule expression (default: */5 * * * *) |
| triggers | text | JSON trigger configuration |

### `prompts`
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | autoincrement |
| content | text | prompt template content |

### `settings`
| Column | Type | Notes |
|--------|------|-------|
| key | text, PK | setting identifier |
| value | text | setting value |

### `strategy_executions`
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | autoincrement |
| strategy_id | integer | references strategies.id |
| started_at | text | execution start time |
| completed_at | text | execution end time |
| status | text | 'running', 'success', 'failed' |
| error | text | error message if failed |
| execution_type | text | 'cron', 'manual' |

### `api_calls`
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | autoincrement |
| strategy_id | integer | parent strategy |
| name | text | call identifier |
| url | text | API endpoint |
| method | text | HTTP method (default: GET) |
| headers | text | JSON headers |
| body | text | JSON request body |
| json_path | text | data extraction path |
| output_variable | text | result variable name |
| order_index | integer | execution order |
| enabled | boolean | active status |

### `model_calls`
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | autoincrement |
| strategy_id | integer | parent strategy |
| name | text | call identifier |
| model_tier | text | 'cheap' or 'deep' |
| system_prompt | text | system message |
| user_prompt | text | user message |
| include_api_data | boolean | include API results |
| output_variable | text | result variable name |
| order_index | integer | execution order |
| enabled | boolean | active status |

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | autoincrement |
| signal_hash | text | unique signal identifier |
| tg_msg_id | integer | Telegram message ID |
| sent_at | text | send timestamp |
| reaction | text | user reaction |

## Migration & Seed

Migrations are stored in `migrations/` and applied automatically on startup.

### Running Migrations
```bash
# Backend handles migrations automatically
npm run --workspace backend dev
```

### Seeding Data
```bash
# Insert default users, strategies, and settings
npm run --workspace backend seed
```

The seed script creates:
- Default admin user
- Sample trading strategies
- Basic system settings
- Example prompts and configurations 