import express, { Request, Response } from "express";
import { addAsync, deleteAsync, get, updateAsync } from "./handlers/SensorHandlers";
import supportedModelsHandler from "./handlers/SupportedModelsHandlers";
import { sensorChartDataHandler } from "./handlers/SensorChartDataHandlers";

const router = express.Router();

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

router.get("/:id", (req: Request, res: Response) => {
  const response = get(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await addAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:id", async (req: Request, res: Response) => {
  const response = await updateAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:id", async (req: Request, res: Response) => {
  const response = await deleteAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
