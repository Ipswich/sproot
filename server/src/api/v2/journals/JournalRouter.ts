import * as JournalsHandlers from "./handlers/JournalsHandlers";
import * as JournalEntriesHandlers from "./handlers/JournalEntriesHandlers";
import express, { Request, Response } from "express";
import createContractRoute from "../../validation/createContractRoute";
const router = express.Router();

// Journal Endpoints
router.get(
  "/",
  createContractRoute("listJournals", async (req: Request, res: Response) => {
    const result = await JournalsHandlers.getAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.get(
  "/:journalId",
  createContractRoute("getJournalById", async (req: Request, res: Response) => {
    const result = await JournalsHandlers.getAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.post(
  "/",
  createContractRoute("createJournal", async (req: Request, res: Response) => {
    const result = await JournalsHandlers.addAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.patch(
  "/:journalId",
  createContractRoute("updateJournal", async (req: Request, res: Response) => {
    const result = await JournalsHandlers.updateAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.delete(
  "/:journalId",
  createContractRoute("deleteJournal", async (req: Request, res: Response) => {
    const result = await JournalsHandlers.deleteAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

// Journal Entry Endpoints
router.get(
  "/:journalId/entries",
  createContractRoute("listJournalEntries", async (req: Request, res: Response) => {
    const result = await JournalEntriesHandlers.getByJournalIdAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.post(
  "/:journalId/entries",
  createContractRoute("createJournalEntry", async (req: Request, res: Response) => {
    const result = await JournalEntriesHandlers.addAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

// Journal Tag Endpoints
router.put(
  "/:journalId/tags",
  createContractRoute("attachTagToJournal", async (req: Request, res: Response) => {
    const result = await JournalsHandlers.addTagAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.delete(
  "/:journalId/tags/:tagId",
  createContractRoute("detachTagFromJournal", async (req: Request, res: Response) => {
    const result = await JournalsHandlers.removeTagAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

export default router;
