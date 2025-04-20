import express, { Request, Response } from "express";
import { streamHandlerAsync } from "./CameraHandlers";

const router = express.Router();
router.get("/stream", async (req: Request, res: Response) => {
  await streamHandlerAsync(req, res);
});

export default router;
