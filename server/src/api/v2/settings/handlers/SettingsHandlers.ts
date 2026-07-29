import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { SettingsService } from "../../../../settings/SettingsService";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import {
  SettingsKey,
  SettingsSchema,
  SETTINGS,
} from "../../../../database/settings/SettingsSchema";

const KNOWN_KEYS = new Set<string>();
for (const section of Object.values(SETTINGS)) {
  for (const value of Object.values(section) as string[]) {
    KNOWN_KEYS.add(value);
  }
}

function getActualType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export async function getSettingsAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const service = request.app.get(DI_KEYS.SettingsService) as SettingsService;

  try {
    const allSettings = await service.getAllAsync();
    return {
      statusCode: 200,
      content: {
        data: allSettings,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [`Failed to retrieve settings: ${(error as Error).message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function updateSettingsAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const body = request.body;

  if (body === null || body === undefined || typeof body !== "object" || Array.isArray(body)) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Request body must be a JSON object"],
      },
      ...response.locals["defaultProperties"],
    };
  }

  const updates = Object.entries(body) as [SettingsKey, unknown][];
  const errors: string[] = [];

  for (const [key, value] of updates) {
    if (!KNOWN_KEYS.has(key)) {
      errors.push(`Unknown setting key: ${key}`);
      continue;
    }
    // All SettingsSchema values are string; null is also accepted.
    const actualType = getActualType(value);
    if (value !== null && typeof value !== "string") {
      errors.push(`Invalid type for ${key}: expected string or null, got ${actualType}`);
    }
  }

  if (errors.length > 0) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: errors,
      },
      ...response.locals["defaultProperties"],
    };
  }

  const service = request.app.get(DI_KEYS.SettingsService) as SettingsService;

  try {
    const updatedData: Record<string, unknown> = {};
    for (const [key, value] of updates) {
      await service.setAsync(key, value as SettingsSchema[SettingsKey]);
      updatedData[key] = value;
    }
    return {
      statusCode: 200,
      content: {
        data: updatedData,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [`Failed to update settings: ${(error as Error).message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}
