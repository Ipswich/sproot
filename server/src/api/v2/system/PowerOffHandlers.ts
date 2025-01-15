import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import winston from "winston";

export function powerOffHandler(
  request: Request,
  response: Response,
): SuccessResponse | ErrorResponse {
  const powerOffResponse = {
    statusCode: 200,
    content: {
      data: "System is powering off.",
    },
    ...response.locals["defaultProperties"],
  };

  const logger = request.app.get("logger") as winston.Logger;
  logger.info("Shutdown request received! System is powering off in 3 seconds.");
  setTimeout(async () => {
    await request.app.get("gracefulHaltAsync")();
  }, 3000);

  return powerOffResponse;
}
