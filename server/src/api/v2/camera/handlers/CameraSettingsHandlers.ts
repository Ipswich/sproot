import { Request, Response } from "express";
import { CameraManager } from "../../../../camera/CameraManager";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { ISprootDB } from "@sproot/database/ISprootDB";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";


export function getCameraSettings(request: Request, response: Response): SuccessResponse {
  const cameraManager = request.app.get("cameraManager") as CameraManager;
  const settings = cameraManager.cameraSettings;
  return {
    statusCode: 200,
    content: {
      data: settings,
    },
    ...response.locals["defaultProperties"],
  };
}

export async function updateCameraSettingsAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const newSettings = request.body as SDBCameraSettings;
  // At this point, there is only 1.
  newSettings.id = 1;

  const missingOrInvalidFields = [];
  if (typeof newSettings.id !== "number" || newSettings.id < 1) {
    missingOrInvalidFields.push("id must be a non-negative number");
  }
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
  if (
    newSettings.xVideoResolution !== null &&
    (typeof newSettings.xVideoResolution !== "number" || newSettings.xVideoResolution <= 0)
  ) {
    missingOrInvalidFields.push("xVideoResolution must be a positive number or null");
  }
  if (
    newSettings.yVideoResolution !== null &&
    (typeof newSettings.yVideoResolution !== "number" || newSettings.yVideoResolution <= 0)
  ) {
    missingOrInvalidFields.push("yVideoResolution must be a positive number or null");
  }
  if (
    newSettings.videoFps !== null &&
    (typeof newSettings.videoFps !== "number" || newSettings.videoFps <= 0)
  ) {
    missingOrInvalidFields.push("videoFps must be a positive number or null");
  }
  if (
    newSettings.xImageResolution !== null &&
    (typeof newSettings.xImageResolution !== "number" || newSettings.xImageResolution <= 0)
  ) {
    missingOrInvalidFields.push("xImageResolution must be a positive number or null");
  }
  if (
    newSettings.yImageResolution !== null &&
    (typeof newSettings.yImageResolution !== "number" || newSettings.yImageResolution <= 0)
  ) {
    missingOrInvalidFields.push("yImageResolution must be a positive number or null");
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
    typeof newSettings.timelapseInterval !== "number" ||
    newSettings.timelapseInterval < 1 ||
    newSettings.timelapseInterval > 1440
  ) {
    missingOrInvalidFields.push("timelapseInterval must be a number between 1 and 1440");
  }
  if (newSettings.timelapseStartTime !== null &&
    (typeof newSettings.timelapseStartTime !== "string" || !newSettings.timelapseStartTime.match(/^\d{2}:\d{2}$/))
  ) {
    missingOrInvalidFields.push("timelapseStartTime must be a string in HH:MM format, or null");
  }
  if (
    newSettings.timelapseEndTime !== null &&
    (typeof newSettings.timelapseEndTime !== "string" || !newSettings.timelapseEndTime.match(/^\d{2}:\d{2}$/))
  ) {
    missingOrInvalidFields.push("timelapseEndTime must be a string in HH:MM format, or null");
  }
  if ((newSettings.timelapseStartTime === null && newSettings.timelapseEndTime !== null) ||
    (newSettings.timelapseStartTime !== null && newSettings.timelapseEndTime === null)) {
    missingOrInvalidFields.push("Both timelapseStartTime and timelapseEndTime must be provided or both must be null");
  }
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
    await sprootDB.updateCameraSettingsAsync(newSettings);
    return {
      statusCode: 200,
      content: {
        data: newSettings,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      error: {
        name: "Internal Server Error",
        url: request.originalUrl,
        details: [`Failed to update camera settings: ${error.message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}
