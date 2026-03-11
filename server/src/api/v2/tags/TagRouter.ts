import express, { Request, Response } from "express";
import * as JournalTagHandlers from "./handlers/JournalTagHandlers";
import * as JournalEntryTagHandlers from "./handlers/JournalEntryTagHandlers";

const router = express.Router();

// Journal Tag Endpoints
router.get("/journals", async (req: Request, res: Response) => {
  const result = await JournalTagHandlers.getAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.post("/journals", async (req: Request, res: Response) => {
  const result = await JournalTagHandlers.addAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.patch("/journals/:tagId", async (req: Request, res: Response) => {
  const result = await JournalTagHandlers.updateAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/journals/:tagId", async (req: Request, res: Response) => {
  const result = await JournalTagHandlers.deleteAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

// Journal Entry Tag Endpoints
router.get("/entries", async (req: Request, res: Response) => {
  const result = await JournalEntryTagHandlers.getAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.post("/entries", async (req: Request, res: Response) => {
  const result = await JournalEntryTagHandlers.addAsync(req, res);
  res.status(result.statusCode).json(result);
});

router.patch("/entries/:tagId", async (req: Request, res: Response) => {
  const result = await JournalEntryTagHandlers.updateAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/entries/:tagId", async (req: Request, res: Response) => {
  const result = await JournalEntryTagHandlers.deleteAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

export default router;
