import { io, Socket } from 'socket.io-client';

// === INTERFACES ===
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeConnections: number;
  lastSignal?: Date;
}

export interface TokenUsage {
  used: number;
  limit: number;
  percentage: number;
  warning: boolean;
  panic: boolean;
}

export interface LiveSignal {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: Date;
  strategy: string;
}

export interface Signal {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  strategy: string;
  created_at: string;
  status?: 'active' | 'closed' | 'expired';
  entry_price?: number;
  current_price?: number;
  pnl?: number;
  reactions?: {
    thumbsUp: number;
    profit: number;
    loss: number;
  };
  message?: string;
}

export interface Strategy {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
  cron: string;
  triggers?: any;
  created_at?: string;
  updated_at?: string;
  totalRuns?: number;
  successRate?: number;
  lastRun?: string;
  nextRun?: string;
  modelTier?: string;
}

export interface Admin {
  id: number;
  email: string;
  name?: string;
  telegramId?: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Alert {
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

type EventCallback = (data: any) => void;

// === API SERVICE CLASS ===
class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // ===== SIGNALS API =====
  async getSignals(limit: number = 50): Promise<ApiResponse<Signal[]>> {
    return this.request<Signal[]>(`/api/signals?limit=${limit}`);
  }

  async createSignal(signal: Omit<Signal, 'id' | 'created_at'>): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>('/api/signals', {
      method: 'POST',
      body: JSON.stringify(signal),
    });
  }

  // ===== STRATEGIES API =====
  async getStrategies(): Promise<ApiResponse<Strategy[]>> {
    return this.request<Strategy[]>('/api/strategies');
  }

