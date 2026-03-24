import * as JournalEntriesHandlers from "./handlers/JournalEntriesHandlers";
import express, { Request, Response } from "express";
const router = express.Router();

// Journal Entry Endpoints
// router.get("/", async (req: Request, res: Response) => {
//   const result = await JournalEntriesHandlers.getByJournalIdAsync(req, res);
//   res.status(result.statusCode).json(result);
//   return;
// });

router.get("/:entryId", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.getByEntryIdAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.patch("/:entryId", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.updateAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/:entryId", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.deleteAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

// Journal Entry Tag Endpoints
router.put("/:entryId/tags", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.addTagAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/:entryId/tags/:tagId", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.removeTagAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

export default router;
