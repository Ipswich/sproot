import express, { Request, Response } from "express";

import { getAsync, addAsync, updateAsync, deleteAsync } from "./handlers/DeviceZoneHandlers";
import createContractRoute from "../../validation/createContractRoute";

const router = express.Router();

router.get(
  "/",
  createContractRoute("listDeviceZones", async (req: Request, res: Response) => {
    const response = await getAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.post(
  "/",
  createContractRoute("createDeviceZone", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.patch(
  "/:deviceZoneId",
  createContractRoute("updateDeviceZone", async (req: Request, res: Response) => {
    const response = await updateAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.delete(
  "/:deviceZoneId",
  createContractRoute("deleteDeviceZone", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

export default router;
