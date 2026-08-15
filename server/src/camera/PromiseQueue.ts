export class PromiseQueue {
  #tail: Promise<void> = Promise.resolve();

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.#tail;
    let release!: () => void;

    this.#tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await task();
    } finally {
      release();
    }
  }
}
