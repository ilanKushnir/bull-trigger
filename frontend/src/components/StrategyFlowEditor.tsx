import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useApi } from '../services/websocketService';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  PlusIcon, 
  TrashIcon, 
  PlayIcon, 
  PencilIcon as EditIcon, 
  GlobeAltIcon as GlobeIcon, 
  CpuChipIcon as BrainIcon,
  BeakerIcon as TestTubeIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
  CommandLineIcon as ConditionIcon,
  ArrowPathIcon as TriggerIcon,
  PaperAirplaneIcon as TelegramIcon
} from '@heroicons/react/24/outline';

interface StrategyFlowEditorProps {
  strategyId: number;
  onClose: () => void;
}

interface ApiCall {
  id?: number;
  name: string;
  url: string;
  method: string;
  headers?: string;
  body?: string;
  jsonPath?: string;
  outputVariable: string;
  orderIndex: number;
  enabled: boolean;
}

interface ModelCall {
  id?: number;
  name: string;
  modelTier: 'cheap' | 'deep';
  systemPrompt?: string;
  userPrompt: string;
  includeApiData: boolean;
  outputVariable: string;
  orderIndex: number;
  enabled: boolean;
}

interface ConditionNode {
  id?: number;
  name: string;
  conditionType: 'api_result' | 'model_response' | 'variable_value';
  leftOperand: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
  rightOperand: string;
  trueOutputVariable?: string;
  falseOutputVariable?: string;
  orderIndex: number;
  enabled: boolean;
}

interface StrategyTriggerNode {
  id?: number;
  name: string;
  targetStrategyId: number;
  conditionVariable?: string;
  passVariables?: string[];
  waitForCompletion: boolean;
  outputVariable?: string;
  orderIndex: number;
  enabled: boolean;
}

interface TelegramMessageNode {
  id?: number;
  name: string;
  chatId: string;
  messageTemplate: string;
  includeApiData: boolean;
  onlyIfVariable?: string;
  messageType: 'info' | 'success' | 'warning' | 'error';
  parseMode?: 'Markdown' | 'HTML' | 'none';
  orderIndex: number;
  enabled: boolean;
}

