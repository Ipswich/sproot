import { ControlMode } from "@sproot/common/outputs/IOutputBase";
import type { IOutputsRepository } from "../../database/repositories/outputs/IOutputsRepository";
import type { IOutputActionsRepository } from "../../database/repositories/automations/actions/IOutputActionsRepository";
import type { ISubcontrollersRepository } from "../../database/repositories/subcontrollers/ISubcontrollersRepository";
import { DeviceDataQueryRow } from "@sproot/common/api/v2/QueryTypes";
import { PCA9685, PCA9685Output } from "../PCA9685";
import { SDBOutput } from "@sproot/common/database/SDBOutput";
import { SDBOutputState } from "@sproot/common/database/SDBOutputState";
import { Pca9685Driver } from "pca9685";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
import { OutputBase } from "../base/OutputBase";
import { Models } from "@sproot/common/outputs/Models";
import { AvailableDevice } from "@sproot/common/utility/DeviceTypes";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";

const createMockOutputsRepo = (): IOutputsRepository => ({
  getAllAsync: async () => [],
  getByIdAsync: async () => [],
  getByModelAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
  updateLastOutputStateAsync: async () => {},
  getLastOutputStateAsync: async () => [],
  addOutputStateAsync: async () => {},
  getOutputStatesAsync: async () => [],
  getBucketedOutputStatesAsync: async () => [],
  getDataAsync: async () => ({
    xAxis: { field: "time", values: [] },
    data: null as unknown as DeviceDataQueryRow,
  }),
});

const createMockOutputActionsRepo = (): IOutputActionsRepository => ({
  getAllAsync: async () => [],
  getAsync: async () => [],
  addAsync: async () => 0,
  getOutputActionAsync: async () => [],
  getActionsByOutputIdAsync: async () => [],
  updateAsync: async () => {},
  deleteAsync: async () => {},
});

const createMockSubcontrollersRepo = (): ISubcontrollersRepository => ({
  getAllAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => 0,
  deleteAsync: async () => 0,
});

const mockOutputsRepo = createMockOutputsRepo();
const mockOutputActionsRepo = createMockOutputActionsRepo();
const mockSubcontrollersRepo = createMockSubcontrollersRepo();

function stubPca9685DutyCycle() {
  return sinon.stub(Pca9685Driver.prototype, "setDutyCycle").callsFake((...args) => {
    const callback = args[3];
    if (typeof callback === "function") {
      callback(undefined);
    }
  });
}

