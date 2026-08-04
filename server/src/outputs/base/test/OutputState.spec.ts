import { OutputState } from "../OutputState";
import { IOutputsRepository } from "../../../database/repositories/outputs/IOutputsRepository";
import { SDBOutputState } from "@sproot/common/database/SDBOutputState";
import { ControlMode } from "@sproot/common/outputs/IOutputBase";

import { assert } from "chai";
import sinon from "sinon";
import { DeviceDataQueryRow } from "@sproot/common/api/v2/QueryTypes";

const createMockOutputsRepo = (): IOutputsRepository => ({
  getAllAsync: async () => [],
  getByIdAsync: async () => [],
  getByModelAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
  updateLastOutputStateAsync: async () => {},
  getLastOutputStateAsync: sinon.stub().resolves([]),
  addOutputStateAsync: async () => {},
  getOutputStatesAsync: async () => [],
  getBucketedOutputStatesAsync: async () => [],
  getDataAsync: async () => ({
    xAxis: { field: "time", values: [] },
    data: {} as DeviceDataQueryRow,
  }),
});

describe("OutputState.ts tests", () => {
  describe("updateControlMode", () => {
    const mockOutputsRepo = createMockOutputsRepo();
    const outputState = new OutputState(1, mockOutputsRepo);
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
      const mockOutputsRepo = createMockOutputsRepo();
      (mockOutputsRepo.getLastOutputStateAsync as sinon.SinonStub).resolves([
        { controlMode: ControlMode.manual, value: 100 } as SDBOutputState,
      ]);
      let outputState = new OutputState(1, mockOutputsRepo);

      assert.equal(outputState.controlMode, ControlMode.automatic);
      assert.equal(outputState.value, 0);
      await outputState.loadAsync();
      assert.equal(outputState.controlMode, ControlMode.manual);

      outputState = new OutputState(1, mockOutputsRepo);
      (mockOutputsRepo.getLastOutputStateAsync as sinon.SinonStub).resolves([
        { controlMode: ControlMode.automatic, value: 0 } as SDBOutputState,
      ]);
      await outputState.loadAsync();
      assert.equal(outputState.controlMode, ControlMode.automatic);
      assert.equal(outputState.value, 0);
    });
  });

  describe("setNewState", () => {
    const mockOutputsRepo = createMockOutputsRepo();
    const outputState = new OutputState(1, mockOutputsRepo);
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
    const mockOutputsRepo = createMockOutputsRepo();
    const outputState = new OutputState(1, mockOutputsRepo);
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
    const mockOutputsRepo = createMockOutputsRepo();
    const outputState = new OutputState(1, mockOutputsRepo);
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
    const mockOutputsRepo = createMockOutputsRepo();
    const outputState = new OutputState(1, mockOutputsRepo);
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
    const mockOutputsRepo = createMockOutputsRepo();
    const addOutputStateAsyncStub = sinon.stub();
    Object.defineProperty(mockOutputsRepo, "addOutputStateAsync", {
      value: addOutputStateAsyncStub,
      writable: true,
    });
    const localOutputState = new OutputState(1, mockOutputsRepo);
    it("should call addOutputStateAsync with the correct parameters", async () => {
      const automaticState = {
        controlMode: ControlMode.automatic,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      localOutputState.setNewStateAsync(automaticState);

      await localOutputState.addCurrentStateToDatabaseAsync();
      sinon.assert.calledWith(addOutputStateAsyncStub, {
        id: 1,
        controlMode: ControlMode.automatic,
        value: 50,
      });
    });
  });
});
