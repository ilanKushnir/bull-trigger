import Database from 'better-sqlite3';
import { JSONPath } from 'jsonpath-plus';
import path from 'path';

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

export interface ConditionNode {
  id: number;
  strategyId: number;
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

export interface StrategyTriggerNode {
  id: number;
  strategyId: number;
  name: string;
  targetStrategyId: number;
  conditionVariable?: string;
  passVariables?: string[]; // JSON array
  waitForCompletion: boolean;
  outputVariable?: string;
  orderIndex: number;
  enabled: boolean;
}

export interface TelegramMessageNode {
  id: number;
  strategyId: number;
  name: string;
  chatId: string; // Telegram chat ID or channel username
  messageTemplate: string;
  includeApiData: boolean;
  onlyIfVariable?: string;
  messageType: 'info' | 'success' | 'warning' | 'error';
  parseMode: 'Markdown' | 'HTML' | 'none';
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
  stepType: 'api_call' | 'model_call' | 'condition_node' | 'strategy_trigger_node' | 'telegram_message_node';
  stepId: number;
  stepName: string;
  input?: any;
  output?: any;
  error?: string;
  duration: number;
}

export class StrategyFlowService {
  
  // ===== API CALLS MANAGEMENT =====
  
  async createApiCall(strategyId: number, apiCallData: any): Promise<number> {
    const query = `
      INSERT INTO api_calls (strategy_id, name, url, method, headers, json_path, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      strategyId,
      apiCallData.name,
      apiCallData.url,
      apiCallData.method,
      JSON.stringify(apiCallData.headers || {}),
      apiCallData.jsonPath,
      apiCallData.orderIndex || 0
    ];
    
    try {
      const result = db.prepare(query).run(...values);
      return result.lastInsertRowid as number;
    } catch (error) {
      console.error('Failed to create API call:', error);
      throw error;
    }
  }

  async updateApiCall(id: number, apiCallData: any): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    const fieldMap: Record<string, string> = {
      name: 'name',
      url: 'url',
      method: 'method',
      headers: 'headers',
      jsonPath: 'json_path',
      orderIndex: 'order_index'
    };
    
    Object.entries(apiCallData).forEach(([key, value]) => {
      if (key !== 'id') {
        const dbField = fieldMap[key] || key;
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE api_calls SET ${fields.join(', ')} WHERE id = ?`;
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
  
  async createModelCall(strategyId: number, modelCallData: any): Promise<number> {
    const query = `
      INSERT INTO model_calls (strategy_id, name, prompt_template, model_tier, order_index)
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [
      strategyId,
      modelCallData.name,
      modelCallData.promptTemplate,
      modelCallData.modelTier,
      modelCallData.orderIndex || 0
    ];
    
    try {
      const result = db.prepare(query).run(...values);
      return result.lastInsertRowid as number;
    } catch (error) {
      console.error('Failed to create model call:', error);
      throw error;
    }
  }

  async updateModelCall(id: number, modelCallData: any): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    const fieldMap: Record<string, string> = {
      name: 'name',
      promptTemplate: 'prompt_template',
      modelTier: 'model_tier',
      orderIndex: 'order_index'
    };
    
    Object.entries(modelCallData).forEach(([key, value]) => {
      if (key !== 'id') {
        const dbField = fieldMap[key] || key;
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE model_calls SET ${fields.join(', ')} WHERE id = ?`;
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

  // ===== CONDITION NODES MANAGEMENT =====
  
  createConditionNode(conditionNode: Omit<ConditionNode, 'id'>): number {
    const result: any = db.prepare(`
      INSERT INTO condition_nodes 
      (strategy_id, name, condition_type, left_operand, operator, right_operand, true_output_variable, false_output_variable, order_index, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      conditionNode.strategyId,
      conditionNode.name,
      conditionNode.conditionType,
      conditionNode.leftOperand,
      conditionNode.operator,
      conditionNode.rightOperand,
      conditionNode.trueOutputVariable || null,
      conditionNode.falseOutputVariable || null,
      conditionNode.orderIndex,
      conditionNode.enabled ? 1 : 0
    );
    
    return result.lastInsertRowid;
  }

  updateConditionNode(id: number, updates: Partial<ConditionNode>): void {
    const fields: string[] = [];
    const values: any[] = [];
    
    const fieldMap: Record<string, string> = {
      strategyId: 'strategy_id',
      conditionType: 'condition_type',
      leftOperand: 'left_operand',
      rightOperand: 'right_operand',
      trueOutputVariable: 'true_output_variable',
      falseOutputVariable: 'false_output_variable',
      orderIndex: 'order_index',
      name: 'name',
      operator: 'operator',
      enabled: 'enabled'
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        const dbField = fieldMap[key] || key;
        fields.push(`${dbField} = ?`);
        values.push(key === 'enabled' ? (value ? 1 : 0) : value);
      }
    });
    
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE condition_nodes SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
    }
  }

  deleteConditionNode(id: number): void {
    db.prepare('DELETE FROM condition_nodes WHERE id = ?').run(id);
  }

  getConditionNodesByStrategy(strategyId: number): ConditionNode[] {
    const rows = db.prepare(`
      SELECT 
        id, 
        strategy_id as strategyId, 
        name, 
        condition_type as conditionType, 
        left_operand as leftOperand, 
        operator, 
        right_operand as rightOperand, 
        true_output_variable as trueOutputVariable, 
        false_output_variable as falseOutputVariable, 
        order_index as orderIndex, 
        enabled 
      FROM condition_nodes 
      WHERE strategy_id = ? 
      ORDER BY order_index ASC
    `).all(strategyId) as any[];
    
    return rows.map(row => ({
      ...row,
      enabled: Boolean(row.enabled)
    })) as ConditionNode[];
  }

  // ===== STRATEGY TRIGGER NODES MANAGEMENT =====
  
  createStrategyTriggerNode(triggerNode: Omit<StrategyTriggerNode, 'id'>): number {
    const result: any = db.prepare(`
      INSERT INTO strategy_trigger_nodes 
      (strategy_id, name, target_strategy_id, condition_variable, pass_variables, wait_for_completion, output_variable, order_index, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      triggerNode.strategyId,
      triggerNode.name,
      triggerNode.targetStrategyId,
      triggerNode.conditionVariable || null,
      triggerNode.passVariables ? JSON.stringify(triggerNode.passVariables) : null,
      triggerNode.waitForCompletion ? 1 : 0,
      triggerNode.outputVariable || null,
      triggerNode.orderIndex,
      triggerNode.enabled ? 1 : 0
    );
    
    return result.lastInsertRowid;
  }

  updateStrategyTriggerNode(id: number, updates: Partial<StrategyTriggerNode>): void {
    const fields: string[] = [];
    const values: any[] = [];
    
    const fieldMap: Record<string, string> = {
      strategyId: 'strategy_id',
      targetStrategyId: 'target_strategy_id',
      conditionVariable: 'condition_variable',
      passVariables: 'pass_variables',
      waitForCompletion: 'wait_for_completion',
      outputVariable: 'output_variable',
      orderIndex: 'order_index',
      name: 'name',
      enabled: 'enabled'
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        const dbField = fieldMap[key] || key;
        fields.push(`${dbField} = ?`);
        let processedValue = value;
        if (key === 'enabled' || key === 'waitForCompletion') {
          processedValue = value ? 1 : 0;
        } else if (key === 'passVariables' && Array.isArray(value)) {
          processedValue = JSON.stringify(value);
        }
        values.push(processedValue);
      }
    });
    
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE strategy_trigger_nodes SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
    }
  }

