import { Express, Request, Response, NextFunction } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import addDefaultProperties, {
  createDefaultProperties,
} from "./middleware/DefaultResponseProperties";
import { authorize } from "./middleware/Authorize";
import authenticationRouter from "./authentication/AuthenticationRouter";
import pingRouter from "./ping/PingRouter";
import systemRouter from "./system/SystemRouter";
import sensorsRouter from "./sensors/SensorsRouter";
import outputsRouter from "./outputs/OutputsRouter";
import automationsRouter from "./automations/AutomationsRouter";
import outputActionsRouter from "./automations/OutputActionRouter";
import cameraRouter from "./camera/CameraRouter";
import subcontrollersRouter from "./subcontrollers/SubcontrollersRouter";
import deviceZoneRotuer from "./devicezones/DeviceZoneRouter";

const spec_path = "../api_spec/openapi_v2.yaml";

const openapi_v2_doc = YAML.load(spec_path);
const swaggerUiOptions = {
  swaggerOptions: { defaultModelsExpandDepth: -1 },
};
const authenticateMiddleware = authorize(
  process.env["AUTHENTICATION_ENABLED"]!,
  process.env["JWT_SECRET"]!,
);

function ApiRootV2(app: Express) {
  const logger = app.get("logger");

  app.use(
    "/api/v2/docs",
    swaggerUi.serveFiles(openapi_v2_doc, swaggerUiOptions),
    swaggerUi.setup(openapi_v2_doc),
  );

  // OpenAPI Validator
  app.use(
    OpenApiValidator.middleware({
      apiSpec: spec_path,
      validateRequests: true,
      validateResponses: true,
      validateSecurity: process.env["AUTHENTICATION_ENABLED"]!.toLowerCase() === "true",
    }),
  );

  app.use("/api/v2/", addDefaultProperties);
  app.use("/api/v2/ping", pingRouter);
  app.use("/api/v2/system", authenticateMiddleware, systemRouter);

  app.use(
    "/api/v2/authenticate",
    authenticationRouter(
      process.env["AUTHENTICATION_ENABLED"]!,
      parseInt(process.env["JWT_EXPIRATION"]!),
      process.env["JWT_SECRET"]!,
    ),
  );

  // The real data routes
  app.use("/api/v2/sensors", authenticateMiddleware, sensorsRouter);
  app.use("/api/v2/outputs", authenticateMiddleware, outputsRouter);
  app.use("/api/v2/automations", authenticateMiddleware, automationsRouter);
  app.use("/api/v2/output-actions", authenticateMiddleware, outputActionsRouter);
  app.use("/api/v2/camera", authenticateMiddleware, cameraRouter);
  app.use("/api/v2/subcontrollers", authenticateMiddleware, subcontrollersRouter);
  app.use("/api/v2/device-zones", authenticateMiddleware, deviceZoneRotuer);

  // Error handler - anything unexpected ends up here.
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // format error
    const errorResponse = {
      statusCode: err.status ?? 500,
      error: {
        request: {
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          query: req.query,
        },
        name: err.name ?? "Internal Server Error",
        url: req.originalUrl,
        details: err.errors ?? [],
      },
      ...(res.locals["defaultProperties"] ?? createDefaultProperties()),
    };

    // Log 500s
    if (err.status === 500) {
      logger.error(JSON.stringify(errorResponse));
    }

    res.status(err.status ?? 500).json(errorResponse);
  });
}

export default ApiRootV2;
