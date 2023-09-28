import express, { Request, Response } from "express"
import { PCA9685 } from "../../outputs/PCA9685";

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

export default router;