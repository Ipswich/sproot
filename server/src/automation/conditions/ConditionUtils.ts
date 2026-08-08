import { ConditionOperator } from "@sproot/common/automation/ConditionTypes";
import {
  ITimeCondition,
  TimeConditionPhaseAnchorType,
} from "@sproot/common/automation/ITimeCondition";
import { isBetweenTimeStamp, isBetweenMonthDate } from "@sproot/common/utility/TimeMethods";

const TIME_REGEX = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
const MINUTE_IN_MS = 60 * 1000;

type TimeWindowType = "always" | "between" | "once" | "invalid";

export function evaluateNumber(
  reading: number,
  operator: ConditionOperator,
  comparisonValue: number,
): boolean {
  switch (operator) {
    case "equal":
      return reading == comparisonValue;
    case "notEqual":
      return reading != comparisonValue;
    case "greater":
      return reading > comparisonValue;
    case "less":
      return reading < comparisonValue;
    case "greaterOrEqual":
      return reading >= comparisonValue;
    case "lessOrEqual":
      return reading <= comparisonValue;
  }
}

export function evaluateWeekday(now: Date, activeWeekdaysAsDecimal: number): boolean {
  let binary = activeWeekdaysAsDecimal.toString(2).padStart(7, "0");
  if (binary.length > 7) {
    binary = binary.slice(-7);
  }

  return binary[6 - now.getDay()] == "1";
}

export function evaluateMonth(now: Date, activeMonthsAsDecimal: number): boolean {
  let binary = activeMonthsAsDecimal.toString(2).padStart(12, "0");
  if (binary.length > 12) {
    binary = binary.slice(-12);
  }

  return binary[11 - now.getMonth()] == "1";
}

export function evaluateTime(
  now: Date,
  startTime?: string | null,
  endTime?: string | null,
  repeatInterval?: number | null,
  repeatDuration?: number | null,
  phaseAnchorType?: TimeConditionPhaseAnchorType | null,
  phaseAnchorValue?: string | null,
): boolean {
  const schedule: ITimeCondition = createTimeConditionSchedule(
    -1,
    "allOf",
    startTime,
    endTime,
    repeatInterval,
    repeatDuration,
    phaseAnchorType,
    phaseAnchorValue,
  );

  return evaluateTimeWindow(now, startTime, endTime) && evaluateTimeRepeat(now, schedule);
}

export function getTimeWindowType(
  startTime?: string | null,
  endTime?: string | null,
): TimeWindowType {
  if (startTime == null && endTime == null) {
    return "always";
  }

  if (startTime != null && endTime != null) {
    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      return "invalid";
    }
    return "between";
  }

  if (startTime != null && endTime == null) {
    if (!TIME_REGEX.test(startTime)) {
      return "invalid";
    }
    return "once";
  }

  return "invalid";
}

export function evaluateTimeWindow(
  now: Date,
  startTime?: string | null,
  endTime?: string | null,
): boolean {
  const windowType = getTimeWindowType(startTime, endTime);

  if (windowType == "always") {
    // if neither startTime nor endTime, return true
    return true;
  } else if (windowType == "between") {
    // if both startTime and endTime and, check if it's between those two
    return isBetweenTimeStamp(startTime, endTime, now);
  } else if (windowType == "once") {
    // if only startTime and startTime is now, return true
    const [startHours, startMinutes] = parseTimeParts(startTime!);
    return startHours == now.getHours() && startMinutes == now.getMinutes();
  }
  // anything else, return false.
  return false;
}

export function hasRepeatPattern(schedule: ITimeCondition): boolean {
  return schedule.repeatInterval != null && schedule.repeatDuration != null;
}

export function hasValidRepeatConfiguration(schedule: ITimeCondition): boolean {
  const hasInterval = schedule.repeatInterval != null;
  const hasDuration = schedule.repeatDuration != null;

  if (hasInterval !== hasDuration) {
    return false;
  }

  if (!hasInterval) {
    return true;
  }

  const repeatInterval = schedule.repeatInterval!;
  const repeatDuration = schedule.repeatDuration!;

  if (
    !Number.isInteger(repeatInterval) ||
    !Number.isInteger(repeatDuration) ||
    repeatInterval <= 0 ||
    repeatDuration <= 0 ||
    repeatDuration >= repeatInterval
  ) {
    return false;
  }

  return getTimeWindowType(schedule.startTime, schedule.endTime) !== "once";
}

