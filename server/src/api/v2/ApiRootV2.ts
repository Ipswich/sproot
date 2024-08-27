import { Express, Request, Response, NextFunction } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import addDefaultProperties, {
  createDefaultProperties,
} from "./middleware/DefaultResponseProperties";
import { authorize } from "./middleware/Authorize";
import authenticationRouter from "./authentication/authenticationRouter";
import pingRouter from "./ping/PingRouter";
import sensorsRouter from "./sensors/SensorsRouter";
import outputsRouter from "./outputs/OutputsRouter";

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
  let logger = app.get("logger");

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

  app.use(
    "/api/v2/authenticate",
    authenticationRouter(
      process.env["AUTHENTICATION_ENABLED"]!,
      parseInt(process.env["JWT_EXPIRATION"]!),
      process.env["JWT_SECRET"]!,
    ),
  );

  // The real data routes
  app.use((req: Request, _res: Response, next: NextFunction) => {console.log(req.method, req.url); next();});
  app.use("/api/v2/sensors", authenticateMiddleware, sensorsRouter);
  app.use("/api/v2/outputs", authenticateMiddleware, outputsRouter);

  // Error handler - anything unexpected ends up here.
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // format error
    let errorResponse = {
      statusCode: err.status ?? 500,
      error: {
        name: err.name ?? "Internal Server Error",
        url: req.originalUrl,
        details: err.errors ?? [],
      },
      ...(res.locals["defaultProperties"] ?? createDefaultProperties()),
    };

    // Log 500s
    if (err.status === 500 ?? err.status === undefined) {
      logger.error(JSON.stringify(errorResponse));
    }

    res.status(err.status ?? 500).json(errorResponse);
  });
}

export default ApiRootV2;
