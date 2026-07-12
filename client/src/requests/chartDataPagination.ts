export type ChartDataResponse<TData = any> = {
  xAxis: { field: string; values: string[] };
  data: TData | null;
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

    if (response.data != null) {
      const item = response.data;
      const key = (item as Record<string, unknown>)["id"] as
        string | number | undefined;
      if (key != null) {
        const existing = dataMap.get(key);
        if (existing) {
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

export async function fetchFanOutPaginatedChartData<
  TRequest extends ChartDataRequest,
  TData,
>(
  fetchFn: ChartDataFetchFn<TRequest, TData>,
  initialRequest: TRequest,
  ids: number[],
  maxConcurrent: number = 5,
): Promise<ChartDataPaginationResult<TData>> {
  if (ids.length === 0) {
    return { data: null, error: undefined };
  }

  // Build per-ID request templates (without cursor)
  const perIdRequests = ids.map((id) => ({
    ...initialRequest,
    id,
  }));

  let xAxisField = "time";
  let allXAxisValues: string[] = [];
  let dataMap = new Map<string | number, TData>();
  let error: string | undefined;
  let pageCount = 0;

  // Cursor state per ID
  const cursors = new Map<number, string>();

  while (true) {
    pageCount++;

    // Fan out requests in bounded parallel batches
    const batches: Array<{ req: typeof perIdRequests[0]; index: number }>[] = [];
    for (let i = 0; i < perIdRequests.length; i += maxConcurrent) {
      batches.push(perIdRequests.slice(i, i + maxConcurrent).map((req, j) => ({ req, index: i + j })));
    }

    const allResults: PromiseSettledResult<ChartDataResponse<TData>>[] = [];
    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(({ req, index }) => {
          const cursor = cursors.get(ids[index]!);
          return fetchFn({
            ...req,
            ...(cursor ? { cursor } : {}),
          } as TRequest & { cursor?: string });
        }),
      );
      for (let b = 0; b < batch.length; b++) {
        allResults[batch[b]!.index] = batchResults[b]!;
      }
    }

    const results = allResults;

    let anyHasMore = false;

    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;

      if (result.status === "rejected") {
        const err = result.reason as Error;
        const message = err instanceof Error ? err.message : "Unknown error";
        if (!error) {
          error = message;
        }
        continue;
      }

      const response = result.value!;
      const hasMore = !!response.nextCursor;
      if (hasMore) {
        cursors.set(ids[i]!, response.nextCursor!);
        anyHasMore = true;
      } else {
        cursors.delete(ids[i]!);
      }

      // Merge xAxis from first successful response
      if (allXAxisValues.length === 0) {
        xAxisField = response.xAxis.field;
        allXAxisValues = [...response.xAxis.values];
      }

      // Merge data entries
      if (response.data != null) {
        const item = response.data;
        const key = (item as Record<string, unknown>)["id"] as
          | string
          | number
          | undefined;
        if (key != null) {
          const existing = dataMap.get(key);
          if (existing) {
            const existingEntry = existing as Record<string, unknown>;
            const newItem = item as Record<string, unknown>;
            const existingStats = existingEntry[
              "statistics"
            ] as Record<string, (number | null)[]>;
            const newStats = newItem[
              "statistics"
            ] as Record<string, (number | null)[]>;

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
      }
    }

    if (!anyHasMore) {
      break;
    }

    // Safety cap
    if (pageCount >= 50) {
      break;
    }
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
