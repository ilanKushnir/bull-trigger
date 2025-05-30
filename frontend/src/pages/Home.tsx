import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useWebSocket } from '../services/websocketService';

// Icons as simple components
const DatabaseIcon = () => <span>🗄️</span>;
const BotIcon = () => <span>🤖</span>;
const BrainIcon = () => <span>🧠</span>;
const ZapIcon = () => <span>⚡</span>;
const DollarIcon = () => <span>💰</span>;
const AlertIcon = () => <span>🚨</span>;
const SignalIcon = () => <span>📈</span>;
const CheckIcon = () => <span>✅</span>;
const WarningIcon = () => <span>⚠️</span>;
const InfoIcon = () => <span>ℹ️</span>;

interface SystemStats {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  memoryUsage: any;
  activeConnections: number;
  isConnected: boolean;
}

interface TokenData {
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

export default function Home() {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    status: 'healthy',
    uptime: 0,
    memoryUsage: {},
    activeConnections: 0,
    isConnected: false
  });
  
  const [tokenData, setTokenData] = useState<TokenData>({
    used: 15420,
    limit: 100000,
    percentage: 0.1542,
    warning: false,
    panic: false
  });
  
  const [recentSignals, setRecentSignals] = useState<LiveSignal[]>([
    {
      id: '1',
      symbol: 'BTC/USDT',
      signal: 'BUY',
      confidence: 0.85,
      price: 43250,
      timestamp: new Date(Date.now() - 300000),
      strategy: 'Signal Hunter'
    },
    {
      id: '2',
      symbol: 'ETH/USDT',
      signal: 'SELL',
      confidence: 0.72,
      price: 2340,
      timestamp: new Date(Date.now() - 600000),
      strategy: 'Volume Spike'
    }
  ]);
  
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      type: 'info',
      message: 'System started successfully',
      timestamp: new Date(Date.now() - 900000)
    }
  ]);

  const [connectionLatency, setConnectionLatency] = useState<number>(0);
  
  const websocket = useWebSocket();

  useEffect(() => {
    // Connect to WebSocket server
    websocket.connect('http://localhost:3000');
    
    // Subscribe to all relevant channels
    websocket.subscribeToHealth();
    websocket.subscribeToTokens();
    websocket.subscribeToSignals();

    // Set up event listeners
    websocket.on('connection:status', (data: { connected: boolean }) => {
      setSystemStats(prev => ({ ...prev, isConnected: data.connected }));
    });

    websocket.on('health:update', (data: any) => {
      setSystemStats(prev => ({
        ...prev,
        status: data.status,
        uptime: data.uptime,
        memoryUsage: data.memoryUsage,
        activeConnections: data.activeConnections
      }));
    });

    websocket.on('tokens:update', (data: TokenData) => {
      setTokenData(data);
    });

    websocket.on('signal:new', (signal: LiveSignal) => {
      setRecentSignals(prev => [signal, ...prev.slice(0, 4)]);
    });

    websocket.on('signals:recent', (signals: LiveSignal[]) => {
      setRecentSignals(signals.slice(0, 5));
    });

    websocket.on('alert:new', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 4)]);
    });

    websocket.on('latency:update', (data: { latency: number }) => {
      setConnectionLatency(data.latency);
    });

    // Ping every 10 seconds to measure latency
    const pingInterval = setInterval(() => {
      if (websocket.isConnected()) {
        websocket.ping();
      }
    }, 10000);

    return () => {
      clearInterval(pingInterval);
      websocket.off('connection:status');
      websocket.off('health:update');
      websocket.off('tokens:update');
      websocket.off('signal:new');
      websocket.off('signals:recent');
      websocket.off('alert:new');
      websocket.off('latency:update');
    };
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'success';
      case 'SELL': return 'error';
      case 'HOLD': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">
            🏠 Dashboard
          </h1>
          <p className="text-gray-400">
            Real-time system monitoring and crypto signal analytics
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${systemStats.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-400">
              {systemStats.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {connectionLatency > 0 && (
            <span className="text-xs text-gray-500">
              {connectionLatency}ms
            </span>
          )}
          <Button 
            size="sm" 
            onClick={() => websocket.sendTestSignal()}
            variant="outline"
          >
            📡 Test Signal
          </Button>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusColor(systemStats.status) as any}>
                {systemStats.status.toUpperCase()}
              </Badge>
              <span className="text-2xl font-bold text-white">
                {systemStats.isConnected ? '🟢' : '🔴'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Uptime: {formatUptime(systemStats.uptime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatMemory(systemStats.memoryUsage.heapUsed || 0)}
            </div>
            <p className="text-xs text-gray-500">
              / {formatMemory(systemStats.memoryUsage.heapTotal || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Active Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {systemStats.activeConnections}
            </div>
            <p className="text-xs text-gray-500">WebSocket clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Signals Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {recentSignals.length}
            </div>
            <p className="text-xs text-gray-500">Recent signals</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage Gauge */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center space-x-2">
              <span>🪙</span>
              <span>Token Usage</span>
              {tokenData.warning && <Badge variant="warning">Warning</Badge>}
              {tokenData.panic && <Badge variant="error">Critical</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={tokenData.panic ? "#EF4444" : tokenData.warning ? "#F59E0B" : "#10B981"}
                  strokeWidth="3"
                  strokeDasharray={`${tokenData.percentage * 100}, 100`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {Math.round(tokenData.percentage * 100)}%
                </span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-white">
                {tokenData.used.toLocaleString()} / {tokenData.limit.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">tokens used this month</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center space-x-2">
              <span>📈</span>
              <span>Live Signals</span>
              <Badge variant="info">Real-time</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSignals.map((signal) => (
                <div key={signal.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <div className="flex items-center space-x-3">
                    <Badge variant={getSignalColor(signal.signal) as any}>
                      {signal.signal}
                    </Badge>
                    <div>
                      <p className="text-white font-medium">{signal.symbol}</p>
                      <p className="text-xs text-gray-500">{signal.strategy}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white">${signal.price.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      {Math.round(signal.confidence * 100)}% confidence
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center space-x-2">
            <span>🚨</span>
            <span>System Alerts</span>
            <Badge variant="info">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-800 rounded">
                <Badge variant={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}>
                  {alert.type.toUpperCase()}
                </Badge>
                <span className="text-white flex-1">{alert.message}</span>
                <span className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 