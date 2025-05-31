import { useEffect, useState } from 'react';
import StrategyFlowEditor from '../components/StrategyFlowEditor';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Strategy, useApi } from '../services/websocketService';
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

export default function Strategies() {
  const [strategies, setStrategies] = useState<ExtendedStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState<{ [key: string]: boolean }>({});
  const [showFlowEditor, setShowFlowEditor] = useState<string | null>(null);
  
  const api = useApi();

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

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
            <Badge variant={strategy.enabled ? 'success' : 'default'}>
              {strategy.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
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
            className="bg-green-600 hover:bg-green-700 text-white"
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">🚀 Strategy Management</h1>
          <p className="text-gray-400 mt-2">
            Configure and monitor your trading strategies with advanced flow-based automation
          </p>
        </div>
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
    </div>
  );
} 