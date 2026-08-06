export const DYNAMIC_TIME_POINT_LABELS = {
  sunrise: "Sunrise",
  sunriseEnd: "Sunrise End",
  goldenHourEnd: "Golden Hour End",
  solarNoon: "Solar Noon",
  goldenHour: "Golden Hour",
  sunsetStart: "Sunset Start",
  sunset: "Sunset",
  dusk: "Dusk",
  nauticalDusk: "Nautical Dusk",
  night: "Night",
  nadir: "Nadir",
  nightEnd: "Night End",
  nauticalDawn: "Nautical Dawn",
  dawn: "Dawn",
  moonrise: "Moonrise",
  moonset: "Moonset",
} as const;

export type DynamicTimePoint = keyof typeof DYNAMIC_TIME_POINT_LABELS;

export const DYNAMIC_TIME_POINT_VALUES = Object.keys(
  DYNAMIC_TIME_POINT_LABELS,
) as DynamicTimePoint[];

export function isDynamicTimePoint(value: string): value is DynamicTimePoint {
  return value in DYNAMIC_TIME_POINT_LABELS;
}

export function getDynamicTimePointLabel(value: string | null | undefined): string | null {
  if (!value || !isDynamicTimePoint(value)) {
    return null;
  }

  return DYNAMIC_TIME_POINT_LABELS[value];
}