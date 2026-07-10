export type ChartDataResponse<TData = any> = {
  xAxis: { field: string; values: string[] };
  data: TData[];
  nextCursor?: string;
};

export type ChartDataRequest = {
  cursor?: string;
};

export type ChartDataFetchFn<TRequest extends ChartDataRequest, TData = any> = (
  request: TRequest,
) => Promise<ChartDataResponse<TData>>;

export type MergedChartData<TData = any> = {
  xAxis: { field: string; values: string[] };
  data: TData[];
};

export type ChartDataPaginationResult<TData = any> = {
  data: MergedChartData<TData> | null;
  error: string | undefined;
};

export async function fetchPaginatedChartData<
  TRequest extends ChartDataRequest,
  TData,
>(
  fetchFn: ChartDataFetchFn<TRequest, TData>,
  initialRequest: TRequest,
): Promise<ChartDataPaginationResult<TData>> {
  let xAxisField = "time";
  let allXAxisValues: string[] = [];
  let dataMap = new Map<string | number, TData>();
  let error: string | undefined;
  let pageCount = 0;

  let currentRequest: TRequest = { ...initialRequest };
  const maxPages = 50;

  while (pageCount < maxPages) {
    pageCount++;

    let response: ChartDataResponse<TData>;

    try {
      response = await fetchFn(currentRequest);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      if (allXAxisValues.length > 0) {
        return {
          data: {
            xAxis: { field: xAxisField, values: allXAxisValues },
            data: Array.from(dataMap.values()),
          },
          error,
        };
      }
      return { data: null, error };
    }

    xAxisField = response.xAxis.field;
    const xAxisValues = response.xAxis.values;
    allXAxisValues = [...allXAxisValues, ...xAxisValues];

    for (const item of response.data) {
      const key = (item as Record<string, unknown>)["id"] as
        string | number | undefined;
      if (key == null) continue;

      const existing = dataMap.get(key);
      if (existing) {
        // Merge statistics arrays from this page into the existing entry
        const existingEntry = existing as Record<string, unknown>;
        const newItem = item as Record<string, unknown>;
        const existingStats = existingEntry["statistics"] as Record<
          string,
          (number | null)[]
        >;
        const newStats = newItem["statistics"] as Record<
          string,
          (number | null)[]
        >;

        if (existingStats && newStats) {
          for (const agg of Object.keys(newStats)) {
            if (agg in existingStats) {
              (existingStats[agg] as (number | null)[]) = [
                ...(existingStats[agg] as (number | null)[]),
                ...(newStats[agg] as (number | null)[]),
              ];
            } else {
              existingStats[agg] = [...newStats[agg]!];
            }
          }
        }
      } else {
        dataMap.set(key, item);
      }
    }

    if (!response.nextCursor) {
      break;
    }

    currentRequest = { ...currentRequest, cursor: response.nextCursor };
  }

  const result: ChartDataPaginationResult<TData> = {
    data: {
      xAxis: { field: xAxisField, values: allXAxisValues },
      data: Array.from(dataMap.values()),
    },
    error: undefined,
  };
  if (error) {
    result.error = error;
  }
  return result;
}
