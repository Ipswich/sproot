import { Transform, TransformCallback } from "stream";
import winston from "winston";
import type { Response as ExpressResponse } from "express";

export interface Subscriber {
  /** Called when a new frame arrives */
  onFrame(frame: Buffer): void;
  /** Called when subscriber is removed */
  onDestroy(): void;
}

export interface FrameBufferOptions {
  logger: winston.Logger;
  /** Maximum number of frames to keep in queue */
  maxFrames?: number;
}

export class FrameBuffer extends Transform {
  #logger: winston.Logger;
  #subscribers: Map<ExpressResponse, Subscriber> = new Map();
  #lastFrame: Buffer | null = null;
  #frameQueue: Buffer[] = [];
  #maxFrames: number;
  #frameCount: number = 0;
  #lastFrameTime: number = 0;

  constructor(options: FrameBufferOptions) {
    super({
      writableObjectMode: true,
      readableObjectMode: false,
    });
    this.#logger = options.logger;
    this.#maxFrames = options.maxFrames ?? 5;
  }

  /**
   * Adds a subscriber that will receive frames as they arrive.
   * Accepts either an Express response or a NodeJS.WritableStream for backward compatibility.
   */
  addSubscriber(
    responseOrStream: ExpressResponse | NodeJS.WritableStream,
    subscriber: Subscriber,
  ): void {
    // Type guard to check if it's an Express response
    const isExpressResponse = (
      obj: ExpressResponse | NodeJS.WritableStream,
    ): obj is ExpressResponse => {
      return "statusCode" in obj && typeof obj.statusCode === "number";
    };

    const key = isExpressResponse(responseOrStream) ? responseOrStream : (responseOrStream as any);

    if (this.#subscribers.has(key)) {
      this.#logger.warn("Subscriber already registered");
      return;
    }

    this.#subscribers.set(key, subscriber);

    // Send last frame immediately if available
    if (this.#lastFrame) {
      try {
        subscriber.onFrame(this.#lastFrame);
      } catch (e) {
        this.#logger.warn(
          `Failed to send last frame to subscriber: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    this.#logger.debug(
      `FrameBuffer: subscriber added, total subscribers: ${this.#subscribers.size}`,
    );
  }

  /**
   * Removes a subscriber
   */
  removeSubscriber(responseOrStream: ExpressResponse | NodeJS.WritableStream): void {
    // Type guard to check if it's an Express response
    const isExpressResponse = (
      obj: ExpressResponse | NodeJS.WritableStream,
    ): obj is ExpressResponse => {
      return "statusCode" in obj && typeof obj.statusCode === "number";
    };

    const key = isExpressResponse(responseOrStream) ? responseOrStream : (responseOrStream as any);

    const subscriber = this.#subscribers.get(key);
    if (subscriber) {
      this.#subscribers.delete(key);
      try {
        subscriber.onDestroy();
      } catch (e) {
        this.#logger.warn(
          `Failed to destroy subscriber: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      this.#logger.debug(
        `FrameBuffer: subscriber removed, total subscribers: ${this.#subscribers.size}`,
      );
    }
  }

  /**
   * Called by upstream connection when a new frame arrives
   */
  override _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback): void {
    const frame = Buffer.from(chunk);
    this.receiveFrame(frame);
    callback();
  }

  /**
   * Called by upstream connection when a new frame arrives
   */
  receiveFrame(frame: Buffer): void {
    this.#lastFrame = frame;
    this.#lastFrameTime = Date.now();
    this.#frameCount++;

    // Queue the frame for subscribers
    this.#frameQueue.push(frame);

    // Enforce max frames - drop oldest if queue is too large
    while (this.#frameQueue.length > this.#maxFrames) {
      this.#frameQueue.shift();
    }

    // Notify all subscribers
    for (const [responseOrStream, subscriber] of this.#subscribers.entries()) {
      try {
        // Check if Express response is still writable (headers not sent, not ended)
        const isExpressResponse =
          "statusCode" in responseOrStream && typeof responseOrStream.statusCode === "number";
        if (isExpressResponse) {
          const res = responseOrStream as ExpressResponse;
          if (!res.headersSent && !res.writableEnded && res.writable) {
            subscriber.onFrame(frame);
          }
        } else {
          // For NodeJS.WritableStream
          if (responseOrStream.writable) {
            subscriber.onFrame(frame);
          }
        }
      } catch (e) {
        this.#logger.debug(
          `Failed to deliver frame to subscriber: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  /**
   * Gets the most recent frame without notifying subscribers
   */
  getLastFrame(): Buffer | null {
    return this.#lastFrame;
  }

  /**
   * Gets the number of active subscribers
   */
  getSubscriberCount(): number {
    return this.#subscribers.size;
  }

  /**
   * Gets the time of the last frame in milliseconds
   */
  getLastFrameTime(): number {
    return this.#lastFrameTime;
  }

  /**
   * Gets the total number of frames received since creation
   */
  getFrameCount(): number {
    return this.#frameCount;
  }

  /**
   * Checks if the stream is healthy (received a frame in the last N ms)
   */
  isHealthy(timeoutMs: number = 10000): boolean {
    return Date.now() - this.#lastFrameTime < timeoutMs;
  }

  /**
   * Gets the internal frame queue length (for testing)
   */
  getFrameQueueLength(): number {
    return this.#frameQueue.length;
  }

  /**
   * Clears all state (for testing or reset scenarios)
   */
  clear(): void {
    this.#lastFrame = null;
    this.#frameQueue = [];
    this.#lastFrameTime = 0;
  }
}
