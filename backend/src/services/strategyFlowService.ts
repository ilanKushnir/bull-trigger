import Database from 'better-sqlite3';
import path from 'path';
import { JSONPath } from 'jsonpath-plus';

// Use the same database path logic as server.ts
const cwd = process.cwd();
const isInBackendDir = cwd.endsWith('/backend');
const DB_FILE = process.env.DB_FILE || (isInBackendDir 
  ? path.resolve(cwd, 'database.sqlite')
  : path.resolve(cwd, 'backend/database.sqlite'));
const db = new Database(DB_FILE);

export interface ApiCall {
  id: number;
  strategyId: number;
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

export interface ModelCall {
  id: number;
  strategyId: number;
  name: string;
  modelTier: 'cheap' | 'deep';
  systemPrompt?: string;
  userPrompt: string;
  includeApiData: boolean;
  outputVariable: string;
  orderIndex: number;
  enabled: boolean;
}

export interface FlowExecutionResult {
  success: boolean;
  variables: Record<string, any>;
  logs: FlowExecutionLog[];
  error?: string;
}

export interface FlowExecutionLog {
  stepType: 'api_call' | 'model_call';
  stepId: number;
  stepName: string;
  input?: any;
  output?: any;
  error?: string;
  duration: number;
}

export class StrategyFlowService {
  
  // ===== API CALLS MANAGEMENT =====
  
  createApiCall(apiCall: Omit<ApiCall, 'id'>): number {
    const result: any = db.prepare(`
      INSERT INTO api_calls 
      (strategy_id, name, url, method, headers, body, json_path, output_variable, order_index, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      apiCall.strategyId,
      apiCall.name,
      apiCall.url,
      apiCall.method,
      apiCall.headers || null,
      apiCall.body || null,
      apiCall.jsonPath || null,
      apiCall.outputVariable,
      apiCall.orderIndex,
      apiCall.enabled ? 1 : 0
    );
    
    return result.lastInsertRowid;
  }

  updateApiCall(id: number, updates: Partial<ApiCall>): void {
    const fields: string[] = [];
    const values: any[] = [];
    
    // Define explicit field mappings
    const fieldMap: Record<string, string> = {
      strategyId: 'strategy_id',
      jsonPath: 'json_path',
      outputVariable: 'output_variable',
      orderIndex: 'order_index',
      // Direct mappings (no transformation needed)
      name: 'name',
      url: 'url',
      method: 'method',
      headers: 'headers',
      body: 'body',
      enabled: 'enabled'
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        const dbField = fieldMap[key] || key;
        fields.push(`${dbField} = ?`);
        // Convert boolean to integer for SQLite
        values.push(key === 'enabled' ? (value ? 1 : 0) : value);
      }
    });
    
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE api_calls SET ${fields.join(', ')} WHERE id = ?`;
      console.log('🔧 Executing SQL:', query, 'with values:', values);
      db.prepare(query).run(...values);
    }
  }

  deleteApiCall(id: number): void {
    db.prepare('DELETE FROM api_calls WHERE id = ?').run(id);
  }

  getApiCallsByStrategy(strategyId: number): ApiCall[] {
    const rows = db.prepare(`
      SELECT 
        id, 
        strategy_id as strategyId, 
        name, 
        url, 
        method, 
        headers, 
        body, 
        json_path as jsonPath, 
        output_variable as outputVariable, 
        order_index as orderIndex, 
        enabled 
      FROM api_calls 
      WHERE strategy_id = ? 
      ORDER BY order_index ASC
    `).all(strategyId) as any[];
    
    return rows.map(row => ({
      ...row,
      enabled: Boolean(row.enabled)
    })) as ApiCall[];
  }

  // ===== MODEL CALLS MANAGEMENT =====
  
