import express, { Request, Response } from "express";
import createContractRoute from "../../validation/createContractRoute";

import {
  getAsync,
  getByIdAsync,
  addAsync,
  updateAsync,
  deleteAsync,
} from "./handlers/AutomationHandlers";
import conditionsRouter from "./ConditionsRouter";

const router = express.Router();

router.get(
  "/",
  createContractRoute("listAutomations", async (req: Request, res: Response) => {
    const response = await getAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/:automationId",
  createContractRoute("getAutomationById", async (req: Request, res: Response) => {
    const response = await getByIdAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.post(
  "/",
  createContractRoute("createAutomation", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.patch(
  "/:automationId",
  createContractRoute("updateAutomation", async (req: Request, res: Response) => {
    const response = await updateAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.delete(
  "/:automationId",
  createContractRoute("deleteAutomation", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

conditionsRouter(router);

export default router;
