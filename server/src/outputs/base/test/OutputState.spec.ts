import { OutputState } from "../OutputState";
import { SprootDB } from "../../../database/SprootDB";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

import { assert } from "chai";
import sinon from "sinon";

describe("OutputState.ts tests", () => {
  describe("updateControlMode", () => {
    const sprootDB = sinon.createStubInstance(SprootDB);
    const outputState = new OutputState(1, sprootDB);
    it("should update control mode", () => {
      outputState.updateControlMode(ControlMode.automatic);
      assert.equal(ControlMode.automatic, outputState.controlMode);
      outputState.updateControlMode(ControlMode.manual);
      assert.equal(ControlMode.manual, outputState.controlMode);
    });
  });

  describe("initializeAsync", function () {
    it("should set current state based on the last output state in the database", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getLastOutputStateAsync = sinon
        .stub<[number], Promise<SDBOutputState[]>>()
        .resolves([{ controlMode: ControlMode.manual, value: 100 } as SDBOutputState]);
      let outputState = new OutputState(1, sprootDB);

      assert.equal(outputState.controlMode, ControlMode.automatic);
      assert.equal(outputState.value, 0);
      await outputState.initializeAsync();
      assert.equal(outputState.controlMode, ControlMode.manual);

      outputState = new OutputState(1, sprootDB);
      sprootDB.getLastOutputStateAsync = sinon
        .stub<[number], Promise<SDBOutputState[]>>()
        .resolves([{ controlMode: ControlMode.automatic, value: 0 } as SDBOutputState]);
      await outputState.initializeAsync();
      assert.equal(outputState.controlMode, ControlMode.automatic);
      assert.equal(outputState.value, 0);
    });
  });

  describe("setNewState", () => {
    const sprootDB = sinon.createStubInstance(SprootDB);
    const outputState = new OutputState(1, sprootDB);
    it("should set new states", async () => {
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
      await outputState.setNewStateAsync(automaticState, ControlMode.automatic);
      await outputState.setNewStateAsync(manualState, ControlMode.manual);
      assert.deepEqual(outputState.automatic, automaticState);
      assert.deepEqual(outputState.manual, manualState);

      manualState.value = -1;
      await outputState.setNewStateAsync(manualState, ControlMode.manual);
      assert.equal(outputState.manual.value, 0);

      manualState.value = 101;
      await outputState.setNewStateAsync(manualState, ControlMode.manual);
      assert.equal(outputState.manual.value, 100);
    });
  });

  describe("get", () => {
    const sprootDB = sinon.createStubInstance(SprootDB);
    const outputState = new OutputState(1, sprootDB);
    it("should return the correct states", async () => {
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
      await outputState.setNewStateAsync(automaticState, ControlMode.automatic);
      await outputState.setNewStateAsync(manualState, ControlMode.manual);

      assert.deepEqual(outputState.get(), automaticState);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.get(), manualState);
    });
  });

  describe("value", () => {
    const sprootDB = sinon.createStubInstance(SprootDB);
    const outputState = new OutputState(1, sprootDB);
    it("should return the correct values", async () => {
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
      await outputState.setNewStateAsync(automaticState, ControlMode.automatic);
      await outputState.setNewStateAsync(manualState, ControlMode.manual);

      assert.deepEqual(outputState.value, automaticState.value);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.value, manualState.value);
    });
  });

  describe("logTime", () => {
    const sprootDB = sinon.createStubInstance(SprootDB);
    const outputState = new OutputState(1, sprootDB);
    it("should return the correct logTimes", async () => {
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
      await outputState.setNewStateAsync(automaticState, ControlMode.automatic);
      await outputState.setNewStateAsync(manualState, ControlMode.manual);

      assert.deepEqual(outputState.logTime, automaticState.logTime);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.logTime, manualState.logTime);
    });
  });

  describe("addCurrentStateToDatabaseAsync", () => {
    const localSprootDB = sinon.createStubInstance(SprootDB);
    const localOutputState = new OutputState(1, localSprootDB);
    it("should call addOutputStateAsync with the correct parameters", async () => {
      const automaticState = {
        controlMode: ControlMode.automatic,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      localOutputState.setNewStateAsync(automaticState, ControlMode.automatic);

      const addOutputStateAsyncStub = sinon.stub(localSprootDB, "addOutputStateAsync");
      await localOutputState.addCurrentStateToDatabaseAsync();
      sinon.assert.calledWith(addOutputStateAsyncStub, {
        id: 1,
        controlMode: ControlMode.automatic,
        value: 50,
      });
      sinon.restore();
    });
  });
});
