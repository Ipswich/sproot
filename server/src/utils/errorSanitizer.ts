import { logger } from "../logger";

export const GENERIC_ERROR_MESSAGE = "Internal server error";

export function safeErrorMessage(error: unknown): string {
  logger.error(error);
  return GENERIC_ERROR_MESSAGE;
}
