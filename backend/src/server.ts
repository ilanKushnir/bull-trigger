// @ts-nocheck
import Fastify from 'fastify';
import envPlugin from '@fastify/env';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
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

// Determine the correct database path
const cwd = process.cwd();
const isInBackendDir = cwd.endsWith('/backend');
const DB_FILE_PATH = process.env.DB_FILE || (isInBackendDir 
  ? path.resolve(cwd, 'database.sqlite')
  : path.resolve(cwd, 'backend/database.sqlite'));
console.log('🔍 Database file path:', DB_FILE_PATH);
console.log('🔍 Current working directory:', process.cwd());
const sqliteDb = new Database(DB_FILE_PATH);

// Note: ensureTokenSettings() will be called in start() function after database is ready

export const buildServer = async () => {
  const fastify = Fastify({ 
    logger: true
  });

  await fastify.register(envPlugin, { schema: envSchema, dotenv: true, data: process.env });

  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000']
      : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  console.log('✅ CORS plugin registered');

  // Manual CORS hook as fallback
  fastify.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'];
    
    if (origin && allowedOrigins.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (request.method === 'OPTIONS') {
      reply.send();
    }
  });

  // await fastify.register(helmet, {
  //   crossOriginResourcePolicy: false
  // });
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

  // ===== ADMIN MANAGEMENT ENDPOINTS =====
  
  // Get all admins
  fastify.get('/api/admins', async () => {
    try {
      const admins = sqliteDb.prepare(`
        SELECT id, email, name, telegram_id as telegramId, is_admin as isAdmin, created_at as createdAt 
        FROM users 
        WHERE is_admin = 1 
        ORDER BY created_at DESC
      `).all();
      return admins;
    } catch (error) {
      return [];
    }
  });

  // Get all users (including non-admins)
  fastify.get('/api/users', async () => {
    try {
      const users = sqliteDb.prepare(`
        SELECT id, email, name, telegram_id as telegramId, is_admin as isAdmin, created_at as createdAt 
        FROM users 
        ORDER BY created_at DESC
      `).all();
      return users;
    } catch (error) {
      return [];
    }
  });

  // Create new admin/user
  fastify.post('/api/admins', async (req) => {
    const { email, name, telegramId, isAdmin } = req.body as any;
    
    try {
      const result: any = sqliteDb.prepare(`
        INSERT INTO users (email, name, telegram_id, is_admin) 
        VALUES (?, ?, ?, ?)
      `).run(email, name || null, telegramId || null, isAdmin ? 1 : 0);
      
      // Broadcast admin update via WebSocket
      websocketService?.broadcastAlert({
        type: 'info',
        message: `New ${isAdmin ? 'admin' : 'user'} created: ${email}`,
        timestamp: new Date()
      });
      
      return { id: result.lastInsertRowid };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return { error: 'Email or Telegram ID already exists' };
      }
      return { error: 'Failed to create user' };
    }
  });

  // Update admin/user
  fastify.put<{ Params: { id: string }; Body: any }>('/api/admins/:id', async (req) => {
    const id = Number(req.params.id);
    const { email, name, telegramId, isAdmin } = req.body;
    
    try {
      sqliteDb.prepare(`
        UPDATE users 
        SET email = ?, name = ?, telegram_id = ?, is_admin = ? 
        WHERE id = ?
      `).run(email, name || null, telegramId || null, isAdmin ? 1 : 0, id);
      
      // Broadcast admin update via WebSocket
      websocketService?.broadcastAlert({
        type: 'info',
        message: `User updated: ${email}`,
        timestamp: new Date()
      });
      
      return { ok: true };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return { error: 'Email or Telegram ID already exists' };
      }
      return { error: 'Failed to update user' };
    }
  });

  // Delete admin/user
  fastify.delete<{ Params: { id: string } }>('/api/admins/:id', async (req) => {
    const id = Number(req.params.id);
    
    try {
      const user = sqliteDb.prepare('SELECT email FROM users WHERE id = ?').get(id) as { email: string } | undefined;
      
      sqliteDb.prepare('DELETE FROM users WHERE id = ?').run(id);
      
      // Broadcast admin deletion via WebSocket
      websocketService?.broadcastAlert({
        type: 'warning',
        message: `User deleted: ${user?.email || 'Unknown'}`,
        timestamp: new Date()
      });
      
      return { ok: true };
    } catch (error) {
      return { error: 'Failed to delete user' };
    }
  });

  // Validate Telegram ID endpoint
  fastify.post('/api/admins/validate-telegram', async (req) => {
    const { telegramId } = req.body as any;
    
    try {
      const existing = sqliteDb.prepare('SELECT id FROM users WHERE telegram_id = ?').get(telegramId);
      return { available: !existing };
    } catch (error) {
      return { error: 'Failed to validate Telegram ID' };
    }
  });

  // ===== END ADMIN MANAGEMENT =====

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

function ensureTokenSettings() {
  console.log('🔍 Checking database tables...');
  try {
    const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('🔍 Available tables:', tables);
  } catch (error) {
    console.error('🔍 Error listing tables:', error);
  }
  
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

export const start = async () => {
  const server = await buildServer();
  
  // Start the Fastify server
  await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  
  // Initialize database settings first, before any services that might need them
  ensureTokenSettings();
  ensureDefaultStrategies();
  refreshRegistry();
  
  // Initialize WebSocket service using the underlying HTTP server
  const httpServer = server.server;
  initializeWebSocketService(httpServer, sqliteDb);
  
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