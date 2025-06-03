const { strategyFlowService } = require('./src/services/strategyFlowService.ts');

console.log('Testing strategyFlowService.getApiCallsByStrategy(97)...');
const result = strategyFlowService.getApiCallsByStrategy(97);
console.log('Result:', JSON.stringify(result, null, 2)); 