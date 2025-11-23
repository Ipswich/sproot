import { SensorList } from "../../../sensors/list/SensorList.js";
import { SensorBase } from "../../../sensors/base/SensorBase.js";
import { SensorCondition } from "../SensorCondition.js";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType.js";

import { assert } from "chai";
import sinon from "sinon";

describe("SensorCondition.ts tests", () => {
  describe("evaluate", () => {
    it("should return true or false, depending on the condition and comparator", () => {
      const sensorCondition = new SensorCondition(
        1,
        "allOf",
        1,
        ReadingType.temperature,
        "equal",
        50,
      );
      const sensorListMock = sinon.createStubInstance(SensorList);
      const sensorMock = sinon.createStubInstance(SensorBase);
      sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock });

      sensorMock.lastReading = {
        temperature: "51",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isFalse(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "notEqual";
      assert.isFalse(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "51",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "greaterOrEqual";
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "51",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "greater";
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isFalse(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "51",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "lessOrEqual";
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "49",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));

      sensorCondition.operator = "less";
      sensorMock.lastReading = {
        temperature: "50",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isFalse(sensorCondition.evaluate(sensorListMock));
      sensorMock.lastReading = {
        temperature: "49",
        humidity: "49",
        pressure: "51",
        moisture: "0",
        voltage: "0",
      };
      assert.isTrue(sensorCondition.evaluate(sensorListMock));
    });
  });
});
