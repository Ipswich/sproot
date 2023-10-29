import "dotenv/config";
import { OutputList } from "../OutputList";
import { SDBOutput } from "@sproot/sproot-common/src/database/SDBOutput";
import { MockSprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import Pca9685Driver from "pca9685";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
const sandbox = sinon.createSandbox();
const mockSprootDB = new MockSprootDB();

describe("OutputList.ts tests", function () {
  this.afterEach(() => {
    sandbox.restore();
  });

  it("should create, update, and delete outputs.", async function () {
    sandbox.createStubInstance(Pca9685Driver);
    const getOutputsAsyncStub = sandbox.stub(MockSprootDB.prototype, "getOutputsAsync").resolves([
      {
        id: 1,
        model: "pca9685",
        address: "0x40",
        description: "test output 1",
        pin: 0,
        isPwm: true,
        isInvertedPwm: false,
      } as SDBOutput,
      {
        id: 2,
        model: "pca9685",
        address: "0x40",
        description: "test output 2",
        pin: 1,
        isPwm: false,
        isInvertedPwm: false,
      } as SDBOutput,
      {
        id: 3,
        model: "pca9685",
        address: "0x40",
        description: "test output 3",
        pin: 2,
        isPwm: true,
        isInvertedPwm: true,
      } as SDBOutput,
      {
        id: 4,
        model: "pca9685",
        address: "0x40",
        description: "test output 4",
        pin: 3,
        isPwm: false,
        isInvertedPwm: true,
      } as SDBOutput,
    ]);
    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();

    const outputList = new OutputList(mockSprootDB, logger);
    // Create
    await outputList.initializeOrRegenerateAsync();
    assert.equal(Object.keys(outputList.outputs).length, 4);

    // Update and delete
    getOutputsAsyncStub.resolves([
      {
        id: 1,
        model: "pca9685",
        address: "0x40",
        description: "1 tuptuo tset",
        pin: 0,
        isPwm: true,
        isInvertedPwm: false,
      } as SDBOutput,
    ]);
    await outputList.initializeOrRegenerateAsync();
    assert.equal(outputList.outputs["1"]!.description, "1 tuptuo tset");
    assert.equal(Object.keys(outputList.outputs).length, 1);
  });

  it("should delete pca9685 objects if there are no outputs left on the object", async function () {
    sandbox.createStubInstance(Pca9685Driver);
    sandbox.stub(Pca9685Driver.prototype, "dispose").callsFake(() => {});

    const getOutputsAsyncStub = sandbox.stub(MockSprootDB.prototype, "getOutputsAsync").resolves([
      {
        id: 1,
        model: "pca9685",
        address: "0x40",
        description: "test output 1",
        pin: 0,
        isPwm: true,
        isInvertedPwm: false,
      } as SDBOutput,
      {
        id: 2,
        model: "pca9685",
        address: "0x40",
        description: "test output 2",
        pin: 1,
        isPwm: false,
        isInvertedPwm: false,
      } as SDBOutput,
      {
        id: 3,
        model: "pca9685",
        address: "0x40",
        description: "test output 3",
        pin: 2,
        isPwm: true,
        isInvertedPwm: true,
      } as SDBOutput,
      {
        id: 4,
        model: "pca9685",
        address: "0x40",
        description: "test output 4",
        pin: 3,
        isPwm: false,
        isInvertedPwm: true,
      } as SDBOutput,
    ]);
    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();
    const outputList = new OutputList(mockSprootDB, logger);

    // Create
    await outputList.initializeOrRegenerateAsync();

    // Delete all PCA9685s
    getOutputsAsyncStub.resolves([]);
    await outputList.initializeOrRegenerateAsync();
    assert.isEmpty(outputList.pca9685Record);
  });

  it("should return output data (no functions)", async function () {
    sandbox.createStubInstance(Pca9685Driver);
    sandbox.stub(MockSprootDB.prototype, "getOutputsAsync").resolves([
      {
        id: 1,
        model: "pca9685",
        address: "0x40",
        description: "test output 1",
        pin: 0,
        isPwm: true,
        isInvertedPwm: false,
      } as SDBOutput,
    ]);
    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();

    const outputList = new OutputList(mockSprootDB, logger);
    await outputList.initializeOrRegenerateAsync();
    const outputData = outputList.outputData;

    assert.equal(outputData["1"]!["description"], "test output 1");
    assert.equal(outputData["1"]!["pin"], 0);
    assert.equal(outputData["1"]!["isPwm"], true);
    assert.equal(outputData["1"]!["isInvertedPwm"], false);
    assert.exists(outputList.outputs["1"]!["sprootDB"]);
  });

  it("should dispose of all outputs", async function () {
    sandbox.createStubInstance(Pca9685Driver);
    sandbox.stub(Pca9685Driver.prototype, "dispose").callsFake(() => {});

    sandbox.stub(MockSprootDB.prototype, "getOutputsAsync").resolves([
      {
        id: 1,
        model: "pca9685",
        address: "0x40",
        description: "test output 1",
        pin: 0,
        isPwm: true,
        isInvertedPwm: false,
      } as SDBOutput,
      {
        id: 2,
        model: "pca9685",
        address: "0x40",
        description: "test output 2",
        pin: 1,
        isPwm: false,
        isInvertedPwm: false,
      } as SDBOutput,
      {
        id: 3,
        model: "pca9685",
        address: "0x40",
        description: "test output 3",
        pin: 2,
        isPwm: true,
        isInvertedPwm: true,
      } as SDBOutput,
      {
        id: 4,
        model: "pca9685",
        address: "0x40",
        description: "test output 4",
        pin: 3,
        isPwm: false,
        isInvertedPwm: true,
      } as SDBOutput,
    ]);
    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();
    const outputList = new OutputList(mockSprootDB, logger);

    // Create
    await outputList.initializeOrRegenerateAsync();
    outputList.dispose();
    assert.isEmpty(outputList.outputs);
    assert.isEmpty(outputList.pca9685Record);
  });
});
