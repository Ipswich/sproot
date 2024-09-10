import { Request, Response } from "express";
import { Router } from "express";
import { addAsync, updateAsync, getAllAsync, getTypeAsync, getOneOfTypeAsync, deleteAsync } from "./handlers/ConditionHandlers";

export default function conditionsRouter(router: Router): Router {
  router.get("/automations/:automationId/conditions", async (req: Request, res: Response) => {
    const response = await getAllAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.get("/automations/:automationId/conditions/:type", async (req: Request, res: Response) => {
    const response = await getTypeAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.get("/automations/:automationId/conditions/:type/:conditionId/", async (req: Request, res: Response) => {
    const response = await getOneOfTypeAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });
  
  router.post("/automations/:automationId/conditions/:type", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.put("/automations/:automationId/conditions/:type/:conditionId", async (req: Request, res: Response) => {
    const response = await updateAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });

  router.delete("/automations/:automationId/conditions/:type/:conditionId", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return
  });


  return router;
}