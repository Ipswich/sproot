# Implementation Plan: Data Query APIs

## Overview

Implement POST `/api/v2/sensors/data` and POST `/api/v2/outputs/data` endpoints for flexible historical data queries with downsampling and cursor pagination.

## Task List

### 1. Common Types (`common/src/api/v2/QueryTypes.ts`)

**Purpose**: Define all request and response types for the new query endpoints.

**Create**: `common/src/api/v2/QueryTypes.ts`

**Types to define**:

- `DataQueryRequest` — shared base fields: `timeRange`, `downsample?`, `cursor?`, `limit?`
- `SensorDataQueryRequest` — extends `DataQueryRequest` with `ids?`, `readingTypes?`, `aggregates?`, `percentile?`
- `OutputDataQueryRequest` — extends `DataQueryRequest` with `ids?`
- `SensorDataValue` — `{ time: string, ...aggregates }`
- `OutputDataValue` — `{ time: string, ...aggregates }`
- `SensorDataQueryResponse` — `{ data: { [sensorId: number]: { [readingType: string]: { units: string, values: SensorDataValue[] } } }, moreDataAvailable: boolean }`
- `OutputDataQueryResponse` — `{ data: { [outputId: number]: { values: OutputDataValue[] } }, moreDataAvailable: boolean }`

**Constants to export**:

- `VALID_AGGREGATES = ["min", "max", "avg", "count", "sum", "stddev", "percentile", "first", "last"]`
- `VALID_DOWNSAMPLES = ["5m", "1h", "1d"]`
- `DEFAULT_LIMIT = 500`, `MAX_LIMIT = 10000`

**Validation helper**: `validateDataQueryRequest(request)` — validates timeRange, downsample, cursor, limit, readingTypes, ids, aggregates, percentile. Returns errors array or null.

**Cursor utilities**: `encodeCursor(timestamp: Date): string` (base64 ISO string), `decodeCursor(cursor: string): Date` (parse base64 ISO string), `cursorToTimestamp(cursor: string | undefined): Date | undefined`

### 2. Database Migration (`server/src/database/migrations/20260530000000_data-query-aggregates.ts`)

**Purpose**: Create new continuous aggregates (1h, 1d) and update refresh policies.

**Changes**:

- Create `sensor_data_1h` continuous aggregate: `time_bucket('1 hour', logTime) AS bucket, sensor_id, metric, first(units, logTime ASC) AS units, first(data, logTime ASC) AS first_data, last(data, logTime DESC) AS last_data, count(*), avg(data), min(data), max(data), stddev_samp(data), percentile_agg(data), last_log_time` GROUP BY bucket, sensor_id, metric;
- Create `sensor_data_1d` continuous aggregate: `time_bucket('1 day', logTime) AS bucket, sensor_id, metric, first(units, logTime ASC) AS units, first(data, logTime ASC) AS first_data, last(data, logTime DESC) AS last_data, count(*), avg(data), min(data), max(data), stddev_samp(data), percentile_agg(data), last_log_time` GROUP BY bucket, sensor_id, metric;
- Create `output_data_1h` continuous aggregate: `time_bucket('1 hour', logTime) AS bucket, output_id, first(controlMode, logTime ASC) AS first_control_mode, last(controlMode, logTime DESC) AS last_control_mode, first(value, logTime ASC) AS first_value, last(value, logTime DESC) AS last_value, count(*), avg(value), min(value), max(value), stddev_samp(value), last_log_time` GROUP BY bucket, output_id;
- Create `output_data_1d` continuous aggregate: same columns, `time_bucket('1 day', logTime)`
- Update refresh policies: 5m → every 10m, 1h → every 30m, 1d → every 1h
- Create indexes on new aggregate tables for (sensor_id, metric, bucket), (output_id, bucket)

**Rollback**: Drop aggregates, drop indexes, restore policies

### 3. QueryService (`server/src/database/QueryService.ts`)

**Purpose**: All database query logic for the data query endpoints.

**Constructor**: `constructor(knex: Knex, logger: Logger)` — inject via DI

**Methods**:

#### `querySensorDataAsync(request: SensorDataQueryRequest): Promise<SensorDataQueryResponse>`

- Validate request (delegates to common validator)
- Determine path: if `downsample` matches a continuous aggregate interval → aggregate path; else → raw path
- **Aggregate path**: Call `querySensorDataAggregateAsync(request)` — one query for all sensors
- **Raw path**: Call `querySensorDataRawAsync(request)` — one query per sensor
- Format results into response shape keyed by sensorId → readingType

