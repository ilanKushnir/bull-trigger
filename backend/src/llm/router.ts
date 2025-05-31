// @ts-nocheck
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getModel, getSetting, incrementTokenUsage } from '../utils/settings';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || getSetting('OPENAI_API_KEY');

export function getLLM(type: 'deep' | 'cheap' = 'cheap') {
  const modelName = getModel(type);
  
  const llm = new ChatOpenAI({
    temperature: 0.2,
    modelName,
    openAIApiKey: OPENAI_API_KEY,
    callbacks: [
      {
        handleLLMEnd: (output, runId) => {
          // Track token usage from the API response
          if (output.llmOutput?.tokenUsage) {
            const totalTokens = output.llmOutput.tokenUsage.totalTokens || 0;
            if (totalTokens > 0) {
              incrementTokenUsage(totalTokens);
              console.log(`🪙 Token usage tracked: ${totalTokens} tokens (${type} model)`);
            }
          }
        },
        handleLLMError: (error, runId) => {
          console.error(`❌ LLM error (${type} model):`, error);
        }
      }
    ]
  });
  
  return llm;
}

/**
 * Call an LLM with a simple text prompt and return the response
 */
export async function callLLM(
  prompt: string, 
  type: 'deep' | 'cheap' = 'cheap',
  systemPrompt?: string
): Promise<string> {
  const llm = getLLM(type);
  
  try {
    let messages = [];
    
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    
    messages.push(new HumanMessage(prompt));
    
    const response = await llm.invoke(messages);
    return response.content as string;
  } catch (error) {
    console.error(`Failed to call ${type} LLM:`, error);
    throw error;
  }
} 