import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { TPLinkSmartPlugs, TPLinkPlug } from "../TPLinkSmartPlugs";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { Device as SimulatedDevice, UdpServer } from "tplink-smarthome-simulator";
import { Plug } from "tplink-smarthome-api";

import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
import * as sinon from "sinon";
import winston from "winston";
import { OutputBase } from "../base/OutputBase";
const mockSprootDB = new MockSprootDB();

describe("tplinkPlug.ts tests", async function () {
  const simulatedHS300 = new SimulatedDevice({
    model: "hs300",
    address: "127.0.0.1",
    port: 9999,
    responseDelay: 0,
  });
  this.beforeAll(async () => {
    await simulatedHS300.start();
    await UdpServer.start();
  });
  this.afterAll(async () => {
    UdpServer.stop();
    await simulatedHS300.stop();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should create and delete TPLink Smart Plugs outputs", async function () {
    const logger = winston.createLogger({ silent: true });

    await using tplinkSmartPlugs = new TPLinkSmartPlugs(mockSprootDB, 5, 5, 5, 5, logger, 5000);

    // disposing with nothing shouldn't cause issues
    await tplinkSmartPlugs.disposeOutputAsync({} as OutputBase);
    const output1 = await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "TPLINK_SMART_PLUG",
      address: simulatedHS300.address,
      name: "test output 1",
      pin: simulatedHS300.children[0]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output2 = await tplinkSmartPlugs.createOutputAsync({
      id: 2,
      model: "TPLINK_SMART_PLUG",
      address: simulatedHS300.address,
      name: "test output 2",
      pin: simulatedHS300.children[1]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output3 = await tplinkSmartPlugs.createOutputAsync({
      id: 3,
      model: "TPLINK_SMART_PLUG",
      address: simulatedHS300.address,
      name: "test output 3",
      pin: simulatedHS300.children[2]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output4 = await tplinkSmartPlugs.createOutputAsync({
      id: 4,
      model: "TPLINK_SMART_PLUG",
      address: simulatedHS300.address,
      name: "test output 4",
      pin: simulatedHS300.children[3]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    assert.equal(Object.keys(tplinkSmartPlugs.outputs).length, 4);
    assert.exists(tplinkSmartPlugs.outputs["4"]);
    assert.equal(tplinkSmartPlugs.usedPins["127.0.0.1"]!.length, 4);
    assert.exists(tplinkSmartPlugs.boardRecord["127.0.0.1"]);

    tplinkSmartPlugs.outputs["1"]?.state.updateControlMode(ControlMode.manual);
    tplinkSmartPlugs.outputs["2"]?.state.updateControlMode(ControlMode.manual);
    await tplinkSmartPlugs.outputs["2"]?.setAndExecuteStateAsync({
      value: 0,
      controlMode: ControlMode.manual,
      logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    } as SDBOutputState);

    // Dispose 1 output
    await tplinkSmartPlugs.disposeOutputAsync(output4!);
    assert.equal(Object.keys(tplinkSmartPlugs.outputs).length, 3);
    assert.equal(tplinkSmartPlugs.usedPins["127.0.0.1"]!.length, 3);
    assert.isUndefined(tplinkSmartPlugs.outputs["4"]);

    // Disposing with a non existent pin should also not cause issues
    await tplinkSmartPlugs.disposeOutputAsync({ pin: "3", address: "127.0.0.1" } as OutputBase);

    // Dispose the rest
    await tplinkSmartPlugs.disposeOutputAsync(output1!);
    await tplinkSmartPlugs.disposeOutputAsync(output2!);
    await tplinkSmartPlugs.disposeOutputAsync(output3!);
    assert.equal(Object.keys(tplinkSmartPlugs.outputs).length, 0);
    assert.isUndefined(tplinkSmartPlugs.usedPins["127.0.0.1"]);
    assert.isUndefined(tplinkSmartPlugs.boardRecord["127.0.0.1"]);
  });

  it("available TPLink Smart Plugs should be tracked", async function () {
    const logger = winston.createLogger({ silent: true });
    await using tplinkSmartPlugs = new TPLinkSmartPlugs(mockSprootDB, 5, 5, 5, 5, logger, 5000);

    // No devices should be available at first - takes a hot sec for events to get emitted
    assert.equal(Object.keys(tplinkSmartPlugs.getAvailableDevices()).length, 0);

    // Wait a moment for the device to be detected
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(Object.keys(tplinkSmartPlugs.getAvailableDevices()).length, 6);

    const output1 = await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "TPLINK_SMART_PLUG",
      address: simulatedHS300.address,
      name: "test output 1",
      pin: simulatedHS300.children[0]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    assert.equal(Object.keys(tplinkSmartPlugs.getAvailableDevices()).length, 5);
    assert.equal(Object.keys(tplinkSmartPlugs.getAvailableDevices(undefined, false)).length, 6);
    await tplinkSmartPlugs.disposeOutputAsync(output1!);

    assert.equal(Object.keys(tplinkSmartPlugs.getAvailableDevices()).length, 6);
  });

  it("creation should skip outputs that are already being created", async function () {
    const warnStub = sinon.stub();
    sinon
      .stub(winston, "createLogger")
      .callsFake(
        () => ({ info: () => {}, warn: warnStub, error: () => {} }) as unknown as winston.Logger,
      );
    const logger = winston.createLogger();

    await using tplinkSmartPlugs = new TPLinkSmartPlugs(mockSprootDB, 5, 5, 5, 5, logger, 50);

    (await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "TPLINK_SMART_PLUG",
      address: simulatedHS300.address,
      name: "test output 1",
      pin: simulatedHS300.children[0]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput),
      await Promise.allSettled([
        tplinkSmartPlugs.createOutputAsync({
          id: 1,
          model: "TPLINK_SMART_PLUG",
          address: simulatedHS300.address,
          name: "test output 1",
          pin: simulatedHS300.children[0]?.sysinfo.id,
          isPwm: false,
          isInvertedPwm: false,
        } as SDBOutput),
        tplinkSmartPlugs.createOutputAsync({
          id: 1,
          model: "TPLINK_SMART_PLUG",
          address: simulatedHS300.address,
          name: "test output 1",
          pin: simulatedHS300.children[0]?.sysinfo.id,
          isPwm: false,
          isInvertedPwm: false,
        } as SDBOutput),
        tplinkSmartPlugs.createOutputAsync({
          id: 1,
          model: "TPLINK_SMART_PLUG",
          address: simulatedHS300.address,
          name: "test output 1",
          pin: simulatedHS300.children[0]?.sysinfo.id,
          isPwm: false,
          isInvertedPwm: false,
        } as SDBOutput),
      ]));

    assert.equal(warnStub.callCount, 2);
    await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "TPLINK_SMART_PLUG",
      address: simulatedHS300.address,
      name: "test output 1",
      pin: simulatedHS300.children[0]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    assert.equal(warnStub.callCount, 2); // No warnings - output should be successfully created as a single call (no interfering runs).
  });

  it("should return output data (no functions)", async function () {
    const logger = winston.createLogger({ silent: true });

    await using tplinkSmartPlugs = new TPLinkSmartPlugs(mockSprootDB, 5, 5, 5, 5, logger, 50);

    await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "TPLINK_SMART_PLUG",
      address: simulatedHS300.address,
      name: "test output 1",
      pin: simulatedHS300.children[0]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    let outputData = tplinkSmartPlugs.outputData;

    assert.equal(outputData["1"]!["name"], "test output 1");
    assert.equal(outputData["1"]!["pin"], simulatedHS300.children[0]?.sysinfo.id);
    assert.equal(outputData["1"]!["isPwm"], false);
    assert.equal(outputData["1"]!["isInvertedPwm"], false);
    assert.notExists((tplinkSmartPlugs.outputs["1"]! as TPLinkPlug).tplinkPlug);
    assert.exists(tplinkSmartPlugs.outputs["1"]!["sprootDB"]);

    // This here verifies that we're handling events properly (since we've got a fancy registry to make these grab plugs
    // and update their state on the fly). It takes a hot minute for the client to start lookin', so give it a few seconds
    // to figure itself out and grab the plug when it comes online.
    await new Promise((resolve) => setTimeout(resolve, 200));
    outputData = tplinkSmartPlugs.outputData;
    assert.exists((tplinkSmartPlugs.outputs["1"]! as TPLinkPlug).tplinkPlug);
  });

  it("should update and apply states with respect to control mode", async function () {
    const logger = winston.createLogger({ silent: true });
    const setStatePowerStub = sinon.stub(Plug.prototype, "setPowerState").resolves(true);
    await using tplinkSmartPlugs = new TPLinkSmartPlugs(mockSprootDB, 5, 5, 5, 5, logger, 50);
    await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "TPLINK_SMART_PLUG",
      name: "test output 1",
      pin: simulatedHS300.children[0]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    // The client created in the constructor takes a hot second to start lookin', so give it a few seconds to figure itself out.
    // This here also verifies that we're handling events properly (since we've got a fancy registry to make these grab plugs
    // and update their state on the fly).
    await new Promise((resolve) => setTimeout(resolve, 200));

    //Automatic High
    await tplinkSmartPlugs.setAndExecuteStateAsync("1", {
      value: 100,
      controlMode: ControlMode.automatic,
      logTime: new Date().toISOString(),
    } as SDBOutputState);
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 100);
    assert.equal(setStatePowerStub.getCall(0).args[0], true);
    assert.equal(setStatePowerStub.callCount, 1);

    //Automatic Low
    await tplinkSmartPlugs.setAndExecuteStateAsync("1", {
      value: 0,
      controlMode: ControlMode.automatic,
      logTime: new Date().toISOString(),
    } as SDBOutputState);
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 0);
    assert.equal(setStatePowerStub.getCall(1).args[0], false);
    assert.equal(setStatePowerStub.callCount, 2);

    //Swap to Manual (+0 execution call, manual is also low)
    tplinkSmartPlugs.updateControlModeAsync("1", ControlMode.manual);
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.manual.value, 0);
    assert.equal(setStatePowerStub.callCount, 2);

    //Manual High
    await tplinkSmartPlugs.setAndExecuteStateAsync("1", {
      value: 100,
      controlMode: ControlMode.manual,
      logTime: new Date().toISOString(),
    } as SDBOutputState);
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.manual.value, 100);
    assert.equal(setStatePowerStub.callCount, 3);
    assert.equal(setStatePowerStub.getCall(2).args[0], true);

    //Automatic Low (+1 execution call, switching back to automatic mode (low -> high))
    tplinkSmartPlugs.updateControlModeAsync("1", ControlMode.automatic);
    await tplinkSmartPlugs.setAndExecuteStateAsync("1", {
      value: 0,
      controlMode: ControlMode.automatic,
      logTime: new Date().toISOString(),
    } as SDBOutputState);
    assert.equal(setStatePowerStub.callCount, 4);
    assert.equal(setStatePowerStub.getCall(3).args[0], false);

    //Automatic Low (+0 execution call, switching back to automatic mode (low -> low))
    tplinkSmartPlugs.updateControlModeAsync("1", ControlMode.automatic);
    assert.equal(setStatePowerStub.callCount, 4);

    //Inverted PWM Execution (Overwrite existing sensor here)
    await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "TPLINK_SMART_PLUG",
      name: "test output 1",
      pin: simulatedHS300.children[0]?.sysinfo.id,
      isPwm: true,
      isInvertedPwm: true,
    } as SDBOutput);

    await tplinkSmartPlugs.setAndExecuteStateAsync("1", {
      value: 100,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 100);
    assert.equal(setStatePowerStub.callCount, 5);
    assert.equal(setStatePowerStub.getCall(4).args[0], false);

    //PWM error handling
    await tplinkSmartPlugs.setAndExecuteStateAsync("1", {
      value: -1,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 0);
    assert.equal(setStatePowerStub.callCount, 6);

    await tplinkSmartPlugs.setAndExecuteStateAsync("1", {
      value: 101,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 100);
    assert.equal(setStatePowerStub.callCount, 7);

    //Non-PWM error handling
    await tplinkSmartPlugs.createOutputAsync({
      id: 2,
      model: "TPLINK_SMART_PLUG",
      name: "test output 1",
      pin: simulatedHS300.children[0]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    //Execute non-pwm output (not 0 or 100, but should get normalized to "100" since its not 0)
    await tplinkSmartPlugs.setAndExecuteStateAsync("2", {
      value: 75,
      controlMode: ControlMode.automatic,
    } as SDBOutputState);
    assert.equal(setStatePowerStub.callCount, 8);
  });

  it("should handle power-on and power-off events", async function () {
    const infoStub = sinon.stub();
    const warnStub = sinon.stub();
    sinon.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: infoStub,
          warn: warnStub,
          error: () => {},
          verbose: () => {},
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();
    const setStatePowerStub = sinon.stub(Plug.prototype, "setPowerState").resolves(true);
    await using tplinkSmartPlugs = new TPLinkSmartPlugs(mockSprootDB, 5, 5, 5, 5, logger);
    const plug = await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "TPLINK_SMART_PLUG",
      name: "test output 1",
      pin: simulatedHS300.children[0]?.sysinfo.id,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    // The client created in the constructor takes a hot second to start lookin', so give it a few seconds to figure itself out.
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Some simple "If we're in manual, does it update the state to reflect this?"
    await plug!.updateControlModeAsync(ControlMode.manual);

    assert.equal(infoStub.callCount, 2);
    assert.equal(plug!.controlMode, ControlMode.manual);
    assert.equal(plug!.value, 0);

    (tplinkSmartPlugs.outputs["1"] as TPLinkPlug).tplinkPlug?.emit("power-on");
    assert.equal(infoStub.callCount, 3);
    assert.equal(plug!.controlMode, ControlMode.manual);
    assert.equal(plug!.value, 100);

    await new Promise((r) => setTimeout(r, 10)); // Wait for any debounced calls to finish
    (tplinkSmartPlugs.outputs["1"] as TPLinkPlug).tplinkPlug?.emit("power-off");
    assert.equal(infoStub.callCount, 4);
    assert.equal(plug!.controlMode, ControlMode.manual);
    assert.equal(plug!.value, 0);

    // Some simple "If we're in automatic, does it reapply the state we were just in?"
    await plug!.updateControlModeAsync(ControlMode.automatic);
    await plug!.setAndExecuteStateAsync({
      controlMode: ControlMode.automatic,
      value: 100,
    } as SDBOutputState);
    assert.equal(plug!.controlMode, ControlMode.automatic);
    assert.equal(plug!.value, 100);
    assert.equal(setStatePowerStub.callCount, 1);

    (tplinkSmartPlugs.outputs["1"] as TPLinkPlug).tplinkPlug?.emit("power-off");
    assert.equal(plug!.controlMode, ControlMode.automatic);
    assert.equal(plug!.value, 100);
    assert.equal(setStatePowerStub.callCount, 2);

    await new Promise((r) => setTimeout(r, 10)); // Wait for any debounced calls to finish
    (tplinkSmartPlugs.outputs["1"] as TPLinkPlug).tplinkPlug?.emit("power-on");
    assert.equal(plug!.controlMode, ControlMode.automatic);
    assert.equal(plug!.value, 100);
    assert.equal(setStatePowerStub.callCount, 3);

    // Without forcing an execution in the listener, the following sequence
    // would fail to turn the output off.
    await plug!.setAndExecuteStateAsync({
      controlMode: ControlMode.automatic,
      value: 0,
    } as SDBOutputState);

    await plug!.setAndExecuteStateAsync({
      controlMode: ControlMode.automatic,
      value: 0,
    } as SDBOutputState);

    assert.equal(setStatePowerStub.callCount, 4);
    assert.equal(plug!.controlMode, ControlMode.automatic);
    assert.equal(plug!.value, 0);

    (tplinkSmartPlugs.outputs["1"] as TPLinkPlug).tplinkPlug?.emit("power-on");

    assert.equal(setStatePowerStub.callCount, 5);
    assert.equal(plug!.controlMode, ControlMode.automatic);
    assert.equal(plug!.value, 0);
  });
});