#### `queryOutputDataAsync(request: OutputDataQueryRequest): Promise<OutputDataQueryResponse>`

- Validate request
- Determine path: aggregate vs raw
- **Aggregate path**: Call `queryOutputDataAggregateAsync(request)` — one query for all outputs
- **Raw path**: Call `queryOutputDataRawAsync(request)` — one query per output
- Format results into response shape keyed by outputId

#### `querySensorDataAggregateAsync(request: SensorDataQueryRequest): Promise<SensorDataQueryResponse>`

- Build query using Knex query builder:
  - `knex.select()` with computed fields for each requested aggregate
  - `time_bucket(downsample, logTime) AS bucket`
  - For each aggregate: `knex.raw()` for min/max/avg/count/stddev/percentile/FIRST_VALUE/LAST_VALUE
  - `GROUP BY bucket, sensor_id, metric`
  - `WHERE logTime BETWEEN start AND end`
  - If downsample = "5m", join with `sensor_data_5m` (already exists)
  - If downsample = "1h", join with `sensor_data_1h` (new)
  - If downsample = "1d", join with `sensor_data_1d` (new)
  - Actually, use the aggregate table directly: `knex(from).select('*')` from the aggregate table
  - Add WHERE for sensor_id, metric filters, bucket range
  - Add ORDER BY bucket ASC
  - Add LIMIT = limit + 1 for cursor pagination
  - Add ROW_NUMBER() window function for per-group limiting
- Process rows: group by sensorId → readingType, build values array
- Check `moreDataAvailable` (rows.length > limit)
- Truncate to limit if needed

#### `querySensorDataRawAsync(request: SensorDataQueryRequest): Promise<SensorDataQueryResponse>`

- For each sensorId in request.ids (or all sensors if empty):
  - Build query: `knex('sensor_data').select('logTime', 'metric', 'data', 'units')`
  - WHERE `sensor_id = sensorId` AND `logTime BETWEEN start AND end`
  - ORDER BY `logTime DESC`
  - LIMIT = limit + 1
  - Execute query
  - Extract unique readingTypes from results
  - Group by readingType, apply requested aggregates
  - Check `moreDataAvailable`
- Merge all sensor results into response shape

#### `queryOutputDataAggregateAsync(request: OutputDataQueryRequest): Promise<OutputDataQueryResponse>`

- Similar to `querySensorDataAggregateAsync` but for output_data aggregate tables
- Use `output_data_5m`, `output_data_1h`, `output_data_1d`
- No metric column, only output_id

#### `queryOutputDataRawAsync(request: OutputDataQueryRequest): Promise<OutputDataQueryResponse>`

- Similar to `querySensorDataRawAsync` but for output_data table
- One query per outputId

#### `getAllSensorIdsAsync(): Promise<number[]>`

- `knex('sensors').select('id').whereNotNull('deleted_at')` — wait, no, where `deleted_at IS NULL`
- Return all active sensor IDs

#### `getAllOutputIdsAsync(): Promise<number[]>`

- `knex('outputs').select('id').whereNull('deleted_at')` — actually check existing pattern
- Return all active output IDs

#### `getSensorUnitsAsync(sensorIds: number[]): Promise<Record<number, Record<string, string>>>`

- Query sensors table for name, reading_type, units for given sensorIds
- Return nested map: `{ [sensorId]: { [metric]: units } }`

#### `getReadingTypesForSensorAsync(sensorId: number): Promise<string[]>`

- Query sensor_data hypertable for distinct metrics for a sensor
- Return array of reading type strings

### 4. Sensor Data Handler (`server/src/api/v2/sensors/handlers/SensorDataQueryHandler.ts`)

**Purpose**: Handler for POST `/api/v2/sensors/data` endpoint.

**Handler function**: `queryDataAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse>`

- Get QueryService from DI: `request.app.get('queryService')`
- Call `queryService.querySensorDataAsync(request.body)`
- Wrap result in `SuccessResponse` with `moreDataAvailable`
- Return response

**Validation**: Use `validateDataQueryRequest` from common. Return 400 with details if invalid.

### 5. Output Data Handler (`server/src/api/v2/outputs/handlers/OutputDataQueryHandler.ts`)

**Purpose**: Handler for POST `/api/v2/outputs/data` endpoint.

**Handler function**: `queryDataAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse>`

