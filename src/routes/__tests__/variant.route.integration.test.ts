/**
 * Integration test to demonstrate the variant endpoint behavior
 * This simulates what happens when the /api/variant/all endpoint is called
 * Run with: npx ts-node src/routes/__tests__/variant.route.integration.test.ts
 */

import { DEFAULT_RANGE, normalizeRange } from './test-utils';

// Simulate database response with various problematic range values
const mockDatabaseVariants = [
  { s_no: 'VAR-001', series: 'Series A', range: '{"start":10,"end":20}' },  // Valid
  { s_no: 'VAR-002', series: 'Series B', range: '' },                        // Empty string
  { s_no: 'VAR-003', series: 'Series C', range: null },                      // Null
  { s_no: 'VAR-004', series: 'Series D', range: '   ' },                     // Whitespace
  { s_no: 'VAR-005', series: 'Series E', range: '{invalid json}' },          // Invalid JSON
  { s_no: 'VAR-006', series: 'Series F', range: '{"start":0' },              // Malformed JSON
  { s_no: 'VAR-007', series: 'Series G', range: '{"start":0,"end":0}' },     // Default valid
];

console.log('=== Simulating /api/variant/all endpoint ===\n');

// Simulate the endpoint logic
console.log('Step 1: Fetching variants from database...');
console.log(`Found ${mockDatabaseVariants.length} variants\n`);

console.log('Step 2: Normalizing range values...');
const normalizedVariants = mockDatabaseVariants.map(variant => ({
  ...variant,
  range: normalizeRange(variant.range as any, variant.s_no)
}));

console.log('\nStep 3: Preparing response...');
const response = { variants: normalizedVariants };

console.log('\n=== Final API Response ===');
console.log(JSON.stringify(response, null, 2));

console.log('\n=== Verification ===');
let allRangesParseable = true;
response.variants.forEach(variant => {
  try {
    const parsed = JSON.parse(variant.range);
    console.log(`✓ ${variant.s_no}: range is parseable JSON with start=${parsed.start}, end=${parsed.end}`);
  } catch (error) {
    console.error(`✗ ${variant.s_no}: range is NOT parseable JSON: "${variant.range}"`);
    allRangesParseable = false;
  }
});

console.log('\n=== Result ===');
if (allRangesParseable) {
  console.log('✓ SUCCESS: All ranges are safe to parse!');
  console.log('✓ The API will never return unparseable range values.');
  process.exit(0);
} else {
  console.error('✗ FAILURE: Some ranges are not parseable!');
  process.exit(1);
}
