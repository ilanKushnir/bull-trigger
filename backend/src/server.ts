// @ts-nocheck
import cors from '@fastify/cors';
import envPlugin from '@fastify/env';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Database from 'better-sqlite3';
import Fastify from 'fastify';
import path from 'path';
import { pathToFileURL } from 'url';
import { strategyExecutionService } from './services/strategyExecutionService';
import { strategyFlowService } from './services/strategyFlowService';
import { refreshRegistry } from './strategies/registry';
import { resetTokenUsage } from './utils/settings';
import { initializeWebSocketService } from './websocket/websocketService';

type FastifyType = import('fastify').FastifyInstance;

const envSchema = {
  type: 'object',
  required: ['PORT'],
  properties: {
    PORT: { type: 'string', default: '3000' },
    NODE_ENV: { type: 'string', default: 'development' }
  }
};

// Database setup with the same path logic
const cwd = process.cwd();
const isInBackendDir = cwd.endsWith('/backend');
const DB_FILE_PATH = process.env.DB_FILE || (isInBackendDir 
  ? path.resolve(cwd, 'database.sqlite')
  : path.resolve(cwd, 'backend/database.sqlite'));

const sqliteDb = new Database(DB_FILE_PATH);

export const buildServer = async () => {
  const fastify = Fastify({ 
    logger: {
      level: 'warn', // Reduce log verbosity
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          colorize: true
        }
      }
    }
  });

  await fastify.register(envPlugin, { schema: envSchema, dotenv: true, data: process.env });

  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:3000', 'http://localhost:3001']
      : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  // Manual CORS hook as fallback
  fastify.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:3000', 'http://localhost:3001'];
    
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
      activeConnections: 0 // Will be updated when WebSocket service is available
    }
  }));

  // WebSocket status endpoint
  fastify.get('/api/websocket/status', async () => {
    return {
      enabled: true,
      activeConnections: 0 // Will be updated when WebSocket service is available
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
        
        return { 
          ok: true, 
          executionId,
          variables: flowResult.variables,
          logs: flowResult.logs
        };
      } else {
        // Mark execution as failed
        strategyExecutionService.failExecution(executionId, flowResult.error);
        
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

  // Settings management endpoints
  fastify.get('/api/settings', async () => {
    try {
      const settings = sqliteDb.prepare('SELECT key, value FROM settings ORDER BY key').all() as { key: string; value: string }[];
      
      const settingsObj: Record<string, any> = {};
      settings.forEach(({ key, value }) => {
        try {
          settingsObj[key] = JSON.parse(value);
        } catch {
          settingsObj[key] = value;
        }
      });
      
      return settingsObj;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return { error: 'Failed to fetch settings' };
    }
  });

  fastify.put('/api/settings', async (req) => {
    const settings = req.body as Record<string, any>;
    
    try {
      const updateStmt = sqliteDb.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const transaction = sqliteDb.transaction((settingsToUpdate: Array<[string, any]>) => {
        for (const [key, value] of settingsToUpdate) {
          const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          updateStmt.run(key, serializedValue);
        }
      });
      
      transaction(Object.entries(settings));
      return { ok: true };
    } catch (error) {
      console.error('Failed to update settings:', error);
      return { error: 'Failed to update settings' };
    }
  });

  fastify.put('/api/settings/tokenReset', async () => {
    try {
      resetTokenUsage();
      return { ok: true };
    } catch (error) {
      console.error('Failed to reset token usage:', error);
      return { error: 'Failed to reset token usage' };
    }
  });

  // Strategy flow endpoints
  fastify.post('/api/strategies', async (req) => {
    const { name, description } = req.body as any;
    const res: any = sqliteDb
      .prepare('INSERT INTO strategies (name, description, enabled, cron) VALUES (?, ?, 1, ?)')
      .run(name, description ?? null, '*/5 * * * *');
    return { id: res.lastInsertRowid };
  });

  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/flow', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyFlowService.getStrategyFlow(strategyId);
  });

  // API calls management
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/api-calls', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyFlowService.getApiCallsByStrategy(strategyId);
  });

  fastify.post<{ Params: { id: string }; Body: any }>('/api/strategies/:id/api-calls', async (req) => {
    const strategyId = Number(req.params.id);
    const apiCallData = { ...req.body, strategyId };
    const id = await strategyFlowService.createApiCall(strategyId, apiCallData);
    return { id };
  });

  fastify.put<{ Params: { id: string; apiCallId: string }; Body: any }>('/api/strategies/:id/api-calls/:apiCallId', async (req) => {
    const apiCallId = Number(req.params.apiCallId);
    await strategyFlowService.updateApiCall(apiCallId, req.body);
    return { ok: true };
  });

  fastify.delete<{ Params: { id: string; apiCallId: string } }>('/api/strategies/:id/api-calls/:apiCallId', async (req) => {
    const apiCallId = Number(req.params.apiCallId);
    strategyFlowService.deleteApiCall(apiCallId);
    return { ok: true };
  });

  fastify.post('/api/test-api-call', async (req) => {
    const result = await strategyFlowService.testApiCall(req.body as any);
    return result;
  });

  // Model calls management
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/model-calls', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyFlowService.getModelCallsByStrategy(strategyId);
  });

  fastify.post<{ Params: { id: string }; Body: any }>('/api/strategies/:id/model-calls', async (req) => {
    const strategyId = Number(req.params.id);
    const modelCallData = { ...req.body, strategyId };
    const id = await strategyFlowService.createModelCall(strategyId, modelCallData);
    return { id };
  });

  fastify.put<{ Params: { id: string; modelCallId: string }; Body: any }>('/api/strategies/:id/model-calls/:modelCallId', async (req) => {
    const modelCallId = Number(req.params.modelCallId);
    await strategyFlowService.updateModelCall(modelCallId, req.body);
    return { ok: true };
  });

  fastify.delete<{ Params: { id: string; modelCallId: string } }>('/api/strategies/:id/model-calls/:modelCallId', async (req) => {
    const modelCallId = Number(req.params.modelCallId);
    strategyFlowService.deleteModelCall(modelCallId);
    return { ok: true };
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

  // ===== CONDITION NODES MANAGEMENT =====

  // Get condition nodes for a strategy
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/condition-nodes', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyFlowService.getConditionNodesByStrategy(strategyId);
  });

  // Create new condition node
  fastify.post<{ Params: { id: string }; Body: any }>('/api/strategies/:id/condition-nodes', async (req) => {
    const strategyId = Number(req.params.id);
    const conditionNodeData = { ...req.body, strategyId };
    const id = strategyFlowService.createConditionNode(conditionNodeData);
    return { id };
  });

  // Update condition node
  fastify.put<{ Params: { id: string; conditionNodeId: string }; Body: any }>('/api/strategies/:id/condition-nodes/:conditionNodeId', async (req) => {
    const conditionNodeId = Number(req.params.conditionNodeId);
    strategyFlowService.updateConditionNode(conditionNodeId, req.body);
    return { ok: true };
  });

  // Delete condition node
  fastify.delete<{ Params: { id: string; conditionNodeId: string } }>('/api/strategies/:id/condition-nodes/:conditionNodeId', async (req) => {
    const conditionNodeId = Number(req.params.conditionNodeId);
    strategyFlowService.deleteConditionNode(conditionNodeId);
    return { ok: true };
  });

  // ===== STRATEGY TRIGGER NODES MANAGEMENT =====

  // Get strategy trigger nodes for a strategy
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/strategy-trigger-nodes', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyFlowService.getStrategyTriggerNodesByStrategy(strategyId);
  });

  // Create new strategy trigger node
  fastify.post<{ Params: { id: string }; Body: any }>('/api/strategies/:id/strategy-trigger-nodes', async (req) => {
    const strategyId = Number(req.params.id);
    const triggerNodeData = { ...req.body, strategyId };
    const id = strategyFlowService.createStrategyTriggerNode(triggerNodeData);
    return { id };
  });

  // Update strategy trigger node
  fastify.put<{ Params: { id: string; triggerNodeId: string }; Body: any }>('/api/strategies/:id/strategy-trigger-nodes/:triggerNodeId', async (req) => {
    const triggerNodeId = Number(req.params.triggerNodeId);
    strategyFlowService.updateStrategyTriggerNode(triggerNodeId, req.body);
    return { ok: true };
  });

  // Delete strategy trigger node
  fastify.delete<{ Params: { id: string; triggerNodeId: string } }>('/api/strategies/:id/strategy-trigger-nodes/:triggerNodeId', async (req) => {
    const triggerNodeId = Number(req.params.triggerNodeId);
    strategyFlowService.deleteStrategyTriggerNode(triggerNodeId);
    return { ok: true };
  });

  // ===== TELEGRAM MESSAGE NODES MANAGEMENT =====

  // Get telegram message nodes for a strategy
  fastify.get<{ Params: { id: string } }>('/api/strategies/:id/telegram-message-nodes', async (req) => {
    const strategyId = Number(req.params.id);
    return strategyFlowService.getTelegramMessageNodesByStrategy(strategyId);
  });

  // Create new telegram message node
  fastify.post<{ Params: { id: string }; Body: any }>('/api/strategies/:id/telegram-message-nodes', async (req) => {
    const strategyId = Number(req.params.id);
    const telegramNodeData = { ...req.body, strategyId };
    const id = strategyFlowService.createTelegramMessageNode(telegramNodeData);
    return { id };
  });

  // Update telegram message node
  fastify.put<{ Params: { id: string; telegramNodeId: string }; Body: any }>('/api/strategies/:id/telegram-message-nodes/:telegramNodeId', async (req) => {
    const telegramNodeId = Number(req.params.telegramNodeId);
    strategyFlowService.updateTelegramMessageNode(telegramNodeId, req.body);
    return { ok: true };
  });

  // Delete telegram message node
  fastify.delete<{ Params: { id: string; telegramNodeId: string } }>('/api/strategies/:id/telegram-message-nodes/:telegramNodeId', async (req) => {
    const telegramNodeId = Number(req.params.telegramNodeId);
    strategyFlowService.deleteTelegramMessageNode(telegramNodeId);
    return { ok: true };
  });

  return fastify;
};

