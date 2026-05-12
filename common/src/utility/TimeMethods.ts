const TIMESTAMP_REGEX = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

/**
 * Includes start time, excludes end time.
 */
function isBetweenTimeStamp(
  startTime?: string | null,
  endTime?: string | null,
  now: Date = new Date(),
): boolean {
  if (!startTime || !endTime) {
    return false;
  }
  if (!startTime.match(TIMESTAMP_REGEX) || !endTime.match(TIMESTAMP_REGEX)) {
    return false;
  }
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startMinutes = startH! * 60 + startM!;
  const endMinutes = endH! * 60 + endM!;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Wraparound case: e.g. 23:00 to 05:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Formats a string in the shape "HH:mm" to a more human readable format like "8:00AM", "12:30PM", etc.
 * @param timeString String in the format "HH:mm"
 * @returns string formatted like 8:00AM, 12:30PM, etc. Returns undefined if timeString is null or undefined. Returns the original string if it doesn't match the expected format.
 */
function formatMilitaryTime(timeString?: string | null): string | undefined {
  if (!timeString) {
    return undefined;
  }
  const parts = timeString.split(":");
  if (parts.length !== 2 || !TIMESTAMP_REGEX.test(timeString)) {
    return timeString;
  }
  const hh = parseInt(parts[0]!, 10);
  let mm = parts[1] ?? "00";
  mm = mm.padStart(2, "0");
  if (
    isNaN(hh) ||
    hh < 0 ||
    hh > 23 ||
    isNaN(parseInt(mm)) ||
    parseInt(mm) < 0 ||
    parseInt(mm) > 59
  ) {
    return timeString;
  }
  const period = hh >= 12 ? "PM" : "AM";
  let h12 = hh % 12;
  if (h12 === 0) {
    h12 = 12;
  }
  return `${h12}:${mm}${period}`;
}

/**
 * Normalize a month and day to a canonical year for comparison. The year is set to 2001.
 * This is used to compare month and day values without worrying about leap years or the actual year.
 * @param month
 * @param day
 * @returns
 */
function normalize(month: number, day: number): Date {
  if (month === 2 && day === 29) {
    new Date(2001, month - 1, 28);
  }
  return new Date(2001, month - 1, day);
}

/**
 * Includes start date and end date.
 */
function isBetweenMonthDate(
  startMonth: number,
  startDate: number,
  endMonth: number,
  endDate: number,
  now: Date = new Date(),
): boolean {
  const current = normalize(now.getMonth() + 1, now.getDate());
  const start = normalize(startMonth, startDate);
  const end = normalize(endMonth, endDate);

  if (start <= end) {
    // Normal range (e.g. Mar 1 → Dec 31)
    return current >= start && current <= end;
  } else {
    // Wraparound range (e.g. Oct 15 → Feb 20)
    return current >= start || current <= end;
  }
}

export { isBetweenTimeStamp, isBetweenMonthDate, formatMilitaryTime };