describe("PCA9685.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });

  it("should create and delete PCA9685 outputs", async function () {
    sinon.createStubInstance(Pca9685Driver);
    sinon
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();
    const eventBus = new MemoryEventBus(logger);

    const pca9685 = new PCA9685(
      eventBus,
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo,
      5,
      5,
      5,
      undefined,
      logger,
    );
    // disposing with nothing shouldn't cause issues
    await pca9685.disposeOutputAsync({} as OutputBase);

    const output1 = await pca9685.createOutputAsync({
      id: 1,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);
    const output2 = await pca9685.createOutputAsync({
      id: 2,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 2",
      pin: "1",
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output3 = await pca9685.createOutputAsync({
      id: 3,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 3",
      pin: "2",
      isPwm: true,
      isInvertedPwm: true,
    } as SDBOutput);
    const output4 = await pca9685.createOutputAsync({
      id: 4,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 4",
      pin: "3",
      isPwm: false,
      isInvertedPwm: true,
    } as SDBOutput);
    assert.equal(Object.keys(pca9685.outputs).length, 4);
    assert.exists(pca9685.outputs["4"]);
    assert.equal(pca9685.usedPins["0x40"]!.length, 4);
    assert.exists(pca9685.boardRecord["0x40"]);

    // Dispose 1 output
    await pca9685.disposeOutputAsync(output4!);
    assert.equal(Object.keys(pca9685.outputs).length, 3);
    assert.equal(pca9685.usedPins["0x40"]!.length, 3);
    assert.isUndefined(pca9685.outputs["4"]);

    // disposing with a non existent pin should also not cause issues
    await pca9685.disposeOutputAsync({ pin: "3", address: "0x40" } as OutputBase);

    // Dispose the rest
    await pca9685.disposeOutputAsync(output1!);
    await pca9685.disposeOutputAsync(output2!);
    await pca9685.disposeOutputAsync(output3!);
    assert.equal(Object.keys(pca9685.outputs).length, 0);
    assert.isUndefined(pca9685.usedPins["0x40"]);
    assert.isUndefined(pca9685.boardRecord["0x40"]);
  });

  it("should return output data (no functions)", async function () {
    sinon.createStubInstance(Pca9685Driver);
    sinon
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();
    const eventBus = new MemoryEventBus(logger);

    const pca9685 = new PCA9685(
      eventBus,
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo,
      5,
      5,
      5,
      undefined,
      logger,
    );
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);
    const outputData = pca9685.outputData;

    assert.equal(outputData["1"]!["name"], "test output 1");
    assert.equal(outputData["1"]!["pin"], "0");
    assert.equal(outputData["1"]!["isPwm"], true);
    assert.equal(outputData["1"]!["isInvertedPwm"], false);
    assert.exists((pca9685.outputs["1"]! as PCA9685Output)["pca9685"]);
    assert.exists(pca9685.outputs["1"]!["outputsRepository"]);
  });

  it("should update and apply states with respect to control mode", async function () {
    sinon.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          verbose: () => {},
          debug: () => {},
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();
    sinon.createStubInstance(Pca9685Driver);
    const setDutyCycleStub = stubPca9685DutyCycle();
    const eventBus = new MemoryEventBus(logger);
    const pca9685 = new PCA9685(
      eventBus,
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo,
      5,
      5,
      5,
      undefined,
      logger,
    );
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);

    //Automatic High
    await pca9685.setAndExecuteStateAsync("1", {
      value: 100,
      controlMode: ControlMode.automatic,
      logTime: new Date().toISOString(),
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 100);
    assert.equal(setDutyCycleStub.callCount, 1);
    assert.equal(setDutyCycleStub.getCall(0).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(0).args[1], 1);

    //Automatic Low
    await pca9685.setAndExecuteStateAsync("1", {
      value: 0,
      controlMode: ControlMode.automatic,
      logTime: new Date().toISOString(),
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 0);
    assert.equal(setDutyCycleStub.callCount, 2);
    assert.equal(setDutyCycleStub.getCall(1).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(1).args[1], 0);

    //Swap to Manual (+0 execution call, manual is also low)
    await pca9685.updateControlModeAsync("1", ControlMode.manual);
    assert.equal(setDutyCycleStub.callCount, 2);

    //Manual High
    await pca9685.setAndExecuteStateAsync("1", {
      value: 100,
      controlMode: ControlMode.manual,
      logTime: new Date().toISOString(),
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.manual.value, 100);
    assert.equal(setDutyCycleStub.callCount, 3);
    assert.equal(setDutyCycleStub.getCall(2).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(2).args[1], 1);

    //Automatic Low (+1 execution call, switching back to automatic mode (high -> low)
    await pca9685.updateControlModeAsync("1", ControlMode.automatic);
    assert.equal(setDutyCycleStub.callCount, 4);
    assert.equal(setDutyCycleStub.getCall(3).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(3).args[1], 0);

    //Automatic Low (+0 execution call, switching back to automatic mode (low -> low))
    await pca9685.updateControlModeAsync("1", ControlMode.automatic);
    assert.equal(setDutyCycleStub.callCount, 4);

    //Inverted PWM Execution
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: true,
    } as SDBOutput);

    await pca9685.setAndExecuteStateAsync("1", {
      value: 100,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 100);
    assert.equal(setDutyCycleStub.callCount, 5);
    assert.equal(setDutyCycleStub.getCall(4).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(4).args[1], 0);

    //PWM error handling
    await pca9685.setAndExecuteStateAsync("1", {
      value: -1,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 0);
    assert.equal(setDutyCycleStub.callCount, 6);

    await pca9685.setAndExecuteStateAsync("1", {
      value: 101,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 100);
    assert.equal(setDutyCycleStub.callCount, 7);

    //Non-PWM error handling
    await pca9685.createOutputAsync({
      id: 2,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    //Execute non-pwm output (not 0 or 100, but should get normalized to "100" since its not 0)
    await pca9685.setAndExecuteStateAsync("2", {
      value: 75,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(setDutyCycleStub.callCount, 8);
  });
});

describe("PCA9685.getAvailableDevices", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should return all 1024 devices (64 addresses x 16 channels) when no outputs exist", async () => {
    const logger = winston.createLogger({ silent: true }) as winston.Logger;
    const outputsRepo = createMockOutputsRepo();
    sinon.stub(outputsRepo, "getByModelAsync").resolves([]);
    const pca = new PCA9685(
      new MemoryEventBus(logger),
      outputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo,
      5,
      5,
      5,
      800,
      logger,
    );
    const result = await pca.getAvailableDevices();
    assert.lengthOf(result, 1024);
    assert.equal(result[0]!.address, "0x40");
    assert.deepEqual(result[0]!.pins, ["0"]);
    assert.isNull(result[0]!.subcontrollerId);
  });

  it("should filter out used channels for an address", async () => {
    const logger = winston.createLogger({ silent: true }) as winston.Logger;
    const outputsRepo = createMockOutputsRepo();
    sinon.stub(outputsRepo, "getByModelAsync").resolves([
      {
        id: 1,
        model: Models.PCA9685,
        address: "0x40",
        pin: "0",
        subcontrollerId: null,
      } as SDBOutput,
      {
        id: 2,
        model: Models.PCA9685,
        address: "0x40",
        pin: "1",
        subcontrollerId: null,
      } as SDBOutput,
    ]);
    const pca = new PCA9685(
      new MemoryEventBus(logger),
      outputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo,
      5,
      5,
      5,
      800,
      logger,
    );
    const result = await pca.getAvailableDevices();
    assert.lengthOf(result, 1022);
    const ch0Devices = result.filter((d: AvailableDevice) => d.address === "0x40");
    assert.lengthOf(ch0Devices, 14);
    assert.isFalse(ch0Devices.some((d: AvailableDevice) => d.pins?.includes("0")));
    assert.isFalse(ch0Devices.some((d: AvailableDevice) => d.pins?.includes("1")));
  });

  it("should return alias: null for all PCA9685 devices", async () => {
    const logger = winston.createLogger({ silent: true }) as winston.Logger;
    const outputsRepo = createMockOutputsRepo();
    sinon.stub(outputsRepo, "getByModelAsync").resolves([]);
    const pca = new PCA9685(
      new MemoryEventBus(logger),
      outputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo,
      5,
      5,
      5,
      800,
      logger,
    );
    const result = await pca.getAvailableDevices();
    assert.isTrue(result.every((d: AvailableDevice) => d.alias === null));
  });
});
