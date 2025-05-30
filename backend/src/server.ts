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
import { strategyExecutionService } from './services/strategyExecutionService';
import { strategyFlowService } from './services/strategyFlowService';

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
    
    // Get metrics for each strategy
    const strategiesWithMetrics = rows.map((strategy: any) => {
      const metrics = strategyExecutionService.getStrategyMetrics(strategy.id);
      return {
        ...strategy,
        totalRuns: metrics.totalRuns,
        successRate: metrics.successRate,
        lastRun: metrics.lastRun,
        modelTier: 'cheap' // Default, could be made configurable
      };
    });
    
    return strategiesWithMetrics;
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
    
    // Start tracking execution
    const executionId = strategyExecutionService.startExecution(strategyId, 'manual');
    
    try {
      // Execute the strategy flow (API calls + model calls)
      const flowResult = await strategyFlowService.executeStrategyFlow(strategyId, executionId);
      
      if (flowResult.success) {
        // Mark execution as successful
        strategyExecutionService.completeExecution(executionId);
        
        // Broadcast strategy execution via WebSocket
        websocketService?.broadcastAlert({
          type: 'info',
          message: `Strategy ${strategyId} executed successfully`,
          timestamp: new Date()
        });
        
        return { 
          ok: true, 
          executionId,
          variables: flowResult.variables,
          logs: flowResult.logs
        };
      } else {
        // Mark execution as failed
        strategyExecutionService.failExecution(executionId, flowResult.error);
        
        websocketService?.broadcastAlert({
          type: 'error',
          message: `Strategy ${strategyId} execution failed: ${flowResult.error}`,
          timestamp: new Date()
        });
        
        return { 
          ok: false, 
          error: flowResult.error,
          logs: flowResult.logs
        };
      }
    } catch (error) {
      // Mark execution as failed
      strategyExecutionService.failExecution(executionId, error?.message || 'Unknown error');
      throw error;
    }
  });

  // New endpoint to get detailed metrics for all strategies
  fastify.get('/api/strategies/metrics', async () => {
    return strategyExecutionService.getAllStrategiesMetrics();
  });

  // New endpoint to get metrics for a specific strategy
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/metrics', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyExecutionService.getStrategyMetrics(strategyId);
  });

  // New endpoint to get execution history for a strategy
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/executions', async (req) => {
    const strategyId = Number(req.params.id);
    const limit = Number(req.query?.limit) || 10;
    return strategyExecutionService.getRecentExecutions(strategyId, limit);
  });

  // Endpoint to seed sample execution data (for development)
  fastify.post('/api/strategies/seed-data', async () => {
    strategyExecutionService.seedSampleData();
    return { ok: true, message: 'Sample execution data seeded' };
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

  // ===== STRATEGY FLOW API ENDPOINTS =====

  // Create new strategy
  fastify.post('/api/strategies', async (req) => {
    const { name, description } = req.body as any;
    const res: any = sqliteDb
      .prepare('INSERT INTO strategies (name, description, enabled, cron) VALUES (?, ?, 1, ?)')
      .run(name, description ?? null, '*/5 * * * *');
    return { id: res.lastInsertRowid };
  });

  // Get strategy flow (API calls and model calls)
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/flow', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyFlowService.getStrategyFlow(strategyId);
  });

  // ===== API CALLS MANAGEMENT =====

  // Get API calls for a strategy
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/api-calls', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyFlowService.getApiCallsByStrategy(strategyId);
  });

  // Create new API call
  fastify.post<{ Params: { id: string }; Body: any }>('/api/strategies/:id/api-calls', async (req) => {
    const strategyId = Number(req.params.id);
    const apiCallData = { ...req.body, strategyId };
    const id = strategyFlowService.createApiCall(apiCallData);
    return { id };
  });

  // Update API call
  fastify.put<{ Params: { id: string; apiCallId: string }; Body: any }>('/api/strategies/:id/api-calls/:apiCallId', async (req) => {
    const apiCallId = Number(req.params.apiCallId);
    strategyFlowService.updateApiCall(apiCallId, req.body);
    return { ok: true };
  });

  // Delete API call
  fastify.delete<{ Params: { id: string; apiCallId: string } }>('/api/strategies/:id/api-calls/:apiCallId', async (req) => {
    const apiCallId = Number(req.params.apiCallId);
    strategyFlowService.deleteApiCall(apiCallId);
    return { ok: true };
  });

  // Test API call
  fastify.post('/api/test-api-call', async (req) => {
    const result = await strategyFlowService.testApiCall(req.body as any);
    return result;
  });

  // ===== MODEL CALLS MANAGEMENT =====

  // Get model calls for a strategy
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/model-calls', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyFlowService.getModelCallsByStrategy(strategyId);
  });

  // Create new model call
  fastify.post<{ Params: { id: string }; Body: any }>('/api/strategies/:id/model-calls', async (req) => {
    const strategyId = Number(req.params.id);
    const modelCallData = { ...req.body, strategyId };
    const id = strategyFlowService.createModelCall(modelCallData);
    return { id };
  });

  // Update model call
  fastify.put<{ Params: { id: string; modelCallId: string }; Body: any }>('/api/strategies/:id/model-calls/:modelCallId', async (req) => {
    const modelCallId = Number(req.params.modelCallId);
    strategyFlowService.updateModelCall(modelCallId, req.body);
    return { ok: true };
  });

  // Delete model call
  fastify.delete<{ Params: { id: string; modelCallId: string } }>('/api/strategies/:id/model-calls/:modelCallId', async (req) => {
    const modelCallId = Number(req.params.modelCallId);
    strategyFlowService.deleteModelCall(modelCallId);
    return { ok: true };
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