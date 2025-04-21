import express, { Request, Response } from "express";
import { getLatestImageAsync, streamHandlerAsync } from "./CameraHandlers";

const router = express.Router();
router.get("/stream", async (req: Request, res: Response) => {
  await streamHandlerAsync(req, res);
});

router.get("/latest-image", async (req: Request, res: Response) => {
  await getLatestImageAsync(req, res);
});

export default router;
