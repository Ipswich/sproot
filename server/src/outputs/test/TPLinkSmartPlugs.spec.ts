import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { TPLinkSmartPlugs, TPLinkPlug } from "../TPLinkSmartPlugs";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { UdpServer, Device as SimulatedDevice } from "tplink-smarthome-simulator";
import { Plug } from "tplink-smarthome-api";

import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
import * as sinon from "sinon";
import winston from "winston";
import { OutputBase } from "../base/OutputBase";
import { Client } from "tplink-smarthome-api";
const mockSprootDB = new MockSprootDB();

describe("tplinkPlug.ts tests", function () {
  const simulatedHS300 = new SimulatedDevice({
    model: "hs300",
    address: "127.0.0.1",
    port: 9999,
    responseDelay: 0,
  });
  simulatedHS300.start();
  UdpServer.start();
  this.afterAll(() => {
    simulatedHS300.stop();
    UdpServer.stop();
  });
  afterEach(() => {
    sinon.restore();
  });
  // Helper function, some of these take a very small blip to pick up the mocked devices
  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  it("should create and delete TPLink Smart Plugs outputs", async function () {
    sinon
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();
    const client = new Client();

    using tplinkSmartPlugs = new TPLinkSmartPlugs(mockSprootDB, 5, 5, 5, 5, logger);
    await delay(20);
    const childIds = tplinkSmartPlugs.getAvailableDevices("127.0.0.1");
    const plug1 = await client.getDevice({ host: "127.0.0.1", childId: childIds[0]?.externalId });
    await plug1.setPowerState(true);

    // disposing with nothing shouldn't cause issues
    tplinkSmartPlugs.disposeOutput({} as OutputBase);
    const output1 = await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "tplinkPlug",
      address: "127.0.0.1",
      name: "test output 1",
      pin: childIds[0]?.externalId,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output2 = await tplinkSmartPlugs.createOutputAsync({
      id: 2,
      model: "tplinkPlug",
      address: "127.0.0.1",
      name: "test output 2",
      pin: childIds[1]?.externalId,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output3 = await tplinkSmartPlugs.createOutputAsync({
      id: 3,
      model: "tplinkPlug",
      address: "127.0.0.1",
      name: "test output 3",
      pin: childIds[2]?.externalId,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output4 = await tplinkSmartPlugs.createOutputAsync({
      id: 4,
      model: "tplinkPlug",
      address: "127.0.0.1",
      name: "test output 4",
      pin: childIds[3]?.externalId,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    assert.equal(Object.keys(tplinkSmartPlugs.outputs).length, 4);
    assert.exists(tplinkSmartPlugs.outputs["4"]);
    assert.equal(tplinkSmartPlugs.usedPins["127.0.0.1"]!.length, 4);
    assert.exists(tplinkSmartPlugs.boardRecord["127.0.0.1"]);
    // Should inherit from the existing state of the tplink device
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.manual.value, 100);
    assert.equal(tplinkSmartPlugs.outputs["2"]?.state.manual.value, 0);

    tplinkSmartPlugs.outputs["1"]?.state.updateControlMode(ControlMode.manual);
    tplinkSmartPlugs.outputs["2"]?.state.updateControlMode(ControlMode.manual);
    tplinkSmartPlugs.outputs["2"]?.setNewState(
      {
        value: 0,
        controlMode: ControlMode.manual,
        logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
      } as SDBOutputState,
      ControlMode.manual,
    );

    // Dispose 1 output
    tplinkSmartPlugs.disposeOutput(output4!);
    assert.equal(Object.keys(tplinkSmartPlugs.outputs).length, 3);
    assert.equal(tplinkSmartPlugs.usedPins["127.0.0.1"]!.length, 3);
    assert.isUndefined(tplinkSmartPlugs.outputs["4"]);

    // Disposing with a non existent pin should also not cause issues
    tplinkSmartPlugs.disposeOutput({ pin: "3", address: "127.0.0.1" } as OutputBase);

    // Dispose the rest
    tplinkSmartPlugs.disposeOutput(output1!);
    tplinkSmartPlugs.disposeOutput(output2!);
    tplinkSmartPlugs.disposeOutput(output3!);
    assert.equal(Object.keys(tplinkSmartPlugs.outputs).length, 0);
    assert.isUndefined(tplinkSmartPlugs.usedPins["127.0.0.1"]);
    assert.isUndefined(tplinkSmartPlugs.boardRecord["127.0.0.1"]);
  });

  it("should return output data (no functions)", async function () {
    sinon
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();

    using tplinkSmartPlugs = new TPLinkSmartPlugs(mockSprootDB, 5, 5, 5, 5, logger);
    await delay(20);
    const childIds = tplinkSmartPlugs.getAvailableDevices("127.0.0.1");

    await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "tplinkPlug",
      address: "127.0.0.1",
      name: "test output 1",
      pin: childIds[0]?.externalId,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const outputData = tplinkSmartPlugs.outputData;

    assert.equal(outputData["1"]!["name"], "test output 1");
    assert.equal(outputData["1"]!["pin"], childIds[0]?.externalId);
    assert.equal(outputData["1"]!["isPwm"], false);
    assert.equal(outputData["1"]!["isInvertedPwm"], false);
    assert.exists((tplinkSmartPlugs.outputs["1"]! as TPLinkPlug).tplinkPlug);
    assert.exists(tplinkSmartPlugs.outputs["1"]!["sprootDB"]);
  });

  it("should update and apply states with respect to control mode", async function () {
    sinon
      .stub(winston, "createLogger")
      .callsFake(
        () => ({ info: () => {}, error: () => {}, verbose: () => {} }) as unknown as winston.Logger,
      );
    const logger = winston.createLogger();

    const setStateStub = sinon.stub(Plug.prototype, "setPowerState").resolves();
    using tplinkSmartPlugs = new TPLinkSmartPlugs(mockSprootDB, 5, 5, 5, 5, logger);
    await delay(20);
    const childIds = tplinkSmartPlugs.getAvailableDevices("127.0.0.1");
    await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "tplinkPlug",
      name: "test output 1",
      pin: childIds[0]?.externalId,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    //Automatic High
    tplinkSmartPlugs.setNewOutputState(
      "1",
      <SDBOutputState>{ value: 100, logTime: new Date().toISOString() },
      ControlMode.automatic,
    );
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 100);
    tplinkSmartPlugs.executeOutputState();
    //Creation calls once.
    assert.equal(setStateStub.callCount, 2);
    assert.equal(setStateStub.getCall(1).args[0], true);

    //Automatic Low
    tplinkSmartPlugs.setNewOutputState(
      "1",
      <SDBOutputState>{ value: 0, logTime: new Date().toISOString() },
      ControlMode.automatic,
    );
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 0);
    tplinkSmartPlugs.executeOutputState();
    assert.equal(setStateStub.callCount, 3);
    assert.equal(setStateStub.getCall(2).args[0], false);

    //Swap to Manual
    tplinkSmartPlugs.updateControlMode("1", ControlMode.manual);

    //Manual Low
    tplinkSmartPlugs.setNewOutputState(
      "1",
      <SDBOutputState>{ value: 0, logTime: new Date().toISOString() },
      ControlMode.manual,
    );
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.manual.value, 0);
    tplinkSmartPlugs.executeOutputState();
    assert.equal(setStateStub.callCount, 4);
    assert.equal(setStateStub.getCall(3).args[0], false);

    //Manual High
    tplinkSmartPlugs.setNewOutputState(
      "1",
      <SDBOutputState>{ value: 100, logTime: new Date().toISOString() },
      ControlMode.manual,
    );
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.manual.value, 100);
    tplinkSmartPlugs.executeOutputState();
    assert.equal(setStateStub.callCount, 5);
    assert.equal(setStateStub.getCall(4).args[0], true);

    //Swap to Automatic
    tplinkSmartPlugs.updateControlMode("1", ControlMode.automatic);

    //Execute Automatic Low
    tplinkSmartPlugs.executeOutputState();
    assert.equal(setStateStub.callCount, 6);
    assert.equal(setStateStub.getCall(5).args[0], false);

    //Inverted PWM Execution
    await tplinkSmartPlugs.createOutputAsync({
      id: 1,
      model: "tplinkPlug",
      name: "test output 1",
      pin: childIds[0]?.externalId,
      isPwm: true,
      isInvertedPwm: true,
    } as SDBOutput);

    tplinkSmartPlugs.setNewOutputState("1", <SDBOutputState>{ value: 100 }, ControlMode.automatic);
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 100);
    tplinkSmartPlugs.executeOutputState("1"); //Receives individual output id as well.
    assert.equal(setStateStub.callCount, 8);
    assert.equal(setStateStub.getCall(7).args[0], false);

    //PWM error handling
    tplinkSmartPlugs.setNewOutputState("1", <SDBOutputState>{ value: -1 }, ControlMode.automatic);
    tplinkSmartPlugs.executeOutputState("1"); //Receives individual output id as well.
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 0);
    assert.equal(setStateStub.callCount, 9);

    tplinkSmartPlugs.setNewOutputState("1", <SDBOutputState>{ value: 101 }, ControlMode.automatic);
    tplinkSmartPlugs.executeOutputState("1"); //Receives individual output id as well.
    assert.equal(tplinkSmartPlugs.outputs["1"]?.state.automatic.value, 100);
    assert.equal(setStateStub.callCount, 10);

    //Non-PWM error handling
    await tplinkSmartPlugs.createOutputAsync({
      id: 2,
      model: "tplinkPlug",
      name: "test output 1",
      pin: childIds[0]?.externalId,
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    //Execute non-pwm output (not 0 or 100)
    tplinkSmartPlugs.setNewOutputState("2", <SDBOutputState>{ value: 75 }, ControlMode.automatic);
    tplinkSmartPlugs.executeOutputState("2");
    assert.equal(setStateStub.callCount, 11);
  });
});
