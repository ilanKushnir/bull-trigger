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
import fs from 'fs';
import { exportGraphDot } from './utils/graphUtils';
import { initializeWebSocketService, websocketService } from './websocket/websocketService';

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
  const fastify = Fastify({ 
    logger: true,
    serverFactory: (handler, opts) => {
      const server = require('http').createServer((req, res) => {
        handler(req, res);
      });
      
      // Initialize WebSocket service
      initializeWebSocketService(server, sqliteDb);
      
      return server;
    }
  });

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

  fastify.get('/healthz', async () => ({ 
    status: 'ok',
    websocket: {
      enabled: true,
      activeConnections: websocketService?.getActiveConnections() || 0
    }
  }));

  // WebSocket status endpoint
  fastify.get('/api/websocket/status', async () => {
    return {
      enabled: !!websocketService,
      activeConnections: websocketService?.getActiveConnections() || 0
    };
  });

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
    
    // Broadcast strategy update via WebSocket
    websocketService?.broadcastStrategyUpdate(id, {
      enabled: body.enabled,
      cron: body.cron,
      triggers: body.triggers
    });
    
    return { ok: true };
  });

  fastify.post<{ Params: { id: string } }>('/api/strategies/:id/run', async (req) => {
    const strategyId = Number(req.params.id);
    runStrategyOnce(strategyId);
    
    // Broadcast strategy execution via WebSocket
    websocketService?.broadcastAlert({
      type: 'info',
      message: `Strategy ${strategyId} executed manually`,
      timestamp: new Date()
    });
    
    return { ok: true };
  });

  fastify.put('/api/settings/tokenReset', async () => {
    sqliteDb.prepare('UPDATE settings SET value = 0 WHERE key = "TOKEN_USED"').run();
    
    // Broadcast token reset via WebSocket
    websocketService?.broadcastTokenUpdate();
    websocketService?.broadcastAlert({
      type: 'info',
      message: 'Token usage counter reset',
      timestamp: new Date()
    });
    
    return { ok: true };
  });

  // Live signals endpoint with WebSocket broadcasting
  fastify.post('/api/signals', async (req) => {
    const { symbol, signal, confidence, price, strategy } = req.body as any;
    
    // Store signal in database
    const result: any = sqliteDb.prepare(`
      INSERT INTO signals (symbol, signal, confidence, price, strategy, created_at) 
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(symbol, signal, confidence, price, strategy);
    
    // Broadcast new signal via WebSocket
    websocketService?.broadcastSignal({
      id: result.lastInsertRowid.toString(),
      symbol,
      signal,
      confidence,
      price,
      strategy,
      timestamp: new Date()
    });
    
    return { id: result.lastInsertRowid };
  });

  // Get recent signals
  fastify.get('/api/signals', async () => {
    try {
      const signals = sqliteDb.prepare(`
        SELECT * FROM signals 
        ORDER BY created_at DESC 
        LIMIT 50
      `).all();
      return signals;
    } catch (error) {
      return [];
    }
  });

  // System health endpoint
  fastify.get('/api/system/health', async () => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      status: 'healthy',
      uptime,
      memoryUsage,
      websocketConnections: websocketService?.getActiveConnections() || 0
    };
  });

  // Token usage endpoint
  fastify.get('/api/tokens/usage', async () => {
    const tokenLimit = Number((sqliteDb.prepare('SELECT value FROM settings WHERE key = "TOKEN_LIMIT"').get() as { value: string } | undefined)?.value || 100000);
    const tokenUsed = Number((sqliteDb.prepare('SELECT value FROM settings WHERE key = "TOKEN_USED"').get() as { value: string } | undefined)?.value || 0);
    
    return {
      used: tokenUsed,
      limit: tokenLimit,
      percentage: tokenUsed / tokenLimit
    };
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

  fastify.post('/api/strategies/:id/compile', async (req) => {
    const id = Number(req.params.id);
    const { svgPath } = exportGraphDot(id);
    return { svgPath };
  });

  fastify.get('/api/strategies/:id/preview', async (req, reply) => {
    const id = Number(req.params.id);
    const svg = `/tmp/strategy_${id}.svg`;
    if (!fs.existsSync(svg)) return reply.code(404).send();
    reply.type('image/svg+xml').send(fs.readFileSync(svg));
  });

  fastify.post('/api/strategies', async (req) => {
    const { name, description } = req.body as any;
    const res: any = sqliteDb
      .prepare('INSERT INTO strategies (name, description, enabled, cron) VALUES (?,?,1, "*/5 * * * *")')
      .run(name, description ?? null);
    return { id: res.lastInsertRowid };
  });

  return fastify;
};

export const start = async () => {
  const server = await buildServer();
  await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  
  console.log('🚀 Server started with WebSocket support');
  console.log('📡 WebSocket endpoint: ws://localhost:' + (Number(process.env.PORT) || 3000));
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // executed directly via tsx node
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} 