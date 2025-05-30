import { io, Socket } from 'socket.io-client';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeConnections: number;
  lastSignal?: Date;
}

interface TokenUsage {
  used: number;
  limit: number;
  percentage: number;
  warning: boolean;
  panic: boolean;
}

interface LiveSignal {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: Date;
  strategy: string;
}

interface Alert {
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

type EventCallback = (data: any) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, EventCallback[]> = new Map();

  public connect(url: string = 'http://localhost:3000'): void {
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

    fetch('http://localhost:3000/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSignal)
    }).catch(console.error);
  }
}

// Export a singleton instance
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