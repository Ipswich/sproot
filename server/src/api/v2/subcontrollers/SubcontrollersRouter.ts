import express, { Request, Response } from "express";

import {
  getSubcontrollerHandlerAsync,
  getSubcontrollerOnlineAsync,
  postSubcontrollerHandlerAsync,
  patchSubcontrollerHandlerAsync,
  deleteSubcontrollerAsync,
} from "./handlers/SubcontrollerHandlers";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const response = await getSubcontrollerHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await postSubcontrollerHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:deviceId", async (req: Request, res: Response) => {
  const response = await patchSubcontrollerHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:deviceId", async (req: Request, res: Response) => {
  const response = await deleteSubcontrollerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:deviceId/connection-status", async (req: Request, res: Response) => {
  const response = await getSubcontrollerOnlineAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
