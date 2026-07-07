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

export const KNOWN_DOWNSAMPLES = ["5m", "1h", "1d"] as const;
export type KnownDownsample = (typeof KNOWN_DOWNSAMPLES)[number];

export const DOWNSAMPLE_TO_BUCKET_MINUTES: Record<string, number> = {
  "5m": 5,
  "1h": 60,
  "1d": 1440,
};

export const DEFAULT_LIMIT = 500;
export const MAX_LIMIT = 10000;
export const DEFAULT_AGGREGATES: Aggregate[] = ["avg", "min", "max"];

export interface DataQueryRequestBase {
  timeRange: { start: string; end: string };
  downsample?: string;
  cursor?: string;
  limit?: number;
}

export interface SensorDataQueryRequest extends DataQueryRequestBase {
  ids?: number[];
  readingTypes?: string[];
  aggregates?: Aggregate[];
  percentile?: number;
}

export interface OutputDataQueryRequest extends DataQueryRequestBase {
  ids?: number[];
  aggregates?: Aggregate[];
  percentile?: number;
}

export interface SensorDataQueryResponse {
  data: Record<number, Record<string, SensorReadingGroup>>;
  nextCursor?: string;
}

export interface OutputDataQueryResponse {
  data: Record<number, OutputReadingGroup>;
  nextCursor?: string;
}

export interface SensorReadingGroup {
  units: string;
  values: SensorDataValue[];
}

export interface OutputReadingGroup {
  values: OutputDataValue[];
}

export interface SensorDataValue {
  time: string;
  [agg: string]: unknown;
}

export interface OutputDataValue {
  time: string;
  [agg: string]: unknown;
}
