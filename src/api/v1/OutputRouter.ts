import express, { Request, Response } from "express"
import { PCA9685 } from "../../outputs/PCA9685";
import { ControlMode, State } from "../../outputs/types/OutputBase";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const result = (req.app.get('pca9685') as PCA9685).outputData;
  res.status(200).json({
    message: "Output information successfully retrieved",
    statusCode: 200,
    outputs: result,
    timestamp: new Date().toISOString()
  });
});

router.get('/:id', async (req: Request, res: Response) => {
  const result = (req.app.get('pca9685') as PCA9685)?.outputData[String(req.params["id"])];
  if (!result) {
    res.status(404).json({
      message: "No output found with that Id",
      statusCode: 404,
      timestamp: new Date().toISOString()
    })
    return;
  }
  res.status(200).json({
    message: "Output information successfully retrieved",
    statusCode: 200,
    output: result,
    timestamp: new Date().toISOString()
  });
  return;
});

router.post('/:id/control-mode', async (req: Request, res: Response) => {
  switch (req.body.controlMode) {
    case ControlMode.manual:
      (req.app.get('pca9685') as PCA9685).updateControlMode(String(req.params["id"]), ControlMode.manual);
      break;
    case ControlMode.schedule:
      (req.app.get('pca9685') as PCA9685).updateControlMode(String(req.params["id"]), ControlMode.schedule);
      break;
      default:
        res.status(400).json({
          message: "Invalid control mode",
          statusCode: 400,
          timestamp: new Date().toISOString()
        });
        return;
      }
  (req.app.get('pca9685') as PCA9685).executeOutputState(String(req.params["id"]));
  res.status(200).json({
    message: "Control mode successfully updated",
    statusCode: 200,
    timestamp: new Date().toISOString()
  });
});

router.post('/:id/manual-state', async (req: Request, res: Response) => {
  if (typeof(req.body.isOn) == "boolean" && typeof(req.body.value) == "number" && req.body.value >= 0 && req.body.value <= 100) {
    const state = {
      isOn: req.body.isOn,
      value: req.body.value
    } as State;

    (req.app.get('pca9685') as PCA9685).setNewOutputState(String(req.params["id"]), state, ControlMode.manual);
    res.status(200).json({
      message: "Manual state successfully updated",
      statusCode: 200,
      timestamp: new Date().toISOString()
    });
    return;
  }
  res.status(400).json({
    message: "Invalid state data",
    statusCode: 400,
    timestamp: new Date().toISOString()
  });
  return;
});

export default router;