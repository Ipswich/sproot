import { SensorList } from "../../../sensors/list/SensorList";
import { SensorBase } from "../../../sensors/base/SensorBase";
import { SensorCondition } from "../SensorCondition";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";

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
        null,
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

    it("should return the result of the condition for all readings in the lookback period", () => {
      const sensorCondition = new SensorCondition(
        1,
        "allOf",
        1,
        ReadingType.temperature,
        "greater",
        50,
        3,
      );
      const sensorListMock = sinon.createStubInstance(SensorList);
      const sensorMock = sinon.createStubInstance(SensorBase);

      const now = new Date();
      sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock });

      sensorMock.getCachedReadings.returns({
        temperature: [
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "51",
          },
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "52",
          },
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "53",
          },
        ],
      });
      assert.isTrue(sensorCondition.evaluate(sensorListMock, now));

      // One reading is not greater than comparison value
      sensorMock.getCachedReadings.returns({
        temperature: [
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "49",
          },
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "52",
          },
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "53",
          },
        ],
      });
      assert.isFalse(sensorCondition.evaluate(sensorListMock, now));

      // Not enough readings in the lookback period
      sensorMock.getCachedReadings.returns({
        temperature: [
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "52",
          },
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "53",
          },
        ],
      });
      assert.isFalse(sensorCondition.evaluate(sensorListMock, now));

      // One reading is outside the lookback period
      const oldReading = new Date(now.getTime() - 4 * 60000);
      sensorMock.getCachedReadings.returns({
        temperature: [
          {
            logTime: oldReading.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "51",
          },
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "52",
          },
          {
            logTime: now.toISOString(),
            metric: ReadingType.temperature,
            units: "°F",
            data: "53",
          },
        ],
      });
      assert.isFalse(sensorCondition.evaluate(sensorListMock, now));
    });
  });
});
