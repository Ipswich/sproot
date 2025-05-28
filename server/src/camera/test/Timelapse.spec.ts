import fs from "fs";
import path from "path";
import os from "os";
import winston from "winston";
import sinon from "sinon";
import { assert } from "chai";
import Timelapse from "../Timelapse";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";

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
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 5,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

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

  it("should only capture images during specified time range", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    // Set timelapse to run every 1 minute, but only between 12:00 and 12:10
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: "12:00",
      timelapseEndTime: "12:10",
    } as SDBCameraSettings);

    // At 12:01 - should capture (within range)
    clock.tick(1 * 60 * 1000); // 12:01
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    // At 12:09 - should still capture (within range)
    clock.tick(8 * 60 * 1000); // 12:09
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 2);

    // At 12:11 - should NOT capture (outside range)
    clock.tick(2 * 60 * 1000); // 12:10
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 2);

    timelapse.dispose();
  });

  it("should respect updated time range settings", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    // Initially allow captures between 12:00 and 12:10
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: "12:00",
      timelapseEndTime: "12:10",
    } as SDBCameraSettings);

    // At 12:01 - should capture
    clock.tick(1 * 60 * 1000); // 12:01
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    // Update to only allow captures between 12:30 and 12:40
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: "12:30",
      timelapseEndTime: "12:40",
    } as SDBCameraSettings);

    // At 12:02 - should NOT capture (outside new range)
    clock.tick(1 * 60 * 1000); // 12:02
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    // Move to 12:30 - should capture (within new range)
    clock.tick(28 * 60 * 1000); // 12:30
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 2);

    timelapse.dispose();
  });

  it("should capture images when neither time range is specified", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: "11:00",
      timelapseEndTime: null,
    } as SDBCameraSettings);

    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: null,
      timelapseEndTime: "12:00",
    } as SDBCameraSettings);

    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    timelapse.dispose();
  });

  it("should create filenames with correct format", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 5,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

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
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 2,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

    // Advance 2 minutes - one image
    clock.tick(2 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    // Disable capturing
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: false,
      timelapseInterval: 2,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

    // Advance 10 more minutes - no new images
    clock.tick(10 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    timelapse.dispose();
  });

  it("should update interval when settings change", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    // Start with 5 minute interval
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 5,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

    // Advance 5 minutes - one image
    clock.tick(5 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    // Change to 2 minute interval
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 2,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

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

  it("should not capture images when intervalMinutes is null", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: null,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

    // Advance 10 minutes
    clock.tick(10 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(countFilesInDir(), 0);

    // Update to a valid interval
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 2,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

    // Advance 2 minutes - should capture now
    clock.tick(2 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: null,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

    // Advance 10 more minutes - no new captures
    clock.tick(10 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(countFilesInDir(), 1);

    timelapse.dispose();
  });

  it("should use updated camera name for new captures", async function () {
    const timelapse = new Timelapse(testAddImageFunctionAsync, logger);

    // Start with first camera name
    timelapse.updateSettings({
      name: "camera1",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

    // Advance 1 minute
    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Check there's a file with camera1 in the name
    const files1 = fs.readdirSync(tempDir);
    assert.lengthOf(files1, 1);
    assert.include(files1[0], "camera1");

    // Update camera name
    timelapse.updateSettings({
      name: "camera2",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

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

    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

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

  it("should handle errors from add function gracefully", async function () {
    // Create a add function that throws an error
    const erroringAddFunctionAsync = async (): Promise<void> => {
      throw new Error("Add failed");
    };

    const timelapse = new Timelapse(erroringAddFunctionAsync, logger);
    timelapse.updateSettings({
      name: "testCamera",
      timelapseEnabled: true,
      timelapseInterval: 1,
      timelapseStartTime: null,
      timelapseEndTime: null,
    } as SDBCameraSettings);

    // This should not throw even though the add function throws
    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // It should continue scheduling adds even if one fails
    clock.tick(1 * 60 * 1000);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // No files should be created since the add function errors
    assert.equal(countFilesInDir(), 0);

    timelapse.dispose();
  });
});
