import {
  OUTPUT_AGGREGATE_TABLES,
  OutputDataQueryRequest,
  OutputDataQueryResponse,
  SENSOR_AGGREGATE_TABLES,
  SensorDataQueryRequest,
  SensorDataQueryResponse,
} from "@sproot/sproot-common/dist/api/v2/QueryTypes";
import { IDataQueriesRepository } from "@sproot/sproot-common/dist/database/ISprootDB";
import { Knex } from "knex";
import { BaseKnexRepository } from "./BaseKnexRepository";

export class DataQueriesRepository extends BaseKnexRepository implements IDataQueriesRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async querySensorDataAsync(request: SensorDataQueryRequest): Promise<SensorDataQueryResponse> {
    const tableName = SENSOR_AGGREGATE_TABLES[request.downsample ?? "5m"];
    if (tableName) {
      return this.querySensorDataAggregateAsync(request, tableName);
    }
    return this.querySensorDataRawAsync(request, request.downsample ?? "5m");
  }

  async queryOutputDataAsync(request: OutputDataQueryRequest): Promise<OutputDataQueryResponse> {
    const tableName = OUTPUT_AGGREGATE_TABLES[request.downsample ?? "5m"];
    if (tableName) {
      return this.queryOutputDataAggregateAsync(request, tableName);
    }
    return this.queryOutputDataRawAsync(request, request.downsample ?? "5m");
  }
}
