import express, { Request, Response } from "express";
import { supportedModelsHandler } from "./handlers/SupportedModelsHandlers";
import { addAsync, deleteAsync, get, updateAsync } from "./handlers/OutputHandlers";
import { setControlModeAsync, setManualStateAsync } from "./handlers/OutputStateHandlers";
import { outputChartDataHandler } from "./handlers/OutputChartDataHandlers";
import { getAvailableDevices } from "./handlers/AvailableDevicesHandlers";
import createContractRoute from "../../validation/createContractRoute";

const router = express.Router();

router.get(
  "/supported-models",
  createContractRoute("listSupportedOutputModels", (_req: Request, res: Response) => {
    const response = supportedModelsHandler(res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/chart-data",
  createContractRoute("getOutputChartData", (req: Request, res: Response) => {
    const response = outputChartDataHandler(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/",
  createContractRoute("listOutputs", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/:outputId",
  createContractRoute("getOutputById", (req: Request, res: Response) => {
    const response = get(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.post(
  "/",
  createContractRoute("createOutput", async (req: Request, res: Response) => {
    const response = await addAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.patch(
  "/:outputId",
  createContractRoute("updateOutput", async (req: Request, res: Response) => {
    const response = await updateAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.delete(
  "/:outputId",
  createContractRoute("deleteOutput", async (req: Request, res: Response) => {
    const response = await deleteAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.put(
  "/:outputId/control-mode",
  createContractRoute("setOutputControlMode", async (req: Request, res: Response) => {
    const response = await setControlModeAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.put(
  "/:outputId/manual-state",
  createContractRoute("setOutputManualState", async (req: Request, res: Response) => {
    const response = await setManualStateAsync(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

router.get(
  "/available-devices/:model",
  createContractRoute("listAvailableOutputDevices", async (req: Request, res: Response) => {
    const response = await getAvailableDevices(req, res);

    res.status(response.statusCode).json(response);
    return;
  })
);

export default router;
