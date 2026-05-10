import express, { Request, Response } from "express";
import { addAsync, deleteAsync, get, updateAsync } from "./handlers/SensorHandlers";
import { supportedModelsHandler } from "./handlers/SupportedModelsHandlers";
import { readingTypesHandler } from "./handlers/ReadingTypesHandler";
import { sensorChartDataHandler } from "./handlers/SensorChartDataHandlers";
import createContractRoute from "../../validation/createContractRoute";

const router = express.Router();

router.get(
  "/reading-types",
  createContractRoute("getSensorReadingTypes", (req: Request, res: Response) => {
    const response = readingTypesHandler(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/supported-models",
  createContractRoute("listSupportedSensorModels", (_req: Request, res: Response) => {
    const response = supportedModelsHandler(res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/chart-data",
  createContractRoute("getSensorChartData", (req: Request, res: Response) => {
    const response = sensorChartDataHandler(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/",
  createContractRoute("listSensors", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/:sensorId",
  createContractRoute("getSensorById", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.post(
  "/",
  createContractRoute("createSensor", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.patch(
  "/:sensorId",
  createContractRoute("updateSensor", async (req: Request, res: Response) => {
    const response = await updateAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.delete(
  "/:sensorId",
  createContractRoute("deleteSensor", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

export default router;
