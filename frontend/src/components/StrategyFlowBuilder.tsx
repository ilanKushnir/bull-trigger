import React, { useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import MonacoEditor from './MonacoEditor';

// Type definitions
interface TriggerNodeData {
  label: string;
  type: string;
  schedule: string;
}

interface ApiCallNodeData {
  label: string;
  endpoint: string;
  method: string;
}

interface ModelCallNodeData {
  label: string;
  model: string;
  prompt: string;
}

interface OutputNodeData {
  label: string;
  type: string;
}

interface DecisionNodeData {
  label: string;
  condition: string;
}

// Custom Node Components
const TriggerNode = ({ data }: { data: TriggerNodeData }) => {
  return (
    <div className="bg-blue-600 border-2 border-blue-500 rounded-lg px-4 py-2 shadow-lg min-w-[140px]">
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="text-white text-center">
        <div className="text-xs font-bold">⚡ TRIGGER</div>
        <div className="text-xs mt-1">{data.label}</div>
      </div>
    </div>
  );
};

const ApiCallNode = ({ data }: { data: ApiCallNodeData }) => {
  return (
    <div className="bg-green-600 border-2 border-green-500 rounded-lg px-4 py-2 shadow-lg min-w-[140px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="text-white text-center">
        <div className="text-xs font-bold">🌐 API CALL</div>
        <div className="text-xs mt-1">{data.label}</div>
        <div className="text-xs text-green-200">{data.endpoint}</div>
      </div>
    </div>
  );
};

const ModelCallNode = ({ data }: { data: ModelCallNodeData }) => {
  return (
    <div className="bg-purple-600 border-2 border-purple-500 rounded-lg px-4 py-2 shadow-lg min-w-[140px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <div className="text-white text-center">
        <div className="text-xs font-bold">🧠 AI MODEL</div>
        <div className="text-xs mt-1">{data.label}</div>
        <div className="text-xs text-purple-200">{data.model}</div>
      </div>
    </div>
  );
};

const OutputNode = ({ data }: { data: OutputNodeData }) => {
  return (
    <div className="bg-orange-600 border-2 border-orange-500 rounded-lg px-4 py-2 shadow-lg min-w-[140px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="text-white text-center">
        <div className="text-xs font-bold">📤 OUTPUT</div>
        <div className="text-xs mt-1">{data.label}</div>
        <div className="text-xs text-orange-200">{data.type}</div>
      </div>
    </div>
  );
};

const DecisionNode = ({ data }: { data: DecisionNodeData }) => {
  return (
    <div className="bg-yellow-600 border-2 border-yellow-500 rounded-lg px-4 py-2 shadow-lg min-w-[140px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
      <div className="text-white text-center">
        <div className="text-xs font-bold">❓ DECISION</div>
        <div className="text-xs mt-1">{data.label}</div>
        <div className="text-xs text-yellow-200">{data.condition}</div>
      </div>
    </div>
  );
};

// Node types configuration
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  apiCall: ApiCallNode,
  modelCall: ModelCallNode,
  output: OutputNode,
  decision: DecisionNode,
};

interface StrategyFlowBuilderProps {
  strategyId?: string;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

export default function StrategyFlowBuilder({ strategyId, onSave }: StrategyFlowBuilderProps) {
  // Initial nodes and edges for a sample strategy
  const initialNodes: Node[] = [
    {
      id: '1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: { label: 'Cron Schedule', type: 'cron', schedule: '*/15 * * * *' },
    },
    {
      id: '2',
      type: 'apiCall',
      position: { x: 100, y: 150 },
      data: { label: 'Fetch Price Data', endpoint: '/api/prices', method: 'GET' },
    },
    {
      id: '3',
      type: 'apiCall',
      position: { x: 400, y: 150 },
      data: { label: 'Get Technical Indicators', endpoint: '/api/indicators', method: 'GET' },
    },
    {
      id: '4',
      type: 'modelCall',
      position: { x: 250, y: 250 },
      data: { label: 'Market Analysis', model: 'gpt-4-turbo', prompt: 'Analyze market conditions' },
    },
    {
      id: '5',
      type: 'decision',
      position: { x: 250, y: 350 },
      data: { label: 'Signal Confidence', condition: 'confidence >= 0.8' },
    },
    {
      id: '6',
      type: 'output',
      position: { x: 150, y: 450 },
      data: { label: 'Send Signal', type: 'telegram_message' },
    },
    {
      id: '7',
      type: 'output',
      position: { x: 350, y: 450 },
      data: { label: 'Log Decision', type: 'database_record' },
    },
  ];

  const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e1-3', source: '1', target: '3', animated: true },
    { id: 'e2-4', source: '2', target: '4' },
    { id: 'e3-4', source: '3', target: '4' },
    { id: 'e4-5', source: '4', target: '5' },
    { id: 'e5-6', source: '5', target: '6', label: 'High Confidence' },
    { id: 'e5-7', source: '5', target: '7', label: 'Low Confidence' },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNewNode = (type: string) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: getDefaultNodeData(type),
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const getDefaultNodeData = (type: string) => {
    switch (type) {
      case 'trigger':
        return { label: 'New Trigger', type: 'cron', schedule: '* * * * *' };
      case 'apiCall':
        return { label: 'New API Call', endpoint: '/api/endpoint', method: 'GET' };
      case 'modelCall':
        return { label: 'New Model Call', model: 'gpt-3.5-turbo', prompt: 'Enter prompt...' };
      case 'decision':
        return { label: 'New Decision', condition: 'value > threshold' };
      case 'output':
        return { label: 'New Output', type: 'telegram_message' };
      default:
        return { label: 'New Node' };
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowNodeEditor(true);
  }, []);

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  };