  async updateStrategy(id: number, updates: Partial<Strategy>): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async runStrategy(id: number): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async createStrategy(strategy: { name: string; description?: string }): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>('/api/strategies', {
      method: 'POST',
      body: JSON.stringify(strategy),
    });
  }

  async getStrategyMetrics(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/strategies/metrics');
  }

  async getStrategyMetricsById(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/strategies/${id}/metrics`);
  }

  async getStrategyExecutions(id: number, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/strategies/${id}/executions?limit=${limit}`);
  }

  // ===== STRATEGY FLOW API =====
  async getStrategyFlow(id: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/strategies/${id}/flow`);
  }

  // API Calls Management
  async getApiCalls(strategyId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/strategies/${strategyId}/api-calls`);
  }

  async createApiCall(strategyId: number, apiCall: any): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>(`/api/strategies/${strategyId}/api-calls`, {
      method: 'POST',
      body: JSON.stringify(apiCall),
    });
  }

  async updateApiCall(strategyId: number, apiCallId: number, updates: any): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/api-calls/${apiCallId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteApiCall(strategyId: number, apiCallId: number): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/api-calls/${apiCallId}`, {
      method: 'DELETE',
    });
  }

  async testApiCall(apiCall: any): Promise<ApiResponse<any>> {
    return this.request<any>('/api/test-api-call', {
      method: 'POST',
      body: JSON.stringify(apiCall),
    });
  }

  // Model Calls Management
  async getModelCalls(strategyId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/strategies/${strategyId}/model-calls`);
  }

  async createModelCall(strategyId: number, modelCall: any): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>(`/api/strategies/${strategyId}/model-calls`, {
      method: 'POST',
      body: JSON.stringify(modelCall),
    });
  }

  async updateModelCall(strategyId: number, modelCallId: number, updates: any): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/model-calls/${modelCallId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteModelCall(strategyId: number, modelCallId: number): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/model-calls/${modelCallId}`, {
      method: 'DELETE',
    });
  }

  // ===== SYSTEM API =====
  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return this.request<SystemHealth>('/api/system/health');
  }

  async getTokenUsage(): Promise<ApiResponse<TokenUsage>> {
    return this.request<TokenUsage>('/api/tokens/usage');
  }

  async resetTokenUsage(): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>('/api/settings/tokenReset', {
      method: 'PUT',
    });
  }

  // ===== SETTINGS MANAGEMENT =====
  
  async getSettings(): Promise<ApiResponse<Record<string, any>>> {
    return this.request<Record<string, any>>('/api/settings');
  }

  async getSetting(key: string): Promise<ApiResponse<{ value: any }>> {
    return this.request<{ value: any }>(`/api/settings/${key}`);
  }

  async updateSettings(settings: Record<string, any>): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async updateSetting(key: string, value: any): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  async deleteSetting(key: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/settings/${key}`, {
      method: 'DELETE',
    });
  }

  async resetAllSettings(): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>('/api/settings/reset', {
      method: 'POST',
    });
  }

  // ===== HEALTH CHECK =====
  async healthCheck(): Promise<ApiResponse<{ status: string; websocket?: any }>> {
    return this.request<{ status: string; websocket?: any }>('/healthz');
  }

  // ===== ADMIN MANAGEMENT =====
  async getAdmins(): Promise<ApiResponse<Admin[]>> {
    return this.request<Admin[]>('/api/admins');
  }

  async getUsers(): Promise<ApiResponse<Admin[]>> {
    return this.request<Admin[]>('/api/users');
  }

  async createAdmin(admin: Omit<Admin, 'id' | 'createdAt'>): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>('/api/admins', {
      method: 'POST',
      body: JSON.stringify(admin),
    });
  }

  async updateAdmin(id: number, updates: Partial<Omit<Admin, 'id' | 'createdAt'>>): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteAdmin(id: number): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/admins/${id}`, {
      method: 'DELETE',
    });
  }

  async validateTelegramId(telegramId: string): Promise<ApiResponse<{ available: boolean }>> {
    console.log('🔍 Validating Telegram ID:', telegramId);
    const result = await this.request<{ available: boolean }>('/api/admins/validate-telegram', {
      method: 'POST',
      body: JSON.stringify({ telegramId }),
    });
    console.log('🔍 Telegram ID validation result:', result);
    return result;
  }

  // ===== CONDITION NODES =====

  async getConditionNodes(strategyId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/strategies/${strategyId}/condition-nodes`);
  }

  async createConditionNode(strategyId: number, conditionNode: any): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>(`/api/strategies/${strategyId}/condition-nodes`, {
      method: 'POST',
      body: JSON.stringify(conditionNode),
    });
  }

  async updateConditionNode(strategyId: number, conditionNodeId: number, conditionNode: any): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/condition-nodes/${conditionNodeId}`, {
      method: 'PUT',
      body: JSON.stringify(conditionNode),
    });
  }

  async deleteConditionNode(strategyId: number, conditionNodeId: number): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/condition-nodes/${conditionNodeId}`, {
      method: 'DELETE',
    });
  }

  // ===== STRATEGY TRIGGER NODES =====

  async getStrategyTriggerNodes(strategyId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/strategies/${strategyId}/strategy-trigger-nodes`);
  }

  async createStrategyTriggerNode(strategyId: number, triggerNode: any): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>(`/api/strategies/${strategyId}/strategy-trigger-nodes`, {
      method: 'POST',
      body: JSON.stringify(triggerNode),
    });
  }

  async updateStrategyTriggerNode(strategyId: number, triggerNodeId: number, triggerNode: any): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/strategy-trigger-nodes/${triggerNodeId}`, {
      method: 'PUT',
      body: JSON.stringify(triggerNode),
    });
  }

  async deleteStrategyTriggerNode(strategyId: number, triggerNodeId: number): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/strategy-trigger-nodes/${triggerNodeId}`, {
      method: 'DELETE',
    });
  }

  // ===== TELEGRAM MESSAGE NODES =====

  async getTelegramMessageNodes(strategyId: number): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/strategies/${strategyId}/telegram-message-nodes`);
  }

  async createTelegramMessageNode(strategyId: number, telegramNode: any): Promise<ApiResponse<{ id: number }>> {
    return this.request<{ id: number }>(`/api/strategies/${strategyId}/telegram-message-nodes`, {
      method: 'POST',
      body: JSON.stringify(telegramNode),
    });
  }

  async updateTelegramMessageNode(strategyId: number, telegramNodeId: number, telegramNode: any): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/telegram-message-nodes/${telegramNodeId}`, {
      method: 'PUT',
      body: JSON.stringify(telegramNode),
    });
  }

  async deleteTelegramMessageNode(strategyId: number, telegramNodeId: number): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/strategies/${strategyId}/telegram-message-nodes/${telegramNodeId}`, {
      method: 'DELETE',
    });
  }

  // ===== STRATEGY EXECUTION =====
}

