import fs from "fs";
import path from "path";
import os from "os";
import winston from "winston";
import sinon from "sinon";
import { assert } from "chai";
import Timelapse from "../Timelapse";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants";

describe("Timelapse.ts tests", function () {
  const logger = winston.createLogger({
    transports: [new winston.transports.Console({ silent: true })],
  });

  let tempDir: string;
  let originalTimelapseDir: string;
  let clock: sinon.SinonFakeTimers;

  const testAddImageFunctionAsync = async (fileName: string, directory: string): Promise<void> => {
    await fs.promises.writeFile(path.join(directory, fileName), "");
  };

  before(function () {
    originalTimelapseDir = Constants.TIMELAPSE_DIRECTORY;
  });

  beforeEach(function () {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "timelapse-test-"));
    Object.defineProperty(Constants, "TIMELAPSE_DIRECTORY", {
      value: tempDir,
      configurable: true,
    });

    clock = sinon.useFakeTimers({
      now: new Date(2025, 4, 26, 12, 0), // May 26, 2025, 12:00
      shouldAdvanceTime: true,
    });
  });

  afterEach(function () {
    clock.restore();

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.readdirSync(tempDir).forEach((file) => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      fs.rmdirSync(tempDir);
    }
  });

  after(function () {
    Object.defineProperty(Constants, "TIMELAPSE_DIRECTORY", {
      value: originalTimelapseDir,
      configurable: true,
    });
  });

  function countFilesInDir(): number {
    return fs.existsSync(tempDir) ? fs.readdirSync(tempDir).length : 0;
  }

  it("should capture images at specified intervals when enabled", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    // Enable capturing every 5 minutes
    timelapse.updateSettings("testCamera", true, 5);

    assert.equal(countFilesInDir(), 0);

    // Advance 5 minutes - first capture
    clock.tick(5 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    // Advance 5 more minutes - second capture
    clock.tick(5 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 2);

    timelapse.dispose();
  });

  it("should create filenames with correct format", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    timelapse.updateSettings("testCamera", true, 5);

    // Advance 5 minutes
    clock.tick(5 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify filename format (date should be from our fixed clock time + 5 min)
    const expectedFileName = "testCamera_2025-05-26-12-05.jpg";
    assert.isTrue(fs.existsSync(path.join(tempDir, expectedFileName)));

    timelapse.dispose();
  });

  it("should stop capturing when disabled", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    // Start capturing
    timelapse.updateSettings("testCamera", true, 2);

    // Advance 2 minutes - one image
    clock.tick(2 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    // Disable capturing
    timelapse.updateSettings("testCamera", false, 2);

    // Advance 10 more minutes - no new images
    clock.tick(10 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    timelapse.dispose();
  });

  it("should update interval when settings change", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    // Start with 5 minute interval
    timelapse.updateSettings("testCamera", true, 5);

    // Advance 5 minutes - one image
    clock.tick(5 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    // Change to 2 minute interval
    timelapse.updateSettings("testCamera", true, 2);

    // Advance 2 minutes - second image
    clock.tick(2 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 2);

    // Advance 2 more minutes - third image
    clock.tick(2 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 3);

    timelapse.dispose();
  });

  it("should use updated camera name for new captures", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    // Start with first camera name
    timelapse.updateSettings("camera1", true, 1);

    // Advance 1 minute
    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check there's a file with camera1 in the name
    const files1 = fs.readdirSync(tempDir);
    assert.lengthOf(files1, 1);
    assert.include(files1[0], "camera1");

    // Update camera name
    timelapse.updateSettings("camera2", true, 1);

    // Advance 1 minute
    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check there's a file with camera2 in the name
    const files2 = fs.readdirSync(tempDir);
    assert.lengthOf(files2, 2);
    assert.isTrue(files2.some((file) => file.includes("camera2")));

    timelapse.dispose();
  });

  it("should stop all captures when dispose is called", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    timelapse.updateSettings("testCamera", true, 1);

    // Advance 1 minute - one image
    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    timelapse.dispose();

    // Advance 10 more minutes - no new images
    clock.tick(10 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);
  });

  it("should handle errors from capture function gracefully", async function () {
    // Create a capture function that throws an error
    const erroringCaptureFunction = async (): Promise<void> => {
      throw new Error("Capture failed");
    };

    const timelapse = new Timelapse(erroringCaptureFunction, logger);
    timelapse.updateSettings("testCamera", true, 1);

    // This should not throw even though the capture function throws
    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // It should continue scheduling captures
    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // No files should be created since the capture function errors
    assert.equal(countFilesInDir(), 0);

    timelapse.dispose();
  });
});
