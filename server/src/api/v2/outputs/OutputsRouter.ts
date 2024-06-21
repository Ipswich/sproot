import express, { Request, Response } from "express";
import supportedModelsHandler from "./handlers/SupportedModelsHandler";
import { addOutputHandlerAsync, getOutputHandler, updateOutputHandlerAsync } from "./handlers/OutputHandlers";

const router = express.Router();

router.get("/supported-models", (_req: Request, res: Response) => {
  const response = supportedModelsHandler(res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/", (req: Request, res: Response) => {
  const response = getOutputHandler(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:id", (req: Request, res: Response) => {
  const response = getOutputHandler(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await addOutputHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:id", async (req: Request, res: Response) => {
  const response = await updateOutputHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
