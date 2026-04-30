export function toDbDate(d?: Date | null): string {
  const date = d ?? new Date();
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export function dbToIso(s?: string | Date | null): string | null {
  if (!s) {
    return null;
  }

  if (s instanceof Date) {
    return s.toISOString();
  }

  return s.includes("T") ? s : s.replace(" ", "T") + "Z";
}

export function isoToDb(iso?: string | null): string | null {
  return iso ? toDbDate(new Date(iso)) : null;
}

export default { toDbDate, dbToIso, isoToDb };
