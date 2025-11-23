import express, { Request, Response } from "express";

import {
  getAsync,
  getByIdAsync,
  addAsync,
  updateAsync,
  deleteAsync,
} from "./handlers/AutomationHandlers.js";
import conditionsRouter from "./ConditionsRouter.js";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const response = await getAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:automationId", async (req: Request, res: Response) => {
  const response = await getByIdAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await addAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:automationId", async (req: Request, res: Response) => {
  const response = await updateAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:automationId", async (req: Request, res: Response) => {
  const response = await deleteAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

conditionsRouter(router);

export default router;
