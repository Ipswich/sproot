import { ConditionOperator } from "@sproot/sproot-common/dist/automation/ICondition";

export function evaluateNumber(reading: number, operator: ConditionOperator, comparisonValue: number): boolean {
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

export function evaluateTime(now: Date, startTime?: string | null, endTime?: string | null): boolean {
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

/**
 * Includes start time, excludes end time.
 */
function isBetweenTimeStamp(startTime: string, endTime: string, now: Date): boolean {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  //In case now isn't really "now".
  const nowHours = now.getHours();
  const nowMInutes = now.getMinutes();
  const nowDate = new Date();
  nowDate.setHours(nowHours, nowMInutes, 0, 0);

  const start = new Date();
  start.setHours(startHours!, startMinutes, 0, 0);

  const end = new Date();
  end.setHours(endHours!, endMinutes, 0, 0);

  // If the end time is before the start time, assume it crosses midnight
  if (end < start) {
    return nowDate >= start || nowDate < end;
  }

  return nowDate >= start && nowDate < end;
}

