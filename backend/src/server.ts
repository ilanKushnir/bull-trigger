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
import { resetTokenUsage } from './utils/settings';

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
      ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:3000', 'http://localhost:3001']
      : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  console.log('✅ CORS plugin registered');

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
    try {
      resetTokenUsage();
      
      // Broadcast token reset via WebSocket
      websocketService?.broadcastTokenUpdate();
      websocketService?.broadcastAlert({
        type: 'info',
        message: 'Token usage counter reset',
        timestamp: new Date()
      });
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to reset token usage:', error);
      return { error: 'Failed to reset token usage' };
    }
  });

  // ===== SETTINGS MANAGEMENT ENDPOINTS =====
  
  // Get all settings
  fastify.get('/api/settings', async () => {
    try {
      const settings = sqliteDb.prepare('SELECT key, value FROM settings ORDER BY key').all() as { key: string; value: string }[];
      
      // Convert to object format for easier frontend consumption
      const settingsObj: Record<string, any> = {};
      settings.forEach(({ key, value }) => {
        // Try to parse JSON values, otherwise keep as string
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

  // Get a specific setting
  fastify.get<{ Params: { key: string } }>('/api/settings/:key', async (req) => {
    const { key } = req.params;
    
    try {
      const setting = sqliteDb.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      
      if (!setting) {
        return { error: 'Setting not found' };
      }
      
      // Try to parse JSON value, otherwise return as string
      try {
        return { value: JSON.parse(setting.value) };
      } catch {
        return { value: setting.value };
      }
    } catch (error) {
      console.error('Failed to fetch setting:', error);
      return { error: 'Failed to fetch setting' };
    }
  });

  // Update multiple settings
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
      
      // Broadcast settings update via WebSocket
      websocketService?.broadcastAlert({
        type: 'info',
        message: `Updated ${Object.keys(settings).length} system settings`,
        timestamp: new Date()
      });
      
      // If token settings were updated, broadcast token update
      if (settings.TOKEN_LIMIT || settings.TOKEN_WARN || settings.TOKEN_PANIC) {
        websocketService?.broadcastTokenUpdate();
      }
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to update settings:', error);
      return { error: 'Failed to update settings' };
    }
  });

  // Update a specific setting
  fastify.put<{ Params: { key: string }; Body: { value: any } }>('/api/settings/:key', async (req) => {
    const { key } = req.params;
    const { value } = req.body;
    
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      sqliteDb.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, serializedValue);
      
      // Broadcast setting update via WebSocket
      websocketService?.broadcastAlert({
        type: 'info',
        message: `Updated setting: ${key}`,
        timestamp: new Date()
      });
      
      // If token setting was updated, broadcast token update
      if (key.startsWith('TOKEN_')) {
        websocketService?.broadcastTokenUpdate();
      }
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to update setting:', error);
      return { error: 'Failed to update setting' };
    }
  });

  // Delete a setting
  fastify.delete<{ Params: { key: string } }>('/api/settings/:key', async (req) => {
    const { key } = req.params;
    
    try {
      sqliteDb.prepare('DELETE FROM settings WHERE key = ?').run(key);
      
      // Broadcast setting deletion via WebSocket
      websocketService?.broadcastAlert({
        type: 'warning',
        message: `Deleted setting: ${key}`,
        timestamp: new Date()
      });
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to delete setting:', error);
      return { error: 'Failed to delete setting' };
    }
  });

  // Reset all settings to defaults
  fastify.post('/api/settings/reset', async () => {
    try {
      // Clear all existing settings
      sqliteDb.prepare('DELETE FROM settings').run();
      
      // Re-initialize with defaults
      ensureTokenSettings();
      
      // Add other default settings
      const defaultSettings = [
        ['MODEL_DEEP', 'o1'],
        ['MODEL_CHEAP', 'gpt-4o-mini'],
        ['TELEGRAM_CHAT_ID', '-1001234567890'],
        ['SIGNAL_COOLDOWN', '30'],
        ['HEARTBEAT_INTERVAL', '120'],
        ['ENABLE_NOTIFICATIONS', 'true'],
        ['AUTO_DISABLE_FAILING_STRATEGIES', 'false']
      ];
      
      const insertStmt = sqliteDb.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const transaction = sqliteDb.transaction((settings: Array<[string, string]>) => {
        for (const [key, value] of settings) {
          insertStmt.run(key, value);
        }
      });
      
      transaction(defaultSettings);
      
      // Broadcast settings reset via WebSocket
      websocketService?.broadcastAlert({
        type: 'warning',
        message: 'All settings reset to defaults',
        timestamp: new Date()
      });
      
      websocketService?.broadcastTokenUpdate();
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return { error: 'Failed to reset settings' };
    }
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

function ensureTokenSettings() {
  console.log('🔍 Initializing system settings...');

  // Define all default settings
  const defaultSettings = [
    // Token management
    ['TOKEN_LIMIT', '100000'],
    ['TOKEN_USED', '0'],
    ['TOKEN_WARN', '0.8'],
    ['TOKEN_PANIC', '0.95'],
    
    // AI Models - Updated to latest 2024-2025 models
    ['MODEL_DEEP', 'o1'],  // Advanced reasoning model for complex analysis
    ['MODEL_CHEAP', 'gpt-4o-mini'],  // Latest efficient model for standard tasks
    
    // Telegram Integration
    ['TELEGRAM_CHAT_ID', '-1001234567890'],
    
    // System Behavior
    ['SIGNAL_COOLDOWN', '30'],
    ['HEARTBEAT_INTERVAL', '120'],
    ['ENABLE_NOTIFICATIONS', 'true'],
    ['AUTO_DISABLE_FAILING_STRATEGIES', 'false'],
    
    // Application metadata
    ['app_name', 'Bull Trigger'],
    ['version', '1.0.0']
  ];

  // Insert all default settings (ignore conflicts for existing settings)
  const insertStmt = sqliteDb.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const transaction = sqliteDb.transaction((settings: Array<[string, string]>) => {
    for (const [key, value] of settings) {
      insertStmt.run(key, value);
      console.log(`📝 Setting ${key} = ${value}`);
    }
  });

  transaction(defaultSettings);
  console.log('✅ System settings initialized');
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