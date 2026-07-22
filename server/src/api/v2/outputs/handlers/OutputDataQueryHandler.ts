import {
  OutputDataQueryRequest,
  validateOutputDataQueryRequest,
} from "@sproot/sproot-common/dist/api/v2/QueryTypes";
import { createDataQueryHandler } from "../../shared/DataQueryHandler";

export const outputDataQueryHandlerAsync = createDataQueryHandler<
  OutputDataQueryRequest,
  { data: unknown; nextCursor?: string }
>(validateOutputDataQueryRequest, async (db, params) => db.dataQueries.queryOutputDataAsync(params));
