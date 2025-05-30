import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useApi } from '../services/websocketService';
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
  XMarkIcon
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

export default function StrategyFlowEditor({ strategyId, onClose }: StrategyFlowEditorProps) {
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [modelCalls, setModelCalls] = useState<ModelCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'flow' | 'api' | 'model'>('flow');
  const [editingApiCall, setEditingApiCall] = useState<ApiCall | null>(null);
  const [editingModelCall, setEditingModelCall] = useState<ModelCall | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [executing, setExecuting] = useState(false);
  
  const api = useApi();

  useEffect(() => {
    loadStrategyFlow();
  }, [strategyId]);

  const loadStrategyFlow = async () => {
    setLoading(true);
    try {
      const [apiCallsResult, modelCallsResult] = await Promise.all([
        api.getApiCalls(strategyId),
        api.getModelCalls(strategyId)
      ]);
      
      if (apiCallsResult.success) {
        setApiCalls(apiCallsResult.data || []);
      }
      
      if (modelCallsResult.success) {
        setModelCalls(modelCallsResult.data || []);
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
    const allSteps = [...apiCalls, ...modelCalls];
    return allSteps.length > 0 ? Math.max(...allSteps.map(s => s.orderIndex)) + 1 : 1;
  };

  const renderFlowView = () => {
    const allSteps = [
      ...apiCalls.map(call => ({ ...call, type: 'api' as const })),
      ...modelCalls.map(call => ({ ...call, type: 'model' as const }))
    ].sort((a, b) => a.orderIndex - b.orderIndex);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Strategy Flow</h3>
          <Button onClick={handleExecuteStrategy} disabled={executing} className="flex items-center space-x-2">
            <PlayIcon className="w-4 h-4" />
            <span>{executing ? 'Executing...' : 'Run Strategy'}</span>
          </Button>
        </div>

        {allSteps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-400">No steps configured. Add API calls or model calls to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {allSteps.map((step, index) => (
              <div key={`${step.type}-${step.id}`} className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {index + 1}
                </div>
                
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {step.type === 'api' ? (
                            <GlobeIcon className="w-5 h-5 text-blue-400" />
                          ) : (
                            <BrainIcon className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{step.name}</h4>
                          <p className="text-sm text-gray-400">
                            {step.type === 'api' 
                              ? `${(step as any).method} ${(step as any).url}`
                              : `${(step as any).modelTier} model • Output: ${step.outputVariable}`
                            }
                          </p>
                          {step.type === 'api' && (step as any).jsonPath && (
                            <p className="text-xs text-green-400 mt-1">Extract: {(step as any).jsonPath}</p>
                          )}
                        </div>
                      </div>
                      
                      <Badge variant={step.enabled ? 'success' : 'default'}>
                        {step.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                
                {index < allSteps.length - 1 && (
                  <ArrowRightIcon className="w-5 h-5 text-gray-500" />
                )}
              </div>
            ))}
          </div>
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
              </div>
            </CardHeader>
            
            <CardContent className="max-h-[70vh] overflow-y-auto p-6">
              {selectedTab === 'flow' && renderFlowView()}
              {selectedTab === 'api' && renderApiCallsTab()}
              {selectedTab === 'model' && renderModelCallsTab()}
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