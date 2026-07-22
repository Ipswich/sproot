import { OutputState } from "../OutputState";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

import { assert } from "chai";
import sinon from "sinon";

describe("OutputState.ts tests", () => {
  describe("updateControlMode", () => {
    const sprootDB = new MockSprootDB();
    const outputsStub = {
      getLastOutputStateAsync: sinon.stub<[number], Promise<SDBOutputState[]>>(),
      updateLastOutputStateAsync: sinon.stub(),
      addOutputStateAsync: sinon.stub(),
      getOutputStatesAsync: sinon.stub(),
      getBucketedOutputStatesAsync: sinon.stub(),
      getAllAsync: sinon.stub(),
      getByIdAsync: sinon.stub(),
      addOutputAsync: sinon.stub(),
      updateOutputAsync: sinon.stub(),
      deleteOutputAsync: sinon.stub(),
    };
    Object.defineProperty(sprootDB, "outputs", { value: outputsStub, writable: true });
    const outputState = new OutputState(1, sprootDB);
    it("should update control mode", () => {
      outputState.updateControlMode(ControlMode.automatic);
      assert.equal(0, outputState.lastValue);
      assert.equal(ControlMode.automatic, outputState.controlMode);
      outputState.updateControlMode(ControlMode.manual);
      assert.equal(0, outputState.lastValue);
      assert.equal(ControlMode.manual, outputState.controlMode);
    });
  });

  describe("loadAsync", function () {
    it("should set current state based on the last output state in the database", async () => {
      const sprootDB = new MockSprootDB();
      const outputsStub = {
        getLastOutputStateAsync: sinon.stub<[number], Promise<SDBOutputState[]>>(),
        updateLastOutputStateAsync: sinon.stub(),
        addOutputStateAsync: sinon.stub(),
        getOutputStatesAsync: sinon.stub(),
        getBucketedOutputStatesAsync: sinon.stub(),
        getAllAsync: sinon.stub(),
        getByIdAsync: sinon.stub(),
        addOutputAsync: sinon.stub(),
        updateOutputAsync: sinon.stub(),
        deleteOutputAsync: sinon.stub(),
      };
      Object.defineProperty(sprootDB, "outputs", { value: outputsStub, writable: true });
      outputsStub.getLastOutputStateAsync.resolves([
        { controlMode: ControlMode.manual, value: 100 } as SDBOutputState,
      ]);
      let outputState = new OutputState(1, sprootDB);

      assert.equal(outputState.controlMode, ControlMode.automatic);
      assert.equal(outputState.value, 0);
      await outputState.loadAsync();
      assert.equal(outputState.controlMode, ControlMode.manual);

      outputState = new OutputState(1, sprootDB);
      outputsStub.getLastOutputStateAsync.resolves([
        { controlMode: ControlMode.automatic, value: 0 } as SDBOutputState,
      ]);
      await outputState.loadAsync();
      assert.equal(outputState.controlMode, ControlMode.automatic);
      assert.equal(outputState.value, 0);
    });
  });

  describe("setNewState", () => {
    const sprootDB = new MockSprootDB();
    const outputsStub = {
      getLastOutputStateAsync: sinon.stub<[number], Promise<SDBOutputState[]>>(),
      updateLastOutputStateAsync: sinon.stub(),
      addOutputStateAsync: sinon.stub(),
      getOutputStatesAsync: sinon.stub(),
      getBucketedOutputStatesAsync: sinon.stub(),
      getAllAsync: sinon.stub(),
      getByIdAsync: sinon.stub(),
      addOutputAsync: sinon.stub(),
      updateOutputAsync: sinon.stub(),
      deleteOutputAsync: sinon.stub(),
    };
    Object.defineProperty(sprootDB, "outputs", { value: outputsStub, writable: true });
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
      await outputState.setNewStateAsync(automaticState);
      await outputState.setNewStateAsync(manualState);
      assert.equal(outputState.lastValue, 0);
      assert.deepEqual(outputState.automatic, automaticState);
      assert.deepEqual(outputState.manual, manualState);

      manualState.value = -1;
      await outputState.setNewStateAsync(manualState);
      assert.equal(outputState.lastValue, 0);
      assert.equal(outputState.manual.value, 0);

      manualState.value = 101;
      await outputState.setNewStateAsync(manualState);
      assert.equal(outputState.lastValue, 0);
      assert.equal(outputState.manual.value, 100);
    });
  });

  describe("get", () => {
    const sprootDB = new MockSprootDB();
    const outputsStub = {
      getLastOutputStateAsync: sinon.stub<[number], Promise<SDBOutputState[]>>(),
      updateLastOutputStateAsync: sinon.stub(),
      addOutputStateAsync: sinon.stub(),
      getOutputStatesAsync: sinon.stub(),
      getBucketedOutputStatesAsync: sinon.stub(),
      getAllAsync: sinon.stub(),
      getByIdAsync: sinon.stub(),
      addOutputAsync: sinon.stub(),
      updateOutputAsync: sinon.stub(),
      deleteOutputAsync: sinon.stub(),
    };
    Object.defineProperty(sprootDB, "outputs", { value: outputsStub, writable: true });
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
      await outputState.setNewStateAsync(automaticState);
      await outputState.setNewStateAsync(manualState);

      assert.deepEqual(outputState.get(), automaticState);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.get(), manualState);
    });
  });

  describe("value", () => {
    const sprootDB = new MockSprootDB();
    const outputsStub = {
      getLastOutputStateAsync: sinon.stub<[number], Promise<SDBOutputState[]>>(),
      updateLastOutputStateAsync: sinon.stub(),
      addOutputStateAsync: sinon.stub(),
      getOutputStatesAsync: sinon.stub(),
      getBucketedOutputStatesAsync: sinon.stub(),
      getAllAsync: sinon.stub(),
      getByIdAsync: sinon.stub(),
      addOutputAsync: sinon.stub(),
      updateOutputAsync: sinon.stub(),
      deleteOutputAsync: sinon.stub(),
    };
    Object.defineProperty(sprootDB, "outputs", { value: outputsStub, writable: true });
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
      await outputState.setNewStateAsync(automaticState);
      await outputState.setNewStateAsync(manualState);

      assert.deepEqual(outputState.value, automaticState.value);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.value, manualState.value);
    });
  });

  describe("logTime", () => {
    const sprootDB = new MockSprootDB();
    const outputsStub = {
      getLastOutputStateAsync: sinon.stub<[number], Promise<SDBOutputState[]>>(),
      updateLastOutputStateAsync: sinon.stub(),
      addOutputStateAsync: sinon.stub(),
      getOutputStatesAsync: sinon.stub(),
      getBucketedOutputStatesAsync: sinon.stub(),
      getAllAsync: sinon.stub(),
      getByIdAsync: sinon.stub(),
      addOutputAsync: sinon.stub(),
      updateOutputAsync: sinon.stub(),
      deleteOutputAsync: sinon.stub(),
    };
    Object.defineProperty(sprootDB, "outputs", { value: outputsStub, writable: true });
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
      await outputState.setNewStateAsync(automaticState);
      await outputState.setNewStateAsync(manualState);

      assert.deepEqual(outputState.logTime, automaticState.logTime);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.logTime, manualState.logTime);
    });
  });

  describe("addCurrentStateToDatabaseAsync", () => {
    const localSprootDB = new MockSprootDB();
    const outputsStub = {
      getLastOutputStateAsync: sinon.stub<[number], Promise<SDBOutputState[]>>(),
      updateLastOutputStateAsync: sinon.stub(),
      addOutputStateAsync: sinon.stub(),
      getOutputStatesAsync: sinon.stub(),
      getBucketedOutputStatesAsync: sinon.stub(),
      getAllAsync: sinon.stub(),
      getByIdAsync: sinon.stub(),
      addOutputAsync: sinon.stub(),
      updateOutputAsync: sinon.stub(),
      deleteOutputAsync: sinon.stub(),
    };
    Object.defineProperty(localSprootDB, "outputs", { value: outputsStub, writable: true });
    const localOutputState = new OutputState(1, localSprootDB);
    it("should call addOutputStateAsync with the correct parameters", async () => {
      const automaticState = {
        controlMode: ControlMode.automatic,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      localOutputState.setNewStateAsync(automaticState);

      await localOutputState.addCurrentStateToDatabaseAsync();
      sinon.assert.calledWith(outputsStub.addOutputStateAsync, {
        id: 1,
        controlMode: ControlMode.automatic,
        value: 50,
      });
    });
  });
});