  deleteStrategyTriggerNode(id: number): void {
    db.prepare('DELETE FROM strategy_trigger_nodes WHERE id = ?').run(id);
  }

  getStrategyTriggerNodesByStrategy(strategyId: number): StrategyTriggerNode[] {
    const rows = db.prepare(`
      SELECT 
        id, 
        strategy_id as strategyId, 
        name, 
        target_strategy_id as targetStrategyId, 
        condition_variable as conditionVariable, 
        pass_variables as passVariables, 
        wait_for_completion as waitForCompletion, 
        output_variable as outputVariable, 
        order_index as orderIndex, 
        enabled 
      FROM strategy_trigger_nodes 
      WHERE strategy_id = ? 
      ORDER BY order_index ASC
    `).all(strategyId) as any[];
    
    return rows.map(row => ({
      ...row,
      enabled: Boolean(row.enabled),
      waitForCompletion: Boolean(row.waitForCompletion),
      passVariables: row.passVariables ? JSON.parse(row.passVariables) : []
    })) as StrategyTriggerNode[];
  }

  // ===== TELEGRAM MESSAGE NODES MANAGEMENT =====
  
  createTelegramMessageNode(telegramNode: Omit<TelegramMessageNode, 'id'>): number {
    const result: any = db.prepare(`
      INSERT INTO telegram_message_nodes 
      (strategy_id, name, chat_id, message_template, include_api_data, only_if_variable, message_type, parse_mode, order_index, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      telegramNode.strategyId,
      telegramNode.name,
      telegramNode.chatId,
      telegramNode.messageTemplate,
      telegramNode.includeApiData ? 1 : 0,
      telegramNode.onlyIfVariable || null,
      telegramNode.messageType,
      telegramNode.parseMode,
      telegramNode.orderIndex,
      telegramNode.enabled ? 1 : 0
    );
    
    return result.lastInsertRowid;
  }

  updateTelegramMessageNode(id: number, updates: Partial<TelegramMessageNode>): void {
    const fields: string[] = [];
    const values: any[] = [];
    
    const fieldMap: Record<string, string> = {
      strategyId: 'strategy_id',
      messageTemplate: 'message_template',
      includeApiData: 'include_api_data',
      onlyIfVariable: 'only_if_variable',
      messageType: 'message_type',
      orderIndex: 'order_index',
      name: 'name',
      chatId: 'chat_id',
      parseMode: 'parse_mode',
      enabled: 'enabled'
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        const dbField = fieldMap[key] || key;
        fields.push(`${dbField} = ?`);
        values.push(['enabled', 'includeApiData'].includes(key) ? (value ? 1 : 0) : value);
      }
    });
    
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE telegram_message_nodes SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
    }
  }

  deleteTelegramMessageNode(id: number): void {
    db.prepare('DELETE FROM telegram_message_nodes WHERE id = ?').run(id);
  }

  getTelegramMessageNodesByStrategy(strategyId: number): TelegramMessageNode[] {
    const rows = db.prepare(`
      SELECT 
        id, 
        strategy_id as strategyId, 
        name, 
        chat_id as chatId, 
        message_template as messageTemplate, 
        include_api_data as includeApiData, 
        only_if_variable as onlyIfVariable, 
        message_type as messageType, 
        parse_mode as parseMode, 
        order_index as orderIndex, 
        enabled 
      FROM telegram_message_nodes 
      WHERE strategy_id = ? 
      ORDER BY order_index ASC
    `).all(strategyId) as any[];
    
    return rows.map(row => ({
      ...row,
      enabled: Boolean(row.enabled),
      includeApiData: Boolean(row.includeApiData)
    })) as TelegramMessageNode[];
  }

  // ===== FLOW EXECUTION =====
  
  async executeStrategyFlow(strategyId: number, executionId: number): Promise<FlowExecutionResult> {
    const variables: Record<string, any> = {};
    const logs: FlowExecutionLog[] = [];
    
    try {
      // Get all flow nodes for this strategy
      const apiCalls = this.getApiCallsByStrategy(strategyId);
      const modelCalls = this.getModelCallsByStrategy(strategyId);
      const conditionNodes = this.getConditionNodesByStrategy(strategyId);
      const strategyTriggerNodes = this.getStrategyTriggerNodesByStrategy(strategyId);
      const telegramMessageNodes = this.getTelegramMessageNodesByStrategy(strategyId);
      
      // Combine all steps
      const allSteps = [
        ...apiCalls.map(call => ({ ...call, type: 'api_call' as const })),
        ...modelCalls.map(call => ({ ...call, type: 'model_call' as const })),
        ...conditionNodes.map(node => ({ ...node, type: 'condition_node' as const })),
        ...strategyTriggerNodes.map(node => ({ ...node, type: 'strategy_trigger_node' as const })),
        ...telegramMessageNodes.map(node => ({ ...node, type: 'telegram_message_node' as const }))
      ];

      // Group steps by orderIndex for parallel execution
      const stepGroups: { [orderIndex: number]: any[] } = {};
      allSteps.forEach(step => {
        if (step.enabled) {
          if (!stepGroups[step.orderIndex]) {
            stepGroups[step.orderIndex] = [];
          }
          stepGroups[step.orderIndex].push(step);
        }
      });

      // Execute step groups in order, with parallel execution within each group
      const orderedIndices = Object.keys(stepGroups).map(Number).sort((a, b) => a - b);
      
      for (const orderIndex of orderedIndices) {
        const group = stepGroups[orderIndex];
        
        // Execute all steps in this group in parallel
        const groupPromises = group.map(async (step) => {
          const startTime = Date.now();
          let stepResult;
          let stepError;
          
          // Get emoji for step type
          const stepEmoji = this.getStepEmoji(step.type);
          
          try {
            if (step.type === 'api_call') {
              stepResult = await this.executeApiCall(step as ApiCall, variables);
              variables[step.outputVariable] = stepResult;
            } else if (step.type === 'model_call') {
              stepResult = await this.executeModelCall(step as ModelCall, variables);
              variables[step.outputVariable] = stepResult;
            } else if (step.type === 'condition_node') {
              stepResult = await this.executeConditionNode(step as ConditionNode, variables);
              // Condition nodes set their output variables internally
            } else if (step.type === 'strategy_trigger_node') {
              stepResult = await this.executeStrategyTriggerNode(step as StrategyTriggerNode, variables);
              if (step.outputVariable && stepResult) {
                variables[step.outputVariable] = stepResult;
              }
            } else if (step.type === 'telegram_message_node') {
              stepResult = await this.executeTelegramMessageNode(step as TelegramMessageNode, variables);
            }
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`  ${stepEmoji} ${step.name} (${duration}s)`);
            
          } catch (error) {
            stepError = error instanceof Error ? error.message : 'Unknown error';
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.error(`  ❌ ${step.name} failed: ${stepError} (${duration}s)`);
            throw error; // Re-throw to stop execution
          }
          
          const duration = Date.now() - startTime;
          
          const log: FlowExecutionLog = {
            stepType: step.type as any,
            stepId: step.id,
            stepName: step.name,
            input: this.getStepInput(step),
            output: stepResult,
            error: stepError,
            duration
          };
          
          return log;
        });

        // Wait for all steps in this group to complete
        const groupLogs = await Promise.all(groupPromises);
        logs.push(...groupLogs);
        
        // Save logs to database
        groupLogs.forEach(log => this.saveExecutionLog(executionId, log));
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
    
    try {
      // Import the LLM router dynamically to avoid circular dependencies
      const { callLLM } = await import('../llm/router');
      
      // Call the actual OpenAI API
      const response = await callLLM(
        finalPrompt,
        modelCall.modelTier as 'deep' | 'cheap',
        modelCall.systemPrompt
      );
      
      return response; // Return the string response directly
    } catch (error) {
      console.error(`❌ Model call ${modelCall.name} failed:`, error);
      
      // Fallback to mock response if OpenAI fails (e.g., no API key)
      const mockResponse = `💡 **Mock Trading Tip**

🔹 Always set stop-loss orders to limit potential losses
🔹 Never invest more than you can afford to lose  
🔹 Diversify your portfolio across different cryptocurrencies
🔹 Keep emotions in check - stick to your trading plan
🔹 Stay updated with market news and trends

⚠️ *This is a mock response - configure OpenAI API key for real AI tips*`;
      
      console.log(`📝 ${modelCall.name}: Using fallback response`);
      
      return mockResponse;
    }
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
    try {
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
    } catch (error) {
      console.error('Failed to save execution log:', error);
    }
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

  private getStepInput(step: ApiCall | ModelCall | ConditionNode | StrategyTriggerNode | TelegramMessageNode): any {
    if ('url' in step) {
      return { url: step.url };
    } else if ('userPrompt' in step) {
      return { prompt: step.userPrompt };
    } else if ('conditionType' in step) {
      return {
        conditionType: step.conditionType,
        leftOperand: step.leftOperand,
        operator: step.operator,
        rightOperand: step.rightOperand
      };
    } else if ('targetStrategyId' in step) {
      return {
        targetStrategyId: step.targetStrategyId,
        conditionVariable: step.conditionVariable
      };
    } else if ('messageTemplate' in step) {
      return { messageTemplate: step.messageTemplate };
    }
    return {};
  }

  private async executeConditionNode(conditionNode: ConditionNode, variables: Record<string, any>): Promise<boolean> {
    try {
      const leftValue = this.getVariableValue(conditionNode.leftOperand, variables);
      const rightValue = this.getVariableValue(conditionNode.rightOperand, variables);
      
      let result = false;
      switch (conditionNode.operator) {
        case '>': result = Number(leftValue) > Number(rightValue); break;
        case '<': result = Number(leftValue) < Number(rightValue); break;
        case '>=': result = Number(leftValue) >= Number(rightValue); break;
        case '<=': result = Number(leftValue) <= Number(rightValue); break;
        case '==': result = leftValue == rightValue; break;
        case '!=': result = leftValue != rightValue; break;
        case 'contains': result = String(leftValue).includes(String(rightValue)); break;
        default:
          throw new Error(`Unknown operator: ${conditionNode.operator}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Condition evaluation failed:`, error);
      return false;
    }
  }
  
  private async executeStrategyTriggerNode(triggerNode: StrategyTriggerNode, variables: Record<string, any>): Promise<any> {
    // Check condition if specified
    if (triggerNode.conditionVariable) {
      const conditionValue = variables[triggerNode.conditionVariable];
      if (!conditionValue) {
        return { triggered: false, reason: 'condition_not_met' };
      }
    }
    
    try {
      // Import the strategy execution service to avoid circular dependencies
      const { strategyExecutionService } = await import('../services/strategyExecutionService');
      
      // Start execution tracking for the triggered strategy
      const executionId = strategyExecutionService.startExecution(triggerNode.targetStrategyId, 'manual');
      
      // Prepare variables to pass to the target strategy
      const passedVariables: Record<string, any> = {};
      if (triggerNode.passVariables && Array.isArray(triggerNode.passVariables)) {
        triggerNode.passVariables.forEach(varName => {
          if (variables[varName] !== undefined) {
            passedVariables[varName] = variables[varName];
          }
        });
      }
      
      if (triggerNode.waitForCompletion) {
        // Execute the target strategy and wait for completion
        const targetResult = await this.executeStrategyFlow(triggerNode.targetStrategyId, executionId);
        
        if (targetResult.success) {
          strategyExecutionService.completeExecution(executionId);
          console.log(`🔗 Triggered strategy ${triggerNode.targetStrategyId} - completed`);
          
          return {
            triggered: true,
            targetStrategyId: triggerNode.targetStrategyId,
            passedVariables: Object.keys(passedVariables),
            waitForCompletion: true,
            targetResult: targetResult.variables,
            success: true
          };
        } else {
          strategyExecutionService.failExecution(executionId, targetResult.error);
          console.error(`🔗 Triggered strategy ${triggerNode.targetStrategyId} - failed: ${targetResult.error}`);
          
          return {
            triggered: true,
            targetStrategyId: triggerNode.targetStrategyId,
            passedVariables: Object.keys(passedVariables),
            waitForCompletion: true,
            success: false,
            error: targetResult.error
          };
        }
      } else {
        // Fire and forget - start the strategy execution but don't wait
        console.log(`🔗 Triggered strategy ${triggerNode.targetStrategyId} (background)`);
        
        // Execute in background (fire and forget)
        this.executeStrategyFlow(triggerNode.targetStrategyId, executionId)
          .then(result => {
            if (result.success) {
              strategyExecutionService.completeExecution(executionId);
            } else {
              strategyExecutionService.failExecution(executionId, result.error);
              console.error(`❌ Background strategy ${triggerNode.targetStrategyId} failed: ${result.error}`);
            }
          })
          .catch(error => {
            strategyExecutionService.failExecution(executionId, error.message);
            console.error(`💥 Background strategy ${triggerNode.targetStrategyId} crashed:`, error);
          });
        
        return {
          triggered: true,
          targetStrategyId: triggerNode.targetStrategyId,
          passedVariables: Object.keys(passedVariables),
          waitForCompletion: false,
          success: true,
          executionId
        };
      }
    } catch (error) {
      console.error(`❌ Strategy trigger ${triggerNode.name} failed:`, error);
      
      return {
        triggered: false,
        targetStrategyId: triggerNode.targetStrategyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }
  
  private async executeTelegramMessageNode(telegramNode: TelegramMessageNode, variables: Record<string, any>): Promise<any> {
    // Check condition if specified
    if (telegramNode.onlyIfVariable) {
      const conditionValue = variables[telegramNode.onlyIfVariable];
      if (!conditionValue) {
        return { sent: false, reason: 'condition_not_met' };
      }
    }
    
    // Interpolate variables in message template
    let finalMessage = this.interpolateVariables(telegramNode.messageTemplate, variables);
    
    // Add API data if requested
    if (telegramNode.includeApiData) {
      const apiDataSummary = this.buildApiDataSummary(variables);
      if (apiDataSummary) {
        finalMessage += `\n\nAPI Data:\n${apiDataSummary}`;
      }
    }
    
    try {
      // Import and use the telegram gateway
      const { sendMessage } = await import('../telegram/gateway');
      const telegramResult = await sendMessage(finalMessage);
      
      return { 
        sent: true, 
        messageId: telegramResult?.message_id,
        message: finalMessage 
      };
    } catch (error) {
      console.error(`❌ Telegram ${telegramNode.name} failed:`, error);
      throw error;
    }
  }
  
  private getVariableValue(operand: string, variables: Record<string, any>): any {
    // If operand starts with $, treat as JSONPath
    if (operand.startsWith('$')) {
      const varName = operand.substring(1);
      const targetValue = variables[varName];
      
      if (targetValue === undefined) {
        console.warn(`Variable '${varName}' not found in variables:`, Object.keys(variables));
        return operand; // Return the original operand if variable not found
      }
      
      // If the target value is an object/array and we have a complex path like "btcPrice.value"
      if (varName.includes('.') && typeof targetValue === 'object' && targetValue !== null) {
        try {
          // Use JSONPath for complex path navigation
          const pathParts = varName.split('.');
          let result = variables[pathParts[0]];
          
          for (let i = 1; i < pathParts.length; i++) {
            if (result && typeof result === 'object') {
              result = result[pathParts[i]];
            } else {
              console.warn(`Cannot navigate path '${varName}' - intermediate value is not an object`);
              return operand;
            }
          }
          
          return result;
        } catch (error) {
          console.error(`Failed to navigate path '${varName}':`, error);
          return operand;
        }
      }
      
      return targetValue;
    }
    
    // Otherwise, treat as variable name or literal value
    return variables[operand] !== undefined ? variables[operand] : operand;
  }

  private getStepEmoji(stepType: string): string {
    switch (stepType) {
      case 'api_call': return '🌐';
      case 'model_call': return '🤖';
      case 'condition_node': return '🔍';
      case 'strategy_trigger_node': return '🔗';
      case 'telegram_message_node': return '📤';
      default: return '❓';
    }
  }
}

export const strategyFlowService = new StrategyFlowService(); 