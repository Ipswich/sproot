import express, { Request, Response } from "express";
import * as JournalTagHandlers from "./handlers/JournalTagHandlers";
import * as JournalEntryTagHandlers from "./handlers/JournalEntryTagHandlers";

const router = express.Router();

// Journal Endpoints
router.get("/", async (req: Request, res: Response) => {
  return;
});

router.post("/", async (req: Request, res: Response) => {
  return;
});

router.patch("/:journalId", async (req: Request, res: Response) => {
  return;
});

router.delete("/:journalId", async (req: Request, res: Response) => {
  return;
});

// Journal Tag Endpoints
router.get("/tags", async (req: Request, res: Response) => {
  const result = await JournalTagHandlers.getAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.post("/tags", async (req: Request, res: Response) => {
  const result = await JournalTagHandlers.addAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.patch("/tags/:tagId", async (req: Request, res: Response) => {
  const result = await JournalTagHandlers.updateAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/tags/:tagId", async (req: Request, res: Response) => {
  const result = await JournalTagHandlers.deleteAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

// Journal Entry Endpoints
router.get("/:journalId/entries", async (req: Request, res: Response) => {
  return;
});

router.post("/:journalId/entries", async (req: Request, res: Response) => {
  return;
});

router.patch("/:journalId/entries/:entryId", async (req: Request, res: Response) => {
  return;
});

router.delete("/:journalId/entries/:entryId", async (req: Request, res: Response) => {
  return;
});

// Journal Entry Tag Endpoints
router.get("/entry-tags", async (req: Request, res: Response) => {
  const result = await JournalEntryTagHandlers.getAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.post("/entry-tags", async (req: Request, res: Response) => {
  const result = await JournalEntryTagHandlers.addAsync(req, res);
  res.status(result.statusCode).json(result);
});

router.patch("/entry-tags/:tagId", async (req: Request, res: Response) => {
  const result = await JournalEntryTagHandlers.updateAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/entry-tags/:tagId", async (req: Request, res: Response) => {
  const result = await JournalEntryTagHandlers.deleteAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

export default router;
