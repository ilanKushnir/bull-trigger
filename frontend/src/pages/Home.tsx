import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

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

interface SystemStatus {
  database: 'healthy' | 'warning' | 'error';
  telegram: 'connected' | 'disconnected' | 'error';
  openai: 'healthy' | 'warning' | 'error';
  strategies: {
    total: number;
    active: number;
    running: number;
  };
}

interface TokenUsage {
  current: number;
  limit: number;
  percentage: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

interface RecentSignal {
  id: string;
  strategy: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  confidence: number;
  timestamp: Date;
  reactions: {
    thumbsUp: number;
    profit: number;
    loss: number;
  };
}

export default function Home() {
  const [systemStatus] = useState<SystemStatus>({
    database: 'healthy',
    telegram: 'connected',
    openai: 'healthy',
    strategies: { total: 7, active: 5, running: 2 }
  });

  const [tokenUsage] = useState<TokenUsage>({
    current: 75000,
    limit: 100000,
    percentage: 75
  });

  const [alerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'warning',
      title: 'Token Usage Alert',
      message: 'Token usage at 75% - consider monitoring closely',
      timestamp: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
      id: '2',
      type: 'success',
      title: 'Strategy Performance',
      message: 'Signal Hunter strategy showing 85% accuracy this week',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
    },
    {
      id: '3',
      type: 'info',
      title: 'System Update',
      message: 'Successfully processed 142 signals today',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4)
    }
  ]);

  const [recentSignals] = useState<RecentSignal[]>([
    {
      id: '1',
      strategy: 'Signal Hunter',
      type: 'BUY',
      symbol: 'BTC/USDT',
      confidence: 87,
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      reactions: { thumbsUp: 12, profit: 8, loss: 2 }
    },
    {
      id: '2',
      strategy: 'Price Watcher',
      type: 'SELL',
      symbol: 'ETH/USDT',
      confidence: 92,
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      reactions: { thumbsUp: 15, profit: 11, loss: 1 }
    },
    {
      id: '3',
      strategy: 'Volume Spike',
      type: 'BUY',
      symbol: 'ADA/USDT',
      confidence: 78,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      reactions: { thumbsUp: 7, profit: 3, loss: 4 }
    }
  ]);

  const formatNumber = (num: number) => num.toLocaleString();
  
  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <Badge variant="success">Healthy</Badge>;
      case 'warning':
        return <Badge variant="warning">Warning</Badge>;
      case 'error':
      case 'disconnected':
        return <Badge variant="error">Error</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckIcon />;
      case 'warning': return <WarningIcon />;
      case 'error': return <AlertIcon />;
      default: return <InfoIcon />;
    }
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'BUY': return <span style={{ color: '#10B981' }}>📈</span>;
      case 'SELL': return <span style={{ color: '#EF4444' }}>📉</span>;
      default: return <SignalIcon />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-400 mb-2">
          🚀 Dashboard Overview
        </h1>
        <p className="text-gray-400">
          Monitor your crypto signal platform performance and system health
        </p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Database</CardTitle>
            <DatabaseIcon />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusBadge(systemStatus.database)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Telegram Bot</CardTitle>
            <BotIcon />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusBadge(systemStatus.telegram)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">OpenAI API</CardTitle>
            <BrainIcon />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusBadge(systemStatus.openai)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Strategies</CardTitle>
            <ZapIcon />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {systemStatus.strategies.active}/{systemStatus.strategies.total}
            </div>
            <p className="text-xs text-gray-400">
              {systemStatus.strategies.running} currently running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Gauge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center space-x-2">
            <DollarIcon />
            <span>Token Usage This Month</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">
                {formatNumber(tokenUsage.current)} / {formatNumber(tokenUsage.limit)} tokens
              </span>
              <Badge variant={tokenUsage.percentage > 90 ? 'error' : tokenUsage.percentage > 80 ? 'warning' : 'success'}>
                {tokenUsage.percentage}%
              </Badge>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  tokenUsage.percentage > 90 
                    ? 'bg-red-500' 
                    : tokenUsage.percentage > 80 
                    ? 'bg-orange-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(tokenUsage.percentage, 100)}%` }}
              />
            </div>

            {tokenUsage.percentage > 80 && (
              <div className="flex items-center space-x-2 text-orange-400">
                <WarningIcon />
                <span className="text-sm">
                  {tokenUsage.percentage > 90 
                    ? 'Critical: Consider adding more tokens or reducing usage'
                    : 'Warning: Monitor token usage closely'
                  }
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center space-x-2">
              <AlertIcon />
              <span>Latest Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-900 rounded-lg">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-2">{getTimeAgo(alert.timestamp)}</p>
                  </div>
                  <Badge variant={alert.type as any}>{alert.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center space-x-2">
              <SignalIcon />
              <span>Recent Signals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSignals.map((signal) => (
                <div key={signal.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getSignalIcon(signal.type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white">{signal.symbol}</span>
                        <Badge variant={signal.type === 'BUY' ? 'success' : signal.type === 'SELL' ? 'error' : 'info'}>
                          {signal.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">{signal.strategy}</p>
                      <p className="text-xs text-gray-500">{getTimeAgo(signal.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">{signal.confidence}%</div>
                    <div className="text-xs text-gray-400">
                      👍 {signal.reactions.thumbsUp} ✅ {signal.reactions.profit} ❌ {signal.reactions.loss}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 