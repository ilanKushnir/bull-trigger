import { useEffect, useState } from 'react';
import PriceChart from '../components/charts/PriceChart';
import TradingChart from '../components/charts/TradingChart';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, LiveSignal, SystemHealth, TokenUsage, useApi, useWebSocket } from '../services/websocketService';

// Icons as simple components
const DatabaseIcon = () => <span className="text-lg">🗄️</span>;
const BotIcon = () => <span className="text-lg">🤖</span>;
const BrainIcon = () => <span className="text-lg">🧠</span>;
const ZapIcon = () => <span className="text-lg">⚡</span>;
const DollarIcon = () => <span className="text-lg">💰</span>;
const AlertIcon = () => <span className="text-lg">🚨</span>;
const SignalIcon = () => <span className="text-lg">📈</span>;
const CheckIcon = () => <span className="text-sm">✅</span>;
const WarningIcon = () => <span className="text-lg">⚠️</span>;
const InfoIcon = () => <span className="text-lg">ℹ️</span>;

interface SystemStats extends SystemHealth {
  isConnected: boolean;
}

export default function Home() {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [tokenData, setTokenData] = useState<TokenUsage | null>(null);
  const [recentSignals, setRecentSignals] = useState<LiveSignal[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionLatency, setConnectionLatency] = useState<number>(0);
  
  const websocket = useWebSocket();
  const api = useApi();

  // Generate sample data for charts
  const generateChartData = () => {
    // Token usage over time (last 7 days)
    const tokenUsageData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: Math.floor(Math.random() * 5000) + 10000 + (i * 2000)
      };
    });

    // Signal performance data
    const signalPerformanceData = [
      { name: 'BUY', value: recentSignals.filter(s => s.signal === 'BUY').length },
      { name: 'SELL', value: recentSignals.filter(s => s.signal === 'SELL').length },
      { name: 'HOLD', value: recentSignals.filter(s => s.signal === 'HOLD').length }
    ];

    // Price data for BTC (sample)
    const priceData = Array.from({ length: 24 }, (_, i) => {
      const basePrice = 43250;
      const variation = (Math.random() - 0.5) * 2000;
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - (23 - i));
      
      const randomSignal = Math.random();
      let signal: 'BUY' | 'SELL' | 'HOLD' | undefined = undefined;
      if (randomSignal > 0.8) {
        signal = randomSignal > 0.9 ? 'BUY' : 'SELL';
      }
      
      return {
        timestamp: timestamp.toISOString(),
        price: Math.floor(basePrice + variation + (i * 10)),
        volume: Math.floor(Math.random() * 1000000) + 500000,
        signal
      };
    });

    return { tokenUsageData, signalPerformanceData, priceData };
  };

  const { tokenUsageData, signalPerformanceData, priceData } = generateChartData();

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      
      // Fetch initial data from API
      const [healthResult, tokenResult, signalsResult] = await Promise.all([
        api.getSystemHealth(),
        api.getTokenUsage(),
        api.getSignals(5)
      ]);

      if (healthResult.success && healthResult.data) {
        setSystemStats({ ...healthResult.data, isConnected: false });
      }

      if (tokenResult.success && tokenResult.data) {
        setTokenData(tokenResult.data);
      }

      if (signalsResult.success && signalsResult.data) {
        // Convert API signals to LiveSignal format
        const liveSignals: LiveSignal[] = signalsResult.data.map(signal => ({
          id: signal.id,
          symbol: signal.symbol,
          signal: signal.signal,
          confidence: signal.confidence / 100, // Convert percentage to decimal if needed
          price: signal.price,
          timestamp: new Date(signal.created_at),
          strategy: signal.strategy
        }));
        setRecentSignals(liveSignals);
      }

      setLoading(false);
    };

    // Initialize WebSocket connection
    websocket.connect('http://localhost:3000');
    websocket.subscribeToHealth();
    websocket.subscribeToTokens();
    websocket.subscribeToSignals();

    // Set up WebSocket event listeners for real-time updates
    websocket.on('connection:status', (data: { connected: boolean }) => {
      setSystemStats(prev => prev ? { ...prev, isConnected: data.connected } : null);
    });

    websocket.on('health:update', (data: SystemHealth) => {
      setSystemStats(prev => ({ ...data, isConnected: prev?.isConnected || false }));
    });

    websocket.on('tokens:update', (data: TokenUsage) => {
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

    // Initialize data
    initializeData();

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

  const handleTokenReset = async () => {
    const result = await api.resetTokenUsage();
    if (result.success) {
      // The WebSocket will automatically update the token data
      setAlerts(prev => [{
        type: 'info',
        message: 'Token usage counter reset successfully',
        timestamp: new Date()
      }, ...prev.slice(0, 4)]);
    } else {
      setAlerts(prev => [{
        type: 'error',
        message: result.error || 'Failed to reset token usage',
        timestamp: new Date()
      }, ...prev.slice(0, 4)]);
    }
  };

  const handleTestSignal = () => {
    websocket.sendTestSignal();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-blue-400">Loading dashboard data...</div>
      </div>
    );
  }

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
            <div className={`w-3 h-3 rounded-full ${systemStats?.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-400">
              {systemStats?.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {connectionLatency > 0 && (
            <span className="text-xs text-gray-500">
              {connectionLatency}ms
            </span>
          )}
          <Button 
            size="sm" 
            onClick={handleTestSignal}
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
              <Badge variant={getStatusColor(systemStats?.status || 'healthy') as any}>
                {systemStats?.status?.toUpperCase() || 'HEALTHY'}
              </Badge>
              <span className="text-2xl font-bold text-white">
                {systemStats?.isConnected ? '🟢' : '🔴'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Uptime: {formatUptime(systemStats?.uptime || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatMemory(systemStats?.memoryUsage?.heapUsed || 0)}
            </div>
            <p className="text-xs text-gray-500">
              / {formatMemory(systemStats?.memoryUsage?.heapTotal || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Active Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {systemStats?.activeConnections || 0}
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
              {tokenData?.warning && <Badge variant="warning">Warning</Badge>}
              {tokenData?.panic && <Badge variant="error">Critical</Badge>}
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
                  stroke={tokenData?.panic ? "#EF4444" : tokenData?.warning ? "#F59E0B" : "#10B981"}
                  strokeWidth="3"
                  strokeDasharray={`${(tokenData?.percentage || 0) * 100}, 100`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {Math.round((tokenData?.percentage || 0) * 100)}%
                </span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-white">
                {tokenData?.used.toLocaleString() || '0'} / {tokenData?.limit.toLocaleString() || '0'}
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
                  {alert.type?.toUpperCase() || 'INFO'}
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

      {/* Charts and Analytics Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-blue-400 flex items-center space-x-2">
          <span>📊</span>
          <span>Analytics Dashboard</span>
        </h2>

        {/* Price Chart */}
        <PriceChart
          symbol="BTC/USDT"
          data={priceData}
          height={400}
          showSignals={true}
          timeframe="1h"
        />

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Token Usage Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-white">Token Usage Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TradingChart
                data={tokenUsageData}
                type="area"
                height={250}
                colors={['#3B82F6']}
                title=""
                showLegend={false}
              />
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-400">Daily token consumption over the last week</p>
              </div>
            </CardContent>
          </Card>

          {/* Signal Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-white">Signal Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <TradingChart
                data={signalPerformanceData}
                type="pie"
                height={250}
                colors={['#10B981', '#EF4444', '#F59E0B']}
                title=""
                showLegend={false}
              />
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-400">BUY Signals</p>
                  <p className="text-lg font-bold text-green-500">
                    {signalPerformanceData.find(s => s.name === 'BUY')?.value || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">SELL Signals</p>
                  <p className="text-lg font-bold text-red-500">
                    {signalPerformanceData.find(s => s.name === 'SELL')?.value || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">HOLD Signals</p>
                  <p className="text-lg font-bold text-yellow-500">
                    {signalPerformanceData.find(s => s.name === 'HOLD')?.value || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Market Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">Today's Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Signals Generated</span>
                  <span className="text-white font-bold">{recentSignals.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Strategies Active</span>
                  <span className="text-green-500 font-bold">7/7</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Success Rate</span>
                  <span className="text-blue-400 font-bold">78%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">API Latency</span>
                  <span className="text-white font-bold">{connectionLatency}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">WebSocket</span>
                  <Badge variant={systemStats?.isConnected ? 'success' : 'error'}>
                    {systemStats?.isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Memory Usage</span>
                  <span className="text-white font-bold">
                    {formatMemory(systemStats?.memoryUsage?.heapUsed || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-gray-400">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleTestSignal}
                >
                  📡 Send Test Signal
                </Button>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleTokenReset}
                >
                  🔄 Reset Token Counter
                </Button>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  📊 View Full Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 