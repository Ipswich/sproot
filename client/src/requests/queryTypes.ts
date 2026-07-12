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

export const CHART_AGGREGATE_OPTIONS = [
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "last", label: "Last" },
  { value: "first", label: "First" },
  { value: "sum", label: "Sum" },
  { value: "count", label: "Count" },
  { value: "stddev", label: "Std. Dev." },
  { value: "percentile", label: "Percentile" },
] as const satisfies ReadonlyArray<{ value: Aggregate; label: string }>;

export const CHART_DOWNSAMPLE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "5m", label: "5 minutes" },
  { value: "15 minutes", label: "15 minutes" },
  { value: "30 minutes", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "6 hours", label: "6 hours" },
  { value: "1d", label: "1 day" },
] as const;

export const DOWNSAMPLE_TO_BUCKET_MINUTES: Record<string, number> = {
  "5m": 5,
  "1h": 60,
  "1d": 1440,
};

export const DEFAULT_LIMIT = 500;
export const MAX_LIMIT = 10000;
export function getChartIntervalHours(chartInterval: string): number {
  return chartInterval === "0" ? 168 : parseInt(chartInterval, 10) || 24;
}

export function getDownsampleMinutes(downsample: string): number {
  if (downsample in DOWNSAMPLE_TO_BUCKET_MINUTES) {
    return DOWNSAMPLE_TO_BUCKET_MINUTES[downsample]!;
  }

  const match = downsample
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*(m|h|d|minute(?:s)?|hour(?:s)?|day(?:s)?)$/);

  if (!match) {
    return DOWNSAMPLE_TO_BUCKET_MINUTES["5m"]!;
  }

  const amount = parseInt(match[1]!, 10);
  const unit = match[2]!;

  if (unit === "m" || unit.startsWith("minute")) {
    return amount;
  }

  if (unit === "h" || unit.startsWith("hour")) {
    return amount * 60;
  }

  return amount * 1440;
}

function resolveAutoDownsample(durationMs: number): string {
  const durationHours = durationMs / (1000 * 60 * 60);
  if (durationHours <= 72) {
    return "5m";
  }
  if (durationHours <= 168) {
    return "1h";
  }

  return "1d";
}

export function resolveSelectedDownsample(
  downsample: string | null | undefined,
  durationMs: number,
): string {
  if (downsample && downsample !== "auto") {
    return downsample;
  }

  return resolveAutoDownsample(durationMs);
}

export function getQueryPointLimit(
  durationMs: number,
  downsample: string,
): number {
  const intervalMinutes = getDownsampleMinutes(downsample);
  const intervalMs = intervalMinutes * 60 * 1000;

  return Math.min(
    MAX_LIMIT,
    Math.max(DEFAULT_LIMIT, Math.ceil(durationMs / intervalMs) + 1),
  );
}

export interface SensorDataQueryRequest {
  timeRange: { start: string; end: string };
  downsample?: string;
  cursor?: string;
  limit?: number;
  id: number;
  readingTypes?: string[];
  aggregates?: Aggregate[];
  percentile?: number;
}

export interface OutputDataQueryRequest {
  timeRange: { start: string; end: string };
  downsample?: string;
  cursor?: string;
  limit?: number;
  id: number;
  aggregates?: Aggregate[];
  percentile?: number;
}

export interface SensorDataQueryResponse {
  xAxis: { field: string; values: string[] };
  data: {
    id: number;
    name: string;
    units: string;
    statistics: Record<string, (number | null)[]>;
  } | null;
  nextCursor?: string;
}

export interface OutputDataQueryResponse {
  xAxis: { field: string; values: string[] };
  data: {
    id: number;
    name: string;
    units: string;
    statistics: Record<string, (number | null)[]>;
  } | null;
  nextCursor?: string;
}