  const deleteSelectedNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
      setSelectedNode(null);
      setShowNodeEditor(false);
    }
  };

  const saveFlow = () => {
    if (onSave) {
      onSave(nodes, edges);
    }
    alert('Strategy flow saved successfully!');
  };

  const validateFlow = () => {
    const hasValidFlow = nodes.length > 0 && edges.length > 0;
    const hasTrigger = nodes.some(node => node.type === 'trigger');
    const hasOutput = nodes.some(node => node.type === 'output');
    
    if (!hasValidFlow) {
      alert('Flow must have at least one node and one connection');
      return false;
    }
    if (!hasTrigger) {
      alert('Flow must have at least one trigger node');
      return false;
    }
    if (!hasOutput) {
      alert('Flow must have at least one output node');
      return false;
    }
    
    alert('✅ Flow validation passed!');
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center justify-between">
            <span>🎨 Visual Strategy Builder</span>
            <div className="flex space-x-2">
              <Button size="sm" onClick={validateFlow} variant="outline">
                ✅ Validate
              </Button>
              <Button size="sm" onClick={saveFlow} variant="success">
                💾 Save Flow
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" onClick={() => addNewNode('trigger')} className="bg-blue-600 hover:bg-blue-700">
              ⚡ Add Trigger
            </Button>
            <Button size="sm" onClick={() => addNewNode('apiCall')} className="bg-green-600 hover:bg-green-700">
              🌐 Add API Call
            </Button>
            <Button size="sm" onClick={() => addNewNode('modelCall')} className="bg-purple-600 hover:bg-purple-700">
              🧠 Add AI Model
            </Button>
            <Button size="sm" onClick={() => addNewNode('decision')} className="bg-yellow-600 hover:bg-yellow-700">
              ❓ Add Decision
            </Button>
            <Button size="sm" onClick={() => addNewNode('output')} className="bg-orange-600 hover:bg-orange-700">
              📤 Add Output
            </Button>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>💡 <strong>Tip:</strong> Drag nodes to position them, click to edit properties</span>
            <Badge variant="info">Nodes: {nodes.length}</Badge>
            <Badge variant="success">Connections: {edges.length}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Flow Canvas */}
      <div className="relative">
        <div style={{ height: '600px' }} className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-900"
            defaultEdgeOptions={{
              style: { stroke: '#6B7280', strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6B7280' },
            }}
          >
            <Background color="#374151" gap={16} />
            <Controls className="bg-gray-800 border-gray-600 text-white" />
          </ReactFlow>
        </div>
      </div>

      {/* Node Editor Panel */}
      {showNodeEditor && selectedNode && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center justify-between">
              <span>✏️ Edit Node: {(selectedNode.data as any).label}</span>
              <div className="flex space-x-2">
                <Button size="sm" onClick={deleteSelectedNode} variant="error">
                  🗑️ Delete
                </Button>
                <Button size="sm" onClick={() => setShowNodeEditor(false)} variant="outline">
                  ✖️ Close
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Node Label
                </label>
                <input
                  type="text"
                  value={(selectedNode.data as any).label || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {selectedNode.type === 'trigger' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cron Schedule
                  </label>
                  <input
                    type="text"
                    value={(selectedNode.data as unknown as TriggerNodeData).schedule || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { schedule: e.target.value })}
                    placeholder="*/15 * * * *"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {selectedNode.type === 'apiCall' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Endpoint
                    </label>
                    <input
                      type="text"
                      value={(selectedNode.data as unknown as ApiCallNodeData).endpoint || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { endpoint: e.target.value })}
                      placeholder="/api/prices"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      HTTP Method
                    </label>
                    <select
                      value={(selectedNode.data as unknown as ApiCallNodeData).method || 'GET'}
                      onChange={(e) => updateNodeData(selectedNode.id, { method: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                </>
              )}

              {selectedNode.type === 'modelCall' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      AI Model
                    </label>
                    <select
                      value={(selectedNode.data as unknown as ModelCallNodeData).model || 'gpt-3.5-turbo'}
                      onChange={(e) => updateNodeData(selectedNode.id, { model: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Cheap)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo (Deep)</option>
                      <option value="gpt-4">GPT-4 (Deep)</option>
                    </select>
                  </div>
                  <div>
                    <MonacoEditor
                      title="🧠 AI Prompt Template"
                      value={(selectedNode.data as unknown as ModelCallNodeData).prompt || ''}
                      onChange={(value) => updateNodeData(selectedNode.id, { prompt: value || '' })}
                      language="markdown"
                      height="300px"
                      placeholder="Enter your AI prompt template here..."
                      showLanguageSelector={true}
                      showFormatButton={true}
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'decision' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Condition
                  </label>
                  <input
                    type="text"
                    value={(selectedNode.data as unknown as DecisionNodeData).condition || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                    placeholder="confidence >= 0.8"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {selectedNode.type === 'output' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Output Type
                  </label>
                  <select
                    value={(selectedNode.data as unknown as OutputNodeData).type || 'telegram_message'}
                    onChange={(e) => updateNodeData(selectedNode.id, { type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="telegram_message">Telegram Message</option>
                    <option value="database_record">Database Record</option>
                    <option value="webhook">Webhook</option>
                    <option value="email">Email Alert</option>
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 