import { PassThrough, Readable } from "stream";
import winston from "winston";

const LIVESTREAM_RECONNECT_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT = 1000; // 1 second

class Livestream {
  #passthrough: PassThrough = new PassThrough();
  #readableStream: Readable | null = null;
  #livestreamAbortController: AbortController | null = null;
  #logger: winston.Logger;
  #reconnectTimeoutRef: NodeJS.Timeout | null = null;
  #connecting: boolean = false;
  #abortListener: ((event: Event) => void) | null = null;

  constructor(logger: winston.Logger) {
    this.#logger = logger;
  }

  get readableStream() {
    return this.#isConnected() ? this.#passthrough : null;
  }

  async connectToLivestreamAsync(
    url: string,
    headers: Record<string, string>,
    fetchTimeout: number = FETCH_TIMEOUT,
  ): Promise<boolean> {
    if (this.#isConnected()) {
      return true;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.#connecting) {
      this.#logger.debug("Connection attempt already in progress");
      return false;
    }

    this.#connecting = true;
    let newConnectionAbortController: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let upstream: Response | null = null;

    try {
      // Create a new connection
      newConnectionAbortController = new AbortController();
      timeoutId = setTimeout(() => newConnectionAbortController?.abort(), fetchTimeout);

      upstream = await fetch(`${url}/stream.mjpg`, {
        method: "GET",
        headers: headers,
        signal: newConnectionAbortController.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!upstream.ok || !upstream.body) {
        await upstream.body?.cancel();
        newConnectionAbortController.abort();
        return false;
      }
      // If successful, clean up the old connection
      this.#logger.info(`Successfully connected to upstream camera server`);
      this.disconnectFromLivestream();

      // Set up the new readable stream, pointed at the new connection
      this.#livestreamAbortController = newConnectionAbortController;
      try {
        this.#readableStream = Readable.fromWeb(upstream.body, {
          signal: this.#livestreamAbortController.signal,
        });
      } catch (e) {
        await upstream.body.cancel();
        this.#livestreamAbortController.abort();
        this.#livestreamAbortController = null;
        this.#logger.error("Failed to create readable stream from upstream body");
        return false;
      }
      this.#readableStream.pipe(this.#passthrough, { end: false });

      // Set up the reconnect timeout - long lived http connections can be unreliable.
      this.#reconnectTimeoutRef = setTimeout(async () => {
        await this.reconnectLivestreamAsync(url, headers);
      }, LIVESTREAM_RECONNECT_INTERVAL);

      // Add event listeners to handle abort signal and stream end/errors
      this.#abortListener = () => {
        this.#readableStream?.unpipe(this.#passthrough);
        this.#readableStream?.destroy();
      };
      this.#livestreamAbortController.signal.addEventListener("abort", this.#abortListener);

      this.#readableStream
        .on("end", () => {
          this.disconnectFromLivestream();
        })
        .on("error", (e) => {
          this.#logger.error(`Upstream error: ${e instanceof Error ? e.message : String(e)}`);
          this.disconnectFromLivestream();
        });

      return true;
    } catch (e) {
      this.#logger.error(
        `Error connecting to upstream camera server: ${e instanceof Error ? e.message : String(e)}`,
      );
      await upstream?.body?.cancel();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (newConnectionAbortController && !newConnectionAbortController.signal.aborted) {
        newConnectionAbortController.abort();
      }
      this.disconnectFromLivestream();
      return false;
    } finally {
      this.#connecting = false;
    }
  }

  /**
   * Reconnects the livestream.
   * @returns {Promise<boolean>} True if reconnected successfully, false otherwise
   */
  async reconnectLivestreamAsync(url: string, headers: Record<string, string>): Promise<boolean> {
    this.#logger.info("Reconnecting to upstream camera server...");
    this.disconnectFromLivestream();
    const connected = await this.connectToLivestreamAsync(url, headers);
    if (!connected) {
      this.#logger.warn("Failed to reconnect to upstream camera server");
    }
    return connected;
  }

  disconnectFromLivestream() {
    try {
      if (this.#reconnectTimeoutRef) {
        clearTimeout(this.#reconnectTimeoutRef);
        this.#reconnectTimeoutRef = null;
      }
      if (this.#readableStream) {
        this.#readableStream.unpipe(this.#passthrough);
        this.#readableStream.destroy();
        this.#readableStream.removeAllListeners();
        this.#readableStream = null;
      }
      if (this.#livestreamAbortController) {
        if (!this.#livestreamAbortController.signal.aborted) {
          this.#livestreamAbortController.abort();
        }
        if (this.#abortListener) {
          this.#livestreamAbortController.signal.removeEventListener("abort", this.#abortListener);
          this.#abortListener = null;
        }
        this.#livestreamAbortController = null;
      }
    } catch (e) {
      this.#logger.debug(
        `Error disconnecting from upstream camera server: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  #isConnected() {
    return this.#readableStream !== null;
  }
}

export default Livestream;
