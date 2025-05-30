// @ts-nocheck
import Fastify from 'fastify';
import envPlugin from '@fastify/env';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import Database from 'better-sqlite3';
import { refreshRegistry, runStrategyOnce, ensureDefaultStrategies } from './strategies/registry';
import { strategyFlowRepo } from './repo/strategyFlowRepo';

type FastifyType = import('fastify').FastifyInstance;

const envSchema = {
  type: 'object',
  required: ['PORT'],
  properties: {
    PORT: { type: 'string', default: '3000' },
    NODE_ENV: { type: 'string', default: 'development' }
  }
};

const DB_FILE_PATH = process.env.DB_FILE || path.resolve(process.cwd(), 'database.sqlite');
const sqliteDb = new Database(DB_FILE_PATH);

function ensureTokenSettings() {
  const defaults = [
    ['TOKEN_LIMIT','100000'],
    ['TOKEN_USED','0'],
    ['TOKEN_WARN','0.8'],
    ['TOKEN_PANIC','0.95']
  ];
  for (const [k,v] of defaults) {
    sqliteDb.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').run(k,v);
  }
}

ensureTokenSettings();
ensureDefaultStrategies();

export const buildServer = async () => {
  const fastify = Fastify({ logger: true });

  await fastify.register(envPlugin, { schema: envSchema, dotenv: true, data: process.env });

  await fastify.register(helmet);
  await fastify.register(sensible);

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Bull Trigger API',
        version: '0.1.0'
      }
    }
  });
  await fastify.register(swaggerUi, {
    routePrefix: '/docs/api'
  });

  fastify.get('/healthz', async () => ({ status: 'ok' }));

  fastify.get('/api/strategies', async () => {
    const rows = sqliteDb.prepare('SELECT * FROM strategies').all();
    return rows;
  });

  fastify.put<{ Params: { id: string }; Body: any }>('/api/strategies/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const body = req.body;
    sqliteDb.prepare('UPDATE strategies SET enabled = @enabled, cron = @cron, triggers = @triggers WHERE id = @id').run({
      id,
      enabled: body.enabled ? 1 : 0,
      cron: body.cron,
      triggers: JSON.stringify(body.triggers ?? null)
    });
    refreshRegistry();
    return { ok: true };
  });

  fastify.post<{ Params: { id: string } }>('/api/strategies/:id/run', async (req) => {
    runStrategyOnce(Number(req.params.id));
    return { ok: true };
  });

  fastify.put('/api/settings/tokenReset', async () => {
    sqliteDb.prepare('UPDATE settings SET value = 0 WHERE key = "TOKEN_USED"').run();
    return { ok: true };
  });

  // Strategy flow endpoints
  fastify.get('/api/strategies/:id/flow', async (req) => {
    const id = Number(req.params.id);
    const data = strategyFlowRepo.listFlow(id);
    return data;
  });

  fastify.post('/api/strategies/:id/calls', async (req) => {
    const id = Number(req.params.id);
    const { order_idx, type, config } = req.body as any;
    const callId = strategyFlowRepo.addCall(id, order_idx, type, config);
    return { id: callId };
  });

  fastify.patch('/api/calls/:callId', async (req) => {
    const callId = Number(req.params.callId);
    strategyFlowRepo.updateCall(callId, req.body);
    return { ok: true };
  });

  fastify.delete('/api/calls/:callId', async (req) => {
    strategyFlowRepo.deleteCall(Number(req.params.callId));
    return { ok: true };
  });

  fastify.post('/api/strategies/:id/edges', async (req) => {
    const id = Number(req.params.id);
    const { src_call_id, dst_strategy_id } = req.body as any;
    const edgeId = strategyFlowRepo.addEdge(src_call_id, dst_strategy_id);
    return { id: edgeId };
  });

  return fastify;
};

export const start = async () => {
  const server = await buildServer();
  await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // executed directly via tsx node
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} 