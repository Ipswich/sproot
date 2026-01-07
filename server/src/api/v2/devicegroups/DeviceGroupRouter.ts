import express, { Request, Response } from "express";

import { getAsync, addAsync, updateAsync, deleteAsync } from "./handlers/DeviceGroupHandlers";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const response = await getAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await addAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:deviceGroupId", async (req: Request, res: Response) => {
  const response = await updateAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:deviceGroupId", async (req: Request, res: Response) => {
  const response = await deleteAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
