export const VALID_DURATION_UNITS: Readonly<Set<string>> = new Set([
  "second",
  "seconds",
  "min",
  "mins",
  "minute",
  "minutes",
  "hour",
  "hours",
  "day",
  "days",
  "week",
  "weeks",
  "month",
  "months",
  "year",
  "years",
]);

const DURATION_REGEX = /^(\d+)\s+([a-zA-Z]+)$/;

export type DurationValidation = { valid: true } | { valid: false; errors: string[] };

/**
 * Validates and normalizes a duration string like "30 days".
 * Returns { valid: true } on success, or { valid: false; errors } with
 * descriptive error messages.
 */
export function validateDuration(value: string, context?: string): DurationValidation {
  const trimmed = String(value).trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      errors: [context ? `${context} is empty` : "Duration is empty"],
    };
  }

  const match = trimmed.match(DURATION_REGEX);
  if (!match) {
    return {
      valid: false,
      errors: [
        `${context ? `${context}: ` : ""}"${value}" does not match expected format "N unit" (e.g., "30 days")`,
      ],
    };
  }

  const amount = parseInt(match[1]!, 10);
  const unit = match[2]!;

  if (amount <= 0) {
    return {
      valid: false,
      errors: [`${context ? `${context}: ` : ""}Duration amount must be positive, got ${amount}`],
    };
  }

  if (!VALID_DURATION_UNITS.has(unit)) {
    return {
      valid: false,
      errors: [`${context ? `${context}: ` : ""}Unknown time unit "${unit}"`],
    };
  }

  return { valid: true };
}
