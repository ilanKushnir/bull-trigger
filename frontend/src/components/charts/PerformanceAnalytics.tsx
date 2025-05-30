import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import TradingChart from './TradingChart';

interface PerformanceData {
  signals: Array<{
    id: string;
    symbol: string;
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    timestamp: Date;
    strategy: string;
    pnl?: number;
    status?: 'active' | 'closed' | 'expired';
  }>;
  strategies: Array<{
    id: number;
    name: string;
    enabled: boolean;
    success_rate?: number;
    total_runs?: number;
  }>;
}

interface PerformanceAnalyticsProps {
  data: PerformanceData;
}

export default function PerformanceAnalytics({ data }: PerformanceAnalyticsProps) {
  // Calculate analytics data
  const analytics = useMemo(() => {
    const { signals, strategies } = data;
    
    // Signal distribution by type
    const signalDistribution = [
      { name: 'BUY', value: signals.filter(s => s.signal === 'BUY').length },
      { name: 'SELL', value: signals.filter(s => s.signal === 'SELL').length },
      { name: 'HOLD', value: signals.filter(s => s.signal === 'HOLD').length }
    ];
    
    // Strategy performance
    const strategyPerformance = strategies.map(strategy => ({
      name: strategy.name,
      value: strategy.success_rate || 0,
      runs: strategy.total_runs || 0
    }));
    
    // Daily signal volume (last 7 days)
    const now = new Date();
    const dailyVolume = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      const daySignals = signals.filter(signal => {
        const signalDate = new Date(signal.timestamp);
        return signalDate.toDateString() === date.toDateString();
      });
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: daySignals.length,
        buy: daySignals.filter(s => s.signal === 'BUY').length,
        sell: daySignals.filter(s => s.signal === 'SELL').length,
        hold: daySignals.filter(s => s.signal === 'HOLD').length
      };
    });
    
    // P&L over time (for closed signals)
    const closedSignals = signals.filter(s => s.status === 'closed' && s.pnl !== undefined);
    let cumulativePnL = 0;
    const pnlData = closedSignals.map((signal, index) => {
      cumulativePnL += signal.pnl || 0;
      return {
        name: `Trade ${index + 1}`,
        value: cumulativePnL,
        individual: signal.pnl || 0
      };
    });
    
    // Win/Loss ratio
    const wins = closedSignals.filter(s => (s.pnl || 0) > 0).length;
    const losses = closedSignals.filter(s => (s.pnl || 0) <= 0).length;
    const winRate = closedSignals.length > 0 ? (wins / closedSignals.length) * 100 : 0;
    
    // Strategy signal distribution
    const strategySignals = strategies.map(strategy => {
      const strategySignalCount = signals.filter(s => s.strategy === strategy.name).length;
      return {
        name: strategy.name,
        value: strategySignalCount
      };
    });
    
    return {
      signalDistribution,
      strategyPerformance,
      dailyVolume,
      pnlData,
      winRate,
      totalSignals: signals.length,
      activeStrategies: strategies.filter(s => s.enabled).length,
      avgConfidence: signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length || 0,
      strategySignals
    };
  }, [data]);

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatPnL = (pnl: number) => {
    const isPositive = pnl >= 0;
    return (
      <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
        {isPositive ? '+' : ''}{pnl.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-green-500">
                  {analytics.winRate.toFixed(1)}%
                </p>
              </div>
              <span className="text-2xl">🎯</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Signals</p>
                <p className="text-2xl font-bold text-white">
                  {formatNumber(analytics.totalSignals)}
                </p>
              </div>
              <span className="text-2xl">📈</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Strategies</p>
                <p className="text-2xl font-bold text-blue-400">
                  {analytics.activeStrategies}
                </p>
              </div>
              <span className="text-2xl">⚙️</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Confidence</p>
                <p className="text-2xl font-bold text-purple-400">
                  {analytics.avgConfidence.toFixed(1)}%
                </p>
              </div>
              <span className="text-2xl">🧠</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signal Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Signal Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <TradingChart
              data={analytics.signalDistribution}
              type="pie"
              height={250}
              colors={['#10B981', '#EF4444', '#F59E0B']}
              showLegend={false}
            />
          </CardContent>
        </Card>

        {/* Daily Signal Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Daily Signal Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <TradingChart
              data={analytics.dailyVolume}
              type="bar"
              height={250}
              colors={['#3B82F6']}
            />
          </CardContent>
        </Card>

        {/* Strategy Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Strategy Success Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <TradingChart
              data={analytics.strategyPerformance}
              type="bar"
              height={250}
              colors={['#10B981']}
            />
          </CardContent>
        </Card>

        {/* Cumulative P&L */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Cumulative P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <TradingChart
              data={analytics.pnlData}
              type="area"
              height={250}
              colors={['#8B5CF6']}
            />
          </CardContent>
        </Card>
      </div>

      {/* Strategy Signal Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-white">Strategy Signal Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <TradingChart
            data={analytics.strategySignals}
            type="bar"
            height={300}
            colors={['#06B6D4']}
          />
        </CardContent>
      </Card>

      {/* Performance Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-white">Strategy Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-300">Strategy</th>
                  <th className="text-left p-3 font-medium text-gray-300">Status</th>
                  <th className="text-left p-3 font-medium text-gray-300">Success Rate</th>
                  <th className="text-left p-3 font-medium text-gray-300">Total Runs</th>
                  <th className="text-left p-3 font-medium text-gray-300">Signals Generated</th>
                </tr>
              </thead>
              <tbody>
                {data.strategies.map((strategy) => {
                  const strategySignalCount = data.signals.filter(s => s.strategy === strategy.name).length;
                  return (
                    <tr key={strategy.id} className="border-b border-gray-700">
                      <td className="p-3 text-white">{strategy.name}</td>
                      <td className="p-3">
                        <Badge variant={strategy.enabled ? 'success' : 'default'}>
                          {strategy.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="p-3 text-white">
                        {strategy.success_rate ? `${strategy.success_rate}%` : '—'}
                      </td>
                      <td className="p-3 text-white">
                        {strategy.total_runs ? formatNumber(strategy.total_runs) : '—'}
                      </td>
                      <td className="p-3 text-white">{strategySignalCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 