  createModelCall(modelCall: Omit<ModelCall, 'id'>): number {
    const result: any = db.prepare(`
      INSERT INTO model_calls 
      (strategy_id, name, model_tier, system_prompt, user_prompt, include_api_data, output_variable, order_index, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      modelCall.strategyId,
      modelCall.name,
      modelCall.modelTier,
      modelCall.systemPrompt || null,
      modelCall.userPrompt,
      modelCall.includeApiData ? 1 : 0,
      modelCall.outputVariable,
      modelCall.orderIndex,
      modelCall.enabled ? 1 : 0
    );
    
    return result.lastInsertRowid;
  }

  updateModelCall(id: number, updates: Partial<ModelCall>): void {
    const fields: string[] = [];
    const values: any[] = [];
    
    // Define explicit field mappings
    const fieldMap: Record<string, string> = {
      strategyId: 'strategy_id',
      modelTier: 'model_tier',
      systemPrompt: 'system_prompt',
      userPrompt: 'user_prompt',
      includeApiData: 'include_api_data',
      outputVariable: 'output_variable',
      orderIndex: 'order_index',
      // Direct mappings (no transformation needed)
      name: 'name',
      enabled: 'enabled'
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        const dbField = fieldMap[key] || key;
        fields.push(`${dbField} = ?`);
        // Convert boolean to integer for SQLite
        values.push(['enabled', 'includeApiData'].includes(key) ? (value ? 1 : 0) : value);
      }
    });
    
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE model_calls SET ${fields.join(', ')} WHERE id = ?`;
      console.log('🔧 Executing SQL:', query, 'with values:', values);
      db.prepare(query).run(...values);
    }
  }

  deleteModelCall(id: number): void {
    db.prepare('DELETE FROM model_calls WHERE id = ?').run(id);
  }

  getModelCallsByStrategy(strategyId: number): ModelCall[] {
    const rows = db.prepare(`
      SELECT 
        id, 
        strategy_id as strategyId, 
        name, 
        model_tier as modelTier, 
        system_prompt as systemPrompt, 
        user_prompt as userPrompt, 
        include_api_data as includeApiData, 
        output_variable as outputVariable, 
        order_index as orderIndex, 
        enabled 
      FROM model_calls 
      WHERE strategy_id = ? 
      ORDER BY order_index ASC
    `).all(strategyId) as any[];
    
    return rows.map(row => ({
      ...row,
      enabled: Boolean(row.enabled),
      includeApiData: Boolean(row.includeApiData)
    })) as ModelCall[];
  }

  // ===== FLOW EXECUTION =====
  
