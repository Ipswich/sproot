import { Request, Response } from "express"
import { SensorList } from "../sensors/SensorList"


class SensorController {
    static getSensor = async (req: Request, res: Response) => {
      if (req.params["sensorId"]) {
        const result = (req.app.get('sensorList') as SensorList)?.sensors[String(req.params["sensorId"])]
        if (!result){
          res.send({error : "No sensor found with that id"})
        }
        res.send(result);
      }
      else {
        res.send({error : "No sensorId provided"})
      }
    }

    static getAllSensorData = async (req: Request, res: Response) => {
        const result = (req.app.get('sensorList') as SensorList)?.sensors;
        res.send(result);
    }
};

export { SensorController }