// === WEBSOCKET CLIENT CLASS ===
class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, EventCallback[]> = new Map();

  public connect(url: string = 'http://localhost:3001'): void {
    if (this.socket?.connected) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    console.log('🔌 Connecting to WebSocket server...');
    
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    this.setupEventHandlers();
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 WebSocket disconnected');
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      this.reconnectAttempts = 0;
      this.emit('connection:status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.emit('connection:status', { connected: false, reason });
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      this.emit('connection:error', error);
      this.handleReconnection();
    });

    // Health updates
    this.socket.on('health:update', (data: SystemHealth) => {
      this.emit('health:update', data);
    });

    // Token usage updates
    this.socket.on('tokens:update', (data: TokenUsage) => {
      this.emit('tokens:update', data);
    });

    // Live signals
    this.socket.on('signal:new', (data: LiveSignal) => {
      this.emit('signal:new', data);
    });

    this.socket.on('signals:recent', (data: LiveSignal[]) => {
      this.emit('signals:recent', data);
    });

    // Strategy updates
    this.socket.on('strategy:update', (data: { strategyId: number; data: any }) => {
      this.emit('strategy:update', data);
    });

    // Alerts
    this.socket.on('alert:new', (data: Alert) => {
      this.emit('alert:new', data);
    });

    // Connection health
    this.socket.on('pong', (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      this.emit('latency:update', { latency });
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
      
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection:failed', { attempts: this.reconnectAttempts });
    }
  }

  // Subscription methods
  public subscribeToSignals(): void {
    this.socket?.emit('subscribe:signals');
  }

  public subscribeToHealth(): void {
    this.socket?.emit('subscribe:health');
  }

  public subscribeToTokens(): void {
    this.socket?.emit('subscribe:tokens');
  }

  public subscribeToStrategies(): void {
    this.socket?.emit('subscribe:strategies');
  }

  // Event listener management
  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: EventCallback): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  public ping(): void {
    this.socket?.emit('ping');
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getConnectionId(): string | undefined {
    return this.socket?.id;
  }

  // Send test data (for development)
  public sendTestSignal(): void {
    const testSignal = {
      symbol: 'BTC/USDT',
      signal: 'BUY' as const,
      confidence: 0.85,
      price: 43250,
      strategy: 'Test Strategy'
    };

    fetch('http://localhost:3001/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSignal)
    }).catch(console.error);
  }
}

// === EXPORTS ===
export const apiService = new ApiService();
export const websocketClient = new WebSocketClient();

// React hook for easier integration
export function useWebSocket() {
  return {
    connect: websocketClient.connect.bind(websocketClient),
    disconnect: websocketClient.disconnect.bind(websocketClient),
    subscribeToSignals: websocketClient.subscribeToSignals.bind(websocketClient),
    subscribeToHealth: websocketClient.subscribeToHealth.bind(websocketClient),
    subscribeToTokens: websocketClient.subscribeToTokens.bind(websocketClient),
    subscribeToStrategies: websocketClient.subscribeToStrategies.bind(websocketClient),
    on: websocketClient.on.bind(websocketClient),
    off: websocketClient.off.bind(websocketClient),
    ping: websocketClient.ping.bind(websocketClient),
    isConnected: websocketClient.isConnected.bind(websocketClient),
    sendTestSignal: websocketClient.sendTestSignal.bind(websocketClient)
  };
}

