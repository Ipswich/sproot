import { OutputState } from "../OutputState";
import { SprootDB } from "../../../database/SprootDB";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

import { assert } from "chai";
import sinon from "sinon";

describe("OutputState.ts tests", () => {
  // it("should initialize with default values", () => {
  //   assert.typeOf(outputState.manual, SDBOutputState);
  //   expect(outputState.schedule).toBeInstanceOf(SDBOutputState);
  //   expect(outputState.controlMode).toBe(ControlMode.Manual);
  // });

  describe("updateControlMode", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should update control mode", () => {
      outputState.updateControlMode(ControlMode.schedule);
      assert.equal(ControlMode.schedule, outputState.controlMode);
      outputState.updateControlMode(ControlMode.manual);
      assert.equal(ControlMode.manual, outputState.controlMode);
    });
  });

  describe("setNewState", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should set new states", () => {
      const scheduleState = {
        controlMode: ControlMode.schedule,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      const manualState = {
        controlMode: ControlMode.manual,
        value: 25,
        logTime: "2022-01-01",
      } as SDBOutputState;
      outputState.setNewState(scheduleState, ControlMode.schedule);
      outputState.setNewState(manualState, ControlMode.manual);
      assert.deepEqual(outputState.schedule, scheduleState);
      assert.deepEqual(outputState.manual, manualState);
    });
  });

  describe("get", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should return the correct states", () => {
      const scheduleState = {
        controlMode: ControlMode.schedule,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      const manualState = {
        controlMode: ControlMode.manual,
        value: 25,
        logTime: "2022-01-01",
      } as SDBOutputState;
      outputState.setNewState(scheduleState, ControlMode.schedule);
      outputState.setNewState(manualState, ControlMode.manual);

      assert.deepEqual(outputState.get(), scheduleState);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.get(), manualState);
    });
  });

  describe("value", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should return the correct values", () => {
      const scheduleState = {
        controlMode: ControlMode.schedule,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      const manualState = {
        controlMode: ControlMode.manual,
        value: 25,
        logTime: "2022-01-01",
      } as SDBOutputState;
      outputState.setNewState(scheduleState, ControlMode.schedule);
      outputState.setNewState(manualState, ControlMode.manual);

      assert.deepEqual(outputState.value, scheduleState.value);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.value, manualState.value);
    });
  });

  describe("logTime", () => {
    let sprootDB = {} as SprootDB;
    let outputState = new OutputState(sprootDB);
    it("should return the correct logTimes", () => {
      const scheduleState = {
        controlMode: ControlMode.schedule,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      const manualState = {
        controlMode: ControlMode.manual,
        value: 25,
        logTime: "2022-01-02",
      } as SDBOutputState;
      outputState.setNewState(scheduleState, ControlMode.schedule);
      outputState.setNewState(manualState, ControlMode.manual);

      assert.deepEqual(outputState.logTime, scheduleState.logTime);
      outputState.updateControlMode(ControlMode.manual);
      assert.deepEqual(outputState.logTime, manualState.logTime);
    });
  });

  describe("addCurrentStateToDatabaseAsync", () => {
    const localSprootDB = sinon.createStubInstance(SprootDB);
    const localOutputState = new OutputState(localSprootDB);
    it("should call addOutputStateAsync with the correct parameters", async () => {
      const scheduleState = {
        controlMode: ControlMode.schedule,
        value: 50,
        logTime: "2022-01-01",
      } as SDBOutputState;
      localOutputState.setNewState(scheduleState, ControlMode.schedule);

      const addOutputStateAsyncStub = sinon.stub(localSprootDB, "addOutputStateAsync");
      await localOutputState.addCurrentStateToDatabaseAsync(1);
      sinon.assert.calledWith(addOutputStateAsyncStub, {
        id: 1,
        controlMode: ControlMode.schedule,
        value: 50,
      });
      sinon.restore();
    });
  });
});
