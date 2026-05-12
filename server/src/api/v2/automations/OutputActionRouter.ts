import express, { Request, Response } from "express";
import createContractRoute from "../../validation/createContractRoute";

import { getAsync, getByIdAsync, addAsync, deleteAsync } from "./handlers/OutputActionHandlers";

const router = express.Router();
router.get(
  "/",
  createContractRoute("listOutputActions", async (req: Request, res: Response) => {
    const response = await getAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.get(
  "/:outputActionId",
  createContractRoute("getOutputActionById", async (req: Request, res: Response) => {
    const response = await getByIdAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.post(
  "/",
  createContractRoute("createOutputAction", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

router.delete(
  "/:outputActionId",
  createContractRoute("deleteOutputAction", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  }),
);

export default router;
