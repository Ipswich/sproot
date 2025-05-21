import { Readable } from "stream";
import winston from "winston";

class Livestream {
  #readableStream: Readable | null = null;
  #livestreamAbortController: AbortController | null = null;
  #logger: winston.Logger;
  #reconnectTimeoutRef: NodeJS.Timeout | null = null;

  constructor(logger: winston.Logger) {
    this.#logger = logger;
  }

  get readableStream() {
    return this.#readableStream;
  }

  async connectToLivestreamAsync(url: string, headers: Record<string, string>): Promise<void> {
    this.disconnectFromLivestream();

    this.#livestreamAbortController = new AbortController();
    try {
      const upstream = await fetch(`${url}/stream.mjpg`, {
        method: "GET",
        headers: headers,
        signal: this.#livestreamAbortController.signal,
      });

      // Return if not a successful result
      if (!upstream.ok || !upstream.body) {
        return;
      }

      this.#readableStream = Readable.fromWeb(upstream.body, {
        signal: this.#livestreamAbortController.signal,
      });
      // reconnect every 6 hours - long lived http connections can be unreliable
      this.#livestreamAbortController.signal.addEventListener("abort", () => {
        this.#readableStream?.destroy();
      });
      this.#reconnectTimeoutRef = setTimeout(
        async () => {
          await this.reconnectLivestreamAsync(url, headers);
        },
        60 * 1000 * 60 * 6,
      );
      this.#logger.info(`Successfully connected to upstream livestream`);

      this.#readableStream.on("error", (e) => {
        this.#logger.error(`Upstream stream error: ${e instanceof Error ? e.message : String(e)}`);
        // Safely clean up without triggering additional errors
        try {
          this.#readableStream?.emit("end");
        } catch (e) {
          this.#logger.debug(
            `Error during stream cleanup: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
        this.disconnectFromLivestream();
      });
    } catch (e) {
      this.#logger.error(
        `Error connecting camera to upstream livestream: ${e instanceof Error ? e.message : String(e)}`,
      );
      this.disconnectFromLivestream();
    }
  }

  /**
   * Reconnects the livestream.
   * @returns {Promise<boolean>} True if reconnected successfully, false otherwise
   */
  async reconnectLivestreamAsync(url: string, headers: Record<string, string>): Promise<boolean> {
    this.#logger.info("Reconnecting livestream...");
    this.disconnectFromLivestream();

    try {
      await this.connectToLivestreamAsync(url, headers);
      return this.#readableStream !== null;
    } catch (e) {
      this.#logger.error(
        `Failed to reconnect livestream: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }

  disconnectFromLivestream() {
    if (this.#reconnectTimeoutRef) {
      clearTimeout(this.#reconnectTimeoutRef);
      this.#reconnectTimeoutRef = null;
    }

    if (this.#readableStream) {
      try {
        this.#readableStream.destroy();
      } catch (e) {
        this.#logger.debug(
          `Error destroying stream: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      this.#readableStream.removeAllListeners();
      this.#readableStream = null;
    }

    if (this.#livestreamAbortController) {
      try {
        if (!this.#livestreamAbortController.signal.aborted) {
          this.#livestreamAbortController.abort();
        }
      } catch (e) {
        this.#logger.debug(
          `Error aborting controller: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      this.#livestreamAbortController = null;
    }
  }
}

export default Livestream;
