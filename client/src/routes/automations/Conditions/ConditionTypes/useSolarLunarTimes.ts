import * as SunCalc from "suncalc";
import { useMemo } from "react";
import type { DynamicTimePoint } from "@sproot/common/automation/TimeConditionTimePoints";
import { DYNAMIC_TIME_POINT_VALUES } from "@sproot/common/automation/TimeConditionTimePoints";

export type SolarLunarTimesMap = Record<DynamicTimePoint, Date | null>;

export function useSolarLunarTimes(
  latitude: string | null,
  longitude: string | null,
): SolarLunarTimesMap | null {
  return useMemo(() => {
    if (
      typeof latitude !== "string" ||
      typeof longitude !== "string" ||
      latitude.trim() === "" ||
      longitude.trim() === ""
    ) {
      return null;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    const today = new Date();

    const result: SolarLunarTimesMap = {} as SolarLunarTimesMap;

    for (const point of DYNAMIC_TIME_POINT_VALUES) {
      if (point === "moonrise" || point === "moonset") {
        const moonTimes = SunCalc.getMoonTimes(today, lat, lng);

        if (moonTimes.alwaysUp || moonTimes.alwaysDown) {
          result[point] = null;
          continue;
        }

        result[point] =
          point === "moonrise"
            ? (moonTimes.rise ?? null)
            : (moonTimes.set ?? null);
      } else {
        const solarTimes = SunCalc.getTimes(today, lat, lng);
        result[point] =
          (solarTimes as Record<string, Date | null>)[point] ?? null;
      }
    }

    return result;
  }, [latitude, longitude]);
}
