# Server CLAUDE.md

This file provides guidance to Claude Code when working with the Sproot server project.

## Project Overview

Sproot Server is the Express.js REST API backend for the Sproot greenhouse controller. It handles all HTTP requests, manages the database layer, and integrates with hardware components (sensors, outputs, subcontrollers).

**Purpose:** REST API server that serves the frontend, manages database operations, and handles hardware integration via MQTT and direct device communication.

**Environment:** Node.js with TypeScript (compiled output), Knex.js for MySQL/MariaDB database, Express.js for HTTP serving.

## Development Commands

### Build & Compile

```bash
# Build TypeScript (must complete before running)
npm run build

# Clean compiled output
npm run clean
```

### Run

```bash
# Run with nodemon (auto-reload on changes)
npm run start:dev

# Run after build completes
npm run start
```

### Test

```bash
# Run unit tests (requires build first)
npm run test

# Run API tests with mocks (requires build first)
npm run test:api

# Check linting and formatting
npm run prettier:check
npm run lint
```

## Architecture

**Entry Point:** `src/index.ts` starts the Express server on port 3000.

**HTTP Server:** Express.js application created in `src/program.ts`.

**API Structure:**

- Single v2 endpoint prefix: `/api/v2/*`
- Versioned routes defined in `src/api/v2/ApiRootV2.ts`
- JWT authentication via `authenticateMiddleware`
- OpenAPI spec at `api_spec/openapi_v2.yaml`

**Database Layer:**

- Knex.js for MySQL/MariaDB operations
- Central database class: `src/database/SprootDB.ts` implements `ISprootDB`
- Database migrations managed via Knex migrations directory
- Environment variables: DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD

**Application Structure:**

```
src/
├── program.ts          # Express app setup and initialization
├── index.ts            # Server entry point (port 3000)
├── database/           # Database layer and services
│   ├── SprootDB.ts    # Main database implementation
│   ├── KnexUtilities.ts
│   └── migrations/     # Database migrations
├── api/v2/            # API routes
│   └── ApiRootV2.ts   # Route registry
├── sensors/           # Sensor management
├── outputs/           # Output device management
├── automation/        # Condition and action logic
├── camera/            # Camera stream management
├── journals/          # Journal entries
├── system/            # System monitoring, backups, cron jobs
└── utils/             # Utility functions
```

## Key Directories

**Database:**

- `src/database/SprootDB.ts` - Central database class implementing all CRUD operations
- `src/database/migrations/` - Knex migration files
- Database entities: users, sensors, readings, outputs, states, device_zones, automations, conditions, actions, subcontrollers, journals, journal_entries

**Hardware Integration:**

- PCA9685: PWM relay controller via direct SPI communication
- TPLink Smart Plugs: Via `tplink-smarthome-api` simulator
- ESP32 Subcontrollers: rest-based communication for remote ESP32 devices (firmware updates via `POST /api/v2/subcontrollers/firmware/esp32/ota-update/:deviceId`)
- Sensors: BME280, DS18B20, ADS1115 (Analog-to-digital sensor)

## Environment Variables (`server/.env`)

```
NODE_ENV=development
JWT_SECRET=<random string>
JWT_EXPIRATION=259200000
DEFAULT_USER=<dev username>
DEFAULT_USER_EMAIL=<dev email>
DEFAULT_USER_PASSWORD=<dev password>
AUTHENTICATION_ENABLED=false
DATABASE_HOST=<db host>
DATABASE_PORT=<db port>
DATABASE_USER=<db username>
DATABASE_PASSWORD=<db password>
INTERSERVICE_AUTHENTICATION_KEY=<key>
BACKUP_RETENTION_DAYS=30
```

**Note:** Copy `server/.env.development` to `server/.env` before running. `.env` files are gitignored.

## TypeScript Configuration

**Project:** Uses shared `tsconfig.json` from root with project references.

**Path Aliases:** `@sproot/*` → `../common/dist/*` (pointing to compiled common)

**Build Order:** Common must be built first, then server (tsconfig has `references` to common).

## Common Module Pattern

The `common/` workspace provides:

- Database service interfaces (`ISprootDB`) and implementations
- Type definitions for all entities
- Cross-service authentication utilities

**Important:** Build order matters. Run `npm run build` for common before server.

## Docker Development

When using `docker-compose.yaml.development`:

- Server runs from root project (not from within Docker image)
- Server must be manually started with `npm run start:dev`
- Full stack runs: MariaDB, PHPMyAdmin, Node.js server
- Logs mounted from `/sproot/server/logs/`
- Backups mounted from `/sproot/server/backups/`

**Note:** Docker Compose entrypoint is not set for server - manual start required.

## Build Configuration

**TypeScript:** Shared tsconfig with project references (incremental builds).

**Path Mapping:**

- `@sproot/sproot-common` → `../common/dist/*`

**Linting:** ESLint + Prettier (100 char line width)

**Dependencies:**

- Express, Knex, bcrypt, jsonwebtoken (authentication)
- winston + winston-daily-rotate-file (logging)
- nodemon (dev server)
- mocha (testing framework)
- swagger-jsdoc, swagger-ui-express (OpenAPI docs)

## Testing Patterns

**Unit Tests:**

- Mocha + ts-node
- Tests in `src/**/*.spec.ts`
- Run with: `npm run test`

**API Tests:**

- Mocha with `src/test/setup.ts` setup
- Uses `nock` for HTTP mocking
- Requires `INTERSERVICE_AUTHENTICATION_KEY` env
- Run with: `npm run test:api`

## Development Tips

**Graceful Shutdown:** Server handles SIGINT/SIGTERM gracefully, stopping cron jobs and cleaning up resources.

**Database Operations:** Most database work goes through `SprootDB` class methods (e.g., `getSensorsAsync`, `addSensorAsync`).

**Cron Jobs:** Cron jobs created via helper functions in `src/system/CronJobs.ts` (e.g., `createUpdateDevicesCronJob`, `createBackupCronJob`).

**Logging:** Winston logger configured in `src/logger/index.ts` (create/update this file).

**API Versioning:** All routes under `/api/v2/` with version documented in OpenAPI spec.
