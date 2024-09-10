import { Request, Response } from "express";

import { Router } from "express"
import {
  get,
  addAsync,
  deleteAsync,
} from "./handlers/OutputAutomationHandlers";

export default function OutputAutomationsRouter(router: Router): Router {
  router.get("/:outputId/automations", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  router.post("/:outputId/automations/:automationId", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  router.delete("/:outputId/automations/:automationId", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  return router;
}