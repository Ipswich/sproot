import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import login, { authenticate } from "./middleware/Authentication";
import sensorRouter from "./SensorRouter";
import outputRouter from "./OutputRouter";
import homeRouter from "./HomeRouter";

const spec_path = "../api_spec/openapi_v1.yaml";

function ApiRootV1(app: Express) {
  app.use("/api/v1/authenticate", login);
  app.use("/api/v1/", homeRouter);
  app.use("/api/v1/sensors", authenticate, sensorRouter);
  app.use("/api/v1/outputs", authenticate, outputRouter);

  const openapi_v1_doc = YAML.load(spec_path);

  app.use(
    "/api/v1/docs",
    swaggerUi.serveFiles(openapi_v1_doc, {
      swaggerOptions: { defaultModelsExpandDepth: -1 },
    }),
    swaggerUi.setup(openapi_v1_doc),
  );
}

export default ApiRootV1;
