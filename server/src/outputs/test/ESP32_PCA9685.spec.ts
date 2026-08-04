import type { IOutputsRepository } from "../../database/repositories/outputs/IOutputsRepository";
import type { IOutputActionsRepository } from "../../database/repositories/automations/actions/IOutputActionsRepository";
import type { ISubcontrollersRepository } from "../../database/repositories/subcontrollers/ISubcontrollersRepository";
import { DeviceDataQueryRow } from "@sproot/common/api/v2/QueryTypes";
import { ESP32_PCA9685 } from "../ESP32_PCA9685";
import { SDBOutput } from "@sproot/common/database/SDBOutput";
import { SDBSubcontroller } from "@sproot/common/database/SDBSubcontroller";
import { OutputBase } from "../base/OutputBase";
import { Models } from "@sproot/common/outputs/Models";
import { ControlMode } from "@sproot/common/outputs/IOutputBase";
import { SDBOutputState } from "@sproot/common/database/SDBOutputState";

import { assert } from "chai";
import nock from "nock";
import * as sinon from "sinon";
import winston from "winston";
import { MdnsService } from "../../system/MdnsService";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { AvailableDevice } from "@sproot/common/utility/DeviceTypes";

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

describe("ESP32_PCA9685.ts tests", function () {
  this.beforeEach(() => {
    sinon.stub(mockSubcontrollersRepo, "getAllAsync").resolves([
      {
        id: 1,
        type: "ESP32",
        hostName: "sproot-device.local",
        name: "PCA9685 Controller",
        secureToken: "token",
      },
    ]);
  });
  this.afterEach(() => {
    sinon.restore();
  });

  it("should create and delete PCA9685 outputs", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    mockMdnsService.getIPAddressByHostName.returns("127.0.0.1");
    const scope = nock("http://127.0.0.1")
      .persist()
      .put(/^\/api\/outputs\/pca9685\/0x(?:[0-7][0-9A-Fa-f]|[0-9A-Fa-f])\/(?:[0-9]|1[0-5])$/)
      .reply(200, { status: "ok" });

    sinon
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();
    const eventBus = new MemoryEventBus(logger);

    const pca9685 = new ESP32_PCA9685(
      eventBus,
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo,
      mockMdnsService,
      5,
      5,
      5,
      undefined,
      logger,
    );
    // disposing with nothing shouldn't cause issues
    await pca9685.disposeOutputAsync({} as OutputBase);

    // Missing a subcontrollerID
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.ESP32_PCA9685,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);
    const output2 = await pca9685.createOutputAsync({
      id: 2,
      model: Models.ESP32_PCA9685,
      subcontrollerId: 1,
      address: "0x40",
      name: "test output 2",
      pin: "1",
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output3 = await pca9685.createOutputAsync({
      id: 3,
      model: Models.ESP32_PCA9685,
      subcontrollerId: 1,
      address: "0x40",
      name: "test output 3",
      pin: "2",
      isPwm: true,
      isInvertedPwm: true,
    } as SDBOutput);
    const output4 = await pca9685.createOutputAsync({
      id: 4,
      model: Models.ESP32_PCA9685,
      subcontrollerId: 1,
      address: "0x40",
      name: "test output 4",
      pin: "3",
      isPwm: false,
      isInvertedPwm: true,
    } as SDBOutput);
    assert.equal(Object.keys(pca9685.outputs).length, 3);
    assert.exists(pca9685.outputs["4"]);
    assert.equal((pca9685.usedPins["1"] as Record<string, string[]>)["0x40"]!.length, 3);

    // Dispose 1 output
    await pca9685.disposeOutputAsync(output4!);
    assert.equal(Object.keys(pca9685.outputs).length, 2);
    assert.equal((pca9685.usedPins["1"] as Record<string, string[]>)["0x40"]!.length, 2);
    assert.isUndefined(pca9685.outputs["4"]);

    // disposing with a non existent pin should also not cause issues
    await pca9685.disposeOutputAsync({ pin: "3", address: "0x40" } as OutputBase);

    // Dispose the rest
    await pca9685.disposeOutputAsync(output2!);
    await pca9685.disposeOutputAsync(output3!);
    assert.equal(Object.keys(pca9685.outputs).length, 0);
    assert.isEmpty((pca9685.usedPins["1"] as Record<string, string[]>)["0x40"]);

    scope.done();
  });

  it("should return output data (no functions)", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    mockMdnsService.getIPAddressByHostName.returns("127.0.0.5");
    sinon
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();
    const eventBus = new MemoryEventBus(logger);

    const pca9685 = new ESP32_PCA9685(
      eventBus,
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo,
      mockMdnsService,
      5,
      5,
      5,
      undefined,
      logger,
    );
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.ESP32_PCA9685,
      subcontrollerId: 1,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);
    const outputData = pca9685.outputData;

    assert.equal(outputData["1"]!["name"], "test output 1");
    assert.equal(outputData["1"]!["subcontrollerId"], 1);
    assert.equal(outputData["1"]!["pin"], "0");
    assert.equal(outputData["1"]!["isPwm"], true);
    assert.equal(outputData["1"]!["isInvertedPwm"], false);
    assert.exists(pca9685.outputs["1"]!["outputsRepository"]);
  });

  it("should update and apply states with respect to control mode", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    mockMdnsService.getIPAddressByHostName.returns("127.0.0.2");
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
    const eventBus = new MemoryEventBus(logger);

    let callCount = 0;
    let capturedBody: { value: number } | null = null;
    const scope = nock("http://127.0.0.2")
      .persist()
      .put(
        /^\/api\/outputs\/pca9685\/0x(?:[0-7][0-9A-Fa-f]|[0-9A-Fa-f])\/(?:[0-9]|1[0-5])$/,
        (body) => {
          capturedBody = body;
          return true;
        },
      )
      .reply(200, () => {
        callCount++;
        return { status: "ok" };
      });

    const pca9685 = new ESP32_PCA9685(
      eventBus,
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo,
      mockMdnsService,
      5,
      5,
      5,
      undefined,
      logger,
    );
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.PCA9685,
      subcontrollerId: 1,
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
    assert.equal(callCount, 1);
    assert.equal(capturedBody!.value, 100);

    //Automatic Low
    await pca9685.setAndExecuteStateAsync("1", {
      value: 0,
      controlMode: ControlMode.automatic,
      logTime: new Date().toISOString(),
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 0);
    assert.equal(callCount, 2);
    assert.equal(capturedBody!.value, 0);

    //Swap to Manual (+0 execution call, manual is also low)
    await pca9685.updateControlModeAsync("1", ControlMode.manual);
    assert.equal(callCount, 2);

    //Manual High
    await pca9685.setAndExecuteStateAsync("1", {
      value: 100,
      controlMode: ControlMode.manual,
      logTime: new Date().toISOString(),
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.manual.value, 100);
    assert.equal(callCount, 3);
    assert.equal(capturedBody!.value, 100);

    //Automatic Low (+1 execution call, switching back to automatic mode (high -> low))
    await pca9685.updateControlModeAsync("1", ControlMode.automatic);
    assert.equal(callCount, 4);
    assert.equal(capturedBody!.value, 0);

    //Automatic Low (+0 execution call, switching back to automatic mode (low -> low))
    await pca9685.updateControlModeAsync("1", ControlMode.automatic);
    assert.equal(callCount, 4);

    //Inverted PWM Execution
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.PCA9685,
      subcontrollerId: 1,
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
    assert.equal(callCount, 5);
    assert.equal(capturedBody!.value, 0);

    //PWM error handling
    await pca9685.setAndExecuteStateAsync("1", {
      value: -1,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 0);
    assert.equal(callCount, 6);

    await pca9685.setAndExecuteStateAsync("1", {
      value: 101,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 100);
    assert.equal(callCount, 7);

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

    //Execute non-pwm output (not 0 or 100)
    await pca9685.setAndExecuteStateAsync("2", {
      value: 75,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(callCount, 7);
    scope.done();
  });
});

describe("ESP32_PCA9685.getAvailableDevices", function () {
  this.beforeEach(() => {
    sinon.stub(mockSubcontrollersRepo, "getAllAsync").resolves([
      {
        id: 1,
        hostName: "esp32-1",
        type: "ESP32",
        name: "ESP32 1",
        secureToken: null,
      } as SDBSubcontroller,
    ]);
  });

  this.afterEach(() => {
    sinon.restore();
  });

  it("should return devices per subcontroller with correct subcontrollerId", async () => {
    sinon.stub(mockOutputsRepo, "getByModelAsync").resolves([]);
    const logger = winston.createLogger({ silent: true }) as winston.Logger;
    const mdnsService = sinon.createStubInstance(MdnsService);
    const esp = new ESP32_PCA9685(
      new MemoryEventBus(logger),
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo as any,
      mdnsService as any,
      5,
      5,
      5,
      800,
      logger,
    );
    const result = await esp.getAvailableDevices();
    assert.lengthOf(result, 1024);
    assert.equal(result[0]!.subcontrollerId, 1);
  });

  it("should return 2048 devices (2 subcontrollers x 1024) with correct subcontrollerId", async () => {
    (mockSubcontrollersRepo.getAllAsync as any).resolves([
      {
        id: 1,
        hostName: "esp32-1",
        type: "ESP32",
        name: "ESP32 1",
        secureToken: null,
      } as SDBSubcontroller,
      {
        id: 2,
        hostName: "esp32-2",
        type: "ESP32",
        name: "ESP32 2",
        secureToken: null,
      } as SDBSubcontroller,
    ]);
    sinon.stub(mockOutputsRepo, "getByModelAsync").resolves([]);
    const logger = winston.createLogger({ silent: true }) as winston.Logger;
    const mdnsService = sinon.createStubInstance(MdnsService);
    const esp = new ESP32_PCA9685(
      new MemoryEventBus(logger),
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo as any,
      mdnsService as any,
      5,
      5,
      5,
      800,
      logger,
    );
    const result = await esp.getAvailableDevices();
    assert.lengthOf(result, 2048);
    const sub1Devices = result.filter((d: AvailableDevice) => d.subcontrollerId === 1);
    const sub2Devices = result.filter((d: AvailableDevice) => d.subcontrollerId === 2);
    assert.lengthOf(sub1Devices, 1024);
    assert.lengthOf(sub2Devices, 1024);
  });

  it("should filter used channels per subcontroller per address", async () => {
    sinon.stub(mockOutputsRepo, "getByModelAsync").resolves([
      {
        id: 1,
        model: Models.ESP32_PCA9685,
        address: "0x40",
        pin: "0",
        subcontrollerId: 1,
      } as SDBOutput,
    ]);
    const logger = winston.createLogger({ silent: true }) as winston.Logger;
    const mdnsService = sinon.createStubInstance(MdnsService);
    const esp = new ESP32_PCA9685(
      new MemoryEventBus(logger),
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo as any,
      mdnsService as any,
      5,
      5,
      5,
      800,
      logger,
    );
    const result = await esp.getAvailableDevices();
    assert.lengthOf(result, 1023);
    const ch0Devices = result.filter((d: AvailableDevice) => d.address === "0x40");
    assert.lengthOf(ch0Devices, 15);
    assert.isFalse(ch0Devices.some((d: AvailableDevice) => d.pins?.includes("0")));
  });

  it("should return alias: null for all ESP32_PCA9685 devices", async () => {
    sinon.stub(mockOutputsRepo, "getByModelAsync").resolves([]);
    const logger = winston.createLogger({ silent: true }) as winston.Logger;
    const mdnsService = sinon.createStubInstance(MdnsService);
    const esp = new ESP32_PCA9685(
      new MemoryEventBus(logger),
      mockOutputsRepo,
      mockOutputActionsRepo,
      mockSubcontrollersRepo as any,
      mdnsService as any,
      5,
      5,
      5,
      800,
      logger,
    );
    const result = await esp.getAvailableDevices();
    assert.isTrue(result.every((d: AvailableDevice) => d.alias === null));
  });
});
