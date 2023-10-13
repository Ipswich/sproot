import express, { Request, Response } from "express";
import { SensorList } from "../../sensors/SensorList";
import { ISprootDB } from "../../database/types/ISprootDB";
import { SDBSensor } from "../../database/types/SDBSensor";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const result = (req.app.get("sensorList") as SensorList)?.sensorData;
  res.status(200).json({
    message: "Sensor information successfully retrieved",
    statusCode: 200,
    sensors: result,
    timestamp: new Date().toISOString(),
  });
});

router.post("/", async (req: Request, res: Response) => {
  if(!req.body?.model || !req.body?.address) {
    res.status(400).json({
      message: "Missing model or address",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  let description, model, address;
  try {
    description = req.body.description ? String(req.body.description) : null;
    model = String(req.body.model);
    address = String(req.body.address);
  } catch(e) {
    res.status(400).json({
      message: "Invalid model or address",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  const sprootDB = req.app.get("sprootDB") as ISprootDB;
  const newSensor = {
    description,
    model,
    address,
  } as SDBSensor;

  try {
    sprootDB.addSensorAsync(newSensor);
  } catch(e) {
    res.status(400).json({
      message: "Failed to add sensor to database, invalid request",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(201).json({
    message: "Sensor successfully added",
    statusCode: 201,
    timestamp: new Date().toISOString(),
  });
});

router.get("/:id", async (req: Request, res: Response) => {
  const result = (req.app.get("sensorList") as SensorList)?.sensorData[
    String(req.params["id"])
  ];
  if (!result) {
    res.status(404).json({
      message: "No sensor found with that Id",
      statusCode: 404,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  res.status(200).json({
    message: "Sensor information successfully retrieved",
    statusCode: 200,
    sensor: result,
    timestamp: new Date().toISOString(),
  });
  return;
});

export default router;