  async executeStrategyFlow(strategyId: number, executionId: number): Promise<FlowExecutionResult> {
    const variables: Record<string, any> = {};
    const logs: FlowExecutionLog[] = [];
    
    try {
      // Get all API calls and model calls for this strategy
      const apiCalls = this.getApiCallsByStrategy(strategyId);
      const modelCalls = this.getModelCallsByStrategy(strategyId);
      
      // Combine and sort by order index
      const allSteps = [
        ...apiCalls.map(call => ({ ...call, type: 'api_call' as const })),
        ...modelCalls.map(call => ({ ...call, type: 'model_call' as const }))
      ].sort((a, b) => a.orderIndex - b.orderIndex);
      
      // Execute each step in order
      for (const step of allSteps) {
        if (!step.enabled) continue;
        
        const startTime = Date.now();
        let stepResult;
        let stepError;
        
        try {
          if (step.type === 'api_call') {
            stepResult = await this.executeApiCall(step as ApiCall, variables);
            variables[step.outputVariable] = stepResult;
          } else {
            stepResult = await this.executeModelCall(step as ModelCall, variables);
            variables[step.outputVariable] = stepResult;
          }
        } catch (error) {
          stepError = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Step ${step.name} failed:`, error);
        }
        
        const duration = Date.now() - startTime;
        
        const log: FlowExecutionLog = {
          stepType: step.type,
          stepId: step.id,
          stepName: step.name,
          input: step.type === 'model_call' ? { prompt: (step as ModelCall).userPrompt } : { url: (step as ApiCall).url },
          output: stepResult,
          error: stepError,
          duration
        };
        
        logs.push(log);
        
        // Save log to database
        this.saveExecutionLog(executionId, log);
        
        // If step failed and it's critical, stop execution
        if (stepError) {
          throw new Error(`Step "${step.name}" failed: ${stepError}`);
        }
      }
      
      return {
        success: true,
        variables,
        logs
      };
      
    } catch (error) {
      return {
        success: false,
        variables,
        logs,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private async executeApiCall(apiCall: ApiCall, variables: Record<string, any>): Promise<any> {
    const url = this.interpolateVariables(apiCall.url, variables);
    const headers = apiCall.headers ? JSON.parse(this.interpolateVariables(apiCall.headers, variables)) : {};
    const body = apiCall.body ? this.interpolateVariables(apiCall.body, variables) : undefined;
    
    const response = await fetch(url, {
      method: apiCall.method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: apiCall.method !== 'GET' && body ? body : undefined
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract specific data using JSON path if provided
    if (apiCall.jsonPath) {
      const result = JSONPath({ path: apiCall.jsonPath, json: data });
      return result.length > 0 ? result[0] : null;
    }
    
    return data;
  }
  
  private async executeModelCall(modelCall: ModelCall, variables: Record<string, any>): Promise<any> {
    // Build the prompt with API data if requested
    let finalPrompt = modelCall.userPrompt || '';
    
    if (modelCall.includeApiData) {
      const apiDataSummary = this.buildApiDataSummary(variables);
      finalPrompt = `${apiDataSummary}\n\n${finalPrompt}`;
    }
    
    finalPrompt = this.interpolateVariables(finalPrompt, variables);
    
    // For now, return a mock response - in production, integrate with OpenAI
    const mockResponse = {
      analysis: `Mock AI analysis for: ${modelCall.name}`,
      confidence: 0.85,
      recommendation: "HOLD",
      reasoning: "Based on the provided data..."
    };
    
    console.log(`[Model Call] ${modelCall.name}:`, { finalPrompt, response: mockResponse });
    
    return mockResponse;
  }
  
  private buildApiDataSummary(variables: Record<string, any>): string {
    const apiData = Object.entries(variables)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
      .join('\n\n');
    
    return apiData ? `=== API Data ===\n${apiData}\n=================` : '';
  }
  
  private interpolateVariables(text: string, variables: Record<string, any>): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }
  
  private saveExecutionLog(executionId: number, log: FlowExecutionLog): void {
    db.prepare(`
      INSERT INTO flow_execution_logs 
      (execution_id, step_type, step_id, input, output, error, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      executionId,
      log.stepType,
      log.stepId,
      log.input ? JSON.stringify(log.input) : null,
      log.output ? JSON.stringify(log.output) : null,
      log.error || null,
      log.duration
    );
  }

  // ===== TESTING UTILITIES =====
  
  async testApiCall(apiCall: Omit<ApiCall, 'id' | 'strategyId' | 'orderIndex'>): Promise<any> {
    try {
      console.log('🧪 Testing API call:', {
        url: apiCall.url,
        method: apiCall.method,
        jsonPath: apiCall.jsonPath
      });
      
      const response = await fetch(apiCall.url, {
        method: apiCall.method,
        headers: apiCall.headers ? JSON.parse(apiCall.headers) : { 'Content-Type': 'application/json' },
        body: apiCall.method !== 'GET' && apiCall.body ? apiCall.body : undefined
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      let extractedValue = null;
      
      if (apiCall.jsonPath) {
        try {
          const result = JSONPath({ path: apiCall.jsonPath, json: data });
          extractedValue = result.length > 0 ? result[0] : null;
          console.log('🧪 JSON Path extraction:', {
            path: apiCall.jsonPath,
            result: extractedValue
          });
        } catch (jsonPathError) {
          console.error('🧪 JSON Path extraction failed:', jsonPathError);
          extractedValue = { error: `Invalid JSON path: ${jsonPathError instanceof Error ? jsonPathError.message : 'Unknown JSON path error'}` };
        }
      }
      
      return {
        success: true,
        data,
        extractedValue,
        jsonPath: apiCall.jsonPath
      };
    } catch (error) {
      console.error('🧪 API test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        jsonPath: apiCall.jsonPath
      };
    }
  }

  // ===== STRATEGY FLOW OVERVIEW =====
  
  getStrategyFlow(strategyId: number) {
    const apiCalls = this.getApiCallsByStrategy(strategyId);
    const modelCalls = this.getModelCallsByStrategy(strategyId);
    
    return {
      apiCalls,
      modelCalls,
      totalSteps: apiCalls.length + modelCalls.length
    };
  }
}

export const strategyFlowService = new StrategyFlowService(); 