import { Request, Response } from "express";
import { Router } from "express";
import { deleteAsync, get } from "./handlers/ConditionHandlers";

export default function ConditionsRouter(router: Router): Router {
  router.get("/:outputId/automations/:automationId/conditions", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.delete("/:outputId/automations/:automationId/conditions/:conditionId", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });


  return router;
}