import { Readable } from "stream";
import winston from "winston";
import { FrameBuffer } from "./FrameBuffer";
import { UpstreamConnection, UpstreamConnectionState } from "./UpstreamConnection";

export interface StreamProxyOptions {
  logger: winston.Logger;
  upstreamUrl: string;
  upstreamHeaders: Record<string, string>;
  /** Maximum frames in queue */
  maxFrameBufferFrames?: number;
  /** Initial reconnect delay for upstream */
  upstreamInitialReconnectDelayMs?: number;
  /** Maximum reconnect delay for upstream */
  upstreamMaxReconnectDelayMs?: number;
  /** Health check timeout for upstream */
  upstreamHealthCheckTimeoutMs?: number;
  /** Fetch timeout for upstream connection */
  upstreamFetchTimeoutMs?: number;
}

export interface StreamProxyStatus {
  upstream: UpstreamConnectionState;
  buffer: {
    subscriberCount: number;
    frameCount: number;
    lastFrameTime: number;
    isHealthy: boolean;
  };
}

export class StreamProxy {
  #logger: winston.Logger;
  #frameBuffer: FrameBuffer;
  #upstreamConnection: UpstreamConnection;
  #passthrough: Readable | null = null;

  constructor(options: StreamProxyOptions) {
    this.#logger = options.logger;

    // Create frame buffer
    this.#frameBuffer = new FrameBuffer({
      logger: this.#logger,
      maxFrames: options.maxFrameBufferFrames ?? 5,
    });

    // Create upstream connection
    this.#upstreamConnection = new UpstreamConnection({
      logger: this.#logger,
      url: options.upstreamUrl,
      headers: options.upstreamHeaders,
      frameBuffer: this.#frameBuffer,
      fetchTimeoutMs: options.upstreamFetchTimeoutMs ?? 10000,
      initialReconnectDelayMs: options.upstreamInitialReconnectDelayMs ?? 1000,
      maxReconnectDelayMs: options.upstreamMaxReconnectDelayMs ?? 60000,
      healthCheckTimeoutMs: options.upstreamHealthCheckTimeoutMs ?? 10000,
    });
  }

  /**
   * Gets a readable stream of the latest frames (for backward compatibility)
   */
  get readableStream(): Readable | null {
    // For backward compatibility with CameraManager
    // This provides a single PassThrough that outputs frames
    // Note: This is not ideal for multiple clients - use Express handler instead
    if (!this.#passthrough) {
      this.#passthrough = new Readable({
        read() {},
      });
    }
    return this.#passthrough;
  }

  /**
   * Starts the proxy - connects to upstream
   */
  async startAsync(): Promise<boolean> {
    this.#logger.info("StreamProxy: starting");

    try {
      // Connect to upstream camera server
      const connected = await this.#upstreamConnection.connectAsync();
      if (!connected) {
        this.#logger.error("StreamProxy: failed to connect to upstream camera server");
        return false;
      }

      this.#logger.info("StreamProxy: fully started");
      return true;
    } catch (e) {
      this.#logger.error(
        `StreamProxy: error starting: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }

  /**
   * Stops the proxy - disconnects from upstream
   */
  async stopAsync(): Promise<void> {
    this.#logger.info("StreamProxy: stopping");

    try {
      // Disconnect upstream
      this.#upstreamConnection.disconnect();

      this.#logger.info("StreamProxy: stopped");
    } catch (e) {
      this.#logger.error(
        `StreamProxy: error stopping: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /**
   * Forces a reconnection to the upstream server
   */
  async reconnectAsync(): Promise<boolean> {
    this.#logger.info("StreamProxy: reconnecting to upstream");

    this.#upstreamConnection.disconnect();
    return this.#upstreamConnection.connectAsync();
  }

  /**
   * Gets the current status of the proxy
   */
  getStatus(): StreamProxyStatus {
    return {
      upstream: this.#upstreamConnection.getState(),
      buffer: {
        subscriberCount: this.#frameBuffer.getSubscriberCount(),
        frameCount: this.#frameBuffer.getFrameCount(),
        lastFrameTime: this.#frameBuffer.getLastFrameTime(),
        isHealthy: this.#frameBuffer.isHealthy(),
      },
    };
  }

  /**
   * Gets the frame buffer (for testing or advanced usage)
   */
  getFrameBuffer(): FrameBuffer {
    return this.#frameBuffer;
  }

  /**
   * Gets the upstream connection (for testing or advanced usage)
   */
  getUpstreamConnection(): UpstreamConnection {
    return this.#upstreamConnection;
  }

  /**
   * Cleans up resources
   */
  [Symbol.asyncDispose](): Promise<void> {
    return this.stopAsync();
  }
}

export default StreamProxy;
