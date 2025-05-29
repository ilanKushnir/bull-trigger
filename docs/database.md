# Database Schema

Bull Trigger uses SQLite during development with Drizzle ORM.

## Tables

| Table | Description |
|-------|-------------|
| users | Admin accounts for managing the app |
| strategies | Trading strategy definitions |
| prompts | Prompt presets used by the assistant |
| settings | Key-value app configuration |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | integer, PK | autoincrement |
| email | text | unique, required |
| is_admin | boolean | 1 = admin |
| created_at | text | default CURRENT_TIMESTAMP |

### strategies
| id | integer, PK |
| name | text |
| description | text |

### prompts
| id | integer, PK |
| content | text |

### settings
| key | text, PK |
| value | text |

## Migration & Seed

Migrations live in `migrations/sqlite/` and are applied automatically on `npm run dev` or `npm start`.

Run seeding after migrations:

```bash
npm run --workspace backend seed
```

This inserts default admin, strategy, prompt and settings. 