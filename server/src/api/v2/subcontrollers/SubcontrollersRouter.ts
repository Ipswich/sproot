import express, { Request, Response } from "express";
import createContractRoute from "../../validation/createContractRoute";

import {
  getSubcontrollerHandlerAsync,
  getSubcontrollerOnlineAsync,
  postSubcontrollerHandlerAsync,
  patchSubcontrollerHandlerAsync,
  deleteSubcontrollerAsync,
} from "./handlers/SubcontrollerHandlers";

import {
  getESP32ApplicationBinaryAsync,
  getESP32BootloaderBinaryAsync,
  getESP32FirmwareBinaryAsync,
  getESP32ManifestAsync,
  getESP32PartitionsBinaryAsync,
  updateESP32FirmwareOTAAsync,
} from "./handlers/ESP32Handlers";

const router = express.Router();

router.get(
  "/",
  createContractRoute("listSubcontrollers", async (req: Request, res: Response) => {
    const response = await getSubcontrollerHandlerAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.post(
  "/",
  createContractRoute("createSubcontroller", async (req: Request, res: Response) => {
    const response = await postSubcontrollerHandlerAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.patch(
  "/:deviceId",
  createContractRoute("updateSubcontroller", async (req: Request, res: Response) => {
    const response = await patchSubcontrollerHandlerAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.delete(
  "/:deviceId",
  createContractRoute("deleteSubcontroller", async (req: Request, res: Response) => {
    const response = await deleteSubcontrollerAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/:deviceId/connection-status",
  createContractRoute("getSubcontrollerConnectionStatus", async (req: Request, res: Response) => {
    const response = await getSubcontrollerOnlineAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/firmware/esp32/manifest",
  createContractRoute("getEsp32FirmwareManifest", async (req: Request, res: Response) => {
    const response = await getESP32ManifestAsync(req, res);
    res.status(response.statusCode).json(response);
  })
);

router.get(
  "/firmware/esp32/binary",
  createContractRoute("downloadEsp32FirmwareBinary", async (req: Request, res: Response) => {
    await getESP32FirmwareBinaryAsync(req, res);
  })
);

router.get(
  "/firmware/esp32/bootloader",
  createContractRoute("downloadEsp32FirmwareBootloader", async (req: Request, res: Response) => {
    await getESP32BootloaderBinaryAsync(req, res);
  })
);

router.get(
  "/firmware/esp32/partitions",
  createContractRoute("downloadEsp32FirmwarePartitions", async (req: Request, res: Response) => {
    await getESP32PartitionsBinaryAsync(req, res);
  })
);

router.get(
  "/firmware/esp32/application",
  createContractRoute("downloadEsp32FirmwareApplication", async (req: Request, res: Response) => {
    await getESP32ApplicationBinaryAsync(req, res);
  })
);

router.post(
  "/firmware/esp32/ota-update/:deviceId",
  createContractRoute("runEsp32OtaUpdate", async (req: Request, res: Response) => {
    const response = await updateESP32FirmwareOTAAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

export default router;
