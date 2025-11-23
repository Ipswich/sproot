import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses.js";
import { Request, Response } from "express";
import { SystemStatusMonitor } from "../../../system/StatusMonitor.js";

export async function systemStatusMonitorHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const systemStatusMonitor = request.app.get("systemStatusMonitor") as SystemStatusMonitor;

  try {
    const stats = await systemStatusMonitor.getStatusAsync();
    return {
      statusCode: 200,
      content: {
        data: stats,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      error: {
        name: "Internal Server Error",
        url: request.originalUrl,
        details: [`Failed to retrieve system status: ${error.message}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
}
