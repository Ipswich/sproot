import express, { Request, Response } from "express";
import sensorListHandler from "./handlers/SensorListHandler";
import supportedModelsHandler from "./handlers/SupportedModelsHandler";
import { Success } from "@sproot/api/v2/Responses";
import { SensorList } from "../../../sensors/list/SensorList";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const data = sensorListHandler(req.app.get("sensorList") as SensorList);

  const response: Success = {
    statusCode: 200,
    content: {
      data,
    },
    ...res.locals["defaultProperties"],
  };

  res.status(200).json(response);
});

router.get("/:sensorId", async (req: Request, res: Response) => {
  const data = sensorListHandler(req.app.get("sensorList") as SensorList, req.params["sensorId"]);

  if (Object.keys(data).length === 0) {
    const response: Error = {
      statusCode: 404,
      error: {
        name: "Not Found",
        fullPath: req.originalUrl,
        details: [`Sensor with ID ${req.params["sensorId"]} not found`],
      },
      ...res.locals["defaultProperties"],
    };

    res.status(404).json(response);
    return;
  }

  const response: Success = {
    statusCode: 200,
    content: {
      data,
    },
    ...res.locals["defaultProperties"],
  };

  res.status(200).json(response);
});

router.get("/supported-models", async (_req: Request, res: Response) => {
  const data = supportedModelsHandler();

  const response: Success = {
    statusCode: 200,
    content: {
      data,
    },
    ...res.locals["defaultProperties"],
  };

  res.status(200).json(response);
});

export default router;
