import { Request, Response } from "express";
import { Router } from "express";
import { addAsync, deleteAsync, get, updateAsync } from "./handlers/ConditionHandlers";

export default function conditionsRouter(router: Router): Router {
  router.get("/:outputId/automations/:automationId", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.get("/:outputId/automations/:automationId/conditions", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.get("/:outputId/automations/:automationId/conditions/:type", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.get("/:outputId/automations/:automationId/conditions/:type/:conditionId/", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return
  });
  
  router.post("/:outputId/automations/:automationId/conditions/:type", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.patch("/:outputId/automations/:automationId/conditions/:type/:conditionId", async (req: Request, res: Response) => {
    const response = await updateAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.delete("/:outputId/automations/:automationId/conditions/:type/:conditionId", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });


  return router;
}