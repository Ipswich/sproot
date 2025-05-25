import assert from "assert";
import { Readable } from "stream";
import winston from "winston";
import sinon from "sinon";
import Livestream from "../Livestream";

describe("Livestream", () => {
  let logger: winston.Logger;
  let fetchStub: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;
  let readableFromWebStub: sinon.SinonStub;
  
  beforeEach(() => {
    // Create a silent logger for tests
    logger = winston.createLogger({
      transports: [new winston.transports.Console({ silent: true })]
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

  describe("constructor", () => {
    it("should create a new Livestream instance", () => {
      const livestream = new Livestream(logger);
      assert.strictEqual(livestream.readableStream, null);
    });
  });

  describe("connectToLivestreamAsync", () => {
    it("should connect to livestream successfully", async () => {
      const mockResponse = {
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub()
        }
      };
      fetchStub.resolves(mockResponse);
      
      const livestream = new Livestream(logger);
      const url = "http://test-camera";
      const headers = { Authorization: "Bearer token" };
      
      const result = await livestream.connectToLivestreamAsync(url, headers);
      
      assert.strictEqual(result, true);
      assert.notStrictEqual(livestream.readableStream, null);
      assert(fetchStub.calledOnceWith(`${url}/stream.mjpg`, {
        method: "GET", 
        headers,
        signal: sinon.match.instanceOf(AbortSignal)
      }));
    });
    
    it("should return false when fetch fails", async () => {
      fetchStub.rejects(new Error("Network error"));
      
      const livestream = new Livestream(logger);
      const result = await livestream.connectToLivestreamAsync("http://test-camera", {});
      
      assert.strictEqual(result, false);
      assert.strictEqual(livestream.readableStream, null);
    });
    
    it("should return false when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        body: {
          cancel: sinon.stub().resolves()
        }
      };
      fetchStub.resolves(mockResponse);
      
      const livestream = new Livestream(logger);
      const result = await livestream.connectToLivestreamAsync("http://test-camera", {});
      
      assert.strictEqual(result, false);
      assert.strictEqual(livestream.readableStream, null);
    });
    
    it("should return true immediately if already connected", async () => {
      const mockResponse = {
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub()
        }
      };
      fetchStub.resolves(mockResponse);
      
      const livestream = new Livestream(logger);
      await livestream.connectToLivestreamAsync("http://test-camera", {});
      
      fetchStub.reset();
      const result = await livestream.connectToLivestreamAsync("http://test-camera", {});
      
      assert.strictEqual(result, true);
      assert(fetchStub.notCalled);
    });

    it("should return false if already connecting", async () => {
      fetchStub.returns(new Promise(() => {}));
      
      const livestream = new Livestream(logger);
      
      livestream.connectToLivestreamAsync("http://test-camera", {});
      
      const secondConnectionResult = await livestream.connectToLivestreamAsync("http://test-camera", {});
      
      assert.strictEqual(secondConnectionResult, false);
      
      assert(fetchStub.calledOnce);
    });

    it("should handle failure to create readable stream", async () => {
      const mockResponse = {
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub()
        }
      };
      fetchStub.resolves(mockResponse);
      
      readableFromWebStub.throws(new Error("Failed to create stream"));
      
      const livestream = new Livestream(logger);
      const result = await livestream.connectToLivestreamAsync("http://test-camera", {});
      
      assert.strictEqual(result, false);
      assert.strictEqual(livestream.readableStream, null);
      
      assert(mockResponse.body.cancel.called);
    });
  });

  describe("reconnectLivestreamAsync", () => {
    it("should disconnect and reconnect to the livestream", async () => {
      const mockResponse = {
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub()
        }
      };
      fetchStub.resolves(mockResponse);
      
      const livestream = new Livestream(logger);
      const disconnectSpy = sinon.spy(livestream, "disconnectFromLivestream");
      const connectSpy = sinon.stub(livestream, "connectToLivestreamAsync").resolves(true);
      
      const url = "http://test-camera";
      const headers = { Authorization: "Bearer token" };
      const result = await livestream.reconnectLivestreamAsync(url, headers);
      
      assert.strictEqual(result, true);
      assert(disconnectSpy.calledOnce);
      assert(connectSpy.calledOnceWith(url, headers));
    });
  });

  describe("disconnectFromLivestream", () => {
    it("should properly clean up resources when disconnecting", async () => {
      const mockReadable = new Readable();
      mockReadable._read = () => {};
      const unpipeSpy = sinon.spy(mockReadable, "unpipe");
      const destroySpy = sinon.spy(mockReadable, "destroy");
      
      readableFromWebStub.returns(mockReadable);
      
      const mockResponse = {
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub()
        }
      };
      fetchStub.resolves(mockResponse);
      
      const livestream = new Livestream(logger);
      await livestream.connectToLivestreamAsync("http://test-camera", {});
      
      const clearTimeoutSpy = sinon.spy(global, "clearTimeout");
      
      livestream.disconnectFromLivestream();
      
      assert(unpipeSpy.called);
      assert(destroySpy.called);
      assert(clearTimeoutSpy.called);
      assert.strictEqual(livestream.readableStream, null);
    });
  });

  describe("automatic reconnection", () => {
    it("should schedule automatic reconnection after connection", async () => {
      const mockResponse = {
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub()
        }
      };
      fetchStub.resolves(mockResponse);
      
      const livestream = new Livestream(logger);
      const url = "http://test-camera";
      const headers = { Authorization: "Bearer token" };
      
      const reconnectSpy = sinon.spy(livestream, "reconnectLivestreamAsync");
      
      await livestream.connectToLivestreamAsync(url, headers);
      
      clock.tick(6 * 60 * 60 * 1000);
      
      assert(reconnectSpy.calledOnceWith(url, headers));
    });
  });

  describe("error handling", () => {
    it("should handle stream errors", async () => {
      const mockReadable = new Readable();
      mockReadable._read = () => {};
      
      readableFromWebStub.returns(mockReadable);
      
      const mockResponse = {
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub()
        }
      };
      fetchStub.resolves(mockResponse);
      
      const livestream = new Livestream(logger);
      const disconnectSpy = sinon.spy(livestream, "disconnectFromLivestream");
      
      await livestream.connectToLivestreamAsync("http://test-camera", {});
      
      mockReadable.emit("error", new Error("Stream error"));
      
      assert(disconnectSpy.called);
    });
    
    it("should handle stream end", async () => {
      const mockReadable = new Readable();
      mockReadable._read = () => {};
      
      readableFromWebStub.returns(mockReadable);
      
      const mockResponse = {
        ok: true,
        body: {
          cancel: sinon.stub().resolves(),
          getReader: sinon.stub()
        }
      };
      fetchStub.resolves(mockResponse);
      
      const livestream = new Livestream(logger);
      const disconnectSpy = sinon.spy(livestream, "disconnectFromLivestream");
      
      await livestream.connectToLivestreamAsync("http://test-camera", {});
      
      mockReadable.emit("end");
      
      assert(disconnectSpy.called);
    });
  });
});