export function resolvePhaseAnchorType(
  schedule: ITimeCondition,
): Exclude<TimeConditionPhaseAnchorType, "default"> | null {
  const requestedType = schedule.phaseAnchorType ?? "default";
  if (requestedType !== "default") {
    return requestedType;
  }

  const windowType = getTimeWindowType(schedule.startTime, schedule.endTime);
  if (windowType === "always") {
    return "epoch";
  }

  if (windowType === "between") {
    return "window";
  }

  return null;
}

export function derivePhaseAnchor(schedule: ITimeCondition, now: Date): Date | null {
  const resolvedAnchorType = resolvePhaseAnchorType(schedule);
  if (resolvedAnchorType == null) {
    return null;
  }

  switch (resolvedAnchorType) {
    case "epoch":
      return new Date(0);
    case "fixed":
      return deriveFixedAnchor(schedule.phaseAnchorValue);
    case "clock":
      return deriveClockAnchor(schedule.phaseAnchorValue, now);
    case "window":
      return deriveWindowAnchor(schedule.startTime, now);
  }
}

export function evaluateTimeRepeat(now: Date, schedule: ITimeCondition): boolean {
  if (!hasValidRepeatConfiguration(schedule)) {
    return false;
  }

  if (!hasRepeatPattern(schedule)) {
    return true;
  }

  const anchor = derivePhaseAnchor(schedule, now);
  if (anchor == null) {
    return false;
  }

  const elapsedMs = now.getTime() - anchor.getTime();
  if (elapsedMs < 0) {
    return false;
  }

  const intervalMs = schedule.repeatInterval! * MINUTE_IN_MS;
  const durationMs = schedule.repeatDuration! * MINUTE_IN_MS;
  return elapsedMs % intervalMs < durationMs;
}

function deriveClockAnchor(phaseAnchorValue: string | null | undefined, now: Date): Date | null {
  if (phaseAnchorValue == null || !TIME_REGEX.test(phaseAnchorValue)) {
    return null;
  }

  const [hours, minutes] = parseTimeParts(phaseAnchorValue);
  const anchor = new Date(now);
  anchor.setHours(hours, minutes, 0, 0);

  if (anchor.getTime() > now.getTime()) {
    anchor.setDate(anchor.getDate() - 1);
  }

  return anchor;
}

function deriveWindowAnchor(startTime: string | null | undefined, now: Date): Date | null {
  if (startTime == null || !TIME_REGEX.test(startTime)) {
    return null;
  }

  const [hours, minutes] = parseTimeParts(startTime);
  const anchor = new Date(now);
  anchor.setHours(hours, minutes, 0, 0);

  if (anchor.getTime() > now.getTime()) {
    anchor.setDate(anchor.getDate() - 1);
  }

  return anchor;
}

function deriveFixedAnchor(phaseAnchorValue: string | null | undefined): Date | null {
  if (phaseAnchorValue == null) {
    return null;
  }

  const anchor = new Date(phaseAnchorValue);
  if (Number.isNaN(anchor.getTime())) {
    return null;
  }

  return anchor;
}

function parseTimeParts(timeValue: string): [number, number] {
  const [hours, minutes] = timeValue.split(":").map(Number);
  return [hours ?? 0, minutes ?? 0];
}

function createTimeConditionSchedule(
  id: number,
  groupType: ITimeCondition["groupType"],
  startTime?: string | null,
  endTime?: string | null,
  repeatInterval?: number | null,
  repeatDuration?: number | null,
  phaseAnchorType?: TimeConditionPhaseAnchorType | null,
  phaseAnchorValue?: string | null,
): ITimeCondition {
  return {
    id,
    groupType,
    ...(startTime !== undefined ? { startTime } : {}),
    ...(endTime !== undefined ? { endTime } : {}),
    ...(repeatInterval !== undefined ? { repeatInterval } : {}),
    ...(repeatDuration !== undefined ? { repeatDuration } : {}),
    ...(phaseAnchorType !== undefined ? { phaseAnchorType } : {}),
    ...(phaseAnchorValue !== undefined ? { phaseAnchorValue } : {}),
  };
}

export function evaluateDateRange(
  now: Date,
  startMonth: number,
  startDate: number,
  endMonth: number,
  endDate: number,
): boolean {
  return isBetweenMonthDate(startMonth, startDate, endMonth, endDate, now);
}
