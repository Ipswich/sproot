import express, { Request, Response } from "express";
import { OutputList } from "../../outputs/OutputList";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import ModelList from "../../outputs/ModelList";

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

router.get("/supported-models", async (req: Request, res: Response) => {
  const logger = req.app.get("logger") as winston.Logger;
  const result = Object.values(ModelList);
  logger.http("GET /api/v1/outputs/supported-models - 200, Success");
  res.status(200).json({
    message: "Supported output models successfully retrieved",
    statusCode: 200,
    supportedModels: result,
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

  let name, model, address, pin, isPwm, isInvertedPwm;
  try {
    name = req.body.name ? String(req.body.name) : null;
    model = String(req.body.model);
    address = String(req.body.address);
    pin = Number(req.body.pin);
    isPwm = Boolean(req.body.isPwm);
    isInvertedPwm = Boolean(req.body.isInvertedPwm);
  } catch (e) {
    res.status(400).json({
      message: "Invalid output property",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const sprootDB = req.app.get("sprootDB") as ISprootDB;

  const newOutput = {
    name,
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
    if (req.body.name) {
      output.name = String(req.body.name);
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
    if (
      req.body.value > 0 &&
      req.body.value < 100 &&
      outputList.outputs[String(req.params["id"])]?.isPwm == false
    ) {
      suggestion = "Output is not a PWM output, value must be 0 or 100.";
    } else {
      const state = {
        value: req.body.value,
        logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      } as SDBOutputState;
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
