import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { OutputGroup } from "../OutputGroup";
import { PCA9685 } from "@sproot/sproot-server/src/outputs/PCA9685";
import { Pca9685Driver } from "pca9685";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
import { Models } from "@sproot/sproot-common/dist/outputs/Models";
import { SDBOutputState } from "@sproot/database/SDBOutputState";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

describe("OutputGroup.ts tests", function () {
  let logger: winston.Logger;

  this.beforeEach(() => {
    sinon
      .stub(winston, "createLogger")
      .callsFake(
        () => ({ info: () => {}, error: () => {}, verbose: () => {} }) as unknown as winston.Logger,
      );
    logger = winston.createLogger({ silent: true });
  });
  afterEach(() => {
    sinon.restore();
  });

  const outputGroupSettings: SDBOutput = {
    id: 1,
    model: Models.OUTPUT_GROUP,
    name: "Test Output Group",
    color: "#FFFFFF",
    automationTimeout: 30,
    address: "",
    pin: "",
    isPwm: false,
    isInvertedPwm: false,
    deviceZoneId: null,
    subcontrollerId: null,
  } as SDBOutput;

  it("should set and remove outputs correctly", async function () {
    const mockSprootDB = new MockSprootDB();
    sinon.createStubInstance(Pca9685Driver);

    const pca9685 = new PCA9685(mockSprootDB, 5, 5, 5, 5, undefined, logger);
    await using outputGroup = await OutputGroup.createInstanceAsync(
      outputGroupSettings,
      mockSprootDB,
      5,
      5,
      5,
      5,
      logger,
    );

    // Set some non default values - since this is non-pwm, value will be set to 100
    await outputGroup.updateControlModeAsync(ControlMode.manual);
    await outputGroup.setStateAsync({
      controlMode: ControlMode.manual,
      value: 50,
    } as SDBOutputState);
    assert.equal(outputGroup.controlMode, ControlMode.manual);
    assert.equal(outputGroup.value, 100);

    const output1 = await pca9685.createOutputAsync({
      id: 2,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);
    const output2 = await pca9685.createOutputAsync({
      id: 3,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 2",
      pin: "1",
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output3 = await pca9685.createOutputAsync({
      id: 4,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 3",
      pin: "2",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);

    // Default values
    assert.equal(output1!.controlMode, ControlMode.automatic);
    assert.equal(output2!.controlMode, ControlMode.automatic);
    assert.equal(output1!.value, 0);
    assert.equal(output2!.value, 0);

    assert.isFalse(outputGroup.isPwm);
    await outputGroup.setOutputAsync(output1!);
    await outputGroup.setOutputAsync(output2!);
    assert.isTrue(outputGroup.isPwm);
    assert.lengthOf(Object.keys(outputGroup.outputs), 2);

    // Should immediately apply values to added outputs
    assert.equal(output1!.controlMode, ControlMode.manual);
    assert.equal(output2!.controlMode, ControlMode.manual);
    assert.equal(output1!.value, 100);
    assert.equal(output2!.value, 100);

    await outputGroup.removeOutputAsync(output1!.id);
    // Removing a PWM output should set isPwm to false since the only remaining output is non-PWM
    assert.isFalse(outputGroup.isPwm);
    assert.lengthOf(Object.keys(outputGroup.outputs), 1);

    // This one should set isPwm to true
    await outputGroup.setOutputAsync(output1!);
    assert.isTrue(outputGroup.isPwm);
    assert.equal(output1!.controlMode, ControlMode.manual);
    assert.equal(output1!.value, 100);

    // Setting the state now should respect PWM
    await outputGroup.setStateAsync({
      controlMode: ControlMode.manual,
      value: 50,
    } as SDBOutputState);
    await outputGroup.setOutputAsync(output3!);
    assert.equal(outputGroup.controlMode, ControlMode.manual);
    assert.equal(output1!.controlMode, ControlMode.manual);
    assert.equal(output2!.controlMode, ControlMode.manual);
    assert.equal(output3!.controlMode, ControlMode.manual);
    assert.equal(outputGroup.value, 50);
    assert.equal(output1!.value, 50);
    assert.equal(output2!.value, 100);
    assert.equal(output3!.value, 50);
  });

  it("should set and execute state on all outputs", async function () {
    const mockSprootDB = new MockSprootDB();
    sinon.createStubInstance(Pca9685Driver);

    const pca9685 = new PCA9685(mockSprootDB, 5, 5, 5, 5, undefined, logger);
    await using outputGroup = await OutputGroup.createInstanceAsync(
      outputGroupSettings,
      mockSprootDB,
      5,
      5,
      5,
      5,
      logger,
    );

    const output1 = await pca9685.createOutputAsync({
      id: 2,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);
    const output2 = await pca9685.createOutputAsync({
      id: 3,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 2",
      pin: "1",
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    await outputGroup.setOutputAsync(output1!);
    await outputGroup.setOutputAsync(output2!);

    assert.equal(output1?.controlMode, ControlMode.automatic);
    assert.equal(output2?.controlMode, ControlMode.automatic);
    assert.equal(output1?.value, 0);
    assert.equal(output2?.value, 0);

    const setStateSpy1 = sinon.spy(output1!, "setStateAsync");
    const setStateSpy2 = sinon.spy(output2!, "setStateAsync");
    const executeStateSpy1 = sinon.spy(output1!, "executeStateAsync");
    const executeStateSpy2 = sinon.spy(output2!, "executeStateAsync");
    const newState = { controlMode: ControlMode.automatic, value: 70 } as SDBOutputState;

    await outputGroup.setAndExecuteStateAsync(newState);
    assert.isTrue(setStateSpy1.calledOnce);
    assert.isTrue(setStateSpy2.calledOnce);
    assert.equal(output1?.controlMode, ControlMode.automatic);
    assert.equal(output2?.controlMode, ControlMode.automatic);
    assert.equal(output1?.value, 70);
    assert.equal(output2?.value, 100);

    assert.isTrue(executeStateSpy1.calledOnce);
    assert.isTrue(executeStateSpy2.calledOnce);

    await outputGroup.removeOutputAsync(output1!.id);

    await outputGroup.setAndExecuteStateAsync({
      controlMode: ControlMode.automatic,
      value: 0,
    } as SDBOutputState);

    // output1 should not have been called again
    assert.isTrue(setStateSpy1.calledOnce);
    assert.isTrue(executeStateSpy1.calledOnce);
    assert.equal(output1?.value, 70);
    // output2 should have been called again
    assert.isTrue(setStateSpy2.calledTwice);
    assert.isTrue(executeStateSpy2.calledTwice);
    assert.equal(output2?.value, 0);
  });

  it("should update control mode on all outputs", async function () {
    const mockSprootDB = new MockSprootDB();
    sinon.createStubInstance(Pca9685Driver);

    const pca9685 = new PCA9685(mockSprootDB, 5, 5, 5, 5, undefined, logger);
    await using outputGroup = await OutputGroup.createInstanceAsync(
      outputGroupSettings,
      mockSprootDB,
      5,
      5,
      5,
      5,
      logger,
    );

    const output1 = await pca9685.createOutputAsync({
      id: 2,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);
    const output2 = await pca9685.createOutputAsync({
      id: 3,
      model: Models.PCA9685,
      address: "0x40",
      name: "test output 2",
      pin: "1",
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);

    await outputGroup.setOutputAsync(output1!);
    await outputGroup.setOutputAsync(output2!);

    const updateControlModeSpy1 = sinon.spy(output1!, "updateControlModeAsync");
    const updateControlModeSpy2 = sinon.spy(output2!, "updateControlModeAsync");

    assert.equal(output1?.controlMode, ControlMode.automatic);
    assert.equal(output2?.controlMode, ControlMode.automatic);
    assert.equal(outputGroup.controlMode, ControlMode.automatic);

    await outputGroup.updateControlModeAsync(ControlMode.manual);

    assert.isTrue(updateControlModeSpy1.calledOnce);
    assert.isTrue(updateControlModeSpy2.calledOnce);
    assert.equal(output1?.controlMode, ControlMode.manual);
    assert.equal(output2?.controlMode, ControlMode.manual);
    assert.equal(outputGroup.controlMode, ControlMode.manual);
  });
});
