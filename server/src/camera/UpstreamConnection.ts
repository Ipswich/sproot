import { Readable } from "stream";
import winston from "winston";
import { FrameBuffer } from "./FrameBuffer";

export interface UpstreamConnectionOptions {
  logger: winston.Logger;
  url: string;
  headers: Record<string, string>;
  frameBuffer: FrameBuffer;
  /** Timeout for initial fetch in milliseconds */
  fetchTimeoutMs?: number;
  /** Initial reconnection delay in milliseconds */
  initialReconnectDelayMs?: number;
  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelayMs?: number;
  /** Health check timeout - trigger reconnection if no frames in this time */
  healthCheckTimeoutMs?: number;
}

export type UpstreamConnectionState =
  | { status: "disconnected"; reason?: string }
  | { status: "connecting"; attempt: number }
  | { status: "connected"; lastFrameTime: number; frameCount: number };

export class UpstreamConnection {
  #logger: winston.Logger;
  #url: string;
  #headers: Record<string, string>;
  #frameBuffer: FrameBuffer;
  #fetchTimeoutMs: number;
  #initialReconnectDelayMs: number;
  #maxReconnectDelayMs: number;
  #healthCheckTimeoutMs: number;

  #controller: AbortController | null = null;
  #readableStream: Readable | null = null;
  #reconnectTimeout: NodeJS.Timeout | null = null;
  #connecting: boolean = false;
  #connectionAbortListener: ((event: Event) => void) | null = null;
  #reconnectAttempt: number = 0;

  constructor(options: UpstreamConnectionOptions) {
    this.#logger = options.logger;
    this.#url = options.url;
    this.#headers = options.headers;
    this.#frameBuffer = options.frameBuffer;
    this.#fetchTimeoutMs = options.fetchTimeoutMs ?? 10000;
    this.#initialReconnectDelayMs = options.initialReconnectDelayMs ?? 1000;
    this.#maxReconnectDelayMs = options.maxReconnectDelayMs ?? 60000;
    this.#healthCheckTimeoutMs = options.healthCheckTimeoutMs ?? 10000;
  }

