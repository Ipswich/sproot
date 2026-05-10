import express, { Request, Response } from "express";
import * as JournalTagHandlers from "./handlers/JournalTagHandlers";
import * as JournalEntryTagHandlers from "./handlers/JournalEntryTagHandlers";
import createContractRoute from "../../validation/createContractRoute";

const router = express.Router();

// Journal Tag Endpoints
router.get(
  "/journals",
  createContractRoute("listJournalTags", async (req: Request, res: Response) => {
    const result = await JournalTagHandlers.getAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.post(
  "/journals",
  createContractRoute("createJournalTag", async (req: Request, res: Response) => {
    const result = await JournalTagHandlers.addAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.patch(
  "/journals/:tagId",
  createContractRoute("updateJournalTag", async (req: Request, res: Response) => {
    const result = await JournalTagHandlers.updateAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.delete(
  "/journals/:tagId",
  createContractRoute("deleteJournalTag", async (req: Request, res: Response) => {
    const result = await JournalTagHandlers.deleteAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

// Journal Entry Tag Endpoints
router.get(
  "/entries",
  createContractRoute("listJournalEntryTags", async (req: Request, res: Response) => {
    const result = await JournalEntryTagHandlers.getAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.post(
  "/entries",
  createContractRoute("createJournalEntryTag", async (req: Request, res: Response) => {
    const result = await JournalEntryTagHandlers.addAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.patch(
  "/entries/:tagId",
  createContractRoute("updateJournalEntryTag", async (req: Request, res: Response) => {
    const result = await JournalEntryTagHandlers.updateAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

router.delete(
  "/entries/:tagId",
  createContractRoute("deleteJournalEntryTag", async (req: Request, res: Response) => {
    const result = await JournalEntryTagHandlers.deleteAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  })
);

export default router;
