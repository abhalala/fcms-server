# Variant Route Tests

This directory contains tests for the variant route normalization functionality.

## Test Files

- `test-utils.ts` - Shared utilities for testing range normalization
- `variant.route.test.ts` - Unit tests for the `normalizeRange` function
- `variant.route.integration.test.ts` - Integration test simulating the `/api/variant/all` endpoint

## Running Tests

These tests are meant to be run with `ts-node`. They are excluded from the TypeScript build process (see `tsconfig.json`).

To run the tests:

```bash
# Install dependencies first
yarn install

# Run unit tests
npx ts-node src/routes/__tests__/variant.route.test.ts

# Run integration tests
npx ts-node src/routes/__tests__/variant.route.integration.test.ts
```

## What the Tests Validate

The tests ensure that the `normalizeRange` function correctly:
- Handles empty strings
- Handles null/undefined values
- Handles whitespace-only strings
- Handles invalid JSON
- Handles malformed JSON (unclosed braces, etc.)
- Passes through valid JSON unchanged
- Always returns parseable JSON with `start` and `end` properties
