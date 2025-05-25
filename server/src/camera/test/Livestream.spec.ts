import assert from "assert";
import { Readable } from "stream";
import winston from "winston";
import sinon from "sinon";
import Livestream from "../Livestream";

describe("Livestream.ts tests", () => {
  let logger: winston.Logger;
  let fetchStub: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;
  let readableFromWebStub: sinon.SinonStub;

  beforeEach(() => {
    logger = winston.createLogger({
      transports: [new winston.transports.Console({ silent: true })],
    });

    fetchStub = sinon.stub(global, "fetch");
    clock = sinon.useFakeTimers();

    readableFromWebStub = sinon.stub(Readable, "fromWeb").callsFake(() => {
      const readable = new Readable();
      readable._read = () => {};
      return readable;
    });
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe("connectToLivestreamAsync", () => {
    it("should connect to livestream and return true", async () => {
      const mockBody = {
        cancel: sinon.stub().resolves(),
        getReader: sinon.stub(),
      };

      fetchStub.resolves({ ok: true, body: mockBody });

      const livestream = new Livestream(logger);
      const result = await livestream.connectToLivestreamAsync("http://test-camera", {});

      assert.strictEqual(result, true);
      assert(livestream.readableStream instanceof Readable);
    });

    it("should handle 401 unauthorized response", async () => {
      fetchStub.resolves({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        body: { cancel: sinon.stub().resolves() },
      });

      const livestream = new Livestream(logger);
      const result = await livestream.connectToLivestreamAsync("http://test-camera", {});

      assert.strictEqual(result, false);
      assert.strictEqual(livestream.readableStream, null);
    });

    it("should handle 404 not found response", async () => {
      fetchStub.resolves({
        ok: false,
        status: 404,
        statusText: "Not Found",
        body: { cancel: sinon.stub().resolves() },
      });

      const livestream = new Livestream(logger);
      const result = await livestream.connectToLivestreamAsync("http://test-camera", {});

      assert.strictEqual(result, false);
    });

    it("should handle 500 server error response", async () => {
      fetchStub.resolves({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        body: { cancel: sinon.stub().resolves() },
      });

      const livestream = new Livestream(logger);
      const result = await livestream.connectToLivestreamAsync("http://test-camera", {});

      assert.strictEqual(result, false);
    });

    it("should handle rapid connect-disconnect-connect sequence", async () => {
      const mockBody = {
        cancel: sinon.stub().resolves(),
        getReader: sinon.stub(),
      };

      fetchStub.resolves({ ok: true, body: mockBody });

      const livestream = new Livestream(logger);

      const connectPromise = livestream.connectToLivestreamAsync("http://test-camera", {});

      livestream.disconnectFromLivestream();

      await connectPromise;

      const reconnectResult = await livestream.connectToLivestreamAsync("http://test-camera", {});

      assert.strictEqual(reconnectResult, true);
    });

    it("should handle null/undefined body in response", async () => {
      fetchStub.resolves({
        ok: true,
        body: null,
      });

      const livestream = new Livestream(logger);
      const result = await livestream.connectToLivestreamAsync("http://test-camera", {});

      assert.strictEqual(result, false);
    });
    it("should abort fetch when timeout is reached", async () => {
      // Setup a fetch that never resolves to trigger timeout - also needs a signal to abort
      fetchStub.callsFake((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }
        });
      });

      const livestream = new Livestream(logger);
      const customTimeout = 500;

      const connectionPromise = livestream.connectToLivestreamAsync(
        "http://test-camera",
        {},
        customTimeout,
      );

      clock.tick(customTimeout + 10);

      const result = await connectionPromise;
      assert.strictEqual(result, false);
      assert.strictEqual(livestream.readableStream, null);
    });

    it("should use the default timeout when not specified", async () => {
      // Setup a fetch that never resolves to trigger timeout - also needs a signal to abort
      fetchStub.callsFake((_url, options) => {
        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }
        });
      });

      const livestream = new Livestream(logger);
      const connectionPromise = livestream.connectToLivestreamAsync("http://test-camera", {});

      // Default timeout is 1000ms
      clock.tick(1010);

      const result = await connectionPromise;
      assert.strictEqual(result, false);
    });

    it("should handle errors during stream emission", async () => {
      const mockReadable = new Readable();
      mockReadable._read = () => {};

      readableFromWebStub.returns(mockReadable);

      fetchStub.resolves({
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub(),
        },
      });

      const livestream = new Livestream(logger);
      await livestream.connectToLivestreamAsync("http://test-camera", {});

      const disconnectSpy = sinon.spy(livestream, "disconnectFromLivestream");

      mockReadable.emit("error", new Error("Data streaming error"));

      assert(disconnectSpy.calledOnce);
    });
  });

  describe("disconnectFromLivestream", () => {
    it("should abort the connection when disconnectFromLivestream is called", async () => {
      const mockBodyCancel = sinon.stub().resolves();
      const mockBody = { cancel: mockBodyCancel, getReader: sinon.stub() };
      fetchStub.resolves({ ok: true, body: mockBody });

      const livestream = new Livestream(logger);
      await livestream.connectToLivestreamAsync("http://test-camera", {});

      livestream.disconnectFromLivestream();

      assert.strictEqual(livestream.readableStream, null);
    });

    it("should clean up all event listeners on disconnection", async () => {
      const mockReadable = new Readable();
      mockReadable._read = () => {};
      const removeAllListenersSpy = sinon.spy(mockReadable, "removeAllListeners");

      readableFromWebStub.returns(mockReadable);

      fetchStub.resolves({
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub(),
        },
      });

      const livestream = new Livestream(logger);
      await livestream.connectToLivestreamAsync("http://test-camera", {});

      livestream.disconnectFromLivestream();

      assert(removeAllListenersSpy.calledOnce);
    });

    it("should clear the reconnection timeout when disconnecting", async () => {
      fetchStub.resolves({
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub(),
        },
      });

      const livestream = new Livestream(logger);
      const clearTimeoutSpy = sinon.spy(global, "clearTimeout");

      await livestream.connectToLivestreamAsync("http://test-camera", {});
      livestream.disconnectFromLivestream();

      assert(clearTimeoutSpy.called);
    });

    it("should handle multiple disconnection calls safely", async () => {
      const mockBody = {
        cancel: sinon.stub().resolves(),
        getReader: sinon.stub(),
      };
      fetchStub.resolves({ ok: true, body: mockBody });

      const livestream = new Livestream(logger);
      await livestream.connectToLivestreamAsync("http://test-camera", {});

      livestream.disconnectFromLivestream();
      // Second call should not throw or cause issues
      livestream.disconnectFromLivestream();

      assert.strictEqual(livestream.readableStream, null);
    });
  });

  describe("reconnectLivestreamAsync", () => {
    it("should handle failed reconnection attempts", async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub(),
        },
      });

      fetchStub.onSecondCall().rejects(new Error("Network error during reconnect"));

      const livestream = new Livestream(logger);
      await livestream.connectToLivestreamAsync("http://test-camera", {});

      const result = await livestream.reconnectLivestreamAsync("http://test-camera", {});
      assert.strictEqual(result, false);
    });

    it("should handle automatic reconnection failure", async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub(),
        },
      });

      fetchStub.onSecondCall().rejects(new Error("Network error"));

      const livestream = new Livestream(logger);
      const url = "http://test-camera";
      const headers = { Authorization: "Bearer token" };

      await livestream.connectToLivestreamAsync(url, headers);

      clock.tick(6 * 60 * 60 * 1000 + 10);

      assert(fetchStub.calledTwice);
      assert.strictEqual(livestream.readableStream, null);
    });
  });
});
