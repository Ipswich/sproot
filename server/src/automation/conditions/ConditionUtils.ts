import { ConditionOperator } from "@sproot/sproot-common/dist/automation/ConditionTypes";
import {
  isBetweenTimeStamp,
  isBetweenMonthDate,
} from "@sproot/sproot-common/dist/utility/TimeMethods";

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
): boolean {
  const regex = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

  if (startTime == null && endTime == null) {
    // if neither startTime nor endTime, return true
    return true;
  } else if (startTime != null && endTime != null) {
    // if both startTime and endTime and, check if it's between those two
    if (!regex.test(startTime) || !regex.test(endTime)) {
      return false;
    }
    return isBetweenTimeStamp(startTime, endTime, now);
  } else if (startTime != null && endTime == null) {
    // if only startTime and startTime is now, return true
    if (!regex.test(startTime)) {
      return false;
    }
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    return startHours == now.getHours() && startMinutes == now.getMinutes();
  }
  // anything else, return false.
  return false;
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
