// ============================================================
// Data Query API Types — shared between server and client
// ============================================================

// Aggregate functions supported in query responses
export const VALID_AGGREGATES = [
  "min",
  "max",
  "avg",
  "count",
  "sum",
  "stddev",
  "percentile",
  "first",
  "last",
] as const;
export type Aggregate = (typeof VALID_AGGREGATES)[number];

// Downsample intervals that match continuous aggregates
export const VALID_DOWNSAMPLES = ["5m", "1h", "1d"] as const;
export type Downsample = (typeof VALID_DOWNSAMPLES)[number];

export const DOWNSAMPLE_TO_BUCKET_MINUTES: Record<Downsample, number> = {
  "5m": 5,
  "1h": 60,
  "1d": 1440,
};

export const DEFAULT_LIMIT = 500;
export const MAX_LIMIT = 10000;
export const MAX_ARRAY_SIZE = 1000;

// ---------------------------------------------------------------------------
// Table name mappings for TimescaleDB continuous aggregates
// ---------------------------------------------------------------------------

export const SENSOR_HISTORY_TABLE = "sensor_data";
export const OUTPUT_HISTORY_TABLE = "output_data";

export const SENSOR_AGGREGATE_TABLES: Record<string, string> = {
  "5m": "sensor_data_5m",
  "1h": "sensor_data_1h",
  "1d": "sensor_data_1d",
};

export const OUTPUT_AGGREGATE_TABLES: Record<string, string> = {
  "5m": "output_data_5m",
  "1h": "output_data_1h",
  "1d": "output_data_1d",
};

export const BUCKET_MINUTES_TO_SENSOR_TABLE: Record<number, string> = {
  5: "sensor_data_5m",
  60: "sensor_data_1h",
  1440: "sensor_data_1d",
};

