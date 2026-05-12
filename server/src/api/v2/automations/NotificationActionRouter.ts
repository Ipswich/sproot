import express, { Request, Response } from "express";
import createContractRoute from "../../validation/createContractRoute";

import {
  getAsync,
  getByIdAsync,
  addAsync,
  deleteAsync,
  getActiveNotificationsAsync,
} from "./handlers/NotificationActionHandlers";

const router = express.Router();

router.get(
  "/",
  createContractRoute("listNotificationActions", async (req: Request, res: Response) => {
    const response = await getAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.get(
  "/active",
  createContractRoute("listActiveNotifications", async (req: Request, res: Response) => {
    const response = await getActiveNotificationsAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.get(
  "/:notificationActionId",
  createContractRoute("getNotificationActionById", async (req: Request, res: Response) => {
    const response = await getByIdAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.post(
  "/",
  createContractRoute("createNotificationAction", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.delete(
  "/:notificationActionId",
  createContractRoute("deleteNotificationAction", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

export default router;
