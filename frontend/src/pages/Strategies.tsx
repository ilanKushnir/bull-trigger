import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import StrategyFlowBuilder from '../components/StrategyFlowBuilder';

// Icons as simple components
const ActivityIcon = () => <span>⚡</span>;
const PlayIcon = () => <span>▶️</span>;
const PauseIcon = () => <span>⏸️</span>;
const ZapIcon = () => <span>⚡</span>;
const EditIcon = () => <span>✏️</span>;
const PlusIcon = () => <span>➕</span>;
const ClockIcon = () => <span>⏰</span>;
const CodeIcon = () => <span>💻</span>;
const SettingsIcon = () => <span>⚙️</span>;

interface Strategy {
  id: string;
  name: string;
  description: string;
  cron: string;
  enabled: boolean;
  model_tier: 'cheap' | 'deep';
  trigger_json: string;
  last_run?: Date;
  next_run?: Date;
  success_rate?: number;
  total_runs?: number;
}

export default function Strategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([
    {
      id: '1',
      name: 'General Analysis',
      description: 'Daily market analysis with comprehensive technical indicators',
      cron: '0 9 * * *',
      enabled: true,
      model_tier: 'deep',
      trigger_json: '{"type": "cron_only"}',
      last_run: new Date(Date.now() - 1000 * 60 * 60 * 2),
      next_run: new Date(Date.now() + 1000 * 60 * 60 * 22),
      success_rate: 87,
      total_runs: 45
    },
    {
      id: '2',
      name: 'Price Watcher',
      description: 'Monitors significant price movements and volume spikes',
      cron: '*/1 * * * *',
      enabled: true,
      model_tier: 'cheap',
      trigger_json: '{"type": "price_change", "threshold": 2}',
      last_run: new Date(Date.now() - 1000 * 60 * 15),
      next_run: new Date(Date.now() + 1000 * 60 * 45),
      success_rate: 92,
      total_runs: 156
    },
    {
      id: '3',
      name: 'Signal Hunter',
      description: 'Advanced pattern recognition for high-confidence signals',
      cron: '*/15 * * * *',
      enabled: true,
      model_tier: 'deep',
      trigger_json: '{"type": "probability", "min_confidence": 7}',
      last_run: new Date(Date.now() - 1000 * 60 * 5),
      next_run: new Date(Date.now() + 1000 * 60 * 10),
      success_rate: 78,
      total_runs: 89
    },
    {
      id: '4',
      name: 'Fear-Greed Monitor',
      description: 'Tracks market sentiment changes for contrarian signals',
      cron: '0 * * * *',
      enabled: false,
      model_tier: 'cheap',
      trigger_json: '{"type": "sentiment_change", "threshold": 10}',
      success_rate: 65,
      total_runs: 23
    },
    {
      id: '5',
      name: 'Volume Spike',
      description: 'Detects unusual volume activity across major pairs',
      cron: '*/10 * * * *',
      enabled: true,
      model_tier: 'cheap',
      trigger_json: '{"type": "volume_spike", "threshold": 2.5}',
      last_run: new Date(Date.now() - 1000 * 60 * 8),
      next_run: new Date(Date.now() + 1000 * 60 * 2),
      success_rate: 82,
      total_runs: 134
    },
    {
      id: '6',
      name: 'Weekly Education',
      description: 'Educational content and market summary for beginners',
      cron: 'Sun 10:00',
      enabled: false,
      model_tier: 'cheap',
      trigger_json: '{"type": "cron_only"}',
      success_rate: 95,
      total_runs: 8
    },
    {
      id: '7',
      name: 'Token Watcher',
      description: 'Monitors monthly token usage and sends alerts',
      cron: '0 * * * *',
      enabled: true,
      model_tier: 'cheap',
      trigger_json: '{"type": "token_usage"}',
      last_run: new Date(Date.now() - 1000 * 60 * 45),
      next_run: new Date(Date.now() + 1000 * 60 * 15),
      success_rate: 100,
      total_runs: 67
    }
  ]);

  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'builder'>('list');

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleStrategyToggle = async (strategyId: string) => {
    setStrategies(prev => prev.map(s => 
      s.id === strategyId ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleRunNow = async (strategyId: string) => {
    setIsLoading(true);
    try {
      // Simulate strategy execution
      setTimeout(() => {
        setStrategies(prev => prev.map(s => 
          s.id === strategyId ? { 
            ...s, 
            last_run: new Date(),
            total_runs: (s.total_runs || 0) + 1
          } : s
        ));
        setIsLoading(false);
        alert('Strategy executed successfully!');
      }, 2000);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (strategy: Strategy) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">
            ⚙️ Strategy Builder
          </h1>
          <p className="text-gray-400">
            Design, manage, and monitor your trading strategies
          </p>
        </div>
        <div className="flex space-x-3">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusIcon /> New Strategy
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-4">
            <Button
              onClick={() => setActiveTab('list')}
              variant={activeTab === 'list' ? 'default' : 'outline'}
              className={activeTab === 'list' ? 'bg-blue-600 text-white' : ''}
            >
              📋 Strategy List
            </Button>
            <Button
              onClick={() => setActiveTab('builder')}
              variant={activeTab === 'builder' ? 'default' : 'outline'}
              className={activeTab === 'builder' ? 'bg-blue-600 text-white' : ''}
            >
              🎨 Visual Builder
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Strategies</p>
                    <p className="text-2xl font-bold text-white">{strategies.length}</p>
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
                      {strategies.filter(s => s.enabled).length}
                    </p>
                  </div>
                  <PlayIcon />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Success Rate</p>
                    <p className="text-2xl font-bold text-green-500">
                      {Math.round(strategies.reduce((acc, s) => acc + (s.success_rate || 0), 0) / strategies.length)}%
                    </p>
                  </div>
                  <ZapIcon />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Runs</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {strategies.reduce((acc, s) => acc + (s.total_runs || 0), 0)}
                    </p>
                  </div>
                  <ActivityIcon />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strategy List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center space-x-2">
                <ActivityIcon />
                <span>All Strategies ({strategies.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategies.map((strategy) => (
                  <div 
                    key={strategy.id}
                    className={`p-4 bg-gray-900 rounded-lg cursor-pointer transition-all hover:bg-gray-800 ${
                      selectedStrategy?.id === strategy.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedStrategy(strategy)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-white text-lg">{strategy.name}</h3>
                          {getStatusBadge(strategy)}
                          {getModelBadge(strategy.model_tier)}
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-3">
                          {strategy.description}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Schedule:</span>
                            <div className="flex items-center space-x-1 mt-1">
                              <ClockIcon />
                              <span className="text-white">{strategy.cron}</span>
                            </div>
                          </div>
                          
                          {strategy.success_rate && (
                            <div>
                              <span className="text-gray-500">Success Rate:</span>
                              <div className="text-green-400 font-medium mt-1">
                                {strategy.success_rate}%
                              </div>
                            </div>
                          )}
                          
                          {strategy.total_runs && (
                            <div>
                              <span className="text-gray-500">Total Runs:</span>
                              <div className="text-white font-medium mt-1">
                                {strategy.total_runs}
                              </div>
                            </div>
                          )}
                          
                          {strategy.last_run && (
                            <div>
                              <span className="text-gray-500">Last Run:</span>
                              <div className="text-white mt-1">
                                {getTimeAgo(strategy.last_run)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2 border-t border-gray-700">
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStrategyToggle(strategy.id);
                        }}
                        variant={strategy.enabled ? 'error' : 'success'}
                      >
                        {strategy.enabled ? <PauseIcon /> : <PlayIcon />}
                        {strategy.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunNow(strategy.id);
                        }}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <ZapIcon />
                        {isLoading ? 'Running...' : 'Run Now'}
                      </Button>
                      
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStrategy(strategy);
                          setShowEditor(true);
                        }}
                        variant="outline"
                      >
                        <EditIcon /> Edit
                      </Button>
                      
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStrategy(strategy);
                          setActiveTab('builder');
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        🎨 Flow
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strategy Editor Modal */}
          {showEditor && selectedStrategy && (
            <Card className="border-blue-500">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CodeIcon />
                    <span>Edit Strategy: {selectedStrategy.name}</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setShowEditor(false)}
                    variant="outline"
                  >
                    Close
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Strategy Name
                      </label>
                      <input
                        type="text"
                        value={selectedStrategy.name}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={selectedStrategy.description}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Schedule (Cron Expression)
                      </label>
                      <input
                        type="text"
                        value={selectedStrategy.cron}
                        placeholder="*/15 * * * *"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Model Tier
                      </label>
                      <select
                        value={selectedStrategy.model_tier}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="cheap">Cheap Model (GPT-3.5)</option>
                        <option value="deep">Deep Model (GPT-4)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Trigger Configuration (JSON)
                    </label>
                    <textarea
                      value={JSON.stringify(JSON.parse(selectedStrategy.trigger_json), null, 2)}
                      rows={10}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none font-mono text-sm"
                      placeholder='{"type": "cron_only"}'
                    />
                    <div className="mt-4 flex space-x-2">
                      <Button variant="success">
                        Save Changes
                      </Button>
                      <Button variant="outline">
                        Test Configuration
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Visual Builder Tab */}
      {activeTab === 'builder' && (
        <StrategyFlowBuilder 
          strategyId={selectedStrategy?.id}
          onSave={(nodes, edges) => {
            console.log('Strategy flow saved:', { nodes, edges });
            // Here you would save the flow to your backend
          }}
        />
      )}
    </div>
  );
} 