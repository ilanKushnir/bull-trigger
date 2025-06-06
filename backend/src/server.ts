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
import { SignalsService } from './signals/signalsService';
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

  // WebSocket service will be initialized later
  let websocketService: any = null;

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
    
    // Build the update query dynamically based on provided fields
    const updateFields = [];
    const updateValues: any = { id };
    
    if (body.enabled !== undefined) {
      updateFields.push('enabled = @enabled');
      updateValues.enabled = body.enabled ? 1 : 0;
    }
    
    if (body.cron !== undefined) {
      updateFields.push('cron = @cron');
      updateValues.cron = body.cron;
    }
    
    if (body.cronExpression !== undefined) {
      updateFields.push('cron = @cron');
      updateValues.cron = body.cronExpression;
    }
    
    if (body.name !== undefined) {
      updateFields.push('name = @name');
      updateValues.name = body.name;
    }
    
    if (body.description !== undefined) {
      updateFields.push('description = @description');
      updateValues.description = body.description;
    }
    
    if (body.triggers !== undefined) {
      updateFields.push('triggers = @triggers');
      updateValues.triggers = JSON.stringify(body.triggers);
    }
    
    if (updateFields.length === 0) {
      return { error: 'No valid fields to update' };
    }
    
    const query = `UPDATE strategies SET ${updateFields.join(', ')} WHERE id = @id`;
    sqliteDb.prepare(query).run(updateValues);
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

  fastify.delete<{ Params: { id: string } }>('/api/strategies/:id', async (req) => {
    const strategyId = Number(req.params.id);
    
    try {
      // Delete all related data first
      sqliteDb.prepare('DELETE FROM api_calls WHERE strategy_id = ?').run(strategyId);
      sqliteDb.prepare('DELETE FROM model_calls WHERE strategy_id = ?').run(strategyId);
      sqliteDb.prepare('DELETE FROM strategy_nodes_conditions WHERE strategy_id = ?').run(strategyId);
      sqliteDb.prepare('DELETE FROM strategy_nodes_triggers WHERE strategy_id = ?').run(strategyId);
      sqliteDb.prepare('DELETE FROM strategy_nodes_telegram WHERE strategy_id = ?').run(strategyId);
      
      // Delete the strategy itself
      sqliteDb.prepare('DELETE FROM strategies WHERE id = ?').run(strategyId);
      
      // Refresh the strategy registry to remove the deleted strategy from scheduler
      loadStrategies();
      
      return { ok: true };
    } catch (error) {
      console.error('Failed to delete strategy:', error);
      return { error: 'Failed to delete strategy' };
    }
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

  // ===== SIGNALS MANAGEMENT =====

  // Get all signals with optional filters
  fastify.get('/api/signals', async (req) => {
    try {
      const query = req.query as any;
      const filters = {
        status: query.status,
        symbol: query.symbol,
        signalType: query.signalType,
        limit: query.limit ? Number(query.limit) : undefined,
        offset: query.offset ? Number(query.offset) : undefined
      };
      
      const signals = SignalsService.getSignals(filters);
      return { success: true, data: signals };
    } catch (error) {
      console.error('Failed to get signals:', error);
      return { success: false, error: 'Failed to get signals' };
    }
  });

  // Get signal by ID
  fastify.get<{ Params: { id: string } }>('/api/signals/:id', async (req) => {
    try {
      const id = Number(req.params.id);
      const signal = SignalsService.getSignalById(id);
      
      if (!signal) {
        return { success: false, error: 'Signal not found' };
      }
      
      return { success: true, data: signal };
    } catch (error) {
      console.error('Failed to get signal:', error);
      return { success: false, error: 'Failed to get signal' };
    }
  });

  // Create new signal
  fastify.post('/api/signals', async (req) => {
    try {
      const signalData = req.body as any;
      
      // Generate signal tag if not provided
      if (!signalData.signalTag) {
        signalData.signalTag = SignalsService.generateSignalTag();
      }
      
      const signal = SignalsService.createSignal(signalData);
      
      // Broadcast new signal via WebSocket
      websocketService?.broadcastAlert({
        type: 'success',
        message: `New ${signal.signalType} signal created for ${signal.symbol}`,
        timestamp: new Date(),
        data: signal
      });
      
      return { success: true, data: signal };
    } catch (error) {
      console.error('Failed to create signal:', error);
      return { success: false, error: 'Failed to create signal' };
    }
  });

  // Update signal
  fastify.put<{ Params: { id: string }; Body: any }>('/api/signals/:id', async (req) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;
      
      const signal = SignalsService.updateSignal(id, updates);
      
      if (!signal) {
        return { success: false, error: 'Signal not found' };
      }
      
      // Broadcast signal update via WebSocket
      websocketService?.broadcastAlert({
        type: 'info',
        message: `Signal ${signal.symbol} updated to ${signal.status}`,
        timestamp: new Date()
      });
      
      return { success: true, data: signal };
    } catch (error) {
      console.error('Failed to update signal:', error);
      return { success: false, error: 'Failed to update signal' };
    }
  });

  // Delete signal
  fastify.delete<{ Params: { id: string } }>('/api/signals/:id', async (req) => {
    try {
      const id = Number(req.params.id);
      const signal = SignalsService.getSignalById(id);
      
      if (!signal) {
        return { success: false, error: 'Signal not found' };
      }
      
      const deleted = SignalsService.deleteSignal(id);
      
      if (deleted) {
        // Broadcast signal deletion via WebSocket
        websocketService?.broadcastAlert({
          type: 'warning',
          message: `Signal ${signal.symbol} deleted`,
          timestamp: new Date()
        });
        
        return { success: true };
      } else {
        return { success: false, error: 'Failed to delete signal' };
      }
    } catch (error) {
      console.error('Failed to delete signal:', error);
      return { success: false, error: 'Failed to delete signal' };
    }
  });

  // Get signal statistics
  fastify.get('/api/signals/stats', async () => {
    try {
      const stats = SignalsService.getSignalStats();
      return { success: true, data: stats };
    } catch (error) {
      console.error('Failed to get signal stats:', error);
      return { success: false, error: 'Failed to get signal stats' };
    }
  });

  // Format signal for Telegram
  fastify.get<{ Params: { id: string } }>('/api/signals/:id/telegram', async (req) => {
    try {
      const id = Number(req.params.id);
      const signal = SignalsService.getSignalById(id);
      
      if (!signal) {
        return { success: false, error: 'Signal not found' };
      }
      
      const telegramMessage = SignalsService.formatSignalForTelegram(signal);
      return { success: true, data: { message: telegramMessage } };
    } catch (error) {
      console.error('Failed to format signal for Telegram:', error);
      return { success: false, error: 'Failed to format signal for Telegram' };
    }
  });

  // Bulk update signals status
  fastify.put('/api/signals/bulk-update', async (req) => {
    try {
      const { ids, status } = req.body as { ids: number[]; status: string };
      const updatedSignals = [];
      
      for (const id of ids) {
        const signal = SignalsService.updateSignal(id, { status });
        if (signal) {
          updatedSignals.push(signal);
        }
      }
      
      // Broadcast bulk update via WebSocket
      websocketService?.broadcastAlert({
        type: 'info',
        message: `${updatedSignals.length} signals updated to ${status}`,
        timestamp: new Date()
      });
      
      return { success: true, data: updatedSignals };
    } catch (error) {
      console.error('Failed to bulk update signals:', error);
      return { success: false, error: 'Failed to bulk update signals' };
    }
  });

  // ===== END SIGNALS MANAGEMENT =====

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

  // ===== FLOW EDGES ENDPOINTS =====
  
  // Get flow edges for a strategy
  fastify.get('/api/strategies/:strategyId/edges', async (request, reply) => {
    const { strategyId } = request.params as { strategyId: string };
    
    try {
      const edges = sqliteDb.prepare(`
        SELECT id, source_node_id as source, target_node_id as target, 
               source_handle as sourceHandle, target_handle as targetHandle
        FROM flow_edges 
        WHERE strategy_id = ?
        ORDER BY created_at ASC
      `).all(strategyId);
      
      reply.send({ success: true, edges });
    } catch (error) {
      console.error('Failed to get flow edges:', error);
      reply.status(500).send({ success: false, error: 'Failed to get flow edges' });
    }
  });

  // Create a new flow edge
  fastify.post('/api/strategies/:strategyId/edges', async (request, reply) => {
    const { strategyId } = request.params as { strategyId: string };
    const { sourceNodeId, targetNodeId, sourceHandle, targetHandle } = request.body as any;
    
    try {
      const edgeId = `${sourceNodeId}-${targetNodeId}`;
      
      sqliteDb.prepare(`
        INSERT OR REPLACE INTO flow_edges (id, strategy_id, source_node_id, target_node_id, source_handle, target_handle)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(edgeId, strategyId, sourceNodeId, targetNodeId, sourceHandle || 'default', targetHandle || 'default');
      
      reply.send({ success: true, edgeId });
    } catch (error) {
      console.error('Failed to create flow edge:', error);
      reply.status(500).send({ success: false, error: 'Failed to create flow edge' });
    }
  });

  // Delete a flow edge
  fastify.delete('/api/strategies/:strategyId/edges/:edgeId', async (request, reply) => {
    const { strategyId, edgeId } = request.params as { strategyId: string; edgeId: string };
    
    try {
      sqliteDb.prepare('DELETE FROM flow_edges WHERE id = ? AND strategy_id = ?').run(edgeId, strategyId);
      reply.send({ success: true });
    } catch (error) {
      console.error('Failed to delete flow edge:', error);
      reply.status(500).send({ success: false, error: 'Failed to delete flow edge' });
    }
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