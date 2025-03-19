import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { PCA9685, PCA9685Output } from "@sproot/sproot-server/src/outputs/PCA9685";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { Pca9685Driver } from "pca9685";

import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
import * as sinon from "sinon";
import winston from "winston";
import { OutputBase } from "../base/OutputBase";
const mockSprootDB = new MockSprootDB();

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

    const pca9685 = new PCA9685(mockSprootDB, 5, 5, 5, 5, undefined, logger);
    // disposing with nothing shouldn't cause issues
    pca9685.disposeOutput({} as OutputBase);

    const output1 = await pca9685.createOutputAsync({
      id: 1,
      model: "pca9685",
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);
    const output2 = await pca9685.createOutputAsync({
      id: 2,
      model: "pca9685",
      address: "0x40",
      name: "test output 2",
      pin: "1",
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output3 = await pca9685.createOutputAsync({
      id: 3,
      model: "pca9685",
      address: "0x40",
      name: "test output 3",
      pin: "2",
      isPwm: true,
      isInvertedPwm: true,
    } as SDBOutput);
    const output4 = await pca9685.createOutputAsync({
      id: 4,
      model: "pca9685",
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
    pca9685.disposeOutput(output4!);
    assert.equal(Object.keys(pca9685.outputs).length, 3);
    assert.equal(pca9685.usedPins["0x40"]!.length, 3);
    assert.isUndefined(pca9685.outputs["4"]);

    // disposing with a non existent pin should also not cause issues
    pca9685.disposeOutput({ pin: "3", address: "0x40" } as OutputBase);

    // Dispose the rest
    pca9685.disposeOutput(output1!);
    pca9685.disposeOutput(output2!);
    pca9685.disposeOutput(output3!);
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

    const pca9685 = new PCA9685(mockSprootDB, 5, 5, 5, 5, undefined, logger);
    await pca9685.createOutputAsync({
      id: 1,
      model: "pca9685",
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
    assert.exists(pca9685.outputs["1"]!["sprootDB"]);
  });

  it("should update and apply states with respect to control mode", async function () {
    sinon
      .stub(winston, "createLogger")
      .callsFake(
        () => ({ info: () => {}, error: () => {}, verbose: () => {} }) as unknown as winston.Logger,
      );
    const logger = winston.createLogger();
    sinon.createStubInstance(Pca9685Driver);
    const setDutyCycleStub = sinon.stub(Pca9685Driver.prototype, "setDutyCycle").returns();
    const pca9685 = new PCA9685(mockSprootDB, 5, 5, 5, 5, undefined, logger);
    await pca9685.createOutputAsync({
      id: 1,
      model: "pca9685",
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);

    //Automatic High
    pca9685.setNewOutputStateAsync(
      "1",
      <SDBOutputState>{ value: 100, logTime: new Date().toISOString() },
      ControlMode.automatic,
    );
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 100);
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 1);
    assert.equal(setDutyCycleStub.getCall(0).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(0).args[1], 1);

    //Automatic Low
    pca9685.setNewOutputStateAsync(
      "1",
      <SDBOutputState>{ value: 0, logTime: new Date().toISOString() },
      ControlMode.automatic,
    );
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 0);
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 2);
    assert.equal(setDutyCycleStub.getCall(1).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(1).args[1], 0);

    //Swap to Manual
    pca9685.updateControlMode("1", ControlMode.manual);

    //Manual Low
    pca9685.setNewOutputStateAsync(
      "1",
      <SDBOutputState>{ value: 0, logTime: new Date().toISOString() },
      ControlMode.manual,
    );
    assert.equal(pca9685.outputs["1"]?.state.manual.value, 0);
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 3);
    assert.equal(setDutyCycleStub.getCall(2).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(2).args[1], 0);

    //Manual High
    pca9685.setNewOutputStateAsync(
      "1",
      <SDBOutputState>{ value: 100, logTime: new Date().toISOString() },
      ControlMode.manual,
    );
    assert.equal(pca9685.outputs["1"]?.state.manual.value, 100);
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 4);
    assert.equal(setDutyCycleStub.getCall(3).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(3).args[1], 1);

    //Swap to Automatic
    pca9685.updateControlMode("1", ControlMode.automatic);

    //Execute Automatic Low
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 5);
    assert.equal(setDutyCycleStub.getCall(4).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(4).args[1], 0);

    //Inverted PWM Execution
    await pca9685.createOutputAsync({
      id: 1,
      model: "pca9685",
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: true,
    } as SDBOutput);

    pca9685.setNewOutputStateAsync("1", <SDBOutputState>{ value: 100 }, ControlMode.automatic);
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 100);
    pca9685.executeOutputState("1"); //Receives individual output id as well.
    assert.equal(setDutyCycleStub.callCount, 6);
    assert.equal(setDutyCycleStub.getCall(5).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(5).args[1], 0);

    //PWM error handling
    pca9685.setNewOutputStateAsync("1", <SDBOutputState>{ value: -1 }, ControlMode.automatic);
    pca9685.executeOutputState("1"); //Receives individual output id as well.
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 0);
    assert.equal(setDutyCycleStub.callCount, 7);

    pca9685.setNewOutputStateAsync("1", <SDBOutputState>{ value: 101 }, ControlMode.automatic);
    pca9685.executeOutputState("1"); //Receives individual output id as well.
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 100);
    assert.equal(setDutyCycleStub.callCount, 8);

    //Non-PWM error handling
    await pca9685.createOutputAsync({
      id: 2,
      model: "pca9685",
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    //Execute non-pwm output (not 0 or 100)
    pca9685.setNewOutputStateAsync("2", <SDBOutputState>{ value: 75 }, ControlMode.automatic);
    pca9685.executeOutputState("2");
    assert.equal(setDutyCycleStub.callCount, 8);
  });
});
