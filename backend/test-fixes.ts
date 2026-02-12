import { parseText } from './src/parser/parser';

const testCases = `
6/25
4/25
2/25

Titus Napa Valley Cabernet, 2018, 55+ The Terraces, Rutherford Cabernet 2018, 55

Langmeil Barossa Shiraz 2017 $35 (Gerald highly rec'ded)
`;

const result = parseText(testCases);
console.log('Wines parsed from test cases:');
for (const batch of result.batches) {
  for (const item of batch.items) {
    console.log(`  ${item.name} | ${item.vintageYear} | $${item.price || 'N/A'}`);
  }
}
if (result.batches.length === 0 || result.batches.every(b => b.items.length === 0)) {
  console.log('  (No wines parsed - all problematic lines correctly skipped)');
}
