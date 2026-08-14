import SunCalc from "suncalc";
import type { DynamicTimePoint } from "@sproot/common/automation/TimeConditionTimePoints";
import { isDynamicTimePoint } from "@sproot/common/automation/TimeConditionTimePoints";
import type { IEventBus, Unsubscribe } from "../../eventbus/IEventBus";
import { Events } from "../../eventbus/events/Events";
import type { ISettingsRepository } from "../../database/settings/ISettingsRepository";
import { SETTINGS } from "../../database/settings/SettingsSchema";

const TIME_REGEX = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
const SEARCH_DAY_OFFSETS = [0, -1, -2, -3, -4, -5, -6, -7];
const SEARCH_FORWARD_DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6, 7];

type Coordinates = {
  latitude: number;
  longitude: number;
};

export class TimeExpressionResolver {
  static #noopInstance: TimeExpressionResolver | null = null;

  #settingsRepository: ISettingsRepository | undefined;
  #coordinates: Coordinates | null = null;
  #unsubscribeLatitude: Unsubscribe;
  #unsubscribeLongitude: Unsubscribe;

  static async createInstanceAsync(
    settingsRepository: ISettingsRepository,
    eventBus: IEventBus,
  ): Promise<TimeExpressionResolver> {
    const resolver = new TimeExpressionResolver(settingsRepository, eventBus);
    await resolver.refreshCoordinatesAsync();
    return resolver;
  }

  static createNoop(): TimeExpressionResolver {
    if (this.#noopInstance == null) {
      this.#noopInstance = new TimeExpressionResolver();
    }

    return this.#noopInstance;
  }

