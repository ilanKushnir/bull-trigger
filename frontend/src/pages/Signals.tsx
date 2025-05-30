import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

// Icons as simple components
const SignalIcon = () => <span>📈</span>;
const BuyIcon = () => <span style={{ color: '#10B981' }}>📈</span>;
const SellIcon = () => <span style={{ color: '#EF4444' }}>📉</span>;
const HoldIcon = () => <span style={{ color: '#3B82F6' }}>⏸️</span>;
const SearchIcon = () => <span>🔍</span>;
const FilterIcon = () => <span>🔽</span>;
const RefreshIcon = () => <span>🔄</span>;
const DownloadIcon = () => <span>💾</span>;
const ActivityIcon = () => <span>⚡</span>;
const EyeIcon = () => <span>👁️</span>;

interface Signal {
  id: string;
  strategy: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  confidence: number;
  timestamp: Date;
  status: 'active' | 'closed' | 'expired';
  entry_price?: number;
  current_price?: number;
  pnl?: number;
  reactions: {
    thumbsUp: number;
    profit: number;
    loss: number;
  };
  message: string;
}

export default function Signals() {
  const [signals] = useState<Signal[]>([
    {
      id: '1',
      strategy: 'Signal Hunter',
      type: 'BUY',
      symbol: 'BTC/USDT',
      confidence: 87,
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      status: 'active',
      entry_price: 43250,
      current_price: 43450,
      pnl: 0.46,
      reactions: { thumbsUp: 12, profit: 8, loss: 2 },
      message: '🚀 Strong bullish momentum detected. RSI oversold, MACD crossover confirmed.'
    },
    {
      id: '2',
      strategy: 'Price Watcher',
      type: 'SELL',
      symbol: 'ETH/USDT',
      confidence: 92,
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      status: 'closed',
      entry_price: 2650,
      current_price: 2590,
      pnl: -2.26,
      reactions: { thumbsUp: 15, profit: 11, loss: 1 },
      message: '⚠️ Resistance level hit, volume declining. Take profits here.'
    },
    {
      id: '3',
      strategy: 'Volume Spike',
      type: 'BUY',
      symbol: 'ADA/USDT',
      confidence: 78,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: 'active',
      entry_price: 0.465,
      current_price: 0.472,
      pnl: 1.51,
      reactions: { thumbsUp: 7, profit: 3, loss: 4 },
      message: '📈 Unusual volume spike detected. Breaking resistance at 0.460.'
    },
    {
      id: '4',
      strategy: 'Fear-Greed',
      type: 'HOLD',
      symbol: 'SOL/USDT',
      confidence: 65,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
      status: 'expired',
      reactions: { thumbsUp: 4, profit: 2, loss: 2 },
      message: '😐 Mixed signals. Fear & Greed at 45. Wait for clearer direction.'
    },
    {
      id: '5',
      strategy: 'Signal Hunter',
      type: 'SELL',
      symbol: 'DOT/USDT',
      confidence: 89,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
      status: 'closed',
      entry_price: 7.25,
      current_price: 6.95,
      pnl: 4.14,
      reactions: { thumbsUp: 18, profit: 14, loss: 2 },
      message: '🎯 Perfect execution! Double top pattern confirmed, strong sell signal.'
    }
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'BUY': return <BuyIcon />;
      case 'SELL': return <SellIcon />;
      default: return <HoldIcon />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'closed':
        return <Badge variant="default">Closed</Badge>;
      case 'expired':
        return <Badge variant="warning">Expired</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getPnLDisplay = (signal: Signal) => {
    if (!signal.pnl) return '—';
    const isPositive = signal.pnl > 0;
    return (
      <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
        {isPositive ? '+' : ''}{signal.pnl.toFixed(2)}%
      </span>
    );
  };

  const filteredSignals = signals.filter(signal => {
    const matchesSearch = signal.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         signal.strategy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || signal.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSignals = filteredSignals.slice(startIndex, startIndex + itemsPerPage);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">
            📈 Trading Signals
          </h1>
          <p className="text-gray-400">
            Monitor and analyze all generated trading signals
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshIcon /> {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline">
            <DownloadIcon /> Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Signals</p>
                <p className="text-2xl font-bold text-white">{signals.length}</p>
              </div>
              <ActivityIcon />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-500">
                  {signals.filter(s => s.status === 'active').length}
                </p>
              </div>
              <BuyIcon />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Closed</p>
                <p className="text-2xl font-bold text-gray-300">
                  {signals.filter(s => s.status === 'closed').length}
                </p>
              </div>
              <SellIcon />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-green-500">73%</p>
              </div>
              <BuyIcon />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Search by symbol or strategy..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FilterIcon />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-white">
            Signals ({filteredSignals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-300">Signal</th>
                  <th className="text-left p-4 font-medium text-gray-300">Strategy</th>
                  <th className="text-left p-4 font-medium text-gray-300">Time</th>
                  <th className="text-left p-4 font-medium text-gray-300">Status</th>
                  <th className="text-left p-4 font-medium text-gray-300">P&L</th>
                  <th className="text-left p-4 font-medium text-gray-300">Reactions</th>
                  <th className="text-left p-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSignals.map((signal) => (
                  <tr key={signal.id} className="border-b border-gray-700 hover:bg-gray-900 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {getSignalIcon(signal.type)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white">{signal.symbol}</span>
                            <Badge variant={
                              signal.type === 'BUY' ? 'success' :
                              signal.type === 'SELL' ? 'error' :
                              'info'
                            }>
                              {signal.type}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-400">
                            Confidence: {signal.confidence}%
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-300">{signal.strategy}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-300">{getTimeAgo(signal.timestamp)}</span>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(signal.status)}
                    </td>
                    <td className="p-4">
                      {getPnLDisplay(signal)}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-400">
                        👍 {signal.reactions.thumbsUp} ✅ {signal.reactions.profit} ❌ {signal.reactions.loss}
                      </div>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">
                        <EyeIcon />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSignals.length)} of {filteredSignals.length} signals
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </Button>
          <span className="text-sm text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
} 