import express, { Request, Response } from "express";
import { powerOffHandler } from "./PowerOffHandlers";

const router = express.Router();

router.post("/power-off", (req: Request, res: Response) => {
  const response = powerOffHandler(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