  private constructor(settingsRepository?: ISettingsRepository, eventBus?: IEventBus) {
    this.#settingsRepository = settingsRepository;
    this.#unsubscribeLatitude = () => {};
    this.#unsubscribeLongitude = () => {};

    if (eventBus != null) {
      this.#unsubscribeLatitude = eventBus.subscribe(Events.SYSTEM_LATITUDE_UPDATED, (event) => {
        this.#handleCoordinateUpdate("latitude", event.payload.value);
      });
      this.#unsubscribeLongitude = eventBus.subscribe(Events.SYSTEM_LONGITUDE_UPDATED, (event) => {
        this.#handleCoordinateUpdate("longitude", event.payload.value);
      });
    }
  }

  #handleCoordinateUpdate(coordinate: "latitude" | "longitude", value: string | null): void {
    const parsed = parseCoordinate(
      value,
      coordinate === "latitude" ? -90 : -180,
      coordinate === "latitude" ? 90 : 180,
    );

    if (parsed == null) {
      this.#coordinates = null;
      return;
    }

    if (this.#coordinates == null) {
      void this.refreshCoordinatesAsync();
      return;
    }

    if (coordinate === "latitude") {
      this.#coordinates = { ...this.#coordinates, latitude: parsed };
    } else {
      this.#coordinates = { ...this.#coordinates, longitude: parsed };
    }
  }

  get hasCoordinates(): boolean {
    return this.#coordinates != null;
  }

  async refreshCoordinatesAsync(): Promise<void> {
    if (this.#settingsRepository == null) {
      this.#coordinates = null;
      return;
    }

    const settings = await this.#settingsRepository.getManyAsync([
      SETTINGS.system.latitude,
      SETTINGS.system.longitude,
    ]);

    const latitudeSetting = settings[SETTINGS.system.latitude];
    const longitudeSetting = settings[SETTINGS.system.longitude];

    const latitude = parseCoordinate(
      typeof latitudeSetting === "string" || latitudeSetting == null ? latitudeSetting : null,
      -90,
      90,
    );
    const longitude = parseCoordinate(
      typeof longitudeSetting === "string" || longitudeSetting == null ? longitudeSetting : null,
      -180,
      180,
    );

    this.#coordinates = latitude == null || longitude == null ? null : { latitude, longitude };
  }

  resolveToDate(expression: string | null | undefined, referenceDate: Date): Date | null {
    if (expression == null) {
      return null;
    }

    if (TIME_REGEX.test(expression)) {
      return resolveClockTime(expression, referenceDate);
    }

    if (!isDynamicTimePoint(expression) || this.#coordinates == null) {
      return null;
    }

    return resolveDynamicTimePoint(expression, referenceDate, this.#coordinates);
  }

  resolveMostRecentOccurrence(expression: string | null | undefined, now: Date): Date | null {
    if (expression == null) {
      return null;
    }

    if (TIME_REGEX.test(expression)) {
      const anchor = resolveClockTime(expression, now);
      if (anchor == null) {
        return null;
      }

      if (anchor.getTime() > now.getTime()) {
        anchor.setDate(anchor.getDate() - 1);
      }

      return anchor;
    }

    if (!isDynamicTimePoint(expression) || this.#coordinates == null) {
      return null;
    }

    for (const dayOffset of SEARCH_DAY_OFFSETS) {
      const candidateDate = new Date(now);
      candidateDate.setDate(candidateDate.getDate() + dayOffset);
      const candidate = resolveDynamicTimePoint(expression, candidateDate, this.#coordinates);
      if (candidate != null && candidate.getTime() <= now.getTime()) {
        return candidate;
      }
    }

    return null;
  }

  resolveNextOccurrence(expression: string | null | undefined, after: Date): Date | null {
    if (expression == null) {
      return null;
    }

    if (TIME_REGEX.test(expression)) {
      const candidate = resolveClockTime(expression, after);
      if (candidate == null) {
        return null;
      }

      if (candidate.getTime() <= after.getTime()) {
        candidate.setDate(candidate.getDate() + 1);
      }

      return candidate;
    }

    if (!isDynamicTimePoint(expression) || this.#coordinates == null) {
      return null;
    }

    for (const dayOffset of SEARCH_FORWARD_DAY_OFFSETS) {
      const candidateDate = new Date(after);
      candidateDate.setDate(candidateDate.getDate() + dayOffset);
      const candidate = resolveDynamicTimePoint(expression, candidateDate, this.#coordinates);
      if (candidate != null && candidate.getTime() > after.getTime()) {
        return candidate;
      }
    }

    return null;
  }

  [Symbol.dispose](): void {
    this.#unsubscribeLatitude();
    this.#unsubscribeLongitude();
  }
}

function resolveClockTime(expression: string, referenceDate: Date): Date | null {
  if (!TIME_REGEX.test(expression)) {
    return null;
  }

  const [hours, minutes] = expression.split(":").map(Number);
  const result = new Date(referenceDate);
  result.setHours(hours!, minutes!, 0, 0);
  return result;
}

function resolveDynamicTimePoint(
  expression: DynamicTimePoint,
  referenceDate: Date,
  coordinates: Coordinates,
): Date | null {
  const astronomicalReferenceDate = resolveAstronomicalReferenceDate(referenceDate);

  if (expression === "moonrise" || expression === "moonset") {
    const moonTimes = SunCalc.getMoonTimes(
      astronomicalReferenceDate,
      coordinates.latitude,
      coordinates.longitude,
    ) as { rise?: Date; set?: Date; alwaysUp?: boolean; alwaysDown?: boolean };

    if (moonTimes.alwaysUp || moonTimes.alwaysDown) {
      return null;
    }

    return expression === "moonrise" ? (moonTimes.rise ?? null) : (moonTimes.set ?? null);
  }

  const solarTimes = SunCalc.getTimes(
    astronomicalReferenceDate,
    coordinates.latitude,
    coordinates.longitude,
  ) as Record<string, Date | undefined>;

  return solarTimes[expression] ?? null;
}

function resolveAstronomicalReferenceDate(referenceDate: Date): Date {
  // SunCalc resolves events from the UTC date portion of the input Date.
  // Anchor to a UTC-stable instant derived from the local calendar date so
  // dynamic events follow the same local-day semantics as resolveClockTime().
  return new Date(
    Date.UTC(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
      12,
      0,
      0,
      0,
    ),
  );
}

function parseCoordinate(
  value: string | null | undefined,
  min: number,
  max: number,
): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}
