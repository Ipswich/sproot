import { Request, Response } from "express";

import { Router } from "express"
import {
  get,
  addAsync,
  updateAsync,
  deleteAsync,
} from "./handlers/AutomationHandlers";

export default function AutomationsRouter(router: Router): Router {
  router.get("/automations", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  router.get("/:outputId/automations", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  router.get("/:outputId/automations/:automationId", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  router.post("/:outputId/automations", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  router.patch("/:outputId/automations/:automationId", async (req: Request, res: Response) => {
    const response = await updateAsync(req, res);

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