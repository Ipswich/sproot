import express, { Request, Response } from "express";
import { supportedModelsHandler } from "./handlers/SupportedModelsHandlers";
import { addAsync, deleteAsync, get, updateAsync } from "./handlers/OutputHandlers";
import { setControlMode, setManualState } from "./handlers/OutputStateHandlers";
import { outputChartDataHandler } from "./handlers/OutputChartDataHandlers";

import {
  get as getAutomations,
  addAsync as addAutomationAsync,
  updateAsync as updateAutomationAsync,
  deleteAsync as deleteAutomationAsync,
} from "./automations/handlers/AutomationHandlers";

const router = express.Router();

router.get("/supported-models", (_req: Request, res: Response) => {
  const response = supportedModelsHandler(res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/chart-data", (req: Request, res: Response) => {
  const response = outputChartDataHandler(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/", (req: Request, res: Response) => {
  const response = get(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:outputId", (req: Request, res: Response) => {
  const response = get(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await addAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:outputId", async (req: Request, res: Response) => {
  const response = await updateAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:outputId", async (req: Request, res: Response) => {
  const response = await deleteAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.put("/:outputId/control-mode", (req: Request, res: Response) => {
  const response = setControlMode(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.put("/:outputId/manual-state", (req: Request, res: Response) => {
  const response = setManualState(req, res);

  res.status(response.statusCode).json(response);
  return;
});

// Automations
router.get("/:outputId/automations", (req: Request, res: Response) => {
  const response = getAutomations(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:outputId/automations/:automationId", (req: Request, res: Response) => {
  const response = getAutomations(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/:outputId/automations", async (req: Request, res: Response) => {
  const response = await addAutomationAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:outputId/automations/:automationId", async (req: Request, res: Response) => {
  const response = await updateAutomationAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:outputId/automations/:automationId", async (req: Request, res: Response) => {
  const response = await deleteAutomationAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
