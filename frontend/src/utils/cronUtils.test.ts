import { cronToHuman, isValidCron, getCronDetails } from './cronUtils';

// Test cases for cronToHuman function
const testCases = [
  // Basic patterns
  { cron: '* * * * *', expected: 'Every minute' },
  { cron: '*/15 * * * *', expected: 'Every 15 minutes' },
  { cron: '*/30 * * * *', expected: 'Every 30 minutes' },
  { cron: '0 * * * *', expected: 'Every hour' },
  { cron: '0 */2 * * *', expected: 'Every 2 hours' },
  
  // Daily patterns
  { cron: '0 9 * * *', expected: 'Daily at 9:00 AM' },
  { cron: '30 14 * * *', expected: 'Daily at 2:30 PM' },
  { cron: '0 0 * * *', expected: 'Daily at 12:00 AM' },
  { cron: '0 12 * * *', expected: 'Daily at 12:00 PM' },
  
  // Weekly patterns
  { cron: '0 9 * * 1', expected: 'Weekly on Monday at 9:00 AM' },
  { cron: '0 18 * * 5', expected: 'Weekly on Friday at 6:00 PM' },
  { cron: '30 10 * * 0', expected: 'Weekly on Sunday at 10:30 AM' },
  
  // Monthly patterns
  { cron: '0 0 1 * *', expected: 'Monthly on the 1st at 12:00 AM' },
  { cron: '0 9 15 * *', expected: 'Monthly on the 15th at 9:00 AM' },
  { cron: '0 12 31 * *', expected: 'Monthly on the 31st at 12:00 PM' },
  
  // Complex patterns
  { cron: '0,30 * * * *', expected: 'Custom schedule' },
  { cron: '0 9-17 * * *', expected: 'Custom schedule' },
  
  // Invalid patterns
  { cron: '', expected: 'Invalid schedule' },
  { cron: '0 9 * *', expected: '0 9 * *' }, // Not 5 parts
  { cron: 'invalid', expected: 'invalid' },
];

// Run tests
console.log('Testing cronToHuman function:');
console.log('================================');

testCases.forEach(({ cron, expected }) => {
  const result = cronToHuman(cron);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} "${cron}" → "${result}" (expected: "${expected}")`);
});

// Test isValidCron
console.log('\nTesting isValidCron function:');
console.log('=============================');

const validCronTests = [
  { cron: '0 9 * * *', expected: true },
  { cron: '*/15 * * * *', expected: true },
  { cron: '0 9 * *', expected: false }, // Missing parts
  { cron: '', expected: false },
  { cron: 'invalid', expected: false },
];

validCronTests.forEach(({ cron, expected }) => {
  const result = isValidCron(cron);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} "${cron}" → ${result} (expected: ${expected})`);
});

export {}; // Make this a module 