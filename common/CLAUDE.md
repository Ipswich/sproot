# Common CLAUDE.md

This file provides guidance to Claude Code when working with the Sproot common module.

## Project Overview

Sproot Common is a shared TypeScript library containing type definitions, database service interfaces, and utility classes used across all Sproot projects (server, client).

**Purpose:** Shared codebase providing common type definitions, database service abstractions, and utility functions used by server and client.

**Environment:** TypeScript with Mocha tests, built with tsc to `/dist/` directory.

## Development Commands

### Build & Compile

```bash
# Build TypeScript (must complete before server can build)
npm run build

# Clean compiled output
npm run clean
```

### Test

```bash
# Run unit tests (uses mocha + ts-node)
npm run test

# Run linting and formatting
npm run prettier:check
npm run lint
```

**Important:** Build order matters. Common must be built before server (tsconfig has `references` to common).

## Architecture

**Entry Points:**

- There is no root `index.ts` entry point in this workspace.
- Consumers import shared types and database interfaces from specific subpaths (for example, `dist/database/ISprootDB` after build).
- When documenting or consuming exports from this package, refer to the concrete module path rather than a package-level index export.

**Project Structure:**

```
src/
├── api/                # API request/response types
│   └── v2/
│       └── Responses.ts
├── automation/         # Condition and action types
│   ├── IAutomation.ts
│   ├── IOutputCondition.ts
│   ├── ISensorCondition.ts
│   ├── ITimeCondition.ts
│   ├── ConditionTypes.ts
│   └── IDateRangeCondition.ts
├── database/          # Database service classes and interfaces
│   ├── ISprootDB.ts     # Main database interface
│   ├── SDBUser.ts
│   ├── SDBSensor.ts
│   ├── SDBReading.ts
│   ├── SDBOutput.ts
│   ├── SDBOutputState.ts
│   ├── SDBAutomation.ts
│   ├── SDBSensorCondition.ts
│   ├── SDBOutputCondition.ts
│   ├── SDBTimeCondition.ts
│   ├── SDBWeekdayCondition.ts
│   ├── SDBMonthCondition.ts
│   ├── SDBDateRangeCondition.ts
│   ├── SDBOutputAction.ts
│   ├── SDBSubcontroller.ts
│   ├── SDBDeviceZone.ts
│   ├── SDBCameraSettings.ts
│   ├── SDBJournal.ts
│   ├── SDBJournalEntry.ts
│   └── SDBJournalTag.ts
├── outputs/           # Output device types
│   ├── IOutputBase.ts
│   └── ControlMode.ts
├── sensors/           # Sensor types
│   ├── ISensorBase.ts
│   └── ReadingType.ts
├── system/            # System-related types
└── utility/           # Utility classes and functions
    ├── Constants.ts
    └── Crypto.ts
```

**Path Aliases:** `@sproot/*` → `../common/dist/*` (from server) or `../common/src/*` (from client).

## Key Directories

**Database Layer:**

- `src/database/ISprootDB.ts` - Defines all database service methods (abstract interface)
- `src/database/SDB*.ts` - Concrete database service classes for each entity type
- Server implements `SprootDB` class that satisfies `ISprootDB`

**API Types:**

`src/api/v2/Responses.ts` - Versioned API response type definitions currently present in this workspace

- When documenting or consuming API types, use the concrete versioned module path under `src/api/` rather than a nonexistent shared `src/api/api.ts` entry point

**Automation:**

- `src/automation/IAutomation.ts` - Main automation interface
- `src/automation/ConditionTypes.ts` - `ConditionGroupType`, `ConditionOperator` enums
- `src/automation/ITimeCondition.ts`, etc. - Time/weekday/month/date-range condition interfaces

**Sensors:**

- `src/sensors/ISensorBase.ts` - Base sensor interface
- `src/sensors/ReadingType.ts` - Sensor reading type enum (temperature, humidity, etc.)

**Outputs:**

- `src/outputs/IOutputBase.ts` - Base output interface (with `ControlMode` enum)

**Utilities:**

- `src/utility/Constants.ts` - Global constants (MAX_CACHE_SIZE, INITIAL_CACHE_LOOKBACK, MAX_CHART_DATA_POINTS, etc.)
- `src/utility/Crypto.ts` - Encryption/decryption utilities

## Database Service Patterns

**Interface:** All database services implement `ISprootDB` from `src/database/ISprootDB.ts`.

**Common Pattern:**

```typescript
// Example: Adding a sensor
async addSensorAsync(sensor: SDBSensor): Promise<void> {
  return this.#connection("sensors").insert({
    name: sensor.name,
    model: sensor.model,
    subcontroller_id: sensor.subcontrollerId ?? null,
    address: sensor.address,
    color: sensor.color,
    pin: sensor.pin,
    deviceZoneId: sensor.deviceZoneId ?? null,
    lowCalibrationPoint: sensor.lowCalibrationPoint,
    highCalibrationPoint: sensor.highCalibrationPoint,
  });
}
```

**Async/await:** All database operations are async methods following Promise-based patterns.

**Mock Database:** `MockSprootDB` class for testing purposes (returns empty arrays or mocks).

## TypeScript Configuration

**Project:** Uses shared `tsconfig.json` from root with project references.

**Build Order:** Common must be built before server (server tsconfig has `references` to common).

**Linting:** ESLint + Prettier (100 char line width)

**Dependencies:**

- mysql2 (database connections)
- winston (logging)
- mocha (testing framework)
- ts-node (test runner)

## Build Order Requirements

**Critical:** Common must be built before server can build.

**Reason:** Server's tsconfig has:

```json
{
  "references": [{ "path": "../common" }]
}
```

**Recommended Build Sequence:**

1. `cd common && npm run build`
2. `cd server && npm run build`
3. `cd client && npm run build`

## Testing Patterns

**Unit Tests:**

- Mocha + ts-node
- Tests in `src/**/*.spec.ts`
- Run with: `npm run test`

**Mock Database:** Use `MockSprootDB` for testing without database connection.

## Environment Variables

None required for local development.

## Common Module Pattern

This module provides shared functionality:

- Type definitions for all entities (sensors, outputs, automations, etc.)
- Database service abstractions and implementations
- Cross-service authentication utilities (`InterserviceAuthentication`)
- Utility functions (date utils, crypto)

**Reused by:**

- `server/` - Implements `SprootDB` class satisfying `ISprootDB`
- `client/` - Imports type definitions directly from source
