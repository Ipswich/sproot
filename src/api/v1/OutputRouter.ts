import express, { Request, Response } from "express"
import { OutputList } from "../../outputs/OutputList";
import { IState, ControlMode } from "../../outputs/types/OutputBase";

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const result = (req.app.get('outputList') as OutputList).outputData;
  res.status(200).json({
    message: "Output information successfully retrieved",
    statusCode: 200,
    outputs: result,
    timestamp: new Date().toISOString()
  });
});

router.get('/:id', async (req: Request, res: Response) => {
  const result = (req.app.get('outputList') as OutputList)?.outputData[String(req.params["id"])];
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
      (req.app.get('outputList') as OutputList).updateControlMode(String(req.params["id"]), ControlMode.manual);
      break;
    case ControlMode.schedule:
      (req.app.get('outputList') as OutputList).updateControlMode(String(req.params["id"]), ControlMode.schedule);
      break;
      default:
        res.status(400).json({
          message: "Invalid control mode",
          statusCode: 400,
          timestamp: new Date().toISOString()
        });
        return;
      }
  (req.app.get('outputList') as OutputList).executeOutputState(String(req.params["id"]));
  res.status(200).json({
    message: "Control mode successfully updated",
    statusCode: 200,
    timestamp: new Date().toISOString()
  });
});

router.post('/:id/manual-state', async (req: Request, res: Response) => {
  const outputList = req.app.get('outputList') as OutputList;
  let suggestion = "Value must be a number between 0 and 100.";
  if (typeof(req.body.value) == "number" && req.body.value >= 0 && req.body.value <= 100){
    if (outputList.outputs[String(req.params["id"])]?.isPwm == false) {
      suggestion = "Output is not a PWM output, value must be 0 or 100.";
    } else {
      const state = {
        value: req.body.value
      } as IState;
      outputList.setNewOutputState(String(req.params["id"]), state, ControlMode.manual);
      outputList.executeOutputState(String(req.params["id"]));

      res.status(200).json({
        message: "Manual state successfully updated",
        statusCode: 200,
        timestamp: new Date().toISOString()
      });
      return;
    }
  }
  res.status(400).json({
    message: "Invalid state data",
    statusCode: 400,
    timestamp: new Date().toISOString(),
    suggestion: suggestion
  });
  return;
});

export default router;