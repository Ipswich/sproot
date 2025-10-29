import express, { Request, Response } from "express";
import {
  getESP32FirmwareBinaryAsync,
  getESP32ManifestAsync as getESP32ManifestAsync,
} from "./handlers/ESP32Handlers";

const router = express.Router();
router.get("/esp32/manifest", async (req: Request, res: Response) => {
  const response = await getESP32ManifestAsync(req, res);
  res.status(response.statusCode).json(response);
});

router.get("/esp32/binary", async (req: Request, res: Response) => {
  await getESP32FirmwareBinaryAsync(req, res);
});

export default router;
