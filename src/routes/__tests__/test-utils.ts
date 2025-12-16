/**
 * Test utilities for variant range normalization
 */

// Default range value for malformed/empty range strings
export const DEFAULT_RANGE = '{"start":0,"end":0}';

export function normalizeRange(range: string | null | undefined, variantId: string): string {
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
