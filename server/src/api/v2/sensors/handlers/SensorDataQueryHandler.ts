import {
  SensorDataQueryRequest,
  validateSensorDataQueryRequest,
} from "@sproot/sproot-common/dist/api/v2/QueryTypes";
import { createDataQueryHandler } from "../../shared/DataQueryHandler";

export const sensorDataQueryHandlerAsync = createDataQueryHandler<
  SensorDataQueryRequest,
  { data: unknown; nextCursor?: string }
>(validateSensorDataQueryRequest, async (db, params) => db.sensors.getDataAsync(params));
