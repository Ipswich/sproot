# Data Query API Tests Design

**Date:** 2026-07-04
**Status:** Approved

## Goal

Expand API integration tests to cover cursor pagination, aggregate functions, and downsample functionality for sensor and output data query endpoints.

## Problem

The existing test suite has minimal test data (~5 sensor readings, ~5 output readings) and basic data query tests that cannot verify cursor pagination, multiple aggregate types, or downsample bucketing. New features (cursor pagination, continuous aggregates, expanded aggregate functions) have no integration test coverage.

## Approach

**Approach C (selected):** Extend `testSetup.ts` with seed data generation functions. Create a new `server/src/test/DataQuery.spec.ts` dedicated to data query endpoint tests, separate from the existing `API.spec.ts` which covers general CRUD operations. Migrate existing data query tests from `API.spec.ts` into the new file.

## Files Modified

- **Create:** `server/src/test/DataQuery.spec.ts` — new integration test file
- **Modify:** `server/src/database/seeds/testSetup.ts` — add seed data generation for pagination testing
- **Modify:** `server/src/test/API.spec.ts` — remove migrated data query test blocks

## Test Coverage

### Sensor Data (`POST /api/v2/sensors/data`)

| Area                | Tests                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Cursor Pagination   | first page, next page, previous page, last page, invalid cursor, cursor from wrong query           |
| Aggregate Functions | min, max, avg, count, sum, stddev, percentile, first, last, combined, percentile with custom value |
| Downsample          | 5m, 1h, 1d intervals with aggregates, with readingType filter                                      |
| Filters             | by sensor IDs, by readingTypes, by time range, combined filters                                    |
| Edge Cases          | empty time range, no data in range, limit at max (10000), limit = 1                                |

### Output Data (`POST /api/v2/outputs/data`)

Same test structure as sensor data (mirrored coverage).

## Seed Data Plan

Generate ~60 sensor readings and ~50 output readings spread across Jan-Mar 2024:

- Multiple readings per hour to enable pagination within a single hour window
- Spread across sensors 1-4 and outputs 1, 5
- Consistent metric names matching existing seed data (temperature, humidity)

## Test Structure

```typescript
describe("Sensor Data Query API", () => {
  describe("POST /api/v2/sensors/data", () => {
    describe("Cursor Pagination", () => { ... });
    describe("Aggregate Functions", () => { ... });
    describe("Downsample", () => { ... });
    describe("Filters", () => { ... });
    describe("Edge Cases", () => { ... });
  });
});

describe("Output Data Query API", () => {
  describe("POST /api/v2/outputs/data", () => {
    describe("Cursor Pagination", () => { ... });
    describe("Aggregate Functions", () => { ... });
    describe("Downsample", () => { ... });
    describe("Filters", () => { ... });
    describe("Edge Cases", () => { ... });
  });
});
```

## Trade-offs

| Aspect         | Detail                                                     |
| -------------- | ---------------------------------------------------------- |
| Test count     | ~50-60 new tests total (25-30 per endpoint)                |
| Seed data      | ~110 additional records (60 sensor + 50 output)            |
| File size      | New file ~400-500 lines; API.spec.ts shrinks by ~290 lines |
| Execution time | Minimal impact — most tests are simple POST requests       |
