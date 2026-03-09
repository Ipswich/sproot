import * as JournalsHandlers from "./handlers/JournalsHandlers";
import * as JournalEntriesHandlers from "./handlers/JournalEntriesHandlers";
import * as JournalEntriesDataHandlers from "./handlers/JournalEntriesDataHandlers";
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

// Journal Entry Endpoints
router.get("/:journalId/entries", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.getAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.get("/:journalId/entries/:entryId", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.getAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.post("/:journalId/entries", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.addAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.patch("/:journalId/entries/:entryId", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.updateAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/:journalId/entries/:entryId", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.deleteAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

// Journal Entry Device Data Endpoints
router.get("/:journalId/entries/:entryId/sensor-data", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.getSensorDataAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.get("/:journalId/entries/:entryId/output-data", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.getOutputDataAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.put("/:journalId/entries/:entryId/sensor-data", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.putSensorDataAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.put("/:journalId/entries/:entryId/output-data", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.putOutputDataAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete(
  "/:journalId/entries/:entryId/sensor-data/:sensorId",
  async (req: Request, res: Response) => {
    const result = await JournalEntriesDataHandlers.deleteSensorDataAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  },
);

router.delete(
  "/:journalId/entries/:entryId/output-data/:outputId",
  async (req: Request, res: Response) => {
    const result = await JournalEntriesDataHandlers.deleteOutputDataAsync(req, res);
    res.status(result.statusCode).json(result);
    return;
  },
);

export default router;
