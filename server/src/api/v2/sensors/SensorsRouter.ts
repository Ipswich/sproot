import express, { Request, Response } from "express";
import {
  getSensorHandler,
  addSensorHandlerAsync,
  updateSensorHandlerAsync,
  deleteSensorHandlerAsync,
} from "./handlers/SensorHandlers";
import supportedModelsHandler from "./handlers/SupportedModelsHandler";

const router = express.Router();

router.get("/supported-models", (_req: Request, res: Response) => {
  const response = supportedModelsHandler(res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/", (req: Request, res: Response) => {
  const response = getSensorHandler(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:id", async (req: Request, res: Response) => {
  const response = await deleteSensorHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await addSensorHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:id", (req: Request, res: Response) => {
  const response = getSensorHandler(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:id", async (req: Request, res: Response) => {
  const response = await updateSensorHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
