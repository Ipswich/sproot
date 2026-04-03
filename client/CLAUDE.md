# Client CLAUDE.md

This file provides guidance to Claude Code when working with the Sproot client project.

## Project Overview

Sproot Client is the React frontend for the Sproot greenhouse controller, built with Vite and using React Router for navigation and TanStack React Query for API state management.

**Purpose:** React frontend that displays sensor data, output states, automations, journals, and provides settings configuration.

**Environment:** Vite + React 19 + TypeScript, with build output to `dist/` directory.

## Development Commands

### Build

```bash
# Build TypeScript and compile Vite frontend
npm run build
```

### Run

```bash
# Start Vite dev server
npm run start:dev
```

### Test

```bash
# Manual/exploratory testing via dev server
npm run start:dev
```

**Note:** No automated test suite currently. Use Vite dev server with React DevTools for manual testing.

## Architecture

**Entry Point:** `src/main.tsx` - Creates React root and router.

**Build Tool:** Vite (configured in `vite.config.ts`).

**Routing:** React Router v6 with lazy loaders fetching data from server.

**State Management:** TanStack React Query for API caching and server state.

**UI Library:** Mantine (components, dates, charts, forms) + Recharts.

## Development Commands

### Build

```bash
# Build TypeScript and Vite frontend
npm run build

# Clean build output
npm run clean
```

### Run

```bash
# Start Vite dev server on port 5173
npm run start:dev

# Preview production build
npm run preview
```

### Test

```bash
# No automated tests currently.
# Use Vite dev server with React DevTools for manual/exploratory testing.
```

## Key Directories

**Routing:**

- `src/routes/Root.tsx` - Root route with loader
- `src/routes/live-view/LiveView.tsx` - Camera livestream page
- `src/routes/sensor-data/SensorData.tsx` - Sensor charts with zone grouping
- `src/routes/output-states/OutputStates.tsx` - Relay/PWM status with zone grouping
- `src/routes/automations/Automations.tsx` - Conditions and actions table
- `src/routes/journals/Journals.tsx` - Journal list
- `src/routes/journals/entries/JournalEntries.tsx` - Entry list
- `src/routes/journals/entries/JournalEntryView.tsx` - Single entry view
- `src/routes/settings/*` - Settings pages for each component type

**Loaders:**

- `src/routes/utility/Loaders.ts` - Root loader returning sensor/reading type data

**Components:**

- `src/components/*` - Shared, reusable components

**Utilities:**

- `src/requests/*` - API request utilities
- `src/shell/*` - Header/navbar layout

**Error Handling:**

- `src/error_pages/ErrorPage.tsx` - Global error boundary

**CSS:**

- `src/index.css` - Global styles

## Router Configuration

**Base Router:** Defined in `src/main.tsx` using `createBrowserRouter`.

**Default Route:** `/` → `<HomeRouter />`

**Route Structure:**

```
/
├── /
│   └── <HomeRouter />
├── /live-view
├── /sensor-data/:readingType
├── /output-states
├── /automations
├── /journals
│   ├── /journals/:journalId
│   └── /journals/:journalId/entries/:entryId
├── /settings/outputs
├── /settings/sensors
├── /settings/camera
├── /settings/subcontrollers
└── /settings/system
```

**Loaders:**

- `rootLoader()` - Fetches sensor types, reading data, output data
- Route-specific loaders for conditional redirects

**Fallback Logic:**

- If camera disabled → redirect to temp sensor data
- If no reading types → redirect to outputs
- If no outputs → redirect to sensors settings

## TypeScript Configuration

**Project:** Uses shared `tsconfig.json` from root with project references.

**Path Aliases:**

- `@sproot/sproot-common` → `../common/src/*`
- `@sproot/sproot-client` → `../client/src/*`

**Build Order:** Client depends on common (imports types from common/src).

## Environment Variables (`client/.env.development`)

```
VITE_API_SERVER_URL=<your server URL>
```

**Note:** Copy `client/.env.development` to `client/.env` before running.

## Build Configuration

**TypeScript:** Shared tsconfig with project references (incremental builds).

**Path Mapping:**

- `@sproot/sproot-common` → `../common/src/*`
- `@sproot/sproot-client` → `../client/src/*`

**Vite:** Configured in `vite.config.ts`:

- Uses @vitejs/plugin-react-swc
- Basic CSS module handling

**Linting:** ESLint + Prettier (100 char line width)

- Uses @tanstack/eslint-plugin-query
- React Hooks and Refresh plugins

**Dependencies:**

- React 19 + ReactDOM
- React Router v6
- TanStack React Query + Devtools
- Mantine (core, charts, dates, forms, hooks)
- Recharts (charts)
- @tabler/icons-react (icons)

## Client Patterns

**API Integration:**

- Uses `useQuery` from React Query for fetching data
- Loaders in React Router fetch initial data
- API server URL from `import.meta.env.VITE_API_SERVER_URL`

**Type Imports:**

- `@sproot/sproot-common/src/*` for shared types

**Error Handling:**

- `ErrorPage.tsx` as global error boundary
- Individual route loaders redirect on missing data

## Development Tips

**No Tests:** Manual testing only via Vite dev server.

**TypeScript:** All types come from `@sproot/sproot-common`.

**Build Order:** Client must have common built first.

**Dev Server:** Runs on port 5173 by default (Vite default).

## Build Order Requirements

**Critical:** Client must have common built before it can build.

**Reason:** Client's tsconfig has `references` to common.

**Recommended Build Sequence:**

1. `cd common && npm run build`
2. `cd server && npm run build`
3. `cd client && npm run build`

## Docker Deployment

Client builds container image with nginx + React for production deployment:

- Image: `ghcr.io/ipswich/sproot-client:latest`
- Serves static files from client/dist/

## Testing Patterns

**No Automated Tests:** Manual/exploratory testing via dev server.

**React DevTools:** Available in development mode.

## Common Module Pattern

This module imports shared types from `@sproot/sproot-common/src/*`:

- Database service type definitions
- API request/response types
- Automation condition types
- Sensor/Output interfaces

**Reused from:**

- `common/src/api/*` - API types
- `common/src/database/*` - Database type definitions
- `common/src/automation/*` - Automation types
- `common/src/sensors/*` - Sensor interfaces
- `common/src/outputs/*` - Output interfaces
