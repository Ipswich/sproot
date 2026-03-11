import * as JournalEntriesHandlers from "./handlers/JournalEntriesHandlers";
import * as JournalEntriesDataHandlers from "./handlers/JournalEntriesDataHandlers";
import express, { Request, Response } from "express";
const router = express.Router();

// Journal Entry Endpoints
router.get("/", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.getAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.get("/:entryId", async (req: Request, res: Response) => {
  const result = await JournalEntriesHandlers.getAsync(req, res);
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

// Journal Entry Device Data Endpoints
router.get("/:entryId/sensor-data", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.getSensorDataAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.get("/:entryId/output-data", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.getOutputDataAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.put("/:entryId/sensor-data", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.putSensorDataAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.put("/:entryId/output-data", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.putOutputDataAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/:entryId/sensor-data/:sensorId", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.deleteSensorDataAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.delete("/:entryId/output-data/:outputId", async (req: Request, res: Response) => {
  const result = await JournalEntriesDataHandlers.deleteOutputDataAsync(req, res);
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
