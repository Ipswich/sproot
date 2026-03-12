import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import JournalService from "../../../../journals/JournalService";

/** Possible statusCodes: 200, 400, 404, 503 */
export async function getSensorDataAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  let entryId: number | undefined = undefined;
  entryId = parseInt(req.params["entryId"] ?? "", 10);

  if (isNaN(entryId)) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: ["Valid Journal Entry ID is required."],
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  try {
    const results = await journalService.entryManager.getDeviceDataAsync(entryId, "Sensor");
    if (results.length === 0) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`No sensor data found for journal entry with ID ${entryId}.`],
        },
        ...res.locals["defaultProperties"],
      };
    } else {
      response = {
        statusCode: 200,
        content: {
          data: results,
        },
        ...res.locals["defaultProperties"],
      };
    }
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [
          `Failed to retrieve sensor data for journal entry ${entryId}: ${(error as Error).message}`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }

  return response;
}

/** Possible statusCodes: 200, 400, 404, 503 */
export async function getOutputDataAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  let entryId: number | undefined = undefined;
  entryId = parseInt(req.params["entryId"] ?? "", 10);

  if (isNaN(entryId)) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: ["Valid Journal Entry ID is required."],
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  try {
    const results = await journalService.entryManager.getDeviceDataAsync(entryId, "Output");
    if (results.length === 0) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`No output data found for journal entry with ID ${entryId}.`],
        },
        ...res.locals["defaultProperties"],
      };
    } else {
      response = {
        statusCode: 200,
        content: {
          data: results,
        },
        ...res.locals["defaultProperties"],
      };
    }
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [
          `Failed to retrieve output data for journal entry ${entryId}: ${(error as Error).message}`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }

  return response;
}

export async function putSensorDataAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  const entryId = parseInt(req.params["entryId"] ?? "", 10);
  const sensorId = parseInt(req.body["sensorId"] ?? "", 10);
  const start = new Date(req.body["start"] as string);
  const end = new Date(req.body["end"] as string);
  const badRequests: string[] = [];

  if (isNaN(entryId)) {
    badRequests.push("Valid Journal Entry ID is required.");
  }
  if (isNaN(sensorId)) {
    badRequests.push("Valid Sensor ID is required.");
  }
  if (isNaN(start.getTime())) {
    badRequests.push("Valid start date is required.");
  }
  if (isNaN(end.getTime())) {
    badRequests.push("Valid end date is required.");
  }
  if (start >= end) {
    badRequests.push("Start date must be before end date.");
  }

  if (badRequests.length > 0) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: badRequests,
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  try {
    // Clear out old sensor data for this sensor and entry before attaching new data to prevent duplicates
    await journalService.entryManager.detachSensorDataAsync(entryId, sensorId!);
    await journalService.entryManager.attachSensorDataAsync(entryId, sensorId!, start, end);
    response = {
      statusCode: 200,
      content: {
        data: `Sensor data from sensor ${sensorId} attached to journal entry ${entryId} successfully.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [
          `Failed to attach sensor data to journal entry ${entryId}: ${(error as Error).message}`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }

  return response;
}

/** Possible statusCodes: 200, 400, 404, 503 */
export async function putOutputDataAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  const entryId = parseInt(req.params["entryId"] ?? "", 10);
  const outputId = parseInt(req.body["outputId"] ?? "", 10);
  const start = new Date(req.body["start"] as string);
  const end = new Date(req.body["end"] as string);
  const badRequests: string[] = [];

  if (isNaN(entryId)) {
    badRequests.push("Valid Journal Entry ID is required.");
  }
  if (isNaN(outputId)) {
    badRequests.push("Valid Sensor ID is required.");
  }
  if (isNaN(start.getTime())) {
    badRequests.push("Valid start date is required.");
  }
  if (isNaN(end.getTime())) {
    badRequests.push("Valid end date is required.");
  }
  if (start >= end) {
    badRequests.push("Start date must be before end date.");
  }

  if (badRequests.length > 0) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: badRequests,
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  try {
    // Clear out old output data for this output and entry before attaching new data to prevent duplicates
    await journalService.entryManager.detachOutputDataAsync(entryId, outputId!);
    await journalService.entryManager.attachOutputDataAsync(entryId, outputId!, start, end);
    response = {
      statusCode: 200,
      content: {
        data: `Output data from output ${outputId} attached to journal entry ${entryId} successfully.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [
          `Failed to attach output data to journal entry ${entryId}: ${(error as Error).message}`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }

  return response;
}

/** Possible statusCodes: 200, 400, 404, 503 */
export async function deleteSensorDataAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  const journalId = parseInt(req.params["journalId"] ?? "", 10);
  const entryId = parseInt(req.params["entryId"] ?? "", 10);
  const sensorId = parseInt(req.params["sensorId"] ?? "", 10);
  const badRequests: string[] = [];

  if (isNaN(journalId)) {
    badRequests.push("Valid Journal ID is required.");
  }
  if (isNaN(entryId)) {
    badRequests.push("Valid Journal Entry ID is required.");
  }
  if (isNaN(sensorId)) {
    badRequests.push("Valid Sensor ID is required.");
  }
  if (badRequests.length > 0) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: badRequests,
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  try {
    await journalService.entryManager.detachSensorDataAsync(entryId, sensorId);
    response = {
      statusCode: 200,
      content: {
        data: `Sensor data from sensor ${sensorId} detached from journal entry ${entryId} successfully.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [
          `Failed to detach sensor data from journal entry ${entryId}: ${(error as Error).message}`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }

  return response;
}

/** Possible statusCodes: 200, 400, 404, 503 */
export async function deleteOutputDataAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  const journalId = parseInt(req.params["journalId"] ?? "", 10);
  const entryId = parseInt(req.params["entryId"] ?? "", 10);
  const outputId = parseInt(req.params["outputId"] ?? "", 10);
  const badRequests: string[] = [];

  if (isNaN(journalId)) {
    badRequests.push("Valid Journal ID is required.");
  }
  if (isNaN(entryId)) {
    badRequests.push("Valid Journal Entry ID is required.");
  }
  if (isNaN(outputId)) {
    badRequests.push("Valid Output ID is required.");
  }
  if (badRequests.length > 0) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: badRequests,
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }
  try {
    await journalService.entryManager.detachOutputDataAsync(entryId, outputId);
    response = {
      statusCode: 200,
      content: {
        data: `Output data from output ${outputId} detached from journal entry ${entryId} successfully.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [
          `Failed to detach output data from journal entry ${entryId}: ${(error as Error).message}`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }

  return response;
}