export const BUCKET_MINUTES_TO_OUTPUT_TABLE: Record<number, string> = {
  5: "output_data_5m",
  60: "output_data_1h",
  1440: "output_data_1d",
};

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface DataQueryRequestBase {
  timeRange: {
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
  downsample?: Downsample;
  cursor?: string; // base64-encoded ISO 8601 timestamp
  limit?: number;
}

export interface SensorDataQueryRequest extends DataQueryRequestBase {
  ids?: number[];
  readingTypes?: string[];
  aggregates?: Aggregate[];
  percentile?: number; // 0-1, default 0.5
}

export interface OutputDataQueryRequest extends DataQueryRequestBase {
  ids?: number[];
  aggregates?: Aggregate[];
  percentile?: number; // 0-1, default 0.5
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface DataQueryResponseBase {
  data: unknown;
  nextCursor?: string; // base64-encoded ISO 8601 timestamp for next page
}

export interface SensorDataValue {
  time: string; // ISO 8601 bucket timestamp
  [agg: string]: unknown; // min, max, avg, count, sum, stddev, percentile, first, last
}

export interface OutputDataValue {
  time: string; // ISO 8601 bucket timestamp
  [agg: string]: unknown; // min, max, avg, count, sum, stddev, percentile, first, last
}

export interface SensorReadingGroup {
  units: string;
  values: SensorDataValue[];
}

export interface SensorDataQueryResponse {
  data: Record<number, Record<string, SensorReadingGroup>>;
  nextCursor?: string; // base64-encoded ISO 8601 timestamp for next page
}

export interface OutputReadingGroup {
  values: OutputDataValue[];
}

export interface OutputDataQueryResponse {
  data: Record<number, OutputReadingGroup>;
  nextCursor?: string; // base64-encoded ISO 8601 timestamp for next page
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: true;
  data: unknown;
}

export interface ValidationFailure {
  valid: false;
  errors: string[];
}

export type ValidationResultType = ValidationResult | ValidationFailure;

// ---------------------------------------------------------------------------
// Cursor types
// ---------------------------------------------------------------------------

export interface CursorPayload {
  timestamp: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Validation functions
// ---------------------------------------------------------------------------

function validateTimeRange(
  timeRange: unknown,
): { valid: true } | { valid: false; errors: string[] } {
  if (!timeRange || typeof timeRange !== "object") {
    return { valid: false, errors: ["timeRange is required"] };
  }

  const tr = timeRange as Record<string, unknown>;
  if (!tr["start"] || typeof tr["start"] !== "string") {
    return { valid: false, errors: ["timeRange.start is required and must be a string"] };
  }
  if (!tr["end"] || typeof tr["end"] !== "string") {
    return { valid: false, errors: ["timeRange.end is required and must be a string"] };
  }

  const startDate = new Date(tr["start"]);
  const endDate = new Date(tr["end"]);

  if (isNaN(startDate.getTime())) {
    return { valid: false, errors: ["timeRange.start is not a valid ISO 8601 date"] };
  }
  if (isNaN(endDate.getTime())) {
    return { valid: false, errors: ["timeRange.end is not a valid ISO 8601 date"] };
  }

  if (endDate <= startDate) {
    return { valid: false, errors: ["timeRange.end must be after timeRange.start"] };
  }

  return { valid: true };
}

function validateDownsample(
  downsample: unknown,
): { valid: true } | { valid: false; errors: string[] } {
  if (downsample === undefined) {
    return { valid: true };
  }
  if (typeof downsample !== "string") {
    return { valid: false, errors: ["downsample must be a string"] };
  }
  if (!VALID_DOWNSAMPLES.includes(downsample as Downsample)) {
    return {
      valid: false,
      errors: [`downsample must be one of: ${VALID_DOWNSAMPLES.join(", ")}`],
    };
  }
  return { valid: true };
}

function validateLimit(limit: unknown): { valid: true } | { valid: false; errors: string[] } {
  if (limit === undefined) {
    return { valid: true };
  }
  if (typeof limit !== "number" || !Number.isInteger(limit)) {
    return { valid: false, errors: ["limit must be an integer"] };
  }
  if (limit < 1) {
    return { valid: false, errors: ["limit must be at least 1"] };
  }
  if (limit > MAX_LIMIT) {
    return { valid: false, errors: [`limit must not exceed ${MAX_LIMIT}`] };
  }
  return { valid: true };
}

function validateCursor(cursor: unknown): { valid: true } | { valid: false; errors: string[] } {
  if (cursor === undefined) {
    return { valid: true };
  }
  if (typeof cursor !== "string") {
    return { valid: false, errors: ["cursor must be a string"] };
  }
  try {
    const decoded = Buffer.from(cursor, "base64").toString();
    const date = new Date(decoded);
    if (isNaN(date.getTime())) {
      return { valid: false, errors: ["cursor contains an invalid timestamp"] };
    }
  } catch {
    return { valid: false, errors: ["cursor must be a valid base64-encoded string"] };
  }
  return { valid: true };
}

function validateIds(ids: unknown): { valid: true } | { valid: false; errors: string[] } {
  if (ids === undefined) {
    return { valid: true };
  }
  if (!Array.isArray(ids)) {
    return { valid: false, errors: ["ids must be an array"] };
  }
  for (const id of ids) {
    if (typeof id !== "number") {
      return { valid: false, errors: ["ids must contain only numbers"] };
    }
  }
  return { valid: true };
}

function validateAggregates(
  aggregates: unknown,
): { valid: true } | { valid: false; errors: string[] } {
  if (aggregates === undefined) {
    return { valid: true };
  }
  if (!Array.isArray(aggregates)) {
    return { valid: false, errors: ["aggregates must be an array"] };
  }
  for (const agg of aggregates) {
    if (typeof agg !== "string" || !VALID_AGGREGATES.includes(agg as Aggregate)) {
      return {
        valid: false,
        errors: [
          `aggregates must contain only valid aggregate names: ${VALID_AGGREGATES.join(", ")}`,
        ],
      };
    }
  }
  return { valid: true };
}

function validateReadingTypes(
  readingTypes: unknown,
): { valid: true } | { valid: false; errors: string[] } {
  if (readingTypes === undefined) {
    return { valid: true };
  }
  if (!Array.isArray(readingTypes)) {
    return { valid: false, errors: ["readingTypes must be an array"] };
  }
  for (const rt of readingTypes) {
    if (typeof rt !== "string") {
      return { valid: false, errors: ["readingTypes must contain only strings"] };
    }
  }
  return { valid: true };
}

function validateArraySize(
  value: unknown,
  fieldName: string,
  maxSize: number,
): { valid: true } | { valid: false; errors: string[] } {
  if (value === undefined) {
    return { valid: true };
  }
  if (!Array.isArray(value)) {
    return { valid: true }; // Defensive: non-arrays are handled by the preceding type validator
  }
  if (value.length > maxSize) {
    return { valid: false, errors: [`${fieldName} must not exceed ${maxSize} items`] };
  }
  return { valid: true };
}

function validatePercentile(
  percentile: unknown,
): { valid: true } | { valid: false; errors: string[] } {
  if (percentile === undefined) {
    return { valid: true };
  }
  if (typeof percentile !== "number") {
    return { valid: false, errors: ["percentile must be a number"] };
  }
  if (percentile < 0 || percentile > 1) {
    return { valid: false, errors: ["percentile must be between 0 and 1"] };
  }
  return { valid: true };
}

type ValidationField =
  | { name: "timeRange"; required: true }
  | { name: "downsample"; required: false }
  | { name: "cursor"; required: false }
  | { name: "limit"; required: false }
  | { name: "ids"; required: false; arraySizeValidator?: true }
  | { name: "readingTypes"; required: false; arraySizeValidator?: true }
  | { name: "aggregates"; required: false }
  | { name: "percentile"; required: false };

function runValidationChecks(req: Record<string, unknown>, fields: ValidationField[]): string[] {
  const errors: string[] = [];

  for (const field of fields) {
    switch (field.name) {
      case "timeRange": {
        const result = validateTimeRange(req["timeRange"]);
        if (!result.valid) errors.push(...result.errors);
        break;
      }
      case "downsample": {
        const result = validateDownsample(req["downsample"]);
        if (!result.valid) errors.push(...result.errors);
        break;
      }
      case "cursor": {
        const result = validateCursor(req["cursor"]);
        if (!result.valid) errors.push(...result.errors);
        break;
      }
      case "limit": {
        const result = validateLimit(req["limit"]);
        if (!result.valid) errors.push(...result.errors);
        break;
      }
      case "ids": {
        const idsResult = validateIds(req["ids"]);
        if (!idsResult.valid) errors.push(...idsResult.errors);
        if (field.arraySizeValidator) {
          const sizeResult = validateArraySize(req["ids"], "ids", MAX_ARRAY_SIZE);
          if (!sizeResult.valid) errors.push(...sizeResult.errors);
        }
        break;
      }
      case "readingTypes": {
        const rtResult = validateReadingTypes(req["readingTypes"]);
        if (!rtResult.valid) errors.push(...rtResult.errors);
        if (field.arraySizeValidator) {
          const sizeResult = validateArraySize(req["readingTypes"], "readingTypes", MAX_ARRAY_SIZE);
          if (!sizeResult.valid) errors.push(...sizeResult.errors);
        }
        break;
      }
      case "aggregates": {
        const result = validateAggregates(req["aggregates"]);
        if (!result.valid) errors.push(...result.errors);
        break;
      }
      case "percentile": {
        const result = validatePercentile(req["percentile"]);
        if (!result.valid) errors.push(...result.errors);
        break;
      }
    }
  }

  return errors;
}

function buildValidationData(
  req: Record<string, unknown>,
  fields: ValidationField[],
): {
  timeRange: { start: string; end: string };
  downsample: Downsample | undefined;
  cursor: string | undefined;
  limit: number;
  ids: number[] | undefined;
  aggregates: Aggregate[];
  percentile: number;
  readingTypes?: string[];
} {
  const data: {
    timeRange: { start: string; end: string };
    downsample: Downsample | undefined;
    cursor: string | undefined;
    limit: number;
    ids: number[] | undefined;
    aggregates: Aggregate[];
    percentile: number;
    readingTypes?: string[];
  } = {
    timeRange: req["timeRange"] as { start: string; end: string },
    downsample: req["downsample"] as Downsample | undefined,
    cursor: req["cursor"] as string | undefined,
    limit: (req["limit"] as number) ?? DEFAULT_LIMIT,
    ids: req["ids"] as number[] | undefined,
    aggregates: (req["aggregates"] as Aggregate[] | undefined) ?? [...VALID_AGGREGATES],
    percentile: (req["percentile"] as number) ?? 0.5,
  };

  if (fields.some((f) => f.name === "readingTypes")) {
    const rt = req["readingTypes"] as string[] | undefined;
    if (rt !== undefined) {
      data.readingTypes = rt;
    }
  }

  return data;
}

export function validateSensorDataQueryRequest(body: unknown): ValidationResultType {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be an object"] };
  }

  const req = body as Record<string, unknown>;

  const validationErrors = runValidationChecks(req, [
    { name: "timeRange", required: true },
    { name: "downsample", required: false },
    { name: "cursor", required: false },
    { name: "limit", required: false },
    { name: "ids", required: false, arraySizeValidator: true },
    { name: "readingTypes", required: false, arraySizeValidator: true },
    { name: "aggregates", required: false },
    { name: "percentile", required: false },
  ]);
  errors.push(...validationErrors);

  const allowedFields = new Set([
    "timeRange",
    "downsample",
    "cursor",
    "limit",
    "ids",
    "readingTypes",
    "aggregates",
    "percentile",
  ]);
  const unknownFields = Object.keys(req).filter((k) => !allowedFields.has(k));
  if (unknownFields.length > 0) {
    errors.push(`Unknown fields: ${unknownFields.join(", ")}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: buildValidationData(req, [
      { name: "timeRange", required: true },
      { name: "downsample", required: false },
      { name: "cursor", required: false },
      { name: "limit", required: false },
      { name: "ids", required: false, arraySizeValidator: true },
      { name: "readingTypes", required: false, arraySizeValidator: true },
      { name: "aggregates", required: false },
      { name: "percentile", required: false },
    ]) as SensorDataQueryRequest,
  };
}

export function validateOutputDataQueryRequest(body: unknown): ValidationResultType {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be an object"] };
  }

  const req = body as Record<string, unknown>;

  const validationErrors = runValidationChecks(req, [
    { name: "timeRange", required: true },
    { name: "downsample", required: false },
    { name: "cursor", required: false },
    { name: "limit", required: false },
    { name: "ids", required: false, arraySizeValidator: true },
    { name: "aggregates", required: false },
    { name: "percentile", required: false },
  ]);
  errors.push(...validationErrors);

  const allowedFields = new Set([
    "timeRange",
    "downsample",
    "cursor",
    "limit",
    "ids",
    "aggregates",
    "percentile",
  ]);
  const unknownFields = Object.keys(req).filter((k) => !allowedFields.has(k));
  if (unknownFields.length > 0) {
    errors.push(`Unknown fields: ${unknownFields.join(", ")}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: buildValidationData(req, [
      { name: "timeRange", required: true },
      { name: "downsample", required: false },
      { name: "cursor", required: false },
      { name: "limit", required: false },
      { name: "ids", required: false, arraySizeValidator: true },
      { name: "aggregates", required: false },
      { name: "percentile", required: false },
    ]) as OutputDataQueryRequest,
  };
}
