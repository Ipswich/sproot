import { Request, Response } from "express";
import { Router } from "express";
import {
  addAsync,
  updateAsync,
  getAllAsync,
  getByTypeAsync,
  getOneOfByTypeAsync,
  deleteAsync,
} from "./handlers/ConditionHandlers";

export default function conditionsRouter(router: Router): Router {
  router.get("/:automationId/conditions", async (req: Request, res: Response) => {
    const response = await getAllAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  router.get("/:automationId/conditions/:type", async (req: Request, res: Response) => {
    const response = await getByTypeAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  router.get(
    "/:automationId/conditions/:type/:conditionId/",
    async (req: Request, res: Response) => {
      const response = await getOneOfByTypeAsync(req, res);

      res.status(response.statusCode).json(response);
      return;
    },
  );

  router.post("/:automationId/conditions/:type", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  });

  router.patch(
    "/:automationId/conditions/:type/:conditionId",
    async (req: Request, res: Response) => {
      const response = await updateAsync(req, res);

      res.status(response.statusCode).json(response);
      return;
    },
  );

  router.delete(
    "/:automationId/conditions/:type/:conditionId",
    async (req: Request, res: Response) => {
      const response = await deleteAsync(req, res);

      res.status(response.statusCode).json(response);
      return;
    },
  );

  return router;
}
