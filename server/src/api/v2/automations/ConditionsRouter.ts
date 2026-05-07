import { Request, Response } from "express";
import { Router } from "express";
import createContractRoute from "../../validation/createContractRoute";
import {
  addAsync,
  updateAsync,
  getAllAsync,
  getByTypeAsync,
  getOneOfByTypeAsync,
  deleteAsync,
} from "./handlers/ConditionHandlers";

export default function conditionsRouter(router: Router): Router {
  router.get(
    "/:automationId/conditions",
    createContractRoute("listAutomationConditions", async (req: Request, res: Response) => {
      const response = await getAllAsync(req, res);

      res.status(response.statusCode).json(response);
      return;
    }),
  );

  router.get(
    "/:automationId/conditions/:type",
    createContractRoute("listAutomationConditionsByType", async (req: Request, res: Response) => {
      const response = await getByTypeAsync(req, res);

      res.status(response.statusCode).json(response);
      return;
    }),
  );

  router.get(
    "/:automationId/conditions/:type/:conditionId/",
    createContractRoute("getAutomationConditionById", async (req: Request, res: Response) => {
      const response = await getOneOfByTypeAsync(req, res);

      res.status(response.statusCode).json(response);
      return;
    }),
  );

  router.post(
    "/:automationId/conditions/:type",
    createContractRoute("createAutomationConditionByType", async (req: Request, res: Response) => {
      const response = await addAsync(req, res);

      res.status(response.statusCode).json(response);
      return;
    }),
  );

  router.patch(
    "/:automationId/conditions/:type/:conditionId",
    createContractRoute("updateAutomationCondition", async (req: Request, res: Response) => {
      const response = await updateAsync(req, res);

      res.status(response.statusCode).json(response);
      return;
    }),
  );

  router.delete(
    "/:automationId/conditions/:type/:conditionId",
    createContractRoute("deleteAutomationCondition", async (req: Request, res: Response) => {
      const response = await deleteAsync(req, res);

      res.status(response.statusCode).json(response);
      return;
    }),
  );

  return router;
}
