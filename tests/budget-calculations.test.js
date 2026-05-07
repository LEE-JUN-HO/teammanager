import assert from 'node:assert/strict';
import {
  calculateAnnualBudget,
  calculateExecutionRate,
  getSignal,
  summarizeTeams,
} from '../src/budget.js';

const fullYearFivePeople = Array(12).fill(5);
assert.equal(calculateAnnualBudget(fullYearFivePeople), 3000000);
assert.equal(calculateExecutionRate(1500000, 3000000), 50);
assert.deepEqual(getSignal(68, { yellow: 85, red: 100 }), { label: '안정', tone: 'green' });
assert.deepEqual(getSignal(88, { yellow: 85, red: 100 }), { label: '주의', tone: 'yellow' });
assert.deepEqual(getSignal(102, { yellow: 85, red: 100 }), { label: '위험', tone: 'red' });

const [summary] = summarizeTeams(
  [{ name: 'Test', spent: 600000, headcountByMonth: Array(12).fill(1) }],
  { yellow: 85, red: 100 },
);
assert.equal(summary.budget, 600000);
assert.equal(summary.rate, 100);
assert.equal(summary.signal.label, '위험');

console.log('Budget calculation tests passed.');