async function initializeSystemSettings() {
  const defaultSettings = {
    TOKEN_LIMIT: '100000',
    TOKEN_USED: '0',
    TOKEN_WARN: '0.8',
    TOKEN_PANIC: '0.95',
    MODEL_DEEP: 'o1',
    MODEL_CHEAP: 'gpt-4o-mini',
    TELEGRAM_CHAT_ID: '-1001234567890',
    SIGNAL_COOLDOWN: '30',
    HEARTBEAT_INTERVAL: '120',
    ENABLE_NOTIFICATIONS: 'true',
    AUTO_DISABLE_FAILING_STRATEGIES: 'false',
    app_name: 'Bull Trigger',
    version: '1.0.0'
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = sqliteDb.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!existing) {
      sqliteDb.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  }
}

function loadStrategies() {
  refreshRegistry();
}

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  
  try {
    // Beautiful startup banner
    console.log('\n🚀 ====================================');
    console.log('   📈 BULL TRIGGER SERVER STARTING');
    console.log('   ====================================\n');
    
    // Initialize system components
    console.log('⚙️  Initializing system settings...');
    await initializeSystemSettings();
    
    console.log('📋 Loading strategy registry...');
    loadStrategies();
    
    console.log('🔧 Building server...');
    const fastify = await buildServer();
    
    console.log('🌐 Starting HTTP server...');
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    // Initialize WebSocket after server starts
    console.log('⚡ Initializing WebSocket service...');
    initializeWebSocketService(fastify.server, sqliteDb);
    
    // Beautiful success message
    console.log('\n✅ ====================================');
    console.log('   🎉 SERVER READY!');
    console.log('   ====================================');
    console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/docs/api`);
    console.log(`💾 Database: ${DB_FILE_PATH}`);
    
    // Network interfaces info
    console.log('\n📡 Network Interfaces:');
    console.log('   • localhost (127.0.0.1)');
    console.log('   • All network interfaces (0.0.0.0)');
    console.log('   • Local network access available');
    
    console.log('\n🎯 Ready to process crypto strategies!\n');
    
  } catch (err) {
    console.log('\n❌ ====================================');
    console.log('   💥 SERVER STARTUP FAILED');
    console.log('   ====================================');
    console.error('Error:', err);
    console.log('====================================\n');
    process.exit(1);
  }
}

export const start = startServer;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // executed directly via tsx node
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} 