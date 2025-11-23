import assert from "assert";
import sinon from "sinon";
import fs from "fs";
import path from "path";
import ImageCapture from "../ImageCapture.js";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants.js";
import winston from "winston";
import os from "os";

describe("ImageCapture.ts tests", () => {
  let imageCapture: ImageCapture;
  let tempDir: string;
  let originalImageDir: string;
  let fetchStub: sinon.SinonStub;
  let mockLogger: winston.Logger;

  before(() => {
    mockLogger = {
      info: sinon.spy(),
      error: sinon.spy(),
      debug: sinon.spy(),
      warn: sinon.spy(),
    } as unknown as winston.Logger;
    fetchStub = sinon.stub(global, "fetch");

    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-capture-test-"));

    // Store and override the IMAGE_DIRECTORY constant
    originalImageDir = Constants.IMAGE_DIRECTORY;
    Object.defineProperty(Constants, "IMAGE_DIRECTORY", { value: tempDir });

    imageCapture = new ImageCapture(mockLogger);
  });

  beforeEach(() => {
    // Reset spies and stubs
    (mockLogger.info as sinon.SinonSpy).resetHistory();
    (mockLogger.error as sinon.SinonSpy).resetHistory();
    (mockLogger.debug as sinon.SinonSpy).resetHistory();
    fetchStub.reset();

    // Ensure directory exists and is empty
    fs.mkdirSync(tempDir, { recursive: true });
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
    }
  });

  after(async () => {
    // Restore original IMAGE_DIRECTORY
    Object.defineProperty(Constants, "IMAGE_DIRECTORY", { value: originalImageDir });

    // Restore stubs
    fetchStub.restore();

    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe("captureImageAsync", () => {
    it("should save an image when fetch is successful", async () => {
      const imageBuffer = Buffer.from("test image data");
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(imageBuffer);
          controller.close();
        },
      });
      fetchStub.resolves({ ok: true, status: 200, body: mockBody });

      await imageCapture.captureImageAsync("test.jpg", "http://camera.url", {});
      const savedFilePath = path.join(tempDir, "test.jpg");

      assert.strictEqual(fs.existsSync(savedFilePath), true);
      assert.strictEqual((mockLogger.info as sinon.SinonSpy).calledOnce, true);
      assert.ok((mockLogger.info as sinon.SinonSpy).firstCall.args[0].includes("Image captured"));
    });

    it("should handle fetch errors gracefully", async () => {
      const savedFilePath = path.join(tempDir, "test.jpg");
      fetchStub.rejects(new Error("Network error"));

      await imageCapture.captureImageAsync("test.jpg", "http://camera.url", {});

      assert.strictEqual(fs.existsSync(savedFilePath), false);
      assert.strictEqual((mockLogger.error as sinon.SinonSpy).calledOnce, true);
      assert.ok(
        (mockLogger.error as sinon.SinonSpy).firstCall.args[0].includes("Image capture failed"),
      );
    });

    it("should handle unsuccessful responses", async () => {
      const savedFilePath = path.join(tempDir, "test.jpg");
      fetchStub.resolves({ ok: false, status: 404, body: null });

      await imageCapture.captureImageAsync("test.jpg", "http://camera.url", {});

      assert.strictEqual(fs.existsSync(savedFilePath), false);
      assert.strictEqual((mockLogger.error as sinon.SinonSpy).calledOnce, true);
      assert.ok(
        (mockLogger.error as sinon.SinonSpy).firstCall.args[0].includes(
          "Image capture was unsuccessful",
        ),
      );
    });
  });

  describe("getLatestImageAsync", () => {
    it("should return the most recently modified image", async () => {
      const oldImage = Buffer.from("old image");
      const newImage = Buffer.from("new image");
      const oldPath = path.join(tempDir, "old.jpg");
      const newPath = path.join(tempDir, "new.jpg");

      await fs.promises.writeFile(oldPath, oldImage);
      await fs.promises.utimes(oldPath, new Date(Date.now() - 10000), new Date(Date.now() - 10000)); // 10 seconds old
      await fs.promises.writeFile(newPath, newImage);

      const result = await imageCapture.getLatestImageAsync();

      assert.notStrictEqual(result, null);
      assert.strictEqual(result!.toString(), newImage.toString());
    });

    it("should return null when no images exist", async () => {
      const result = await imageCapture.getLatestImageAsync();
      assert.strictEqual(result, null);
    });
  });

  describe("runImageRetentionAsync", () => {
    it("should remove old files when they exceed retention days", async () => {
      const oldFile = path.join(tempDir, "old.jpg");
      const recentFile = path.join(tempDir, "recent.jpg");

      await fs.promises.writeFile(oldFile, "old content");
      await fs.promises.writeFile(recentFile, "recent content");

      const now = new Date();
      const oldDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days old
      const recentDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day old

      await fs.promises.utimes(oldFile, oldDate, oldDate);
      await fs.promises.utimes(recentFile, recentDate, recentDate);

      await imageCapture.runImageRetentionAsync(10, 5, now, tempDir); // 10MB, 5-day retention

      assert.strictEqual(fs.existsSync(oldFile), false);
      assert.strictEqual(fs.existsSync(recentFile), true);
    });

    it("should remove files when exceeding size limit", async () => {
      const maxSize = 1.5;
      // Create files with 1MB of data each, 1 second apart
      for (let i = 0; i < 3; i++) {
        const filePath = path.join(tempDir, `file${i}.jpg`);
        const buffer = Buffer.alloc(1024 * 1024, i.toString());
        await fs.promises.writeFile(filePath, buffer);

        const fileDate = new Date(Date.now() - (3 - i) * 1000);
        await fs.promises.utimes(filePath, fileDate, fileDate);
      }

      await imageCapture.runImageRetentionAsync(maxSize, 30, new Date(), tempDir); // 1.5MB, 30-day retention

      assert.strictEqual(fs.existsSync(path.join(tempDir, "file0.jpg")), false);
      assert.strictEqual(fs.existsSync(path.join(tempDir, "file1.jpg")), false);
      assert.strictEqual(fs.existsSync(path.join(tempDir, "file2.jpg")), true);

      // Check that size is under the limit
      const files = fs.readdirSync(tempDir);
      const totalSize = files.reduce((acc, file) => {
        const stats = fs.statSync(path.join(tempDir, file));
        return acc + stats.size;
      }, 0);
      assert.strictEqual(totalSize / (1024 * 1024) <= maxSize, true);
    });

    it("should not delete files when within limits", async () => {
      const file1 = path.join(tempDir, "file1.jpg");
      const file2 = path.join(tempDir, "file2.jpg");

      await fs.promises.writeFile(file1, "content 1");
      await fs.promises.writeFile(file2, "content 2");

      await imageCapture.runImageRetentionAsync(100, 100, new Date(), tempDir); // 100MB, 100-day retention

      assert.strictEqual(fs.existsSync(file1), true);
      assert.strictEqual(fs.existsSync(file2), true);
    });
  });
});
