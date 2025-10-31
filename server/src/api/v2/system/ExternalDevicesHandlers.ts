import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { MdnsService } from "../../../system/MdnsService";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

export async function getExternalDevicesHandlerAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const mdnsService = request.app.get("bonjourService") as MdnsService;

  try {
    const recognizedDevices = await sprootDB.getExternalDevicesAsync();

    const returnData = {
      recognized: recognizedDevices,
      unrecognized: mdnsService.devices.filter((service) => {
        return !recognizedDevices.some((device) => device.name === service.name);
      }),
    };

    return {
      statusCode: 200,
      content: {
        data: returnData,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return {
      statusCode: 500,
      content: {
        error: "Failed to retrieve external devices.",
        details: (error as Error).message,
      },
      ...response.locals["defaultProperties"],
    };
  }
}
