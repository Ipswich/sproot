import express, { Request, Response } from "express";

import {
  getAsync,
  getByIdAsync,
  addOutputToOutputAutomationAsync,
  deleteOutputFromOutputAutomationAsync,
  addAsync,
  deleteAsync,
  updateAsync,
} from "./handlers/OutputAutomationHandlers";

const router = express.Router();
router.get("/", async (req: Request, res: Response) => {
  const response = await getAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:outputAutomationId", async (req: Request, res: Response) => {
  const response = await getByIdAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await addAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:outputAutomationId", async (req: Request, res: Response) => {
  const response = await updateAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:outputAutomationId", async (req: Request, res: Response) => {
  const response = await deleteAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});


router.put("/:outputAutomationId/outputs/:outputId", async (req: Request, res: Response) => {
  const response = await addOutputToOutputAutomationAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:outputAutomationId/outputs/:outputId", async (req: Request, res: Response) => {
  const response = await deleteOutputFromOutputAutomationAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router