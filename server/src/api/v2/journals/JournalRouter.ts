import * as JournalsHandlers from "./handlers/JournalsHandlers";
import express, { Request, Response } from "express";
const router = express.Router();

// Journal Endpoints
router.get("/", async (req: Request, res: Response) => {
  const result = await JournalsHandlers.getAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.get("/:journalId", async (req: Request, res: Response) => {
  const result = await JournalsHandlers.getAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const result = await JournalsHandlers.addAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.patch("/:journalId", async (req: Request, res: Response) => {
  const result = await JournalsHandlers.updateAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/:journalId", async (req: Request, res: Response) => {
  const result = await JournalsHandlers.deleteAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

// Journal Tag Endpoints
router.put("/:journalId/tags", async (req: Request, res: Response) => {
  const result = await JournalsHandlers.addTagAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/:journalId/tags/:tagId", async (req: Request, res: Response) => {
  const result = await JournalsHandlers.removeTagAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

export default router;