// React hook for API calls
export function useApi() {
  return {
    // Signals
    getSignals: apiService.getSignals.bind(apiService),
    createSignal: apiService.createSignal.bind(apiService),
    
    // Strategies  
    getStrategies: apiService.getStrategies.bind(apiService),
    updateStrategy: apiService.updateStrategy.bind(apiService),
    runStrategy: apiService.runStrategy.bind(apiService),
    createStrategy: apiService.createStrategy.bind(apiService),
    getStrategyMetrics: apiService.getStrategyMetrics.bind(apiService),
    getStrategyMetricsById: apiService.getStrategyMetricsById.bind(apiService),
    getStrategyExecutions: apiService.getStrategyExecutions.bind(apiService),
    getStrategyFlow: apiService.getStrategyFlow.bind(apiService),
    getApiCalls: apiService.getApiCalls.bind(apiService),
    createApiCall: apiService.createApiCall.bind(apiService),
    updateApiCall: apiService.updateApiCall.bind(apiService),
    deleteApiCall: apiService.deleteApiCall.bind(apiService),
    testApiCall: apiService.testApiCall.bind(apiService),
    getModelCalls: apiService.getModelCalls.bind(apiService),
    createModelCall: apiService.createModelCall.bind(apiService),
    updateModelCall: apiService.updateModelCall.bind(apiService),
    deleteModelCall: apiService.deleteModelCall.bind(apiService),
    
    // System
    getSystemHealth: apiService.getSystemHealth.bind(apiService),
    getTokenUsage: apiService.getTokenUsage.bind(apiService),
    resetTokenUsage: apiService.resetTokenUsage.bind(apiService),
    healthCheck: apiService.healthCheck.bind(apiService),

    // Admin Management
    getAdmins: apiService.getAdmins.bind(apiService),
    getUsers: apiService.getUsers.bind(apiService),
    createAdmin: apiService.createAdmin.bind(apiService),
    updateAdmin: apiService.updateAdmin.bind(apiService),
    deleteAdmin: apiService.deleteAdmin.bind(apiService),
    validateTelegramId: apiService.validateTelegramId.bind(apiService),

    // Model Calls
    getConditionNodes: apiService.getConditionNodes.bind(apiService),
    createConditionNode: apiService.createConditionNode.bind(apiService),
    updateConditionNode: apiService.updateConditionNode.bind(apiService),
    deleteConditionNode: apiService.deleteConditionNode.bind(apiService),
    getStrategyTriggerNodes: apiService.getStrategyTriggerNodes.bind(apiService),
    createStrategyTriggerNode: apiService.createStrategyTriggerNode.bind(apiService),
    updateStrategyTriggerNode: apiService.updateStrategyTriggerNode.bind(apiService),
    deleteStrategyTriggerNode: apiService.deleteStrategyTriggerNode.bind(apiService),
    getTelegramMessageNodes: apiService.getTelegramMessageNodes.bind(apiService),
    createTelegramMessageNode: apiService.createTelegramMessageNode.bind(apiService),
    updateTelegramMessageNode: apiService.updateTelegramMessageNode.bind(apiService),
    deleteTelegramMessageNode: apiService.deleteTelegramMessageNode.bind(apiService),

    // Settings
    getSettings: apiService.getSettings.bind(apiService),
    getSetting: apiService.getSetting.bind(apiService),
    updateSettings: apiService.updateSettings.bind(apiService),
    updateSetting: apiService.updateSetting.bind(apiService),
    deleteSetting: apiService.deleteSetting.bind(apiService),
    resetAllSettings: apiService.resetAllSettings.bind(apiService)
  };
} 