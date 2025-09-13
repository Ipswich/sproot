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
  if (!startTime.match(/^\d{2}:\d{2}$/) || !endTime.match(/^\d{2}:\d{2}$/)) {
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

export { isBetweenTimeStamp };
