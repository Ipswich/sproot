import express, { Request, Response } from "express";

import {
  getAsync,
  getByIdAsync,
  addAsync,
  deleteAsync,
} from "./handlers/OutputActionHandlers";

const router = express.Router();
router.get("/", async (req: Request, res: Response) => {
  const response = await getAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:outputActionId", async (req: Request, res: Response) => {
  const response = await getByIdAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await addAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:outputActionId", async (req: Request, res: Response) => {
  const response = await deleteAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router