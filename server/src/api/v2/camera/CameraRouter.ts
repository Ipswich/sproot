import express, { Request, Response } from "express";
import { streamHandlerAsync } from "./CameraHandlers";

const router = express.Router();
router.get("/stream.mjpg", async (req: Request, res: Response) => {
  const response = await streamHandlerAsync(req, res);

  if (typeof response.statusCode === "number") {
    res.status(response.statusCode).json(response);
  } else {
    res.send();
  }
});

export default router;
