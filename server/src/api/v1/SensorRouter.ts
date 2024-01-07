import { ChartData } from "@sproot/sproot-common/dist/api/ChartData";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/SensorBase";
import { SensorList } from "../../sensors/SensorList";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import express, { Request, Response } from "express";
import winston from "winston";

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

router.get("/chart-data", async (req: Request, res: Response) => {
  const logger = req.app.get("logger") as winston.Logger;
  logger.info("GETTED");
  let offset, limit;
  if (req.query["offset"] && req.query["limit"]) {
    offset = parseInt(req.query["offset"] as string);
    limit = parseInt(req.query["limit"] as string);
    if (isNaN(offset) || isNaN(limit)) {
      logger.http("GET /api/v1/sensors/chart-data - 400, Invalid request");
      res.status(400).json({
        message: "Failed to retrieve chart data, invalid request",
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }
  const sensorList = req.app.get("sensorList") as SensorList;
  try {
    logger.http("GET /api/v1/sensors/chart-data - 200, Success");
    const chartData = sensorList.chartData;
    if (offset != undefined && offset != null && limit != undefined && limit != null) {
      const result: Record<string, ChartData[]> = {};
      for (const key in chartData) {
        result[key as ReadingType] = chartData[key as ReadingType]!.slice(offset, offset + limit);
      }
      let moreChartDataAvailable = true;
      for (const key in chartData) {
        if (chartData[key as ReadingType]!.length <= offset + limit) {
          moreChartDataAvailable = false;
          break;
        }
      }
      res.status(200).json({
        message: "Chart data successfully retrieved",
        statusCode: 200,
        result,
        moreChartDataAvailable,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(200).json({
      message: "Chart data successfully retrieved",
      statusCode: 200,
      chartData: sensorList.chartData,
      timestamp: new Date().toISOString(),
    });
    return;
  } catch (e) {
    logger.http("GET /api/v1/sensors/chart-data - 400, Invalid request");
    res.status(400).json({
      message: "Failed to retrieve chart data, invalid request",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  if (!req.body?.model || !req.body?.address) {
    res.status(400).json({
      message: "Missing model or address",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  let name, model, address;
  try {
    name = req.body.name ? String(req.body.name) : null;
    model = String(req.body.model);
    address = String(req.body.address);
  } catch (e) {
    res.status(400).json({
      message: "Invalid model or address",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const sprootDB = req.app.get("sprootDB") as ISprootDB;
  const newSensor = {
    name,
    model,
    address,
  } as SDBSensor;

  try {
    sprootDB.addSensorAsync(newSensor);
  } catch (e) {
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
  const result = (req.app.get("sensorList") as SensorList)?.sensorData[String(req.params["id"])];
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

router.put("/:id", async (req: Request, res: Response) => {
  if (!req.params["id"]) {
    res.status(400).json({
      message: "Missing sensor id",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const sprootDB = req.app.get("sprootDB") as ISprootDB;

  try {
    const id = Number(req.params["id"]);
    const [sensor] = await sprootDB.getSensorAsync(id);
    if (!sensor) {
      res.status(404).json({
        message: "No sensor found with that Id",
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (req.body.name) {
      sensor.name = String(req.body.name);
    }
    if (req.body.model) {
      sensor.model = String(req.body.model);
    }
    if (req.body.address) {
      sensor.address = String(req.body.address);
    }
    await sprootDB.updateSensorAsync(sensor);
  } catch (e) {
    res.status(400).json({
      message: "Failed to update sensor, invalid request",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    message: "Sensor successfully updated",
    statusCode: 200,
    timestamp: new Date().toISOString(),
  });
});

router.delete("/:id", async (req: Request, res: Response) => {
  if (!req.params["id"]) {
    res.status(400).json({
      message: "Missing sensor id",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const sprootDB = req.app.get("sprootDB") as ISprootDB;

  try {
    const id = Number(req.params["id"]);
    await sprootDB.deleteSensorAsync(id);
  } catch (e) {
    res.status(400).json({
      message: "Failed to delete sensor, invalid request",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    message: "Sensor successfully deleted",
    statusCode: 200,
    timestamp: new Date().toISOString(),
  });
});

router.get("/:id/readings", async (req: Request, res: Response) => {
  const logger = req.app.get("logger") as winston.Logger;
  let offset, limit;
  if (req.query["offset"] && req.query["limit"]) {
    offset = parseInt(req.query["offset"] as string);
    limit = parseInt(req.query["limit"] as string);
    if (isNaN(offset) || isNaN(limit)) {
      logger.http("GET /api/v1/sensors/:id/readings - 400, Invalid request");
      res.status(400).json({
        message: "Failed to retrieve sensor readings, invalid request",
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }
  if (!req.params["id"]) {
    logger.http("GET /api/v1/sensors/:id/readings - 400, Missing sensor id");
    res.status(400).json({
      message: "Missing sensor id",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const sensorList = req.app.get("sensorList") as SensorList;
  try {
    const id = Number(req.params["id"]);
    const sensor = sensorList.sensors[id];
    if (!sensor) {
      logger.http("GET /api/v1/sensors/:id/readings - 404, No sensor found");
      res.status(404).json({
        message: "No sensor found with that Id",
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.http("GET /api/v1/sensors/:id/readings - 200, Success");
    const readings = sensor.getCachedReadings();
    if (offset != undefined && offset != null && limit != undefined && limit != null) {
      const result: Record<string, SDBReading[]> = {};
      for (const key in readings) {
        result[key] = readings[key as ReadingType]!.slice(offset, offset + limit);
      }
      let moreReadingsAvailable = true;
      for (const key in readings) {
        if (readings[key as ReadingType]!.length <= offset + limit) {
          moreReadingsAvailable = false;
          break;
        }
      }
      res.status(200).json({
        message: "Sensor readings successfully retrieved",
        statusCode: 200,
        result,
        moreReadingsAvailable,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(200).json({
      message: "Sensor readings successfully retrieved",
      statusCode: 200,
      readings: sensor.getCachedReadings(),
      timestamp: new Date().toISOString(),
    });
    return;
  } catch (e) {
    logger.http("GET /api/v1/sensors/:id/readings - 400, Invalid request");
    res.status(400).json({
      message: "Failed to retrieve sensor readings, invalid request",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
  }
});


export default router;
