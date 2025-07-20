class QueueCache<T> {
  cache: T[];
  readonly maxSize: number;

  constructor(maxSize: number, cache?: T[]) {
    this.maxSize = maxSize;

    if (cache) {
      this.cache = cache;
    } else {
      this.cache = [];
    }

    while (this.cache.length > this.maxSize) {
      this.cache.shift();
    }
  }

  public addData(data: T): void {
    this.cache.push(data);
    while (this.cache.length > this.maxSize) {
      this.cache.shift();
    }
  }

  public clear(): void {
    this.cache = [];
  }

  public get(offset?: number, limit?: number): T[] {
    if (offset == undefined || limit == undefined) {
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

  public length(): number {
    return this.cache.length;
  }
}

interface IQueueCacheable<T> {
  queueCache: Record<string | number | symbol, QueueCache<T>> | QueueCache<T>;
}

export { QueueCache };
export type { IQueueCacheable };
