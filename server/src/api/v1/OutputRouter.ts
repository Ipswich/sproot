import express, { Request, Response } from "express";
import { OutputList } from "../../outputs/OutputList";
import { IState, ControlMode } from "@sproot/sproot-common/dist/outputs/OutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const result = (req.app.get("outputList") as OutputList).outputData;
  res.status(200).json({
    message: "Output information successfully retrieved",
    statusCode: 200,
    outputs: result,
    timestamp: new Date().toISOString(),
  });
});

router.post("/", async (req: Request, res: Response) => {
  if (
    !req.body?.model ||
    !req.body?.address ||
    !req.body?.pin ||
    !req.body?.isPwm == null ||
    !req.body?.isInvertedPwm == null
  ) {
    res.status(400).json({
      message: "Missing output property",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  let description, model, address, pin, isPwm, isInvertedPwm;
  try {
    description = req.body.description ? String(req.body.description) : null;
    model = String(req.body.model);
    address = String(req.body.address);
    pin = Number(req.body.pin);
    isPwm = Boolean(req.body.isPwm);
    isInvertedPwm = Boolean(req.body.isInvertedPwm);
  } catch (e) {
    res.status(400).json({
      message: "Invalid output property",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const sprootDB = req.app.get("sprootDB") as ISprootDB;

  const newOutput = {
    description,
    model,
    address,
    pin,
    isPwm,
    isInvertedPwm,
  } as SDBOutput;

  try {
    sprootDB.addOutputAsync(newOutput);
  } catch (e) {
    res.status(400).json({
      message: "Failed to add output to database, invalid request",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(201).json({
    message: "Output successfully added",
    statusCode: 201,
    timestamp: new Date().toISOString(),
  });
});

router.get("/:id", async (req: Request, res: Response) => {
  const result = (req.app.get("outputList") as OutputList)?.outputData[String(req.params["id"])];
  if (!result) {
    res.status(404).json({
      message: "No output found with that Id",
      statusCode: 404,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  res.status(200).json({
    message: "Output information successfully retrieved",
    statusCode: 200,
    output: result,
    timestamp: new Date().toISOString(),
  });
  return;
});

router.put("/:id", async (req: Request, res: Response) => {
  if (!req.params["id"]) {
    res.status(400).json({
      message: "Missing output id",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const sprootDB = req.app.get("sprootDB") as ISprootDB;
  try {
    const id = Number(req.params["id"]);
    const [output] = await sprootDB.getOutputAsync(id);
    if (!output) {
      res.status(404).json({
        message: "No sensor found with that Id",
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (req.body.description) {
      output.description = String(req.body.description);
    }
    if (req.body.model) {
      output.model = String(req.body.model);
    }
    if (req.body.address) {
      output.address = String(req.body.address);
    }
    if (req.body.pin) {
      output.pin = Number(req.body.pin);
    }
    if (req.body.isPwm != null) {
      output.isPwm = Boolean(req.body.isPwm);
    }
    if (req.body.isInvertedPwm != null) {
      output.isInvertedPwm = Boolean(req.body.isInvertedPwm);
    }
    await sprootDB.updateOutputAsync(output);
  } catch (err) {
    res.status(400).json({
      message: "Failed to update output, invalid request",
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
  if (!req.params?.["id"]) {
    res.status(400).json({
      message: "Missing output id",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const sprootDB = req.app.get("sprootDB") as ISprootDB;

  try {
    const id = Number(req.params["id"]);
    await sprootDB.deleteOutputAsync(id);
  } catch (e) {
    res.status(400).json({
      message: "Failed to delete output, invalid request",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    message: "Output successfully deleted",
    statusCode: 200,
    timestamp: new Date().toISOString(),
  });
});

router.post("/:id/control-mode", async (req: Request, res: Response) => {
  switch (req.body.controlMode) {
    case ControlMode.manual:
      (req.app.get("outputList") as OutputList).updateControlMode(
        String(req.params["id"]),
        ControlMode.manual,
      );
      break;
    case ControlMode.schedule:
      (req.app.get("outputList") as OutputList).updateControlMode(
        String(req.params["id"]),
        ControlMode.schedule,
      );
      break;
    default:
      res.status(400).json({
        message: "Invalid control mode",
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
      return;
  }
  (req.app.get("outputList") as OutputList).executeOutputState(String(req.params["id"]));
  res.status(200).json({
    message: "Control mode successfully updated",
    statusCode: 200,
    timestamp: new Date().toISOString(),
  });
});

router.post("/:id/manual-state", async (req: Request, res: Response) => {
  const outputList = req.app.get("outputList") as OutputList;
  let suggestion = "Value must be a number between 0 and 100.";
  if (typeof req.body.value == "number" && req.body.value >= 0 && req.body.value <= 100) {
    if (outputList.outputs[String(req.params["id"])]?.isPwm == false) {
      suggestion = "Output is not a PWM output, value must be 0 or 100.";
    } else {
      const state = {
        value: req.body.value,
      } as IState;
      outputList.setNewOutputState(String(req.params["id"]), state, ControlMode.manual);
      outputList.executeOutputState(String(req.params["id"]));

      res.status(200).json({
        message: "Manual state successfully updated",
        statusCode: 200,
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }
  res.status(400).json({
    message: "Invalid state data",
    statusCode: 400,
    timestamp: new Date().toISOString(),
    suggestion: suggestion,
  });
  return;
});

export default router;