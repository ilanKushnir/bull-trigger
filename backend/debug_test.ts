import { strategyFlowService } from './src/services/strategyFlowService';

console.log('🔍 Testing strategyFlowService.getApiCallsByStrategy(97)...');
try {
  const result = strategyFlowService.getApiCallsByStrategy(97);
  console.log('🔍 Direct service result:', JSON.stringify(result, null, 2));
} catch (error: any) {
  console.error('❌ Error:', error.message);
} 