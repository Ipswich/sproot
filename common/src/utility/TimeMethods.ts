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

export { isBetweenTimeStamp };
