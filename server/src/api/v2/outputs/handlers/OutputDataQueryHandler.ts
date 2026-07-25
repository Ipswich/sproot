import {
  OutputDataQueryRequest,
  validateOutputDataQueryRequest,
} from "@sproot/common/api/v2/QueryTypes";
import { createDataQueryHandler } from "../../shared/DataQueryHandler";

export const outputDataQueryHandlerAsync = createDataQueryHandler<
  OutputDataQueryRequest,
  { data: unknown; nextCursor?: string }
>(validateOutputDataQueryRequest, async (db, params) => db.outputs.getDataAsync(params));
