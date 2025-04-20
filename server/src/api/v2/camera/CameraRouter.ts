import express, { Request, Response } from "express";
import { streamHandlerAsync } from "./CameraHandlers";

const router = express.Router();
router.get("/stream.mjpg", async (req: Request, res: Response) => {
  await streamHandlerAsync(req, res);
});

export default router;
