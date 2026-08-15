import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { CameraManager } from "../../../../camera/CameraManager";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";

type CameraSettingsInput = Omit<SDBCameraSettings, "id">;

function getCameraId(request: Request): number | null {
  const rawCameraId = request.params["cameraId"];
  const cameraId = Array.isArray(rawCameraId) ? rawCameraId[0] : rawCameraId;
  const parsed = Number.parseInt(cameraId ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateCameraSettingsInput(newSettings: Partial<CameraSettingsInput>) {
  const missingOrInvalidFields: string[] = [];

  if (typeof newSettings.enabled !== "boolean") {
    missingOrInvalidFields.push("enabled must be a boolean");
  }
  if (
    typeof newSettings.name !== "string" ||
    newSettings.name.length < 1 ||
    newSettings.name.length > 64
  ) {
    missingOrInvalidFields.push("name must be a string between 1 and 64 characters");
  }
  if (!isValidUrl(newSettings.captureUrl)) {
    missingOrInvalidFields.push("captureUrl must be a valid http or https URL");
  }
  if (!isValidUrl(newSettings.streamUrl)) {
    missingOrInvalidFields.push("streamUrl must be a valid http or https URL");
  }
  if (!isValidUrl(newSettings.healthUrl)) {
    missingOrInvalidFields.push("healthUrl must be a valid http or https URL");
  }
  if (typeof newSettings.timelapseEnabled !== "boolean") {
    missingOrInvalidFields.push("timelapseEnabled must be a boolean");
  }
  if (typeof newSettings.imageRetentionDays !== "number" || newSettings.imageRetentionDays < 0) {
    missingOrInvalidFields.push("imageRetentionDays must be a non-negative number");
  }
  if (typeof newSettings.imageRetentionSize !== "number" || newSettings.imageRetentionSize < 0) {
    missingOrInvalidFields.push("imageRetentionSize must be a non-negative number");
  }
  if (
    newSettings.timelapseInterval !== null &&
    newSettings.timelapseInterval !== undefined &&
    (typeof newSettings.timelapseInterval !== "number" ||
      newSettings.timelapseInterval < 1 ||
      newSettings.timelapseInterval > 1440)
  ) {
    missingOrInvalidFields.push("timelapseInterval must be a number between 1 and 1440, or null");
  }
  if (newSettings.timelapseEnabled && newSettings.timelapseInterval == null) {
    missingOrInvalidFields.push("timelapseInterval is required when timelapseEnabled is true");
  }
  if (
    newSettings.timelapseStartTime !== null &&
    newSettings.timelapseStartTime !== undefined &&
    (typeof newSettings.timelapseStartTime !== "string" ||
      !newSettings.timelapseStartTime.match(/^\d{2}:\d{2}$/))
  ) {
    missingOrInvalidFields.push("timelapseStartTime must be a string in HH:MM format, or null");
  }
  if (
    newSettings.timelapseEndTime !== null &&
    newSettings.timelapseEndTime !== undefined &&
    (typeof newSettings.timelapseEndTime !== "string" ||
      !newSettings.timelapseEndTime.match(/^\d{2}:\d{2}$/))
  ) {
    missingOrInvalidFields.push("timelapseEndTime must be a string in HH:MM format, or null");
  }
  if ((newSettings.timelapseStartTime === null) !== (newSettings.timelapseEndTime === null)) {
    missingOrInvalidFields.push(
      "Both timelapseStartTime and timelapseEndTime must be provided or both must be null",
    );
  }

  return missingOrInvalidFields;
}

export async function listCameraSettingsAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse> {
  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
  const settings = await cameraManager.listCameraSettingsAsync();
  return {
    statusCode: 200,
    content: {
      data: settings,
    },
    ...response.locals["defaultProperties"],
  };
}

export async function getCameraSettingsAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const cameraId = getCameraId(request);
  if (cameraId === null) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["cameraId must be a positive integer"],
      },
      ...response.locals["defaultProperties"],
    };
  }

  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
  const settings = await cameraManager.getCameraSettingsAsync(cameraId);
  if (!settings) {
    return {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Camera ${cameraId} was not found`],
      },
      ...response.locals["defaultProperties"],
    };
  }

  return {
    statusCode: 200,
    content: {
      data: settings,
    },
    ...response.locals["defaultProperties"],
  };
}

export async function createCameraSettingsAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const newSettings = request.body as Partial<CameraSettingsInput>;
  const missingOrInvalidFields = validateCameraSettingsInput(newSettings);
  if (missingOrInvalidFields.length > 0) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: missingOrInvalidFields,
      },
      ...response.locals["defaultProperties"],
    };
  }

  try {
    const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
    const createdSettings = await cameraManager.addCameraSettingsAsync(
      newSettings as CameraSettingsInput,
    );
    return {
      statusCode: 201,
      content: {
        data: createdSettings,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [`Failed to create camera settings: ${(error as Error).message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function updateCameraSettingsAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const cameraId = getCameraId(request);
  if (cameraId === null) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["cameraId must be a positive integer"],
      },
      ...response.locals["defaultProperties"],
    };
  }

  const newSettings = request.body as Partial<CameraSettingsInput>;
  const missingOrInvalidFields = validateCameraSettingsInput(newSettings);
  if (missingOrInvalidFields.length > 0) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: missingOrInvalidFields,
      },
      ...response.locals["defaultProperties"],
    };
  }

  try {
    const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
    const updatedSettings = await cameraManager.updateCameraSettingsAsync({
      ...(newSettings as CameraSettingsInput),
      id: cameraId,
    });
    if (!updatedSettings) {
      return {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Camera ${cameraId} was not found`],
        },
        ...response.locals["defaultProperties"],
      };
    }

    return {
      statusCode: 200,
      content: {
        data: updatedSettings,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [`Failed to update camera settings: ${(error as Error).message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}

export async function deleteCameraSettingsAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const cameraId = getCameraId(request);
  if (cameraId === null) {
    return {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["cameraId must be a positive integer"],
      },
      ...response.locals["defaultProperties"],
    };
  }

  const cameraManager = request.app.get(DI_KEYS.CameraManager) as CameraManager;
  const deleted = await cameraManager.deleteCameraSettingsAsync(cameraId);
  if (!deleted) {
    return {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Camera ${cameraId} was not found`],
      },
      ...response.locals["defaultProperties"],
    };
  }

  return {
    statusCode: 200,
    content: {
      data: `Camera ${cameraId} deleted successfully`,
    },
    ...response.locals["defaultProperties"],
  };
}
