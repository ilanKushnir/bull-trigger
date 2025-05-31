import Database from 'better-sqlite3';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getTokenUsage } from '../utils/settings';

interface SystemHealth {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: number;
  activeConnections: number;
}

interface TokenUsageData {
  used: number;
  limit: number;
  percentage: number;
  warnThreshold: number;
  panicThreshold: number;
}

class WebSocketService {
  private io: SocketIOServer;
  private db: Database.Database;
  private activeConnections = 0;
  private healthCheckInterval?: NodeJS.Timeout;
  private tokenUsageInterval?: NodeJS.Timeout;

  constructor(server: HttpServer, db: Database.Database) {
    this.db = db;
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
    this.startHealthChecks();
    this.startTokenUsageUpdates();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.activeConnections++;
      console.log(`🔌 WebSocket connected. Active: ${this.activeConnections}`);

      // Send initial data
      this.sendSystemHealth(socket);
      this.sendTokenUsage(socket);
      this.sendRecentSignals(socket);

      // Handle client subscriptions
      socket.on('subscribe:signals', () => {
        socket.join('signals');
      });

      socket.on('subscribe:health', () => {
        socket.join('health');
      });

      socket.on('subscribe:tokens', () => {
        socket.join('tokens');
      });

      socket.on('subscribe:strategies', () => {
        socket.join('strategies');
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.activeConnections--;
        console.log(`🔌 WebSocket disconnected. Active: ${this.activeConnections}`);
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
    }, 30000); // Every 30 seconds
  }

  private startTokenUsageUpdates() {
    this.tokenUsageInterval = setInterval(() => {
      const tokenUsage = this.getTokenUsage();
      this.io.to('tokens').emit('tokens:update', tokenUsage);
    }, 60000); // Every minute
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
        SELECT * FROM messages 
        WHERE sent_at > datetime('now', '-1 day') 
        ORDER BY sent_at DESC 
        LIMIT 10
      `).all();
      
      socket.emit('signals:recent', signals);
    } catch (error) {
      console.error('Error fetching recent signals:', error);
      socket.emit('signals:recent', []);
    }
  }

  private getSystemHealth(): SystemHealth {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
      activeConnections: this.activeConnections
    };
  }

  private getTokenUsage(): TokenUsageData {
    try {
      const tokenInfo = getTokenUsage();
      
      return {
        used: tokenInfo.used,
        limit: tokenInfo.limit,
        percentage: tokenInfo.percentage,
        warnThreshold: tokenInfo.warnThreshold * 100,
        panicThreshold: tokenInfo.panicThreshold * 100
      };
    } catch (error) {
      console.error('Error getting token usage:', error);
      return {
        used: 0,
        limit: 100000,
        percentage: 0,
        warnThreshold: 80,
        panicThreshold: 95
      };
    }
  }

  // Public methods for external services to broadcast updates
  public broadcastSignalUpdate(signal: any) {
    this.io.to('signals').emit('signals:new', signal);
  }

  public broadcastStrategyUpdate(strategy: any) {
    this.io.to('strategies').emit('strategy:update', strategy);
  }

  public broadcastHealthUpdate() {
    const health = this.getSystemHealth();
    this.io.to('health').emit('health:update', health);
  }

  public broadcastTokenUsage() {
    const tokenUsage = this.getTokenUsage();
    this.io.to('tokens').emit('tokens:update', tokenUsage);
  }

  public close() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.tokenUsageInterval) {
      clearInterval(this.tokenUsageInterval);
    }
    this.io.close();
  }
}

// Singleton instance
let webSocketService: WebSocketService | null = null;

export function initializeWebSocketService(server: HttpServer, db: Database.Database): WebSocketService {
  if (!webSocketService) {
    webSocketService = new WebSocketService(server, db);
  }
  return webSocketService;
}

export function getWebSocketService(): WebSocketService | null {
  return webSocketService;
} 