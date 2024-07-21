import { OutputState } from "../OutputState";
import { SprootDB } from "../../../database/SprootDB";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

import { assert } from "chai";
import sinon from "sinon";

describe("OutputState.ts tests", () => {
  describe("updateControlMode", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should update control mode", () => {
      outputState.updateControlMode(ControlMode.automatic);
      assert.equal(ControlMode.automatic, outputState.controlMode);
      outputState.updateControlMode(ControlMode.manual);
      assert.equal(ControlMode.manual, outputState.controlMode);
    });
  });

  describe("setNewState", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should set new states", () => {
      const automaticState = {
        controlMode: ControlMode.automatic,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      const manualState = {
        controlMode: ControlMode.manual,
        value: 25,
        logTime: "2022-01-01",
      } as SDBOutputState;
      outputState.setNewState(automaticState, ControlMode.automatic);
      outputState.setNewState(manualState, ControlMode.manual);
      assert.deepEqual(outputState.automatic, automaticState);
      assert.deepEqual(outputState.manual, manualState);

      manualState.value = -1;
      outputState.setNewState(manualState, ControlMode.manual);
      assert.equal(outputState.manual.value, 0);

      manualState.value = 101;
      outputState.setNewState(manualState, ControlMode.manual);
      assert.equal(outputState.manual.value, 100);
    });
  });

  describe("get", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should return the correct states", () => {
      const automaticState = {
        controlMode: ControlMode.automatic,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      const manualState = {
        controlMode: ControlMode.manual,
        value: 25,
        logTime: "2022-01-01",
      } as SDBOutputState;
      outputState.setNewState(automaticState, ControlMode.automatic);
      outputState.setNewState(manualState, ControlMode.manual);

      assert.deepEqual(outputState.get(), automaticState);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.get(), manualState);
    });
  });

  describe("value", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should return the correct values", () => {
      const automaticState = {
        controlMode: ControlMode.automatic,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      const manualState = {
        controlMode: ControlMode.manual,
        value: 25,
        logTime: "2022-01-01",
      } as SDBOutputState;
      outputState.setNewState(automaticState, ControlMode.automatic);
      outputState.setNewState(manualState, ControlMode.manual);

      assert.deepEqual(outputState.value, automaticState.value);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.value, manualState.value);
    });
  });

  describe("logTime", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should return the correct logTimes", () => {
      const automaticState = {
        controlMode: ControlMode.automatic,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      const manualState = {
        controlMode: ControlMode.manual,
        value: 25,
        logTime: "2022-01-02",
      } as SDBOutputState;
      outputState.setNewState(automaticState, ControlMode.automatic);
      outputState.setNewState(manualState, ControlMode.manual);

      assert.deepEqual(outputState.logTime, automaticState.logTime);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.logTime, manualState.logTime);
    });
  });

  describe("addCurrentStateToDatabaseAsync", () => {
    const localSprootDB = sinon.createStubInstance(SprootDB);
    const localOutputState = new OutputState(localSprootDB);
    it("should call addOutputStateAsync with the correct parameters", async () => {
      const automaticState = {
        controlMode: ControlMode.automatic,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      localOutputState.setNewState(automaticState, ControlMode.automatic);

      const addOutputStateAsyncStub = sinon.stub(localSprootDB, "addOutputStateAsync");
      await localOutputState.addCurrentStateToDatabaseAsync(1);
      sinon.assert.calledWith(addOutputStateAsyncStub, {
        id: 1,
        controlMode: ControlMode.automatic,
        value: 50,
      });
      sinon.restore();
    });
  });
});
