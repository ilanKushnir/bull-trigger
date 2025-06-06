import React, { useEffect, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Signal, useApi } from '../services/websocketService';

// Icons as simple components
const SignalIcon = () => <span className="text-lg">📈</span>;
const BuyIcon = () => <span className="text-lg" style={{ color: '#10B981' }}>📈</span>;
const SellIcon = () => <span className="text-lg" style={{ color: '#EF4444' }}>📉</span>;
const SearchIcon = () => <span className="text-sm">🔍</span>;
const FilterIcon = () => <span className="text-sm">🔽</span>;
const RefreshIcon = () => <span className="text-sm">🔄</span>;
const DownloadIcon = () => <span className="text-sm">💾</span>;
const ActivityIcon = () => <span className="text-lg">⚡</span>;
const DeleteIcon = () => <span className="text-sm">🗑️</span>;
const PlusIcon = () => <span className="text-sm">➕</span>;

export default function Signals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const api = useApi();

  const fetchSignals = async () => {
    setLoading(true);
    try {
      // Get signals with filters
      const filtersToApply: any = {};
      
      if (filterStatus !== 'all') filtersToApply.status = filterStatus;
      if (filterType !== 'all') filtersToApply.signalType = filterType;
      filtersToApply.limit = 100;

      const result = await api.getSignals(filtersToApply);
      
      if (result.success && result.data) {
        const signalsData = Array.isArray(result.data) ? result.data : [];
        setSignals(signalsData);
      } else {
        console.error('Failed to fetch signals:', result.error);
        setSignals([]);
      }

      // Get stats
      const statsResult = await api.getSignalStats();
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      setSignals([]);
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [filterStatus, filterType]);

  const handleRefresh = () => {
    fetchSignals();
  };

  const handleDeleteSignal = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this signal?')) {
      const result = await api.deleteSignal(id);
      if (result.success) {
        setSignals(signals.filter(s => s.id !== id));
        fetchSignals(); // Refresh stats
      } else {
        alert('Failed to delete signal');
      }
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    const result = await api.updateSignal(id, { status: status as any });
    if (result.success) {
      setSignals(signals.map(s => s.id === id ? { ...s, status: status as any } : s));
      fetchSignals(); // Refresh to update stats
    } else {
      alert('Failed to update signal status');
    }
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getSignalIcon = (type: string) => {
    return type === 'LONG' ? <BuyIcon /> : <SellIcon />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'closed':
        return <Badge variant="default">Closed</Badge>;
      case 'cancelled':
        return <Badge variant="warning">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'Low':
        return <Badge variant="success">🟢 Low</Badge>;
      case 'Medium':
        return <Badge variant="warning">🟡 Medium</Badge>;
      case 'High':
        return <Badge variant="error">🔴 High</Badge>;
      default:
        return <Badge variant="default">{risk}</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString()}`;
  };

  const safeSignals = Array.isArray(signals) ? signals : [];
  const filteredSignals = safeSignals.filter(signal => {
    if (!signal || !signal.symbol || !signal.strategyName) return false;
    const matchesSearch = signal.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         signal.strategyName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSignals = filteredSignals.slice(startIndex, startIndex + itemsPerPage);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-blue-400">Loading signals data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">
            📈 Trading Signals
          </h1>
          <p className="text-gray-400">
            Monitor and manage all trading signals
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-1"
          >
            <PlusIcon />
            <span>Create Signal</span>
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center space-x-1">
            <RefreshIcon />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-1">
            <DownloadIcon />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Signals</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
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
                  <p className="text-2xl font-bold text-green-500">{stats.active}</p>
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
                  <p className="text-2xl font-bold text-gray-300">{stats.closed}</p>
                </div>
                <SellIcon />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">LONG/SHORT</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {stats.byType?.LONG || 0}/{stats.byType?.SHORT || 0}
                  </p>
                </div>
                <SignalIcon />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
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
          {paginatedSignals.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium mb-2">No signals found</h3>
              <p>Create your first trading signal to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-300">Signal</th>
                    <th className="text-left p-4 font-medium text-gray-300">Entry/SL</th>
                    <th className="text-left p-4 font-medium text-gray-300">Targets</th>
                    <th className="text-left p-4 font-medium text-gray-300">Strategy</th>
                    <th className="text-left p-4 font-medium text-gray-300">Time</th>
                    <th className="text-left p-4 font-medium text-gray-300">Status</th>
                    <th className="text-left p-4 font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSignals.map((signal) => (
                    <tr key={signal.id} className="border-b border-gray-700 hover:bg-gray-900 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          {getSignalIcon(signal.signalType)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-white">{signal.symbol}</span>
                              <Badge variant={signal.signalType === 'LONG' ? 'success' : 'error'}>
                                {signal.signalType}
                              </Badge>
                              {getRiskBadge(signal.riskLevel)}
                            </div>
                            <div className="text-xs text-gray-400">
                              Confidence: {signal.confidence}% | {signal.leverage}x leverage
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="text-white">
                            Entry: {formatPrice(signal.entryPriceMin)}
                            {signal.entryPriceMin !== signal.entryPriceMax && ` - ${formatPrice(signal.entryPriceMax)}`}
                          </div>
                          <div className="text-red-400">SL: {formatPrice(signal.stopLoss)}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-green-400">
                          {signal.tp1 && <div>TP1: {formatPrice(signal.tp1)}</div>}
                          {signal.tp2 && <div>TP2: {formatPrice(signal.tp2)}</div>}
                          {signal.tp3 && <div>TP3: {formatPrice(signal.tp3)}</div>}
                          {!signal.tp1 && !signal.tp2 && !signal.tp3 && <span className="text-gray-500">No targets</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300">{signal.strategyName}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300">{getTimeAgo(signal.createdAt)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col space-y-1">
                          {getStatusBadge(signal.status)}
                          {signal.signalTag && (
                            <span className="text-xs text-blue-400">{signal.signalTag}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <select
                            value={signal.status}
                            onChange={(e) => handleUpdateStatus(signal.id!, e.target.value)}
                            className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white"
                          >
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteSignal(signal.id!)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <DeleteIcon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {paginatedSignals.length > 0 && (
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
      )}

      {/* Create Signal Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96 max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Create New Signal</h2>
            <CreateSignalForm 
              onClose={() => setShowCreateForm(false)}
              onCreated={() => {
                setShowCreateForm(false);
                fetchSignals();
              }}
              api={api}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Create Signal Form Component
function CreateSignalForm({ onClose, onCreated, api }: { 
  onClose: () => void; 
  onCreated: () => void; 
  api: any; 
}) {
  const [formData, setFormData] = useState({
    signalType: 'LONG' as 'LONG' | 'SHORT',
    symbol: '',
    riskLevel: 'Medium' as 'Low' | 'Medium' | 'High',
    confidence: 75,
    entryPriceMin: 0,
    entryPriceMax: 0,
    leverage: 1,
    tp1: undefined as number | undefined,
    tp2: undefined as number | undefined,
    tp3: undefined as number | undefined,
    stopLoss: 0,
    strategyName: '',
    note: '',
    status: 'active' as 'active' | 'closed' | 'cancelled'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.symbol.trim()) {
      alert('Please enter a symbol');
      return;
    }
    if (!formData.strategyName.trim()) {
      alert('Please enter a strategy name');
      return;
    }
    if (formData.entryPriceMin <= 0 || formData.entryPriceMax <= 0 || formData.stopLoss <= 0) {
      alert('Please enter valid prices');
      return;
    }
    
    const result = await api.createSignal(formData);
    if (result.success) {
      onCreated();
    } else {
      alert('Failed to create signal: ' + result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Signal Type</label>
          <select
            value={formData.signalType}
            onChange={(e) => setFormData({ ...formData, signalType: e.target.value as any })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          >
            <option value="LONG">LONG</option>
            <option value="SHORT">SHORT</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Symbol</label>
          <input
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            placeholder="BTC/USDT"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Risk Level</label>
          <select
            value={formData.riskLevel}
            onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as any })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Confidence (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.confidence}
            onChange={(e) => setFormData({ ...formData, confidence: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Entry Price Min</label>
          <input
            type="number"
            step="0.01"
            value={formData.entryPriceMin}
            onChange={(e) => setFormData({ ...formData, entryPriceMin: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Entry Price Max</label>
          <input
            type="number"
            step="0.01"
            value={formData.entryPriceMax}
            onChange={(e) => setFormData({ ...formData, entryPriceMax: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Leverage</label>
          <input
            type="number"
            min="1"
            step="0.1"
            value={formData.leverage}
            onChange={(e) => setFormData({ ...formData, leverage: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Stop Loss</label>
          <input
            type="number"
            step="0.01"
            value={formData.stopLoss}
            onChange={(e) => setFormData({ ...formData, stopLoss: Number(e.target.value) })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">TP1 (Optional)</label>
          <input
            type="number"
            step="0.01"
            value={formData.tp1 || ''}
            onChange={(e) => setFormData({ ...formData, tp1: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">TP2 (Optional)</label>
          <input
            type="number"
            step="0.01"
            value={formData.tp2 || ''}
            onChange={(e) => setFormData({ ...formData, tp2: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">TP3 (Optional)</label>
          <input
            type="number"
            step="0.01"
            value={formData.tp3 || ''}
            onChange={(e) => setFormData({ ...formData, tp3: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Strategy Name</label>
        <input
          type="text"
          value={formData.strategyName}
          onChange={(e) => setFormData({ ...formData, strategyName: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          placeholder="Trend Support Bounce"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Note (Optional)</label>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          placeholder="Brief explanation of why this signal looks good..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="default">
          Create Signal
        </Button>
      </div>
    </form>
  );
} 