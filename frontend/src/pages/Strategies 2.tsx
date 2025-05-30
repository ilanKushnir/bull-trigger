import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import StrategyFlowBuilder from '../components/StrategyFlowBuilder';
import { useApi, Strategy } from '../services/websocketService';
import { cronToHuman } from '../utils/cronUtils';
import StrategyFlowEditor from '../components/StrategyFlowEditor';
import { formatDistanceToNow } from 'date-fns';
import { Switch } from '../components/ui/switch';
import { PlayIcon, PauseIcon, ZapIcon, EditIcon, PlusIcon, ClockIcon, CodeIcon, SettingsIcon, SaveIcon } from 'lucide-react';
import { CogIcon, ShareIcon } from 'lucide-react';

// Icons as simple components
const ActivityIcon = () => <span className="text-lg">⚡</span>;
const PlayIcon = () => <span className="text-sm">▶️</span>;
const PauseIcon = () => <span className="text-sm">⏸️</span>;
const ZapIcon = () => <span className="text-lg">⚡</span>;
const EditIcon = () => <span className="text-sm">✏️</span>;
const PlusIcon = () => <span className="text-sm">➕</span>;
const ClockIcon = () => <span className="text-sm">⏰</span>;
const CodeIcon = () => <span className="text-lg">💻</span>;
const SettingsIcon = () => <span className="text-lg">⚙️</span>;
const SaveIcon = () => <span className="text-sm">💾</span>;

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
        <ClockIcon />
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

export default function Strategies() {
  const [strategies, setStrategies] = useState<ExtendedStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<ExtendedStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState<{ [key: string]: boolean }>({});
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'builder'>('list');
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    cron: '',
    model_tier: 'cheap' as 'cheap' | 'deep',
    trigger_json: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<ExtendedStrategy | null>(null);
  const [showFlowEditor, setShowFlowEditor] = useState<string | null>(null);
  
  const api = useApi();

  useEffect(() => {
    const fetchStrategies = async () => {
      setLoading(true);
      const result = await api.getStrategies();
      
      if (result.success && result.data) {
        // The API now returns real metrics, so we don't need to mock them
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
      // Update the strategy's last run time and total runs
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

  const handleCreateStrategy = async (name: string, description: string) => {
    const result = await api.createStrategy({ name, description });
    
    if (result.success) {
      // Refresh strategies list
      const updatedResult = await api.getStrategies();
      if (updatedResult.success && updatedResult.data) {
        const enrichedStrategies: ExtendedStrategy[] = updatedResult.data.map(strategy => ({
          ...strategy,
          model_tier: (strategy.modelTier === 'deep' ? 'deep' : 'cheap') as 'cheap' | 'deep',
          trigger_json: strategy.triggers ? JSON.stringify(strategy.triggers) : '{"type": "cron_only"}',
          last_run: strategy.lastRun ? new Date(strategy.lastRun) : undefined,
          next_run: strategy.nextRun ? new Date(strategy.nextRun) : undefined,
          success_rate: strategy.successRate || 0,
          total_runs: strategy.totalRuns || 0
        }));
        setStrategies(enrichedStrategies);
      }
    } else {
      console.error('Failed to create strategy:', result.error);
    }
  };

  const handleEdit = (strategy: ExtendedStrategy) => {
    setSelectedStrategy(strategy);
    setEditForm({
      name: strategy.name,
      description: strategy.description || '',
      cron: strategy.cron,
      model_tier: strategy.model_tier || 'cheap',
      trigger_json: strategy.trigger_json || '{"type": "cron_only"}'
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!selectedStrategy) return;
    
    setIsSaving(true);
    
    try {
      const updateData = {
        name: editForm.name,
        description: editForm.description,
        cron: editForm.cron,
        // Add other fields as needed
      };
      
      const result = await api.updateStrategy(selectedStrategy.id, updateData);
      
      if (result.success) {
        // Update the strategy in the list
        setStrategies(prev => prev.map(s => 
          s.id === selectedStrategy.id 
            ? { ...s, ...updateData, model_tier: editForm.model_tier, trigger_json: editForm.trigger_json }
            : s
        ));
        setShowEditor(false);
        setSelectedStrategy(null);
      } else {
        console.error('Failed to update strategy:', result.error);
        alert('Failed to save strategy: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving strategy:', error);
      alert('Failed to save strategy');
    }
    
    setIsSaving(false);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedStrategy(null);
    setEditForm({
      name: '',
      description: '',
      cron: '',
      model_tier: 'cheap',
      trigger_json: ''
    });
  };

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (strategy: ExtendedStrategy) => {
    if (!strategy.enabled) {
      return <Badge variant="default">Disabled</Badge>;
    }
    
    const timeSinceLastRun = strategy.last_run ? Date.now() - strategy.last_run.getTime() : Infinity;
    const isRunning = timeSinceLastRun < 60000;
    
    if (isRunning) {
      return <Badge variant="info" className="animate-pulse">Running</Badge>;
    }
    
    return <Badge variant="success">Active</Badge>;
  };

  const getModelBadge = (tier: string) => {
    return tier === 'deep' 
      ? <Badge variant="info">Deep Model</Badge>
      : <Badge variant="warning">Cheap Model</Badge>;
  };

  const renderStrategyCard = (strategy: ExtendedStrategy) => (
    <Card key={strategy.id} className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">{strategy.name}</h3>
            <p className="text-gray-400 text-sm mb-2">{strategy.description}</p>
            <ScheduleDisplay cron={strategy.cron} />
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={strategy.enabled ? 'success' : 'default'}>
              {strategy.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <Button
              onClick={() => setEditingStrategy(strategy)}
              size="sm"
              variant="outline"
              className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
            >
              <CogIcon className="w-4 h-4 mr-1" />
              Settings
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowFlowEditor(strategy.id.toString());
              }}
              className="bg-purple-600 hover:bg-purple-700 flex items-center space-x-1"
            >
              <span>🎨</span>
              <span>Flow</span>
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
              {strategy.last_run ? formatDistanceToNow(new Date(strategy.last_run), { addSuffix: true }) : 'Never'}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Switch
              checked={strategy.enabled}
              onChange={(enabled) => handleStrategyToggle(strategy.id.toString())}
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
                <PlayIcon className="w-4 h-4 mr-1" />
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
        <div className="text-blue-400">Loading strategies data...</div>
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
        <div className="flex space-x-3">
          <Button
            onClick={() => setEditingStrategy({ name: '', description: '', enabled: true, cron: '*/5 * * * *' })}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Strategy
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading strategies...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {strategies.map(renderStrategyCard)}
          {strategies.length === 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-12 text-center">
                <h3 className="text-xl font-semibold text-white mb-2">No Strategies Found</h3>
                <p className="text-gray-400 mb-4">
                  Create your first strategy to start automated trading analysis
                </p>
                <Button
                  onClick={() => setEditingStrategy({ name: '', description: '', enabled: true, cron: '*/5 * * * *' })}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Strategy
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Strategy Settings Modal */}
      {editingStrategy && (
        <StrategyEditModal
          strategy={editingStrategy}
          onSave={handleSave}
          onClose={() => setEditingStrategy(null)}
        />
      )}

      {/* Strategy Flow Editor Modal */}
      {showFlowEditor && (
        <StrategyFlowEditor
          strategyId={Number(showFlowEditor)}
          onClose={() => setShowFlowEditor(null)}
        />
      )}
    </div>
  );
} 