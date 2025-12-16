/**
 * Simple test file to demonstrate variant range normalization
 * Run with: npx ts-node src/routes/__tests__/variant.route.test.ts
 */

// Mock the normalizeRange function logic for testing
const DEFAULT_RANGE = '{"start":0,"end":0}';

function normalizeRange(range: string | null | undefined, variantId: string): string {
  // Check if range is falsy or empty
  if (!range || range.trim() === '') {
    console.log(`[Variant API] Normalizing empty range for variant ${variantId} - using default range`);
    return DEFAULT_RANGE;
  }

  // Try to parse the range to validate it's proper JSON
  try {
    JSON.parse(range);
    return range; // Valid JSON, return as-is
  } catch (error) {
    console.log(`[Variant API] Normalizing invalid range for variant ${variantId} - using default range. Original value: "${range}"`);
    return DEFAULT_RANGE;
  }
}

// Test cases
console.log('=== Running Variant Range Normalization Tests ===\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${description}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  Error: ${error}`);
    testsFailed++;
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
}

// Test 1: Valid JSON range should pass through unchanged
test('Valid JSON range should pass through unchanged', () => {
  const input = '{"start":10,"end":20}';
  const result = normalizeRange(input, 'TEST-001');
  assertEqual(result, input, 'Valid JSON should not be modified');
});

// Test 2: Empty string should be normalized to default
test('Empty string should be normalized to default', () => {
  const result = normalizeRange('', 'TEST-002');
  assertEqual(result, DEFAULT_RANGE, 'Empty string should return default range');
});

// Test 3: Null value should be normalized to default
test('Null value should be normalized to default', () => {
  const result = normalizeRange(null, 'TEST-003');
  assertEqual(result, DEFAULT_RANGE, 'Null value should return default range');
});

// Test 4: Undefined value should be normalized to default
test('Undefined value should be normalized to default', () => {
  const result = normalizeRange(undefined, 'TEST-004');
  assertEqual(result, DEFAULT_RANGE, 'Undefined value should return default range');
});

// Test 5: Whitespace-only string should be normalized to default
test('Whitespace-only string should be normalized to default', () => {
  const result = normalizeRange('   ', 'TEST-005');
  assertEqual(result, DEFAULT_RANGE, 'Whitespace string should return default range');
});

// Test 6: Invalid JSON should be normalized to default
test('Invalid JSON should be normalized to default', () => {
  const result = normalizeRange('{invalid json}', 'TEST-006');
  assertEqual(result, DEFAULT_RANGE, 'Invalid JSON should return default range');
});

// Test 7: Malformed JSON (unclosed brace) should be normalized
test('Malformed JSON (unclosed brace) should be normalized', () => {
  const result = normalizeRange('{"start":0', 'TEST-007');
  assertEqual(result, DEFAULT_RANGE, 'Malformed JSON should return default range');
});

// Test 8: Plain text should be normalized to default
test('Plain text should be normalized to default', () => {
  const result = normalizeRange('not json at all', 'TEST-008');
  assertEqual(result, DEFAULT_RANGE, 'Plain text should return default range');
});

// Test 9: Default range string should pass through
test('Default range string should pass through unchanged', () => {
  const result = normalizeRange(DEFAULT_RANGE, 'TEST-009');
  assertEqual(result, DEFAULT_RANGE, 'Default range should pass through unchanged');
});

// Test 10: Ensure normalized result is always parseable
test('Normalized result should always be parseable JSON', () => {
  const testCases = ['', null, undefined, 'bad', '{incomplete', '   '];
  testCases.forEach((testCase, index) => {
    const result = normalizeRange(testCase as any, `TEST-010-${index}`);
    try {
      const parsed = JSON.parse(result);
      if (!parsed.hasOwnProperty('start') || !parsed.hasOwnProperty('end')) {
        throw new Error('Parsed result does not have start and end properties');
      }
    } catch (error) {
      throw new Error(`Result "${result}" is not parseable JSON: ${error}`);
    }
  });
});

console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}
