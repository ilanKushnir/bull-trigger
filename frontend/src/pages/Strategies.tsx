import { useEffect, useState } from 'react';
import StrategyFlowEditor from '../components/StrategyFlowEditor';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Strategy, useApi, useWebSocket } from '../services/websocketService';
import { cronToHuman } from '../utils/cronUtils';

// Extended Strategy interface for the Strategies page
interface ExtendedStrategy extends Strategy {
  model_tier?: 'cheap' | 'deep';
  trigger_json?: string;
  last_run?: Date;
  next_run?: Date;
  success_rate?: number;
  total_runs?: number;
}

// Schedule Display Component with Tooltip
const ScheduleDisplay = ({ cronExpression }: { cronExpression: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const humanReadable = cronToHuman(cronExpression);

  return (
    <div className="relative inline-block">
      <div 
        className="flex items-center space-x-1 mt-1 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="text-sm">⏰</span>
        <span className="text-white hover:text-blue-400 transition-colors border-b border-dotted border-gray-500">
          {humanReadable}
        </span>
      </div>
      
      {showTooltip && (
        <div className="absolute z-50 px-3 py-2 text-xs text-white bg-gray-800 border border-gray-600 rounded-lg shadow-xl bottom-full left-0 mb-2 whitespace-nowrap">
          <div className="text-gray-300">
            <span className="text-blue-400 font-medium">Cron:</span> {cronExpression}
          </div>
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-600"></div>
        </div>
      )}
    </div>
  );
};

// Simple Switch Component
const Switch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      checked ? 'bg-blue-600' : 'bg-gray-400'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// Create Strategy Modal Component
const CreateStrategyModal = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: { name: string; description: string }) => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    await onSubmit({ name: name.trim(), description: description.trim() });
    setIsSubmitting(false);
    setName('');
    setDescription('');
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">🚀 Create New Strategy</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Strategy Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., BTC Price Alert"
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe what this strategy does..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin w-4 h-4 mr-1">⟳</span>
                  Creating...
                </>
              ) : (
                'Create Strategy'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  strategyName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  strategyName: string;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">⚠️</span>
          <h2 className="text-xl font-bold text-white">Delete Strategy</h2>
        </div>
        
        <p className="text-gray-300 mb-2">
          Are you sure you want to delete the strategy:
        </p>
        <p className="text-white font-semibold mb-4">"{strategyName}"</p>
        
        <div className="bg-red-900/20 border border-red-500/30 rounded-md p-3 mb-6">
          <p className="text-red-300 text-sm">
            <strong>⚠️ Warning:</strong> This action cannot be undone. All related data including API calls, model calls, and execution history will be permanently deleted.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="animate-spin w-4 h-4 mr-1">⟳</span>
                Deleting...
              </>
            ) : (
              'Delete Strategy'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function Strategies() {
  const [strategies, setStrategies] = useState<ExtendedStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState<{ [key: string]: boolean }>({});
  const [showFlowEditor, setShowFlowEditor] = useState<string | null>(null);
  const [createStrategyModalOpen, setCreateStrategyModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState<ExtendedStrategy | null>(null);
  
  const api = useApi();
  const websocket = useWebSocket();

  // Function to refetch strategies data
  const refetchStrategies = async () => {
    const result = await api.getStrategies();
    
    if (result.success && result.data) {
      const enrichedStrategies: ExtendedStrategy[] = result.data.map(strategy => ({
        ...strategy,
        model_tier: (strategy.modelTier === 'deep' ? 'deep' : 'cheap') as 'cheap' | 'deep',
        trigger_json: strategy.triggers ? JSON.stringify(strategy.triggers) : '{"type": "cron_only"}',
        last_run: strategy.lastRun ? new Date(strategy.lastRun) : undefined,
        next_run: strategy.nextRun ? new Date(strategy.nextRun) : undefined,
        success_rate: strategy.successRate || 0,
        total_runs: strategy.totalRuns || 0
      }));
      setStrategies(enrichedStrategies);
    } else {
      console.error('Failed to fetch strategies:', result.error);
      setStrategies([]);
    }
  };

  useEffect(() => {
    const fetchStrategies = async () => {
      setLoading(true);
      await refetchStrategies();
      setLoading(false);
    };

    fetchStrategies();

    // Initialize WebSocket connection and subscribe to strategy updates
    websocket.connect('http://localhost:3000');
    websocket.subscribeToStrategies();

    // Set up WebSocket event listeners for real-time strategy updates
    websocket.on('strategy:update', (data: { strategyId: number; metrics: any }) => {
      console.log('📊 Received strategy update:', data);
      setStrategies(prev => prev.map(s => 
        s.id === data.strategyId ? { 
          ...s,
          total_runs: data.metrics.totalRuns,
          success_rate: data.metrics.successRate,
          last_run: data.metrics.lastRun ? new Date(data.metrics.lastRun) : undefined
        } : s
      ));
    });

    websocket.on('strategies:update', (updatedStrategy: any) => {
      console.log('📊 Received strategies update:', updatedStrategy);
      setStrategies(prev => prev.map(s => 
        s.id === updatedStrategy.id ? { 
          ...s,
          ...updatedStrategy,
          last_run: updatedStrategy.lastRun ? new Date(updatedStrategy.lastRun) : undefined,
          total_runs: updatedStrategy.totalRuns || s.total_runs,
          success_rate: updatedStrategy.successRate || s.success_rate
        } : s
      ));
    });

    // Set up periodic refresh as fallback (every 30 seconds)
    const refreshInterval = setInterval(() => {
      refetchStrategies();
    }, 30000);

    // Cleanup function
    return () => {
      websocket.off('strategy:update');
      websocket.off('strategies:update');
      clearInterval(refreshInterval);
    };
  }, []);

  const handleStrategyToggle = async (strategyId: string) => {
    const numericId = Number(strategyId);
    const strategy = strategies.find(s => s.id === numericId);
    if (!strategy) return;

    const result = await api.updateStrategy(numericId, { enabled: !strategy.enabled });
    
    if (result.success) {
      setStrategies(prev => prev.map(s => 
        s.id === numericId ? { ...s, enabled: !s.enabled } : s
      ));
    } else {
      console.error('Failed to update strategy:', result.error);
    }
  };

  const handleRunNow = async (strategyId: string) => {
    const numericId = Number(strategyId);
    setIsExecuting(prev => ({ ...prev, [strategyId]: true }));
    
    const result = await api.runStrategy(numericId);
    
    if (result.success) {
      // Update local state immediately with current time
      setStrategies(prev => prev.map(s => 
        s.id === numericId ? { 
          ...s, 
          last_run: new Date(),
          total_runs: (s.total_runs || 0) + 1
        } : s
      ));
    } else {
      console.error('Failed to run strategy:', result.error);
    }
    
    setIsExecuting(prev => ({ ...prev, [strategyId]: false }));
  };

  const handleCreateStrategy = async (data: { name: string; description: string }) => {
    const result = await api.createStrategy(data);
    
    if (result.success) {
      setCreateStrategyModalOpen(false);
      await refetchStrategies(); // Refresh the strategies list
    } else {
      console.error('Failed to create strategy:', result.error);
      alert(`Failed to create strategy: ${result.error}`);
    }
  };

  const handleDeleteStrategy = async (strategy: ExtendedStrategy) => {
    setStrategyToDelete(strategy);
    setDeleteConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!strategyToDelete) return;
    
    const result = await api.deleteStrategy(strategyToDelete.id);
    
    if (result.success) {
      setDeleteConfirmModalOpen(false);
      setStrategyToDelete(null);
      await refetchStrategies(); // Refresh the strategies list
    } else {
      console.error('Failed to delete strategy:', result.error);
      alert(`Failed to delete strategy: ${result.error}`);
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteConfirmModalOpen(false);
    setStrategyToDelete(null);
  };

  const formatTimeAgo = (date: Date) => {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const renderStrategyCard = (strategy: ExtendedStrategy) => (
    <Card key={strategy.id} className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">{strategy.name}</h3>
            <p className="text-gray-400 text-sm mb-2">{strategy.description}</p>
            <ScheduleDisplay cronExpression={strategy.cron} />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowFlowEditor(strategy.id.toString());
              }}
              className="bg-purple-600 hover:bg-purple-700 flex items-center space-x-1"
            >
              <span>🎨</span>
              <span>Flow Editor</span>
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteStrategy(strategy);
              }}
              className="bg-red-600 hover:bg-red-700 flex items-center space-x-1"
            >
              <span>🗑️</span>
              <span>Delete</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-900 rounded">
            <div className="text-2xl font-bold text-blue-400">{strategy.total_runs || 0}</div>
            <div className="text-xs text-gray-400">Total Runs</div>
          </div>
          <div className="text-center p-3 bg-gray-900 rounded">
            <div className="text-2xl font-bold text-green-400">
              {strategy.success_rate ? `${Math.round(strategy.success_rate)}%` : '0%'}
            </div>
            <div className="text-xs text-gray-400">Success Rate</div>
          </div>
          <div className="text-center p-3 bg-gray-900 rounded">
            <div className="text-xs text-gray-400">Last Run</div>
            <div className="text-sm text-white">
              {strategy.last_run ? formatTimeAgo(strategy.last_run) : 'Never'}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Switch
              checked={strategy.enabled}
              onChange={() => handleStrategyToggle(strategy.id.toString())}
            />
            <span className="text-sm text-gray-400">
              {strategy.enabled ? 'Strategy is active' : 'Strategy is paused'}
            </span>
          </div>
          <Button
            onClick={() => handleRunNow(strategy.id.toString())}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isExecuting[strategy.id.toString()] || false}
          >
            {isExecuting[strategy.id.toString()] ? (
              <>
                <span className="animate-spin w-4 h-4 mr-1">⟳</span>
                Running...
              </>
            ) : (
              <>
                <span className="mr-1">▶️</span>
                Run Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-blue-400">Loading strategies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">🚀 Strategy Management</h1>
          <p className="text-gray-400 mt-2">
            Configure and monitor your trading strategies with advanced flow-based automation
          </p>
        </div>
        <Button
          onClick={() => setCreateStrategyModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create New Strategy
        </Button>
      </div>

      <div className="grid gap-6">
        {strategies.map(renderStrategyCard)}
        {strategies.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">No Strategies Found</h3>
              <p className="text-gray-400 mb-4">
                Your strategies will appear here once they're loaded from the backend
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Strategy Flow Editor Modal */}
      {showFlowEditor && (
        <StrategyFlowEditor
          strategyId={Number(showFlowEditor)}
          onClose={() => setShowFlowEditor(null)}
          onRefetch={refetchStrategies}
        />
      )}

      {/* Create Strategy Modal */}
      {createStrategyModalOpen && (
        <CreateStrategyModal
          isOpen={createStrategyModalOpen}
          onClose={() => setCreateStrategyModalOpen(false)}
          onSubmit={handleCreateStrategy}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModalOpen && strategyToDelete && (
        <DeleteConfirmModal
          isOpen={deleteConfirmModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          strategyName={strategyToDelete.name}
        />
      )}
    </div>
  );
} 