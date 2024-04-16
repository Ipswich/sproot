class QueueCache<T> {
  cache: T[];
  readonly limit: number;

  constructor(limit: number, cache?: T[]) {
    this.limit = limit;

    if (cache) {
      this.cache = cache;
    } else {
      this.cache = [];
    }

    while (this.cache.length > this.limit) {
      this.cache.shift();
    }
  }

  public addData(data: T): void {
    this.cache.push(data);
    while (this.cache.length > this.limit) {
      this.cache.shift();
    }
  }

  public clear(): void {
    this.cache = [];
  }

  public get(offset?: number, limit?: number): T[] {
    if (offset == null || !limit) {
      if (limit) {
        return this.cache.slice(undefined, limit);
      }
      return this.cache;
    }
    if (offset < 0 || limit < 1 || offset > this.cache.length) {
      return [];
    }

    return this.cache.slice(offset, offset + limit);
  }
}

interface IQueueCacheable<T> {
  queueCache: Record<string | number | symbol, QueueCache<T>> | QueueCache<T>;
}

export { QueueCache };
export type { IQueueCacheable };