  /**
   * Gets the current connection state
   */
  getState(): UpstreamConnectionState {
    if (this.#connecting) {
      return { status: "connecting", attempt: this.#reconnectAttempt };
    }
    if (!this.#readableStream) {
      return { status: "disconnected" };
    }
    return {
      status: "connected",
      lastFrameTime: this.#frameBuffer.getLastFrameTime(),
      frameCount: this.#frameBuffer.getFrameCount(),
    };
  }

  /**
   * Starts the upstream connection
   */
  async connectAsync(): Promise<boolean> {
    if (this.#connecting) {
      this.#logger.debug("UpstreamConnection: connection attempt already in progress");
      return false;
    }

    if (this.#readableStream) {
      this.#logger.debug("UpstreamConnection: already connected, disconnecting first");
      await this.#disconnectInternal();
    }

    this.#connecting = true;
    this.#reconnectAttempt++;
    let newController: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let upstream: Response | null = null;

    try {
      newController = new AbortController();
      timeoutId = setTimeout(() => newController?.abort(), this.#fetchTimeoutMs);

      this.#logger.info(
        `UpstreamConnection: connecting to ${this.#url} (attempt ${this.#reconnectAttempt})`,
      );

      upstream = await fetch(`${this.#url}/stream.mjpg`, {
        method: "GET",
        headers: this.#headers,
        signal: newController.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!upstream.ok || !upstream.body) {
        const errorMsg = `UpstreamConnection: invalid response (status: ${upstream.status})`;
        this.#logger.error(errorMsg);
        await upstream.body?.cancel();
        throw new Error(errorMsg);
      }

      this.#logger.info("UpstreamConnection: successfully connected to camera server");

      // Set up the new readable stream
      this.#controller = newController;
      try {
        this.#readableStream = Readable.fromWeb(upstream.body, {
          signal: this.#controller.signal,
        });
      } catch (e) {
        await upstream.body?.cancel();
        this.#controller.abort();
        this.#controller = null;
        this.#logger.error(`UpstreamConnection: failed to create readable stream`);
        throw e;
      }

      // Wire up the stream to frame buffer
      this.#readableStream.pipe(this.#frameBuffer, { end: false });

      // Add abort listener for cleanup
      this.#connectionAbortListener = () => {
        this.#logger.info("UpstreamConnection: connection aborted");
        this.#readableStream?.unpipe(this.#frameBuffer);
        this.#readableStream?.destroy();
        this.#readableStream = null;
      };
      this.#controller.signal.addEventListener("abort", this.#connectionAbortListener);

      // Set up health monitoring
      this.#scheduleHealthCheck();

      // Handle stream end and errors
      this.#readableStream
        .on("end", () => {
          this.#logger.info("UpstreamConnection: upstream stream ended");
          this.#handleDisconnect("stream ended");
        })
        .on("error", (e) => {
          const errorMsg = `UpstreamConnection: upstream error: ${e instanceof Error ? e.message : String(e)}`;
          this.#logger.error(errorMsg);
          this.#handleDisconnect(errorMsg);
        });

      this.#reconnectAttempt = 0;
      return true;
    } catch (e) {
      this.#logger.error(
        `UpstreamConnection: error connecting: ${e instanceof Error ? e.message : String(e)}`,
      );
      await upstream?.body?.cancel();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (newController && !newController.signal.aborted) {
        newController.abort();
      }
      this.#handleDisconnect(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      this.#connecting = false;
    }
  }

  /**
   * Schedules a health check and returns the delay until next check
   */
  #scheduleHealthCheck(): number {
    const checkInterval = () => {
      if (!this.#readableStream) {
        return 0;
      }

      if (!this.#frameBuffer.isHealthy(this.#healthCheckTimeoutMs)) {
        this.#logger.warn(
          `UpstreamConnection: health check failed - no frames for ${this.#healthCheckTimeoutMs}ms, reconnecting`,
        );
        this.#handleDisconnect("health check timeout");
        return 0;
      }

      // Check again in 2 seconds
      return 2000;
    };

    const delay = checkInterval();
    if (delay > 0) {
      this.#reconnectTimeout = setTimeout(checkInterval, delay);
    }

    return delay;
  }

  /**
   * Handles disconnection and schedules reconnection
   */
  #handleDisconnect(reason: string): void {
    if (this.#reconnectTimeout) {
      clearTimeout(this.#reconnectTimeout);
      this.#reconnectTimeout = null;
    }

    const delay = this.#calculateReconnectDelay();
    this.#logger.info(`UpstreamConnection: disconnected - ${reason}, reconnecting in ${delay}ms`);

    this.#reconnectTimeout = setTimeout(() => {
      this.connectAsync().catch((e) => {
        this.#logger.error(`UpstreamConnection: reconnection failed: ${e}`);
      });
    }, delay);
  }

  /**
   * Calculates reconnection delay with exponential backoff
   */
  #calculateReconnectDelay(): number {
    const minDelay = this.#initialReconnectDelayMs;
    const maxDelay = this.#maxReconnectDelayMs;

    // Exponential backoff: minDelay * 2^attempt
    let delay = minDelay * Math.pow(2, this.#reconnectAttempt);
    delay = Math.min(delay, maxDelay);

    // Add 10% jitter
    const jitter = delay * 0.1;
    delay += (Math.random() - 0.5) * 2 * jitter;

    return Math.max(minDelay, Math.min(delay, maxDelay));
  }

  /**
   * Internal disconnect without triggering reconnection
   */
  async #disconnectInternal(): Promise<void> {
    if (this.#reconnectTimeout) {
      clearTimeout(this.#reconnectTimeout);
      this.#reconnectTimeout = null;
    }

    if (this.#readableStream) {
      this.#readableStream.unpipe(this.#frameBuffer);
      this.#readableStream.removeAllListeners();
      this.#readableStream.destroy();
      this.#readableStream = null;
    }

    if (this.#controller) {
      if (this.#connectionAbortListener) {
        this.#controller.signal.removeEventListener("abort", this.#connectionAbortListener);
        this.#connectionAbortListener = null;
      }
      this.#controller.abort();
      this.#controller = null;
    }
  }

  /**
   * Disconnects immediately without attempting reconnection
   */
  disconnect(): void {
    this.#logger.info("UpstreamConnection: explicit disconnect");
    this.#disconnectInternal();
    this.#reconnectAttempt = 0;
  }
}
