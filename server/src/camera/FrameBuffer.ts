import { PassThrough } from "stream";
import winston from "winston";
import type { Response as ExpressResponse } from "express";

export interface Subscriber {
  /** Called when a new chunk arrives */
  onChunk(chunk: Buffer): void;
  /** Called when subscriber is removed */
  onDestroy(): void;
}

export interface FrameBufferOptions {
  logger: winston.Logger;
}

/**
 * FrameBuffer provides multicast streaming capabilities.
 * It maintains a PassThrough stream that receives chunks from the upstream connection,
 * and allows Express responses to subscribe and receive those chunks.
 */
export class FrameBuffer {
  #logger: winston.Logger;
  #passThrough: PassThrough | null = null;
  #subscribers: Set<ExpressResponse> = new Set();
  #subscriberMap: Map<ExpressResponse, Subscriber> = new Map();

  constructor(options: FrameBufferOptions) {
    this.#logger = options.logger;
  }

  /**
   * Gets or creates the PassThrough stream for piping upstream data
   */
  getStream(): PassThrough {
    if (!this.#passThrough) {
      this.#passThrough = new PassThrough();
      this.#passThrough.on("data", (chunk: Buffer) => {
        this.#logger.debug(`FrameBuffer: received chunk of ${chunk.length} bytes from upstream`);
        this.#deliverChunk(chunk);
      });
      this.#passThrough.on("error", (err: Error) => {
        this.#logger.error(`FrameBuffer stream error: ${err.message}`);
      });
      this.#passThrough.on("end", () => {
        this.#logger.warn("FrameBuffer: upstream stream ended");
      });
    }
    return this.#passThrough;
  }

  /**
   * Adds a subscriber that will receive chunks as they arrive.
   */
  addSubscriber(response: ExpressResponse, subscriber: Subscriber): void {
    if (this.#subscribers.has(response)) {
      this.#logger.warn("Subscriber already registered");
      return;
    }

    this.#subscribers.add(response);
    this.#subscriberMap.set(response, subscriber);

    this.#logger.debug(
      `FrameBuffer: subscriber added, total subscribers: ${this.#subscribers.size}`,
    );
  }

  /**
   * Removes a subscriber
   */
  removeSubscriber(response: ExpressResponse): void {
    const subscriber = this.#subscriberMap.get(response);
    const removedSubscriber = this.#subscriberMap.delete(response);
    const removedResponse = this.#subscribers.delete(response);

    if (!removedSubscriber && !removedResponse) {
      return;
    }

    try {
      subscriber?.onDestroy();
    } catch (e) {
      this.#logger.warn(
        `Failed to destroy subscriber: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    this.#logger.debug(
      `FrameBuffer: subscriber removed, total subscribers: ${this.#subscribers.size}`,
    );
  }

  /**
   * Delivers a chunk to all active subscribers
   */
  #deliverChunk(chunk: Buffer): void {
    if (this.#subscribers.size === 0) {
      this.#logger.debug(`FrameBuffer: no subscribers, dropping chunk of ${chunk.length} bytes`);
      return;
    }

    const staleResponses = new Set<ExpressResponse>();

    for (const response of this.#subscribers) {
      const subscriber = this.#subscriberMap.get(response);
      if (!subscriber) {
        staleResponses.add(response);
        continue;
      }

      if (!response.writable || response.writableEnded || response.destroyed) {
        this.#logger.debug(`FrameBuffer: response not writable, removing subscriber`);
        staleResponses.add(response);
        continue;
      }

      try {
        subscriber.onChunk(chunk);
      } catch (e) {
        staleResponses.add(response);
        this.#logger.warn(
          `Failed to deliver chunk to subscriber: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    for (const response of staleResponses) {
      this.removeSubscriber(response);
    }
  }

  /**
   * Gets the number of active subscribers
   */
  getSubscriberCount(): number {
    return this.#subscribers.size;
  }

  /**
   * Checks if the stream is healthy (subscribers are receiving data)
   */
  isHealthy(): boolean {
    return this.#subscribers.size > 0;
  }
}
