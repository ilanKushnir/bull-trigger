import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import Database from 'better-sqlite3';

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

export class WebSocketService {
  private io: SocketIOServer;
  private db: Database.Database;
  private activeConnections = 0;
  private healthCheckInterval?: NodeJS.Timeout;
  private tokenUsageInterval?: NodeJS.Timeout;

  constructor(server: HttpServer, db: Database.Database) {
    this.db = db;
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'development' 
          ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] 
          : false,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startHealthChecks();
    this.startTokenUsageUpdates();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.activeConnections++;
      console.log(`🔌 WebSocket client connected. Active connections: ${this.activeConnections}`);

      // Send initial data
      this.sendSystemHealth(socket);
      this.sendTokenUsage(socket);
      this.sendRecentSignals(socket);

      // Handle client subscriptions
      socket.on('subscribe:signals', () => {
        socket.join('signals');
        console.log('📈 Client subscribed to signals');
      });

      socket.on('subscribe:health', () => {
        socket.join('health');
        console.log('💚 Client subscribed to health updates');
      });

      socket.on('subscribe:tokens', () => {
        socket.join('tokens');
        console.log('🪙 Client subscribed to token usage');
      });

      socket.on('subscribe:strategies', () => {
        socket.join('strategies');
        console.log('⚙️ Client subscribed to strategy updates');
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.activeConnections--;
        console.log(`🔌 WebSocket client disconnected. Active connections: ${this.activeConnections}`);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      const health = this.getSystemHealth();
      this.io.to('health').emit('health:update', health);
    }, 5000); // Every 5 seconds
  }

  private startTokenUsageUpdates() {
    this.tokenUsageInterval = setInterval(() => {
      const tokenUsage = this.getTokenUsage();
      this.io.to('tokens').emit('tokens:update', tokenUsage);
    }, 10000); // Every 10 seconds
  }

  private getSystemHealth(): SystemHealth {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Get last signal from database
    const lastSignalRow = this.db.prepare(`
      SELECT created_at FROM signals 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get() as { created_at: string } | undefined;

    const lastSignal = lastSignalRow ? new Date(lastSignalRow.created_at) : undefined;
    
    // Determine health status
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
      status = 'error';
    } else if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.7) {
      status = 'warning';
    }

    return {
      status,
      uptime,
      memoryUsage,
      activeConnections: this.activeConnections,
      lastSignal
    };
  }

  private getTokenUsage(): TokenUsage {
    const tokenLimit = Number((this.db.prepare('SELECT value FROM settings WHERE key = "TOKEN_LIMIT"').get() as { value: string } | undefined)?.value || 100000);
    const tokenUsed = Number((this.db.prepare('SELECT value FROM settings WHERE key = "TOKEN_USED"').get() as { value: string } | undefined)?.value || 0);
    const tokenWarn = Number((this.db.prepare('SELECT value FROM settings WHERE key = "TOKEN_WARN"').get() as { value: string } | undefined)?.value || 0.8);
    const tokenPanic = Number((this.db.prepare('SELECT value FROM settings WHERE key = "TOKEN_PANIC"').get() as { value: string } | undefined)?.value || 0.95);

    const percentage = tokenUsed / tokenLimit;

    return {
      used: tokenUsed,
      limit: tokenLimit,
      percentage,
      warning: percentage >= tokenWarn,
      panic: percentage >= tokenPanic
    };
  }

  private sendSystemHealth(socket: any) {
    const health = this.getSystemHealth();
    socket.emit('health:update', health);
  }

  private sendTokenUsage(socket: any) {
    const tokenUsage = this.getTokenUsage();
    socket.emit('tokens:update', tokenUsage);
  }

  private sendRecentSignals(socket: any) {
    try {
      const signals = this.db.prepare(`
        SELECT * FROM signals 
        ORDER BY created_at DESC 
        LIMIT 10
      `).all();
      
      socket.emit('signals:recent', signals);
    } catch (error) {
      console.error('Error fetching recent signals:', error);
      socket.emit('signals:recent', []);
    }
  }

  // Public methods for broadcasting events
  public broadcastSignal(signal: LiveSignal) {
    console.log('📈 Broadcasting new signal:', signal.symbol, signal.signal);
    this.io.to('signals').emit('signal:new', signal);
  }

  public broadcastStrategyUpdate(strategyId: number, data: any) {
    console.log('⚙️ Broadcasting strategy update:', strategyId);
    this.io.to('strategies').emit('strategy:update', { strategyId, data });
  }

  public broadcastAlert(alert: { type: 'info' | 'warning' | 'error'; message: string; timestamp: Date }) {
    console.log('🚨 Broadcasting alert:', alert.type, alert.message);
    this.io.emit('alert:new', alert);
  }

  public broadcastTokenUpdate() {
    const tokenUsage = this.getTokenUsage();
    this.io.to('tokens').emit('tokens:update', tokenUsage);
  }

  public getActiveConnections(): number {
    return this.activeConnections;
  }

  public shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.tokenUsageInterval) {
      clearInterval(this.tokenUsageInterval);
    }
    this.io.close();
    console.log('🔌 WebSocket service shutdown');
  }
}

export let websocketService: WebSocketService | null = null;

export function initializeWebSocketService(server: HttpServer, db: Database.Database) {
  websocketService = new WebSocketService(server, db);
  return websocketService;
} 