import { ConditionOperator } from "@sproot/common/automation/ConditionTypes";
import {
  ITimeCondition,
  TimeConditionPhaseAnchorType,
} from "@sproot/common/automation/ITimeCondition";
import { isBetweenMonthDate } from "@sproot/common/utility/TimeMethods";
import { TimeExpressionResolver } from "./TimeExpressionResolver";

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
  timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
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

  return (
    evaluateTimeWindow(now, timeExpressionResolver, startTime, endTime) &&
    evaluateTimeRepeat(now, schedule, timeExpressionResolver)
  );
}

export function getTimeWindowType(
  startTime?: string | null,
  endTime?: string | null,
): TimeWindowType {
  if (startTime == null && endTime == null) {
    return "always";
  }

  if (startTime != null && endTime != null) {
    return "between";
  }

  if (startTime != null && endTime == null) {
    return "once";
  }

  return "invalid";
}

export function evaluateTimeWindow(
  now: Date,
  timeExpressionResolver: TimeExpressionResolver,
  startTime?: string | null,
  endTime?: string | null,
): boolean {
  const windowType = getTimeWindowType(startTime, endTime);

  if (windowType == "always") {
    // if neither startTime nor endTime, return true
    return true;
  } else if (windowType == "between") {
    const bounds = deriveTimeWindowBounds(timeExpressionResolver, now, startTime!, endTime!);
    if (bounds == null) {
      return false;
    }

    return now.getTime() >= bounds.start.getTime() && now.getTime() < bounds.end.getTime();
  } else if (windowType == "once") {
    const start = timeExpressionResolver.resolveToDate(startTime!, now);
    return (
      start != null &&
      start.getHours() == now.getHours() &&
      start.getMinutes() == now.getMinutes() &&
      start.getDate() == now.getDate() &&
      start.getMonth() == now.getMonth() &&
      start.getFullYear() == now.getFullYear()
    );
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

export function derivePhaseAnchor(
  schedule: ITimeCondition,
  now: Date,
  timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
): Date | null {
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
      return deriveClockAnchor(timeExpressionResolver, schedule.phaseAnchorValue, now);
    case "window":
      return deriveWindowAnchor(timeExpressionResolver, schedule.startTime, schedule.endTime, now);
  }
}

export function evaluateTimeRepeat(
  now: Date,
  schedule: ITimeCondition,
  timeExpressionResolver: TimeExpressionResolver = TimeExpressionResolver.createNoop(),
): boolean {
  if (!hasValidRepeatConfiguration(schedule)) {
    return false;
  }

  if (!hasRepeatPattern(schedule)) {
    return true;
  }

  const anchor = derivePhaseAnchor(schedule, now, timeExpressionResolver);
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

function deriveClockAnchor(
  timeExpressionResolver: TimeExpressionResolver,
  phaseAnchorValue: string | null | undefined,
  now: Date,
): Date | null {
  return timeExpressionResolver.resolveMostRecentOccurrence(phaseAnchorValue, now);
}

function deriveWindowAnchor(
  timeExpressionResolver: TimeExpressionResolver,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  now: Date,
): Date | null {
  if (startTime == null || endTime == null) {
    return null;
  }

  const bounds = deriveTimeWindowBounds(timeExpressionResolver, now, startTime, endTime);
  return bounds?.start ?? null;
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

function deriveTimeWindowBounds(
  timeExpressionResolver: TimeExpressionResolver,
  now: Date,
  startTime: string,
  endTime: string,
): { start: Date; end: Date } | null {
  const start = timeExpressionResolver.resolveMostRecentOccurrence(startTime, now);
  if (start == null) {
    return null;
  }

  const end = timeExpressionResolver.resolveNextOccurrence(endTime, start);
  if (end == null) {
    return null;
  }

  return { start, end };
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
