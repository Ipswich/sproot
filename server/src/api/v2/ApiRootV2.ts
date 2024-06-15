import { Express, Request, Response, NextFunction } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import addDefaultProperties, {
  createDefaultProperties,
} from "./middleware/DefaultResponseProperties";
import login from "./middleware/Authentication";
import pingRouter from "./ping/PingRouter";
import sensorsRouter from "./sensors/SensorsRouter";

function ApiRootV2(app: Express) {
  let logger = app.get("logger");

  // OpenAPI Validator
  let openApiValidator = OpenApiValidator.middleware({
    apiSpec: "../openapi_v2.yaml",
    validateRequests: true,
    validateResponses: true,
  });
  app.use("/api/v2/docs", swaggerUi.serve, swaggerUi.setup(YAML.load("../openapi_v2.yaml")));

  app.use("/api/v2/authenticate", openApiValidator, addDefaultProperties, login);
  app.use("/api/v2/ping", openApiValidator, addDefaultProperties, pingRouter);

  app.use("/api/v2/sensors", openApiValidator, addDefaultProperties, sensorsRouter);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // format error
    let errorResponse = {
      statusCode: err.status ?? 500,
      error: {
        name: err.name ?? "Internal Server Error",
        fullPath: req.originalUrl,
        details: err.errors ?? [],
      },
      ...(res.locals["defaultProperties"] ?? createDefaultProperties()),
    };

    // Log 500s
    if (err.status === 500 ?? err.status === undefined) {
      logger.error(errorResponse);
    }

    res.status(err.status ?? 500).json(errorResponse);
  });
}

export default ApiRootV2;
