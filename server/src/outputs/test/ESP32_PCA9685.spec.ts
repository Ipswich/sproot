import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ESP32_PCA9685 } from "@sproot/sproot-server/src/outputs/ESP32_PCA9685";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { OutputBase } from "../base/OutputBase";
import { Models } from "@sproot/sproot-common/dist/outputs/Models";
import { ControlMode } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";

import { assert } from "chai";
import nock from "nock";
import * as sinon from "sinon";
import winston from "winston";
const mockSprootDB = new MockSprootDB();

describe("ESP32_PCA9685.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });

  it("should create and delete PCA9685 outputs", async function () {
    const scope = nock("http://127.0.0.1")
      .persist()
      .put(/^\/api\/outputs\/pca9685\/0x(?:[0-7][0-9A-Fa-f]|[0-9A-Fa-f])\/(?:[0-9]|1[0-5])$/)
      .reply(200, { status: "ok" });

    sinon
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();

    const pca9685 = new ESP32_PCA9685(mockSprootDB, 5, 5, 5, 5, undefined, logger);
    // disposing with nothing shouldn't cause issues
    await pca9685.disposeOutputAsync({} as OutputBase);

    // Missing external address
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
      externalAddress: "http://127.0.0.1",
      address: "0x40",
      name: "test output 2",
      pin: "1",
      isPwm: false,
      isInvertedPwm: false,
    } as SDBOutput);
    const output3 = await pca9685.createOutputAsync({
      id: 3,
      model: Models.ESP32_PCA9685,
      externalAddress: "http://127.0.0.1",
      address: "0x40",
      name: "test output 3",
      pin: "2",
      isPwm: true,
      isInvertedPwm: true,
    } as SDBOutput);
    const output4 = await pca9685.createOutputAsync({
      id: 4,
      model: Models.ESP32_PCA9685,
      externalAddress: "http://127.0.0.1",
      address: "0x40",
      name: "test output 4",
      pin: "3",
      isPwm: false,
      isInvertedPwm: true,
    } as SDBOutput);
    assert.equal(Object.keys(pca9685.outputs).length, 3);
    assert.exists(pca9685.outputs["4"]);
    assert.equal(
      (pca9685.usedPins["http://127.0.0.1"] as Record<string, string[]>)["0x40"]!.length,
      3,
    );

    // Dispose 1 output
    await pca9685.disposeOutputAsync(output4!);
    assert.equal(Object.keys(pca9685.outputs).length, 2);
    assert.equal(
      (pca9685.usedPins["http://127.0.0.1"] as Record<string, string[]>)["0x40"]!.length,
      2,
    );
    assert.isUndefined(pca9685.outputs["4"]);

    // disposing with a non existent pin should also not cause issues
    await pca9685.disposeOutputAsync({ pin: "3", address: "0x40" } as OutputBase);

    // Dispose the rest
    await pca9685.disposeOutputAsync(output2!);
    await pca9685.disposeOutputAsync(output3!);
    assert.equal(Object.keys(pca9685.outputs).length, 0);
    assert.isEmpty((pca9685.usedPins["http://127.0.0.1"] as Record<string, string[]>)["0x40"]);

    scope.done();
  });

  it("should return output data (no functions)", async function () {
    sinon
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();

    const pca9685 = new ESP32_PCA9685(mockSprootDB, 5, 5, 5, 5, undefined, logger);
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.ESP32_PCA9685,
      externalAddress: "http://127.0.0.1",
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);
    const outputData = pca9685.outputData;

    assert.equal(outputData["1"]!["name"], "test output 1");
    assert.equal(outputData["1"]!["externalAddress"], "http://127.0.0.1");
    assert.equal(outputData["1"]!["pin"], "0");
    assert.equal(outputData["1"]!["isPwm"], true);
    assert.equal(outputData["1"]!["isInvertedPwm"], false);
    assert.exists(pca9685.outputs["1"]!["sprootDB"]);
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

    let callCount = 0;
    let capturedBody: any = null;
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

    const pca9685 = new ESP32_PCA9685(mockSprootDB, 5, 5, 5, 5, undefined, logger);
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.PCA9685,
      externalAddress: "http://127.0.0.2",
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: false,
    } as SDBOutput);

    //Automatic High
    await pca9685.setAndExecuteStateAsync("1", <SDBOutputState>{
      value: 100,
      controlMode: ControlMode.automatic,
      logTime: new Date().toISOString(),
    });
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 100);
    assert.equal(callCount, 1);
    assert.equal(capturedBody.value, 100);

    //Automatic Low
    await pca9685.setAndExecuteStateAsync("1", <SDBOutputState>{
      value: 0,
      controlMode: ControlMode.automatic,
      logTime: new Date().toISOString(),
    });
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 0);
    assert.equal(callCount, 2);
    assert.equal(capturedBody.value, 0);

    //Swap to Manual (+0 execution call, manual is also low)
    await pca9685.updateControlModeAsync("1", ControlMode.manual);
    assert.equal(callCount, 2);

    //Manual High
    await pca9685.setAndExecuteStateAsync("1", <SDBOutputState>{
      value: 100,
      controlMode: ControlMode.manual,
      logTime: new Date().toISOString(),
    });
    assert.equal(pca9685.outputs["1"]?.state.manual.value, 100);
    assert.equal(callCount, 3);
    assert.equal(capturedBody.value, 100);

    //Automatic Low (+1 execution call, switching back to automatic mode (high -> low))
    await pca9685.updateControlModeAsync("1", ControlMode.automatic);
    assert.equal(callCount, 4);
    assert.equal(capturedBody.value, 0);

    //Automatic Low (+0 execution call, switching back to automatic mode (low -> low))
    await pca9685.updateControlModeAsync("1", ControlMode.automatic);
    assert.equal(callCount, 4);

    //Inverted PWM Execution
    await pca9685.createOutputAsync({
      id: 1,
      model: Models.PCA9685,
      externalAddress: "http://127.0.0.2",
      address: "0x40",
      name: "test output 1",
      pin: "0",
      isPwm: true,
      isInvertedPwm: true,
    } as SDBOutput);

    await pca9685.setAndExecuteStateAsync("1", <SDBOutputState>{
      value: 100,
      controlMode: ControlMode.automatic,
    });
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 100);
    assert.equal(callCount, 5);
    assert.equal(capturedBody.value, 0);

    //PWM error handling
    await pca9685.setAndExecuteStateAsync("1", <SDBOutputState>{
      value: -1,
      controlMode: ControlMode.automatic,
    });
    assert.equal(pca9685.outputs["1"]?.state.automatic.value, 0);
    assert.equal(callCount, 6);

    await pca9685.setAndExecuteStateAsync("1", <SDBOutputState>{
      value: 101,
      controlMode: ControlMode.automatic,
    });
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
    await pca9685.setAndExecuteStateAsync("2", <SDBOutputState>{
      value: 75,
      controlMode: ControlMode.automatic,
    });
    assert.equal(callCount, 7);
    scope.done();
  });
});
