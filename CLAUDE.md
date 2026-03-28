# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sproot is a Raspberry Pi-based greenhouse controller and monitoring system with extensible software architecture. It uses 3D printed parts, common electronics, and flexible software for hands-off environmental regulation.

**Monorepo Structure:**
```
sproot/
├── common/          # Shared libraries, types, database schemas (TypeScript)
├── server/          # Express.js REST API, database migrations, hardware integration
├── client/          # React frontend with Vite + React Query
├── docs/            # API documentation site (Docusaurus)
└── gateway/         # Nginx gateway for Docker deployment (statically serves client and docs)
```

## Development Commands

### Build
- Server: `cd server && npm run build` (compiles TypeScript; tests via `cd server && npm run test`)
- Client: `cd client && npm run build` (compiles TypeScript and builds Vite frontend)
- Common: `cd common && npm run build` (compiles shared libraries)
- Docs: `npm run build --workspace=docs` (builds Docusaurus documentation site)

### Run
- Development: `cd server && npm run start:dev` (nodemon, auto-reload)
- Client dev: `cd client && npm run start:dev` (Vite dev server on port 5173)
- Docker: `sudo docker compose -f docker-compose.yaml.development up -d` (full dev stack, used for developing with linux-only libraries)

### Test
- Common tests: `cd common && npm run test` (mocha + ts-node)
- Server unit tests: `cd server && npm run test` (mocha + ts-node)
- Server API tests: `cd server && npm run test:api` (inter-service API tests with mocks)
- Client tests: No automated test suite currently. Use the Vite dev server with React DevTools for manual/exploratory testing.

### Lint/Format
- Server Check: `cd server && npm run prettier:check`
- Common check: `cd common && npm run prettier:check`
- Client check: `cd client && npm run prettier:check`

## API Architecture

**Versioned API:** Single v2 endpoint (`/api/v2/*`) with request-scoped JWT authentication via `authenticateMiddleware`.
**Router Structure** (`server/src/api/v2/ApiRootV2.ts`):
```
/api/v2/docs  - Public (OpenAPI docs)
/api/v2/ping - Health check
/api/v2/authenticate - JWT token management
/api/v2/sensors - Reading data and readings
/api/v2/outputs - Output device control and status
/api/v2/automations - Automation conditions and actions
/api/v2/camera - Image capture and livestream
/api/v2/subcontrollers - ESP32 subcontroller management
/api/v2/device-zones - Zone grouping for devices
/api/v2/journals - Journal entries and views
/api/v2/entries - Individual journal entries
/api/v2/tags - Tag management for journals/entries
```

## Data Models (Database - MySQL/MariaDB)

**Core Entity Types:**
- `User` - Authentication accounts
- `Sensor` - Physical sensors (temperature, humidity, etc.)
- `Reading` - Sensor data points
- `Output` - Control devices (relays, smart plugs)
- `State` - Output data points
- `OutputGroup` - Groups of outputs controlled as a unit
- `DeviceZone` - Sensors or Outputs colocated together (shelf, room, etc.)
- `Automation` - Scheduled rules (conditions → actions)
- `Condition` - Triggers for an automation
- `Actions` - (OutputAction) Automation subtypes
- `Subcontrollers` - Child nodes controlled by core service (ESP32)
- `Journal` - Text entries with tags
- `JournalEntry` - Individual journal posts

## Hardware Integration

**Outputs:** PCA9685 to control relays and PWM circuits, TPLink Smart Plugs and Strips.

**Sensors:** Digital (DS18B20, BME280, ADS1115) and analog (capacitive moisture sensors) through ADS1115 digital sensor.

**Subcontrollers:** ESP32 devices that can manage their own relays, pwm interfaces, and sensors (firmware flashing via `POST /api/v2/subcontrollers/:id/flash-firmware`).

**Camera:** Picamera livestreams (configured in camera settings).

## Common Module Pattern

The `common/` module contains shared TypeScript code:
- Type definitions and interfaces
- Database service classes (`SDB*`)
- Lists of things (sensors, outputs, conditions, etc.) that need to be in-sync between client and server
- Cross-service auth utilities (`InterserviceAuthentication`)

**Build Order:** The `common` workspace must be built before `server`, since the server imports from `@sproot/sproot-common/dist/...`. For example, run `npm run build:server` or `npm run build --workspace=common --workspace=server` to build both in the correct order.

## Docker Dev Mode

When using `docker-compose.yaml.development`:
- Server builds and runs from root project
- Server must be manually started (Docker file does not have an entrypoint)
- Runs full stack including MariaDB, PHPMyAdmin
- Logs and backups mounted from host directories

## Environment Variables

**Server (`server/.env.development`):**
```
NODE_ENV=test
JWT_SECRET=<random string>
JWT_EXPIRATION=259200000
DEFAULT_USER/EMAIL/PASSWORD=<dev account>
AUTHENTICATION_ENABLED=false
DATABASE_HOST/PORT/USER/PASSWORD
INTERSERVICE_AUTHENTICATION_KEY=<key>
BACKUP_RETENTION_DAYS=30
```

**Client (`client/.env.development`):**
```
VITE_API_SERVER_URL=<your server URL>
```

## Frontend Architecture

**Routing:** React Router v6 with lazy loaders fetching initial data from server.

**State Management:** TanStack React Query for API caching and server state.

**UI Library:** Mantine (components, dates, charts, forms).

**Routes:**
- `/live-view` - Camera livestream or redirect to temp sensor data
- `/sensor-data/:readingType` - Charts and readings for one reading type (with zone grouping)
- `/output-states` - Relay and PWM status (with zone grouping)
- `/automations` - Conditions and actions table
- `/journals` - Journal list view
- `/journals/:journalId` - Journal view and entry list
- `/journals/:journalId/entries/:entryId` - Entry view
- `/settings/*` - Configuration pages for each component type

## Docs Architecture
**Backing Service:** Docusaurus v3
**Purpose:** Documenting features in a human friendly, readable, manner.

**Routes:**
- `/docs/*` - Page for each major component or feature.

## Docker Images

**Server:** `ghcr.io/ipswich/sproot-server:latest`
**Client:** `ghcr.io/ipswich/sproot-client:latest` (nginx + React)
**DB:** `mariadb:11.5.2-noble`
**PhpMyAdmin:** `phpmyadmin:5.2.1-apache`

## Key Directories

**Common:**
- `common/src/api/*` - Base request and response types for all requests.
- `common/src/automation/*` - Interfaces and types for automation classes
- `common/src/database/*` - Raw types as they exist in the database; Interface for the database class.
- `common/src/outputs/*` - Interfaces and types for outputs
- `common/src/sensors/*` - Interfaces and types for sensors
- `common/src/system/*` - Interfaces and types for system
- `common/src/utility/*` - Utility classes and functions that may be used on either the frontend or backend

**Server:**
- `server/src/api/*` - Versioned API routes and handlers
- `server/src/automation/*` - Condition/action logic
- `server/src/camera/*` - Camera stream and snapshot integrations
- `server/src/database/*` - database queries, migrations, and seeds
- `server/src/journals/*` - journals, entries, and their tags
- `server/src/outputs/*` - Outputs; lifecycle, data fetching, and logic
- `server/src/sensors/*` - Sensors; lifecycle, data fetching, and logic
- `server/src/system/*` - Status monitoring, backups, camera

**Client:**
- `client/src/routes/*` - Page components
- `client/src/components/*` - Shareable, reusable, components
- `client/src/requests/*` - API request utilities
- `client/src/shell/*` - Header/navbar layout
