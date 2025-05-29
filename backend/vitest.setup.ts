import { vi } from 'vitest';

// vitest setup: mock OpenAI
vi.mock('@langchain/openai', () => {
  return {
    ChatOpenAI: class {
      constructor() {}
      async invoke(prompt: any) {
        return { text: 'MOCK_RESPONSE', messages: [] };
      }
    }
  };
}); 