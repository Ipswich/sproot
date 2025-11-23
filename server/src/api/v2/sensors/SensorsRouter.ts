import express, { Request, Response } from "express";
import { addAsync, deleteAsync, get, updateAsync } from "./handlers/SensorHandlers.js";
import { supportedModelsHandler } from "./handlers/SupportedModelsHandlers.js";
import { readingTypesHandler } from "./handlers/ReadingTypesHandler.js";
import { sensorChartDataHandler } from "./handlers/SensorChartDataHandlers.js";

const router = express.Router();

router.get("/reading-types", (req: Request, res: Response) => {
  const response = readingTypesHandler(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/supported-models", (_req: Request, res: Response) => {
  const response = supportedModelsHandler(res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/chart-data", (req: Request, res: Response) => {
  const response = sensorChartDataHandler(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/", (req: Request, res: Response) => {
  const response = get(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:sensorId", (req: Request, res: Response) => {
  const response = get(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await addAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:sensorId", async (req: Request, res: Response) => {
  const response = await updateAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:sensorId", async (req: Request, res: Response) => {
  const response = await deleteAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
