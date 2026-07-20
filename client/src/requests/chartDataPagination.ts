export type ChartDataResponse<TData = unknown> = {
  xAxis: { field: string; values: string[] };
  data: TData | null;
  nextCursor?: string;
};

export type ChartDataRequest = {
  cursor?: string;
};

export type ChartDataFetchFn<
  TRequest extends ChartDataRequest,
  TData = unknown,
> = (request: TRequest) => Promise<ChartDataResponse<TData>>;

export type MergedChartData<TData = unknown> = {
  xAxis: { field: string; values: string[] };
  data: TData[];
};

export type ChartDataPaginationResult<TData = unknown> = {
  data: MergedChartData<TData> | null;
  error: string | undefined;
};

type ChartStatisticValue = number | null;

type ChartDataEntry = {
  id?: string | number;
  statistics?: Record<string, ChartStatisticValue[]>;
} & Record<string, unknown>;

type NormalizedChartDataEntry<TData> = {
  template: TData;
  statisticsByAggregate: Map<string, Map<string, ChartStatisticValue>>;
};

function mergeChartDataPage<TData>(
  response: ChartDataResponse<TData>,
  timestampValues: Set<string>,
  dataMap: Map<string | number, NormalizedChartDataEntry<TData>>,
): void {
  for (const timestamp of response.xAxis.values) {
    timestampValues.add(timestamp);
  }

  if (response.data == null) {
    return;
  }

  const item = response.data as ChartDataEntry;
  const key = item["id"] as string | number | undefined;
  if (key == null) {
    return;
  }

  let normalizedEntry = dataMap.get(key);
  if (!normalizedEntry) {
    normalizedEntry = {
      template: response.data,
      statisticsByAggregate: new Map(),
    };
    dataMap.set(key, normalizedEntry);
  }

  const statistics = item["statistics"];
  if (!statistics) {
    return;
  }

  for (const [aggregate, values] of Object.entries(statistics)) {
    let valuesByTimestamp =
      normalizedEntry.statisticsByAggregate.get(aggregate);
    if (!valuesByTimestamp) {
      valuesByTimestamp = new Map<string, ChartStatisticValue>();
      normalizedEntry.statisticsByAggregate.set(aggregate, valuesByTimestamp);
    }

    for (const [index, timestamp] of response.xAxis.values.entries()) {
      const value = values[index];
      if (value !== undefined) {
        valuesByTimestamp.set(timestamp, value);
      }
    }
  }
}

function buildMergedChartData<TData>(
  xAxisField: string,
  timestampValues: Set<string>,
  dataMap: Map<string | number, NormalizedChartDataEntry<TData>>,
): MergedChartData<TData> {
  const sortedTimestamps = Array.from(timestampValues).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return {
    xAxis: { field: xAxisField, values: sortedTimestamps },
    data: Array.from(dataMap.values()).map(
      ({ template, statisticsByAggregate }) => {
        const baseEntry = template as ChartDataEntry;
        const statistics: Record<string, ChartStatisticValue[]> = {};

        for (const [
          aggregate,
          valuesByTimestamp,
        ] of statisticsByAggregate.entries()) {
          statistics[aggregate] = sortedTimestamps.map((timestamp) => {
            const value = valuesByTimestamp.get(timestamp);
            return value === undefined ? null : value;
          });
        }

        return {
          ...baseEntry,
          statistics,
        } as TData;
      },
    ),
  };
}

export async function fetchPaginatedChartData<
  TRequest extends ChartDataRequest,
  TData,
>(
  fetchFn: ChartDataFetchFn<TRequest, TData>,
  initialRequest: TRequest,
): Promise<ChartDataPaginationResult<TData>> {
  let xAxisField = "time";
  const allXAxisValues = new Set<string>();
  const dataMap = new Map<string | number, NormalizedChartDataEntry<TData>>();
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
      if (allXAxisValues.size > 0) {
        return {
          data: buildMergedChartData(xAxisField, allXAxisValues, dataMap),
          error,
        };
      }
      return { data: null, error };
    }

    xAxisField = response.xAxis.field;
    mergeChartDataPage(response, allXAxisValues, dataMap);

    if (!response.nextCursor) {
      break;
    }

    currentRequest = { ...currentRequest, cursor: response.nextCursor };
  }

  const result: ChartDataPaginationResult<TData> = {
    data: buildMergedChartData(xAxisField, allXAxisValues, dataMap),
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
  const allXAxisValues = new Set<string>();
  const dataMap = new Map<string | number, NormalizedChartDataEntry<TData>>();
  let error: string | undefined;
  let pageCount = 0;

  // Cursor state per ID
  const cursors = new Map<number, string>();

  for (;;) {
    pageCount++;

    // Fan out requests in bounded parallel batches
    const batches: Array<{ req: (typeof perIdRequests)[0]; index: number }>[] =
      [];
    for (let i = 0; i < perIdRequests.length; i += maxConcurrent) {
      batches.push(
        perIdRequests
          .slice(i, i + maxConcurrent)
          .map((req, j) => ({ req, index: i + j })),
      );
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

      xAxisField = response.xAxis.field;
      mergeChartDataPage(response, allXAxisValues, dataMap);
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
    data: buildMergedChartData(xAxisField, allXAxisValues, dataMap),
    error: undefined,
  };
  if (error) {
    result.error = error;
  }
  return result;
}