- Get QueryService from DI
- Call `queryService.queryOutputDataAsync(request.body)`
- Wrap result in `SuccessResponse`
- Return response

### 6. Router Updates

**`server/src/api/v2/sensors/SensorsRouter.ts`**:

- Add: `router.post('/data', authenticateMiddleware, SensorDataQueryHandler.queryDataAsync)`

**`server/src/api/v2/outputs/OutputsRouter.ts`**:

- Add: `router.post('/data', authenticateMiddleware, OutputDataQueryHandler.queryDataAsync)`

### 7. Dependency Injection (`server/src/utils/DependencyInjectionConstants.ts`)

- Add: `QueryService` to `DI_KEYS` enum
- Register in `DependencyInjection.ts`: `container.register('queryService', QueryService)` with KnexConnection and Logger

### 8. OpenAPI Spec (`api_spec/openapi_v2.yaml`)

**Add to sensors section**:

- `POST /sensors/data` — request body (SensorDataQueryRequest), responses (200 with SensorDataQueryResponse, 400, 401, 503)
- Define `SensorDataQueryRequest` schema
- Define `SensorDataValue` schema
- Define `SensorDataQueryResponse` schema

**Add to outputs section**:

- `POST /outputs/data` — request body (OutputDataQueryRequest), responses (200 with OutputDataQueryResponse, 400, 401, 503)
- Define `OutputDataQueryRequest` schema
- Define `OutputDataValue` schema
- Define `OutputDataQueryResponse` schema

### 9. Tests

#### `server/src/database/test/QueryService.spec.ts`

- Setup: stub knex instance with mocked queries
- Test `querySensorDataAsync` aggregate path:
  - Returns correct response shape with aggregated data
  - Respects limit (returns limit+1 rows, truncates to limit)
  - Sets `moreDataAvailable` correctly
  - Handles cursor pagination (decodes cursor, filters by time)
  - Handles multiple sensors and readingTypes
  - Groups by sensorId → readingType correctly
- Test `querySensorDataAsync` raw path:
  - Executes one query per sensor
  - Applies requested aggregates
  - Handles empty sensor list
  - Handles sensors with no data in time range
- Test `queryOutputDataAsync` aggregate/raw paths (similar to sensors)
- Test `validateDataQueryRequest`:
  - Valid requests pass
  - Invalid timeRange returns errors
  - Invalid downsample returns errors
  - Invalid limit returns errors
  - Invalid readingTypes returns errors
  - Invalid ids returns errors
  - Invalid aggregates returns errors
  - Invalid percentile returns errors
- Test cursor utilities:
  - encode/decode roundtrip
  - Invalid cursor returns error
- Test edge cases:
  - Empty ids array (query all)
  - No matching data
  - Limit at boundary (500, 10000)

#### `server/src/api/v2/sensors/test/SensorDataQueryHandler.spec.ts`

- Test successful response (200) with data
- Test with `moreDataAvailable` true/false
- Test validation errors (400)
- Test DI resolution

#### `server/src/api/v2/outputs/test/OutputDataQueryHandler.spec.ts`

- Test successful response (200) with data
- Test with `moreDataAvailable` true/false
- Test validation errors (400)
- Test DI resolution

## Execution Order

1. Task 1: Common types
2. Task 2: Database migration
3. Task 3: QueryService
4. Task 4-5: Handlers
5. Task 6: Router updates
6. Task 7: DI registration
7. Task 8: OpenAPI spec
8. Task 9: Tests (can be done in parallel with 4-8)

## Files to Create

- `common/src/api/v2/QueryTypes.ts`
- `server/src/database/migrations/20260530000000_data-query-aggregates.ts`
- `server/src/database/QueryService.ts`
- `server/src/api/v2/sensors/handlers/SensorDataQueryHandler.ts`
- `server/src/api/v2/outputs/handlers/OutputDataQueryHandler.ts`
- `server/src/database/test/QueryService.spec.ts`
- `server/src/api/v2/sensors/test/SensorDataQueryHandler.spec.ts`
- `server/src/api/v2/outputs/test/OutputDataQueryHandler.spec.ts`

## Files to Modify

- `server/src/api/v2/sensors/SensorsRouter.ts` — add /data route
- `server/src/api/v2/outputs/OutputsRouter.ts` — add /data route
- `server/src/utils/DependencyInjectionConstants.ts` — add QueryService key
- `server/src/utils/DependencyInjection.ts` — register QueryService
- `api_spec/openapi_v2.yaml` — add endpoint definitions and schemas
