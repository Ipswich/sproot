import express, { Request, Response } from "express"
import { SensorList } from "../../sensors/SensorList"

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const result = (req.app.get('sensorList') as SensorList)?.sensors;
  res.status(200).json({
    message: "Sensor information successfully retrieved",
    statusCode: 200,
    sensors: result,
    timestamp: new Date().toISOString()
  });
});

router.get('/:id', async (req: Request, res: Response) => {
    const result = (req.app.get('sensorList') as SensorList)?.sensors[String(req.params["id"])]
    if (!result) {
      res.status(404).json({
        message: "No sensor found with that Id",
        statusCode: 404,
        timestamp: new Date().toISOString()
      })
      return;
    }
    res.status(200).json({
      message: "Sensor information successfully retrieved",
      statusCode: 200,
      sensor: result,
      timestamp: new Date().toISOString()
    });
    return;
});

export default router;