// Custom Node Components
const ApiCallNode = ({ data }: { data: any }) => {
  return (
    <div className="px-3 py-2 shadow-lg rounded-lg bg-blue-600 border border-blue-500 min-w-[180px] max-w-[220px]">
      <div className="flex items-center space-x-2 mb-1">
        <GlobeIcon className="w-3 h-3 text-blue-100" />
        <div className="font-medium text-white text-xs truncate">{data.name}</div>
        <Badge variant={data.enabled ? 'success' : 'default'} className="text-xs px-1 py-0">
          {data.enabled ? 'ON' : 'OFF'}
        </Badge>
      </div>
      <div className="text-xs text-blue-100 mb-1 truncate">{data.method} {data.url}</div>
      {data.jsonPath && (
        <div className="text-xs text-green-300 truncate">Extract: {data.jsonPath}</div>
      )}
      <div className="text-xs text-blue-200 mb-2 truncate">→ {data.outputVariable}</div>
      <div className="flex justify-end space-x-1">
        <Button size="sm" variant="outline" onClick={() => data.onEdit?.(data)} className="h-5 w-5 p-0">
          <EditIcon className="w-2.5 h-2.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => data.onTest?.(data)} className="h-5 w-5 p-0">
          <TestTubeIcon className="w-2.5 h-2.5" />
        </Button>
        <Button size="sm" variant="error" onClick={() => data.onDelete?.(data.id)} className="h-5 w-5 p-0">
          <TrashIcon className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
};

const ModelCallNode = ({ data }: { data: any }) => {
  return (
    <div className="px-3 py-2 shadow-lg rounded-lg bg-purple-600 border border-purple-500 min-w-[180px] max-w-[220px]">
      <div className="flex items-center space-x-2 mb-1">
        <BrainIcon className="w-3 h-3 text-purple-100" />
        <div className="font-medium text-white text-xs truncate">{data.name}</div>
        <Badge variant={data.enabled ? 'success' : 'default'} className="text-xs px-1 py-0">
          {data.enabled ? 'ON' : 'OFF'}
        </Badge>
      </div>
      <div className="text-xs text-purple-100 mb-1">{data.modelTier} model</div>
      <div className="text-xs text-purple-200 mb-1 truncate">
        {data.includeApiData ? 'Includes API data' : 'No API data'}
      </div>
      <div className="text-xs text-purple-200 mb-2 truncate">→ {data.outputVariable}</div>
      <div className="flex justify-end space-x-1">
        <Button size="sm" variant="outline" onClick={() => data.onEdit?.(data)} className="h-5 w-5 p-0">
          <EditIcon className="w-2.5 h-2.5" />
        </Button>
        <Button size="sm" variant="error" onClick={() => data.onDelete?.(data.id)} className="h-5 w-5 p-0">
          <TrashIcon className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
};

const ConditionNode = ({ data }: { data: any }) => {
  return (
    <div className="px-3 py-2 shadow-lg rounded-lg bg-yellow-600 border border-yellow-500 min-w-[180px] max-w-[220px]">
      <div className="flex items-center space-x-2 mb-1">
        <ConditionIcon className="w-3 h-3 text-yellow-100" />
        <div className="font-medium text-white text-xs truncate">{data.name}</div>
        <Badge variant={data.enabled ? 'success' : 'default'} className="text-xs px-1 py-0">
          {data.enabled ? 'ON' : 'OFF'}
        </Badge>
      </div>
      <div className="text-xs text-yellow-100 mb-1">{data.conditionType}</div>
      <div className="text-xs text-yellow-200 mb-1 truncate">
        {data.leftOperand} {data.operator} {data.rightOperand}
      </div>
      <div className="text-xs text-yellow-200 mb-2 truncate">
        ✓ {data.trueOutputVariable || 'true'} | ✗ {data.falseOutputVariable || 'false'}
      </div>
      <div className="flex justify-end space-x-1">
        <Button size="sm" variant="outline" onClick={() => data.onEdit?.(data)} className="h-5 w-5 p-0">
          <EditIcon className="w-2.5 h-2.5" />
        </Button>
        <Button size="sm" variant="error" onClick={() => data.onDelete?.(data.id)} className="h-5 w-5 p-0">
          <TrashIcon className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
};

const StrategyTriggerNode = ({ data }: { data: any }) => {
  return (
    <div className="px-3 py-2 shadow-lg rounded-lg bg-orange-600 border border-orange-500 min-w-[180px] max-w-[220px]">
      <div className="flex items-center space-x-2 mb-1">
        <TriggerIcon className="w-3 h-3 text-orange-100" />
        <div className="font-medium text-white text-xs truncate">{data.name}</div>
        <Badge variant={data.enabled ? 'success' : 'default'} className="text-xs px-1 py-0">
          {data.enabled ? 'ON' : 'OFF'}
        </Badge>
      </div>
      <div className="text-xs text-orange-100 mb-1">→ Strategy #{data.targetStrategyId}</div>
      <div className="text-xs text-orange-200 mb-1 truncate">
        {data.conditionVariable ? `If: ${data.conditionVariable}` : 'Always trigger'}
      </div>
      <div className="text-xs text-orange-200 mb-2 truncate">
        {data.waitForCompletion ? 'Wait for completion' : 'Fire & forget'}
      </div>
      <div className="flex justify-end space-x-1">
        <Button size="sm" variant="outline" onClick={() => data.onEdit?.(data)} className="h-5 w-5 p-0">
          <EditIcon className="w-2.5 h-2.5" />
        </Button>
        <Button size="sm" variant="error" onClick={() => data.onDelete?.(data.id)} className="h-5 w-5 p-0">
          <TrashIcon className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
};

const TelegramMessageNode = ({ data }: { data: any }) => {
  return (
    <div className="px-3 py-2 shadow-lg rounded-lg bg-green-600 border border-green-500 min-w-[180px] max-w-[220px]">
      <div className="flex items-center space-x-2 mb-1">
        <TelegramIcon className="w-3 h-3 text-green-100" />
        <div className="font-medium text-white text-xs truncate">{data.name}</div>
        <Badge variant={data.enabled ? 'success' : 'default'} className="text-xs px-1 py-0">
          {data.enabled ? 'ON' : 'OFF'}
        </Badge>
      </div>
      <div className="text-xs text-green-100 mb-1">#{data.chatId}</div>
      <div className="text-xs text-green-200 mb-1 truncate">{data.messageType} message</div>
      <div className="text-xs text-green-200 mb-2 truncate">
        {data.onlyIfVariable ? `If: ${data.onlyIfVariable}` : 'Always send'}
      </div>
      <div className="flex justify-end space-x-1">
        <Button size="sm" variant="outline" onClick={() => data.onEdit?.(data)} className="h-5 w-5 p-0">
          <EditIcon className="w-2.5 h-2.5" />
        </Button>
        <Button size="sm" variant="error" onClick={() => data.onDelete?.(data.id)} className="h-5 w-5 p-0">
          <TrashIcon className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  apiCall: ApiCallNode,
  modelCall: ModelCallNode,
  conditionNode: ConditionNode,
  strategyTrigger: StrategyTriggerNode,
  telegramMessage: TelegramMessageNode,
};

export default function StrategyFlowEditor({ strategyId, onClose }: StrategyFlowEditorProps) {
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [modelCalls, setModelCalls] = useState<ModelCall[]>([]);
  const [conditionNodes, setConditionNodes] = useState<ConditionNode[]>([]);
  const [strategyTriggerNodes, setStrategyTriggerNodes] = useState<StrategyTriggerNode[]>([]);
  const [telegramMessageNodes, setTelegramMessageNodes] = useState<TelegramMessageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'flow' | 'api' | 'model' | 'condition' | 'trigger' | 'telegram'>('flow');
  const [editingApiCall, setEditingApiCall] = useState<ApiCall | null>(null);
  const [editingModelCall, setEditingModelCall] = useState<ModelCall | null>(null);
  const [editingConditionNode, setEditingConditionNode] = useState<ConditionNode | null>(null);
  const [editingStrategyTriggerNode, setEditingStrategyTriggerNode] = useState<StrategyTriggerNode | null>(null);
  const [editingTelegramMessageNode, setEditingTelegramMessageNode] = useState<TelegramMessageNode | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [executing, setExecuting] = useState(false);
  
  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const api = useApi();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    loadStrategyFlow();
  }, [strategyId]);

  // Update React Flow nodes when API/model calls change
  useEffect(() => {
    updateFlowNodes();
  }, [apiCalls, modelCalls, conditionNodes, strategyTriggerNodes, telegramMessageNodes]);

  const updateFlowNodes = () => {
    const allSteps = [
      ...apiCalls.map(call => ({ ...call, type: 'api' as const })),
      ...modelCalls.map(call => ({ ...call, type: 'model' as const })),
      ...conditionNodes.map(node => ({ ...node, type: 'condition' as const })),
      ...strategyTriggerNodes.map(node => ({ ...node, type: 'trigger' as const })),
      ...telegramMessageNodes.map(node => ({ ...node, type: 'telegram' as const }))
    ].sort((a, b) => a.orderIndex - b.orderIndex);

    // More compact layout - arrange in a flowing line
    const newNodes: Node[] = allSteps.map((step, index) => ({
      id: `${step.type}-${step.id}`,
      type: step.type === 'api' ? 'apiCall' : 
            step.type === 'model' ? 'modelCall' :
            step.type === 'condition' ? 'conditionNode' :
            step.type === 'trigger' ? 'strategyTrigger' : 'telegramMessage',
      position: { 
        x: 50 + (index * 250), // Closer spacing between nodes
        y: 50 + (index % 2) * 20 // Slight vertical offset for visual flow
      },
      data: {
        ...step,
        onEdit: step.type === 'api' ? setEditingApiCall : 
                step.type === 'model' ? setEditingModelCall :
                step.type === 'condition' ? setEditingConditionNode :
                step.type === 'trigger' ? setEditingStrategyTriggerNode :
                setEditingTelegramMessageNode,
        onTest: step.type === 'api' ? handleTestApiCall : undefined,
        onDelete: step.type === 'api' ? handleDeleteApiCall : 
                  step.type === 'model' ? handleDeleteModelCall :
                  step.type === 'condition' ? handleDeleteConditionNode :
                  step.type === 'trigger' ? handleDeleteStrategyTriggerNode :
                  handleDeleteTelegramMessageNode,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    // Create connections between consecutive nodes based on order
    const newEdges: Edge[] = [];
    for (let i = 0; i < newNodes.length - 1; i++) {
      newEdges.push({
        id: `edge-${i}`,
        source: newNodes[i].id,
        target: newNodes[i + 1].id,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: '#10b981', 
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#10b981',
        },
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const loadStrategyFlow = async () => {
    setLoading(true);
    try {
      const [
        apiCallsResult, 
        modelCallsResult, 
        conditionNodesResult,
        strategyTriggerNodesResult,
        telegramMessageNodesResult
      ] = await Promise.all([
        api.getApiCalls(strategyId),
        api.getModelCalls(strategyId),
        api.getConditionNodes(strategyId),
        api.getStrategyTriggerNodes(strategyId),
        api.getTelegramMessageNodes(strategyId)
      ]);
      
      if (apiCallsResult.success) {
        setApiCalls(apiCallsResult.data || []);
      }
      
      if (modelCallsResult.success) {
        setModelCalls(modelCallsResult.data || []);
      }

      if (conditionNodesResult.success) {
        setConditionNodes(conditionNodesResult.data || []);
      }

      if (strategyTriggerNodesResult.success) {
        setStrategyTriggerNodes(strategyTriggerNodesResult.data || []);
      }

      if (telegramMessageNodesResult.success) {
        setTelegramMessageNodes(telegramMessageNodesResult.data || []);
      }
    } catch (error) {
      console.error('Failed to load strategy flow:', error);
    }
    setLoading(false);
  };

  const handleSaveApiCall = async (apiCall: ApiCall) => {
    try {
      console.log('🔧 Attempting to save API call:', apiCall);
      
      let result;
      if (apiCall.id) {
        console.log('🔧 Updating existing API call with ID:', apiCall.id);
        result = await api.updateApiCall(strategyId, apiCall.id, apiCall);
      } else {
        console.log('🔧 Creating new API call for strategy:', strategyId);
        result = await api.createApiCall(strategyId, apiCall);
      }
      
      console.log('🔧 API call save result:', result);
      
      if (result.success) {
        console.log('✅ API call saved successfully');
        await loadStrategyFlow();
        setEditingApiCall(null);
      } else {
        console.error('❌ Failed to save API call:', result.error);
        alert(`Failed to save API call: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Exception while saving API call:', error);
      alert(`Error saving API call: ${error}`);
    }
  };

  const handleSaveModelCall = async (modelCall: ModelCall) => {
    try {
      console.log('🔧 Attempting to save model call:', modelCall);
      
      let result;
      if (modelCall.id) {
        console.log('🔧 Updating existing model call with ID:', modelCall.id);
        result = await api.updateModelCall(strategyId, modelCall.id, modelCall);
      } else {
        console.log('🔧 Creating new model call for strategy:', strategyId);
        result = await api.createModelCall(strategyId, modelCall);
      }
      
      console.log('🔧 Model call save result:', result);
      
      if (result.success) {
        console.log('✅ Model call saved successfully');
        await loadStrategyFlow();
        setEditingModelCall(null);
      } else {
        console.error('❌ Failed to save model call:', result.error);
        alert(`Failed to save model call: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Exception while saving model call:', error);
      alert(`Error saving model call: ${error}`);
    }
  };

  const handleDeleteApiCall = async (id: number) => {
    const result = await api.deleteApiCall(strategyId, id);
    if (result.success) {
      await loadStrategyFlow();
    }
  };

  const handleDeleteModelCall = async (id: number) => {
    const result = await api.deleteModelCall(strategyId, id);
    if (result.success) {
      await loadStrategyFlow();
    }
  };

  const handleTestApiCall = async (apiCall: ApiCall) => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await api.testApiCall(apiCall);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: 'Test failed' });
    }
    
    setTesting(false);
  };

  const handleExecuteStrategy = async () => {
    setExecuting(true);
    setExecutionLogs([]);
    
    try {
      const result = await api.runStrategy(strategyId);
      console.log('Strategy execution result:', result);
      // For now, just log the result - we'll improve logging later
    } catch (error) {
      console.error('Strategy execution failed:', error);
    }
    
    setExecuting(false);
  };

  const getNextOrderIndex = () => {
    const allSteps = [...apiCalls, ...modelCalls, ...conditionNodes, ...strategyTriggerNodes, ...telegramMessageNodes];
    return allSteps.length > 0 ? Math.max(...allSteps.map(s => s.orderIndex)) + 1 : 1;
  };

  const renderFlowView = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Strategy Flow</h3>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setEditingApiCall({
                name: '',
                url: '',
                method: 'GET',
                outputVariable: '',
                orderIndex: getNextOrderIndex(),
                enabled: true
              })} 
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <GlobeIcon className="w-4 h-4" />
              <span>Add API Call</span>
            </Button>
            <Button 
              onClick={() => setEditingModelCall({
                name: '',
                modelTier: 'cheap',
                userPrompt: '',
                includeApiData: true,
                outputVariable: '',
                orderIndex: getNextOrderIndex(),
                enabled: true
              })} 
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              <BrainIcon className="w-4 h-4" />
              <span>Add Model Call</span>
            </Button>
            <Button 
              onClick={() => setEditingConditionNode({
                name: '',
                conditionType: 'variable_value',
                leftOperand: '',
                operator: '==',
                rightOperand: '',
                orderIndex: getNextOrderIndex(),
                enabled: true
              })} 
              className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700"
            >
              <ConditionIcon className="w-4 h-4" />
              <span>Add Condition</span>
            </Button>
            <Button 
              onClick={() => setEditingStrategyTriggerNode({
                name: '',
                targetStrategyId: 1,
                waitForCompletion: false,
                orderIndex: getNextOrderIndex(),
                enabled: true
              })} 
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700"
            >
              <TriggerIcon className="w-4 h-4" />
              <span>Trigger Strategy</span>
            </Button>
            <Button 
              onClick={() => setEditingTelegramMessageNode({
                name: '',
                chatId: '@mychannel',
                messageTemplate: '🚨 Alert from Bull Trigger: {{message}}',
                includeApiData: false,
                messageType: 'info',
                parseMode: 'Markdown',
                orderIndex: getNextOrderIndex(),
                enabled: true
              })} 
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <TelegramIcon className="w-4 h-4" />
              <span>Send to Telegram</span>
            </Button>
            <Button 
              onClick={handleExecuteStrategy} 
              disabled={executing} 
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              <PlayIcon className="w-4 h-4" />
              <span>{executing ? 'Executing...' : 'Run Strategy'}</span>
            </Button>
          </div>
        </div>

        <div className="h-96 bg-gray-900 rounded-lg border border-gray-700">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            className="bg-gray-900"
          >
            <Controls className="bg-gray-800 border border-gray-600" />
            <Background color="#374151" gap={16} />
          </ReactFlow>
        </div>

        {nodes.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">No Flow Steps Configured</h3>
              <p className="text-gray-400 mb-4">
                Add API calls and model calls to build your strategy flow
              </p>
              <div className="flex justify-center space-x-4">
                <Button onClick={() => setEditingApiCall({
                  name: '',
                  url: '',
                  method: 'GET',
                  outputVariable: '',
                  orderIndex: getNextOrderIndex(),
                  enabled: true
                })}>
                  <GlobeIcon className="w-4 h-4 mr-2" />
                  Add API Call
                </Button>
                <Button onClick={() => setEditingModelCall({
                  name: '',
                  modelTier: 'cheap',
                  userPrompt: '',
                  includeApiData: true,
                  outputVariable: '',
                  orderIndex: getNextOrderIndex(),
                  enabled: true
                })}>
                  <BrainIcon className="w-4 h-4 mr-2" />
                  Add Model Call
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {executionLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {executionLogs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-800 rounded">
                    <div className="flex-shrink-0">
                      {log.error ? (
                        <XMarkIcon className="w-4 h-4 text-red-400" />
                      ) : (
                        <CheckIcon className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{log.stepName}</p>
                      <p className="text-xs text-gray-400">{log.duration}ms</p>
                      {log.error && (
                        <p className="text-xs text-red-400 mt-1">{log.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderApiCallsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">API Calls</h3>
        <Button onClick={() => setEditingApiCall({
          name: '',
          url: '',
          method: 'GET',
          outputVariable: '',
          orderIndex: getNextOrderIndex(),
          enabled: true
        })} className="flex items-center space-x-2">
          <PlusIcon className="w-4 h-4" />
          <span>Add API Call</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {apiCalls.map((apiCall) => (
          <Card key={apiCall.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{apiCall.name}</h4>
                  <p className="text-sm text-gray-400">{apiCall.method} {apiCall.url}</p>
                  <p className="text-xs text-green-400">Output: {apiCall.outputVariable}</p>
                  {apiCall.jsonPath && (
                    <p className="text-xs text-blue-400">JSON Path: {apiCall.jsonPath}</p>
                  )}
                  {!apiCall.jsonPath && (
                    <p className="text-xs text-yellow-400">Full response will be stored</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleTestApiCall(apiCall)}
                    disabled={testing}
                  >
                    <TestTubeIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingApiCall(apiCall)}>
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="error" onClick={() => handleDeleteApiCall(apiCall.id!)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Test Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testResult.success ? (
              <>
                {testResult.data?.extractedValue !== undefined && (
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-2">
                      Extracted Value (JSON Path: {testResult.jsonPath || 'N/A'})
                    </h4>
                    <div className="bg-green-900/20 border border-green-700 rounded p-3">
                      <code className="text-green-300 text-sm">
                        {Array.isArray(testResult.data.extractedValue) 
                          ? JSON.stringify(testResult.data.extractedValue[0], null, 2)
                          : JSON.stringify(testResult.data.extractedValue, null, 2)
                        }
                      </code>
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Full API Response</h4>
                  <pre className="text-xs bg-gray-800 p-3 rounded text-gray-300 overflow-auto max-h-40">
                    {JSON.stringify(testResult.data?.data || testResult.data, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div>
                <h4 className="text-sm font-medium text-red-400 mb-2">Error</h4>
                <div className="bg-red-900/20 border border-red-700 rounded p-3">
                  <code className="text-red-300 text-sm">
                    {testResult.error || 'Unknown error'}
                  </code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderModelCallsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Model Calls</h3>
        <Button onClick={() => setEditingModelCall({
          name: '',
          modelTier: 'cheap',
          userPrompt: '',
          includeApiData: true,
          outputVariable: '',
          orderIndex: getNextOrderIndex(),
          enabled: true
        })} className="flex items-center space-x-2">
          <PlusIcon className="w-4 h-4" />
          <span>Add Model Call</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {modelCalls.map((modelCall) => (
          <Card key={modelCall.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{modelCall.name}</h4>
                  <p className="text-sm text-gray-400">{modelCall.modelTier} model</p>
                  <p className="text-xs text-green-400">Output: {modelCall.outputVariable}</p>
                  <p className="text-xs text-purple-400">
                    {modelCall.includeApiData ? 'Includes API data' : 'No API data'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingModelCall(modelCall)}>
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="error" onClick={() => handleDeleteModelCall(modelCall.id!)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderConditionNodesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Condition Nodes</h3>
        <Button onClick={() => setEditingConditionNode({
          name: '',
          conditionType: 'variable_value',
          leftOperand: '',
          operator: '==',
          rightOperand: '',
          orderIndex: getNextOrderIndex(),
          enabled: true
        })} className="flex items-center space-x-2">
          <PlusIcon className="w-4 h-4" />
          <span>Add Condition</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {conditionNodes.map((conditionNode) => (
          <Card key={conditionNode.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{conditionNode.name}</h4>
                  <p className="text-sm text-gray-400">{conditionNode.conditionType}</p>
                  <p className="text-xs text-yellow-400">
                    {conditionNode.leftOperand} {conditionNode.operator} {conditionNode.rightOperand}
                  </p>
                  <p className="text-xs text-green-400">
                    True → {conditionNode.trueOutputVariable || 'true'} | False → {conditionNode.falseOutputVariable || 'false'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingConditionNode(conditionNode)}>
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="error" onClick={() => handleDeleteConditionNode(conditionNode.id!)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStrategyTriggerNodesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Strategy Trigger Nodes</h3>
        <Button onClick={() => setEditingStrategyTriggerNode({
          name: '',
          targetStrategyId: 1,
          waitForCompletion: false,
          orderIndex: getNextOrderIndex(),
          enabled: true
        })} className="flex items-center space-x-2">
          <PlusIcon className="w-4 h-4" />
          <span>Add Trigger</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {strategyTriggerNodes.map((triggerNode) => (
          <Card key={triggerNode.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{triggerNode.name}</h4>
                  <p className="text-sm text-gray-400">→ Strategy #{triggerNode.targetStrategyId}</p>
                  <p className="text-xs text-orange-400">
                    {triggerNode.conditionVariable ? `Condition: ${triggerNode.conditionVariable}` : 'Always trigger'}
                  </p>
                  <p className="text-xs text-orange-400">
                    {triggerNode.waitForCompletion ? 'Wait for completion' : 'Fire & forget'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingStrategyTriggerNode(triggerNode)}>
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="error" onClick={() => handleDeleteStrategyTriggerNode(triggerNode.id!)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTelegramMessageNodesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Telegram Message Nodes</h3>
        <Button onClick={() => setEditingTelegramMessageNode({
          name: '',
          chatId: '@mychannel',
          messageTemplate: '🚨 Alert from Bull Trigger: {{message}}',
          includeApiData: false,
          messageType: 'info',
          parseMode: 'Markdown',
          orderIndex: getNextOrderIndex(),
          enabled: true
        })} className="flex items-center space-x-2">
          <PlusIcon className="w-4 h-4" />
          <span>Add Telegram Message</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {telegramMessageNodes.map((telegramNode) => (
          <Card key={telegramNode.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{telegramNode.name}</h4>
                  <p className="text-sm text-gray-400">#{telegramNode.chatId}</p>
                  <p className="text-xs text-green-400">{telegramNode.messageType} message</p>
                  <p className="text-xs text-green-400">
                    {telegramNode.onlyIfVariable ? `Only if: ${telegramNode.onlyIfVariable}` : 'Always send'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingTelegramMessageNode(telegramNode)}>
                    <EditIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="error" onClick={() => handleDeleteTelegramMessageNode(telegramNode.id!)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const handleSaveConditionNode = async (conditionNode: ConditionNode) => {
    try {
      let result;
      if (conditionNode.id) {
        result = await api.updateConditionNode(strategyId, conditionNode.id, conditionNode);
      } else {
        result = await api.createConditionNode(strategyId, conditionNode);
      }
      
      if (result.success) {
        await loadStrategyFlow();
        setEditingConditionNode(null);
      } else {
        alert(`Failed to save condition node: ${result.error}`);
      }
    } catch (error) {
      alert(`Error saving condition node: ${error}`);
    }
  };

  const handleDeleteConditionNode = async (id: number) => {
    const result = await api.deleteConditionNode(strategyId, id);
    if (result.success) {
      await loadStrategyFlow();
    }
  };

  const handleSaveStrategyTriggerNode = async (triggerNode: StrategyTriggerNode) => {
    try {
      let result;
      if (triggerNode.id) {
        result = await api.updateStrategyTriggerNode(strategyId, triggerNode.id, triggerNode);
      } else {
        result = await api.createStrategyTriggerNode(strategyId, triggerNode);
      }
      
      if (result.success) {
        await loadStrategyFlow();
        setEditingStrategyTriggerNode(null);
      } else {
        alert(`Failed to save strategy trigger node: ${result.error}`);
      }
    } catch (error) {
      alert(`Error saving strategy trigger node: ${error}`);
    }
  };

  const handleDeleteStrategyTriggerNode = async (id: number) => {
    const result = await api.deleteStrategyTriggerNode(strategyId, id);
    if (result.success) {
      await loadStrategyFlow();
    }
  };

  const handleSaveTelegramMessageNode = async (telegramNode: TelegramMessageNode) => {
    try {
      let result;
      if (telegramNode.id) {
        result = await api.updateTelegramMessageNode(strategyId, telegramNode.id, telegramNode);
      } else {
        result = await api.createTelegramMessageNode(strategyId, telegramNode);
      }
      
      if (result.success) {
        await loadStrategyFlow();
        setEditingTelegramMessageNode(null);
      } else {
        alert(`Failed to save telegram message node: ${result.error}`);
      }
    } catch (error) {
      alert(`Error saving telegram message node: ${error}`);
    }
  };

  const handleDeleteTelegramMessageNode = async (id: number) => {
    const result = await api.deleteTelegramMessageNode(strategyId, id);
    if (result.success) {
      await loadStrategyFlow();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
        <div className="text-blue-400">Loading strategy flow...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="h-full overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-white">Strategy Flow Editor</CardTitle>
                <Button variant="outline" onClick={onClose}>
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex space-x-1">
                <Button
                  variant={selectedTab === 'flow' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTab('flow')}
                >
                  Flow View
                </Button>
                <Button
                  variant={selectedTab === 'api' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTab('api')}
                >
                  API Calls ({apiCalls.length})
                </Button>
                <Button
                  variant={selectedTab === 'model' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTab('model')}
                >
                  Model Calls ({modelCalls.length})
                </Button>
                <Button
                  variant={selectedTab === 'condition' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTab('condition')}
                >
                  Conditions ({conditionNodes.length})
                </Button>
                <Button
                  variant={selectedTab === 'trigger' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTab('trigger')}
                >
                  Triggers ({strategyTriggerNodes.length})
                </Button>
                <Button
                  variant={selectedTab === 'telegram' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTab('telegram')}
                >
                  Telegram ({telegramMessageNodes.length})
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="max-h-[70vh] overflow-y-auto p-6">
              {selectedTab === 'flow' && renderFlowView()}
              {selectedTab === 'api' && renderApiCallsTab()}
              {selectedTab === 'model' && renderModelCallsTab()}
              {selectedTab === 'condition' && renderConditionNodesTab()}
              {selectedTab === 'trigger' && renderStrategyTriggerNodesTab()}
              {selectedTab === 'telegram' && renderTelegramMessageNodesTab()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* API Call Editor Modal */}
      {editingApiCall && (
        <ApiCallEditor
          apiCall={editingApiCall}
          onSave={handleSaveApiCall}
          onCancel={() => setEditingApiCall(null)}
          onTest={handleTestApiCall}
        />
      )}

      {/* Model Call Editor Modal */}
      {editingModelCall && (
        <ModelCallEditor
          modelCall={editingModelCall}
          onSave={handleSaveModelCall}
          onCancel={() => setEditingModelCall(null)}
        />
      )}

      {/* Telegram Message Node Editor Modal */}
      {editingTelegramMessageNode && (
        <TelegramMessageNodeEditor
          telegramNode={editingTelegramMessageNode}
          onSave={handleSaveTelegramMessageNode}
          onCancel={() => setEditingTelegramMessageNode(null)}
        />
      )}
    </div>
  );
}

// API Call Editor Component
function ApiCallEditor({ 
  apiCall, 
  onSave, 
  onCancel, 
  onTest 
}: { 
  apiCall: ApiCall; 
  onSave: (apiCall: ApiCall) => void; 
  onCancel: () => void;
  onTest: (apiCall: ApiCall) => void;
}) {
  const [formData, setFormData] = useState(apiCall);

  const handleSave = () => {
    // Ensure all required fields are present and properly formatted
    const cleanedData = {
      ...formData,
      // Trim whitespace and ensure proper formatting
      name: formData.name.trim(),
      url: formData.url.trim(),
      outputVariable: formData.outputVariable.trim(),
      jsonPath: formData.jsonPath?.trim() || undefined,
      headers: formData.headers?.trim() || undefined,
      body: formData.body?.trim() || undefined,
      // Ensure proper data types
      orderIndex: Number(formData.orderIndex),
      enabled: Boolean(formData.enabled)
    };
    
    console.log('🔧 Saving API call with data:', cleanedData);
    onSave(cleanedData);
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">
            {apiCall.id ? 'Edit API Call' : 'New API Call'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="API Call Name"
                required
              />
            </div>
            <div>
              <Label htmlFor="method">Method</Label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({...formData, method: e.target.value})}
                className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              placeholder="https://api.example.com/data"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jsonPath">JSON Path (optional)</Label>
              <Input
                id="jsonPath"
                value={formData.jsonPath || ''}
                onChange={(e) => setFormData({...formData, jsonPath: e.target.value || undefined})}
                placeholder="$.data.price"
              />
              <p className="text-xs text-gray-400 mt-1">
                Use JSONPath syntax to extract specific values
              </p>
            </div>
            <div>
              <Label htmlFor="outputVariable">Output Variable *</Label>
              <Input
                id="outputVariable"
                value={formData.outputVariable}
                onChange={(e) => setFormData({...formData, outputVariable: e.target.value})}
                placeholder="btcPrice"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="headers">Headers (JSON, optional)</Label>
            <Textarea
              id="headers"
              value={formData.headers || ''}
              onChange={(e) => setFormData({...formData, headers: e.target.value || undefined})}
              placeholder='{"Authorization": "Bearer token"}'
              rows={2}
            />
          </div>

          {formData.method !== 'GET' && (
            <div>
              <Label htmlFor="body">Body (JSON, optional)</Label>
              <Textarea
                id="body"
                value={formData.body || ''}
                onChange={(e) => setFormData({...formData, body: e.target.value || undefined})}
                placeholder='{"key": "value"}'
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => onTest(formData)} disabled={!formData.url}>
              <TestTubeIcon className="w-4 h-4 mr-2" />
              Test API Call
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.url.trim() || !formData.outputVariable.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Model Call Editor Component  
function ModelCallEditor({ 
  modelCall, 
  onSave, 
  onCancel 
}: { 
  modelCall: ModelCall; 
  onSave: (modelCall: ModelCall) => void; 
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(modelCall);

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-white">
            {modelCall.id ? 'Edit Model Call' : 'New Model Call'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Market Analysis"
              />
            </div>
            <div>
              <Label htmlFor="modelTier">Model Tier</Label>
              <select
                value={formData.modelTier}
                onChange={(e) => setFormData({...formData, modelTier: e.target.value as 'cheap' | 'deep'})}
                className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="cheap">Cheap Model</option>
                <option value="deep">Deep Model</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="outputVariable">Output Variable</Label>
            <Input
              id="outputVariable"
              value={formData.outputVariable}
              onChange={(e) => setFormData({...formData, outputVariable: e.target.value})}
              placeholder="analysis"
            />
          </div>

          <div>
            <Label htmlFor="systemPrompt">System Prompt (optional)</Label>
            <Textarea
              id="systemPrompt"
              value={formData.systemPrompt || ''}
              onChange={(e) => setFormData({...formData, systemPrompt: e.target.value})}
              placeholder="You are a cryptocurrency market analyst..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="userPrompt">User Prompt</Label>
            <Textarea
              id="userPrompt"
              value={formData.userPrompt}
              onChange={(e) => setFormData({...formData, userPrompt: e.target.value})}
              placeholder="Analyze the market data and provide recommendations..."
              rows={5}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeApiData"
              checked={formData.includeApiData}
              onChange={(e) => setFormData({...formData, includeApiData: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="includeApiData">Include API data in prompt</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(formData)}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Condition Node Editor Component
function ConditionNodeEditor({ 
  conditionNode, 
  onSave, 
  onCancel 
}: { 
  conditionNode: ConditionNode; 
  onSave: (conditionNode: ConditionNode) => void; 
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(conditionNode);

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">
            {conditionNode.id ? 'Edit Condition Node' : 'New Condition Node'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Price Check"
              />
            </div>
            <div>
              <Label htmlFor="conditionType">Condition Type</Label>
              <select
                value={formData.conditionType}
                onChange={(e) => setFormData({...formData, conditionType: e.target.value as any})}
                className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="variable_value">Variable Value</option>
                <option value="api_result">API Result</option>
                <option value="model_response">Model Response</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="leftOperand">Left Operand</Label>
              <Input
                id="leftOperand"
                value={formData.leftOperand}
                onChange={(e) => setFormData({...formData, leftOperand: e.target.value})}
                placeholder="btcPrice"
              />
            </div>
            <div>
              <Label htmlFor="operator">Operator</Label>
              <select
                value={formData.operator}
                onChange={(e) => setFormData({...formData, operator: e.target.value as any})}
                className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="==">=</option>
                <option value="!=">!=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="contains">contains</option>
                <option value="startsWith">starts with</option>
                <option value="endsWith">ends with</option>
              </select>
            </div>
            <div>
              <Label htmlFor="rightOperand">Right Operand</Label>
              <Input
                id="rightOperand"
                value={formData.rightOperand}
                onChange={(e) => setFormData({...formData, rightOperand: e.target.value})}
                placeholder="50000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trueOutputVariable">True Output Variable (optional)</Label>
              <Input
                id="trueOutputVariable"
                value={formData.trueOutputVariable || ''}
                onChange={(e) => setFormData({...formData, trueOutputVariable: e.target.value || undefined})}
                placeholder="highPrice"
              />
            </div>
            <div>
              <Label htmlFor="falseOutputVariable">False Output Variable (optional)</Label>
              <Input
                id="falseOutputVariable"
                value={formData.falseOutputVariable || ''}
                onChange={(e) => setFormData({...formData, falseOutputVariable: e.target.value || undefined})}
                placeholder="lowPrice"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(formData)}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Strategy Trigger Node Editor Component
function StrategyTriggerNodeEditor({ 
  triggerNode, 
  onSave, 
  onCancel 
}: { 
  triggerNode: StrategyTriggerNode; 
  onSave: (triggerNode: StrategyTriggerNode) => void; 
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(triggerNode);

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">
            {triggerNode.id ? 'Edit Strategy Trigger' : 'New Strategy Trigger'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Trigger Alert Strategy"
              />
            </div>
            <div>
              <Label htmlFor="targetStrategyId">Target Strategy ID</Label>
              <Input
                id="targetStrategyId"
                type="number"
                value={formData.targetStrategyId}
                onChange={(e) => setFormData({...formData, targetStrategyId: Number(e.target.value)})}
                placeholder="2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="conditionVariable">Condition Variable (optional)</Label>
            <Input
              id="conditionVariable"
              value={formData.conditionVariable || ''}
              onChange={(e) => setFormData({...formData, conditionVariable: e.target.value || undefined})}
              placeholder="highPrice"
            />
            <p className="text-xs text-gray-400 mt-1">
              Only trigger if this variable is truthy. Leave empty to always trigger.
            </p>
          </div>

          <div>
            <Label htmlFor="passVariables">Variables to Pass (comma-separated)</Label>
            <Input
              id="passVariables"
              value={formData.passVariables?.join(', ') || ''}
              onChange={(e) => setFormData({...formData, passVariables: e.target.value ? e.target.value.split(',').map(v => v.trim()) : []})}
              placeholder="btcPrice, analysis"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="waitForCompletion"
                checked={formData.waitForCompletion}
                onChange={(e) => setFormData({...formData, waitForCompletion: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="waitForCompletion">Wait for completion</Label>
            </div>
            <div>
              <Label htmlFor="outputVariable">Output Variable (if waiting)</Label>
              <Input
                id="outputVariable"
                value={formData.outputVariable || ''}
                onChange={(e) => setFormData({...formData, outputVariable: e.target.value || undefined})}
                placeholder="triggerResult"
                disabled={!formData.waitForCompletion}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(formData)}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Telegram Message Node Editor Component
function TelegramMessageNodeEditor({ 
  telegramNode, 
  onSave, 
  onCancel 
}: { 
  telegramNode: TelegramMessageNode; 
  onSave: (telegramNode: TelegramMessageNode) => void; 
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(telegramNode);

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-white">
            {telegramNode.id ? 'Edit Telegram Message' : 'New Telegram Message'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Price Alert"
              />
            </div>
            <div>
              <Label htmlFor="chatId">Telegram Chat ID</Label>
              <Input
                id="chatId"
                value={formData.chatId}
                onChange={(e) => setFormData({...formData, chatId: e.target.value})}
                placeholder="@mychannel or -1001234567890"
              />
              <p className="text-xs text-gray-400 mt-1">
                Use @channelname for public channels or chat ID for private groups
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="messageTemplate">Message Template</Label>
            <Textarea
              id="messageTemplate"
              value={formData.messageTemplate}
              onChange={(e) => setFormData({...formData, messageTemplate: e.target.value})}
              placeholder="🚨 BTC Price Alert: {{btcPrice}} USDT"
              rows={4}
            />
            <p className="text-xs text-gray-400 mt-1">
              Use {'{{'} variableName {'}'} to include variables in your message.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="messageType">Message Type</Label>
              <select
                value={formData.messageType}
                onChange={(e) => setFormData({...formData, messageType: e.target.value as any})}
                className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <Label htmlFor="parseMode">Parse Mode</Label>
              <select
                value={formData.parseMode || 'Markdown'}
                onChange={(e) => setFormData({...formData, parseMode: e.target.value as any})}
                className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Markdown">Markdown</option>
                <option value="HTML">HTML</option>
                <option value="none">Plain Text</option>
              </select>
            </div>
            <div>
              <Label htmlFor="onlyIfVariable">Only Send If Variable (optional)</Label>
              <Input
                id="onlyIfVariable"
                value={formData.onlyIfVariable || ''}
                onChange={(e) => setFormData({...formData, onlyIfVariable: e.target.value || undefined})}
                placeholder="highPrice"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeApiData"
              checked={formData.includeApiData}
              onChange={(e) => setFormData({...formData, includeApiData: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="includeApiData">Include all API data in message</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSave(formData)}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 